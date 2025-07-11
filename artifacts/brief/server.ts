import { smoothStream, streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { updateDocumentPrompt } from '@/lib/ai/prompts';
import { type calendar_v3, google } from 'googleapis';
import { db, account, type Account } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { BASE_URL } from '@/lib/constants';

export const briefDocumentHandler = createDocumentHandler<'brief'>({
  kind: 'brief',
  onCreateDocument: async ({
    title,
    dataStream,
    session,
    timeMin,
    timeMax,
  }) => {
    let credentials: Account | null = null;
    try {
      const accounts = await db
        .select()
        .from(account)
        .where(
          and(
            eq(account.userId, session.user.id),
            eq(account.provider, 'google'),
          ),
        );
      if (accounts[0]) {
        credentials = accounts[0];
      }
    } catch (err) {
      dataStream.write({
        type: 'data-textDelta',
        data: `\n**Error fetching Google account:** ${err instanceof Error ? err.message : String(err)}`,
        transient: true,
      });
    }

    if (!credentials) {
      dataStream.write({
        type: 'data-textDelta',
        data: `\n**No Google account connected.**`,
        transient: true,
      });
    } else {
      try {
        const auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          `${BASE_URL}/api/auth/callback/google`,
        );
        auth.setCredentials({
          refresh_token: credentials.refresh_token,
        });
        const calendar = google.calendar({ version: 'v3', auth });
        // Get all calendars
        const calendarList = await calendar.calendarList.list();
        const calendars = calendarList.data.items || [];
        // Get today in UTC
        const allEvents: {
          calendar?: string | null;
          events: calendar_v3.Schema$Event[];
        }[] = [];
        for (const cal of calendars) {
          if (!cal.id) continue;
          const events = await calendar.events.list({
            calendarId: cal.id,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
          });
          if (events.data.items && events.data.items.length > 0) {
            allEvents.push({
              calendar: cal.summary || cal.id,
              events: events.data.items,
            });
          }
        }
        if (allEvents.length === 0) {
          dataStream.write({
            type: 'data-textDelta',
            data: `\n**No events found for today.**`,
            transient: true,
          });
        } else {
          let draftContent = '';

          const { fullStream } = streamText({
            model: myProvider.languageModel('artifact-model'),
            system: `Using Markdown, generate a detailed brief book for the upcoming calendar events so I'm properly briefed on all events: ${allEvents.flatMap((cal) => `\n### ${cal.calendar}\n${cal.events.map((e) => `- ${e.summary || '(No title)'} (${e.start?.dateTime || e.start?.date || ''})`).join('\n')}`)}`,
            // 'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
            experimental_transform: smoothStream({ chunking: 'word' }),
            prompt: title,
          });

          for await (const delta of fullStream) {
            const { type } = delta;

            if (type === 'text') {
              const { text } = delta;

              draftContent += text;

              dataStream.write({
                type: 'data-textDelta',
                data: text,
                transient: true,
              });
            }
          }

          return draftContent;
        }
      } catch (err) {
        console.error(err);
        dataStream.write({
          type: 'data-textDelta',
          data: `\n**Error fetching Google Calendar events:** ${err instanceof Error ? err.message : String(err)}`,
          transient: true,
        });
      }
    }
    return '';
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'brief'),
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: description,
      providerOptions: {
        openai: {
          prediction: {
            type: 'content',
            content: document.content,
          },
        },
      },
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text') {
        const { text } = delta;

        draftContent += text;

        dataStream.write({
          type: 'data-textDelta',
          data: text,
          transient: true,
        });
      }
    }

    return draftContent;
  },
});
