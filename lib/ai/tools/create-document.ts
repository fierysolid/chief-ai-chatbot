import { generateUUID } from '@/lib/utils';
import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';
import type { ChatMessage } from '@/lib/types';

interface CreateDocumentProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for brief book creation, or for writing, or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind. The `timeMin` and `timeMax` should only be provided for briefs. Determine their values based on the range the user asks for.',
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
      timeMin: z
        .string()
        .describe(
          "Infer the ISO 8601 date representing the lower bound for the requested brief range from the user's request",
        ),
      timeMax: z
        .string()
        .describe(
          "Infer the ISO 8601 date representing the upper bound for the requested brief range from the user's request",
        ),
    }),
    execute: async ({ title, kind, timeMin, timeMax }) => {
      const id = generateUUID();

      dataStream.write({
        type: 'data-kind',
        data: kind,
        transient: true,
      });

      dataStream.write({
        type: 'data-id',
        data: id,
        transient: true,
      });

      dataStream.write({
        type: 'data-title',
        data: title,
        transient: true,
      });

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
        timeMin,
        timeMax,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
