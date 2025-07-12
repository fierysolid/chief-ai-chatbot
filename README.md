# Chief AI Chatbot

## Overview

This chatbot has the abiliity to grab all your events from your Google Calendar and create a brief book in markdown based on your upcoming day or week.

### Technical Infrastructure

For the purposes of this project, infrastructure was kept low cost while still highly resiliant. By using Google for authentication I can rely on Google's authentication security, simplify authentication in my app, and immediately ask for calendar permissions for use later. Vercel and Neon allow for severless infrastructure that turns off when not being used.

### Tech Stack

The stack I'm using is:

- Next.js (Typescript)
  - shadcn
  - tailwind
  - radix-ui
- Vercel for hosting and blob storage
- Neon for datastore
- Redis for memory caching
- AI SDK for the agent
- Google for auth and AI (next-auth)

### User Experience

The chatbot is designed to quickly produce an artifact (brief, sheet, image, etc) and allow the user to quickly export it for printing so they can get it on their bosses desk.

With only a couple clicks, you can login using Google, hit "Write me a brief for next week" and the chatbot will generate within a few seconds. You can then download the document and send it or print it.

If the brief isn't quite right, the document creation experience has the ability to ask for edits and provide suggestions before you finalize it.

### Security

The app leans on Google for authentication which makes it easy to always have the latest and greatest authentication practices in place. Since Google is also where users are storing their calendar, they should be okay with sending their calendar events to Google's Gemini models as long as we explain their data won't be used in training.

If we're working with government officials and executives, they will likely require a higher standard for data security like NIST, SOC2, or ISO 27701. For this I would use Vanta.

Additionally, we lean on Github for vulnerability scanning and remediation.

## Fix/Expand Features

- Educational information about how their data is being used to create transparency with users.
- Improve context with RAG for specific entities people, places, matters. These entities can be enriched over time as the agent is fed more information about them.
  - This may require a partition on the documents table for each user to keep user data isolated
- Save to Google Docs (assuming this is a desirable for the client's workflow)
  - The chatbot is designed to quickly generate the brief book and provide the user a way to
- Add organizations and roles for RBAC
- Single Sign On and Audit logging for enterprise (WorkOS)
- Improve the structure of the brief for consistent outputs
- Add support for additional email providers
- Artifact managment within the UI

## Security and Infra Pitfalls

The app was created on infrastructure that scales extremely well and could support users for the first year or more depending on speed of growth.

The most glaring security issue is lack of organizations and RBAC control, but with an app this simple it's not a requirement at this phase.
