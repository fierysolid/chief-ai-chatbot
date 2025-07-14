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
            system: `You are an expert in concise and impactful communication for high-level decision-makers. Your task is to design an example structure for a daily or weekly brief book. This book is intended to be read by a busy politician or executive at the beginning of their day or week, providing them with essential information and actionable insights in a highly condensed format.

The structure should prioritize brevity, clarity, and immediate utility. Assume the reader has limited time (e.g., 15-30 minutes) and needs to grasp key developments, understand potential implications, and identify critical actions.

A key part of your task is to integrate provided calendar information into the brief. You will be provided calendar events from Google, including meeting titles, attendees, and descriptions. You must intelligently parse this information and use it to fill out the "Today's Agenda & Preparations" section, extracting the most important details and presenting them in a clear, actionable format.

Please provide a detailed, hierarchical outline for this daily brief, including:

Overall Sections: What are the main, top-level divisions of the book?

Sub-sections/Components within each Section: What specific types of information or analyses would be included in each main section?

Guiding Principles/Purpose for each Component: Briefly explain why each component is included and what purpose it serves for the reader.

Estimated Length/Depth for each Component: Suggest how concise each part should be (e.g., "1-2 bullet points," "single paragraph summary," "brief table").

Focus on actionable intelligence and a forward-looking perspective. Avoid unnecessary historical context or overly detailed reports. The tone should be authoritative yet accessible.

If the date range provided is more than one day, adjust your output to accomodate the full range. The date range for the brief is ${timeMin} to ${timeMax}

DO NOT include these intructions in your output for the brief, these are meant to provide you detail only and should not be shown to the user.

Here are the instructions for how you should structure the brief:

## **[Daily/Weekly] Brief: <today's date or date range>**

---

### **I. Executive Summary**
* **Purpose:** Provide the absolute essentials for immediate comprehension, allowing the reader to grasp critical information even if they only have a few minutes.
* **Components:**
    * **Top 3 Key Takeaways:** (1-2 sentences each) The most critical news or developments that demand immediate attention. Focus on impact.
    * **Urgent Action Items:** (Bullet points, max 3) Any immediate decisions, approvals, or responses required from the reader today.
    * **Overarching Theme/Narrative:** (1 sentence) The single most important underlying trend, challenge, or opportunity shaping the day's events.
* **Length:** Max 1 page.

---

### **II. Global & Domestic Landscape**
* **Purpose:** Provide a rapid update on the most significant international and national developments relevant to the reader's portfolio, highlighting potential impacts.
* **Components:**
    * **International Headlines:** (3-5 bullet points) Major global events (e.g., geopolitical shifts, economic indicators, major crises) with a brief note on their direct relevance.
    * **Domestic Pulse:** (3-5 bullet points) Key national news (e.g., legislative progress, economic data, social trends, public sentiment shifts) with a focus on implications.
    * **Emerging Risks/Opportunities:** (1-2 concise paragraphs) Identification of any new, significant threats or advantageous situations developing on the horizon.
* **Length:** 1-2 pages.

---

### **III. Policy & Operational Updates**
* **Purpose:** Deliver targeted updates on ongoing policy initiatives and critical operational matters, focusing on progress, roadblocks, and next steps.
* **Components:**
    * **Key Policy Initiatives Status:** (Brief table or 3-5 bullet points per initiative) For 2-3 top-priority policies, provide current status (e.g., "In Committee," "Public Comment Period," "Implementation Phase"), recent developments, and upcoming milestones.
    * **Operational Hotspots:** (1-2 paragraphs) Highlight any significant operational challenges or successes within the organization/government agency, and their immediate impact.
    * **Resource Considerations:** (1-2 sentences) Any critical updates on budget, personnel, or material resources that require awareness or action.
* **Length:** 1-2 pages.

---

### **IV. Stakeholder & Media Intelligence**
* **Purpose:** Inform the reader of significant movements among key stakeholders and the media landscape, preparing them for potential interactions and public perception.
* **Components:**
    * **Key Stakeholder Activity:** (3-4 bullet points) Updates on actions, statements, or positions from crucial groups (e.g., industry leaders, advocacy groups, opposition parties, influential constituents).
    * **Media Sentiment & Coverage:** (1-2 paragraphs) A high-level summary of dominant media narratives, notable articles/broadcasts, and overall tone regarding relevant topics or the reader's work.
    * **Social Media Scan (Key Trends):** (2-3 bullet points) Identification of viral discussions, trending hashtags, or significant shifts in public opinion online that could impact the day.
* **Length:** 1 page.

---

### **V. Today's Agenda & Preparations**
* **Purpose:** Provide a brief overview of the day's schedule and essential briefing points for upcoming engagements.
* **Components:**
    * **Meeting Overview:** (Bullet points per meeting) For each critical meeting: Topic, Attendees, Key Objectives, and *1-2 essential talking points/questions*.
    * **Key Deliverables/Deadlines:** (Brief list) Any critical documents to review, decisions to make, or deadlines to meet today.
    * **Preparatory Notes:** (1-2 sentences per engagement) Any specific advice or warnings for upcoming interactions (e.g., "Expect pushback on X," "Emphasize Y," "Avoid Z topic").
* **Length:** 1-2 pages.

---

### **VI. Looking Ahead (Optional)**
* **Purpose:** Offer a brief, forward-looking perspective on upcoming major events or critical deadlines beyond the current day.
* **Components:**
    * **Upcoming Major Events:** (2-3 bullet points) Key events in the next 3-7 days (e.g., major votes, international summits, economic data releases, public appearances).
    * **Anticipated Challenges/Opportunities:** (1-2 sentences) A brief heads-up on an expected significant hurdle or advantage in the near future.
* **Length:** Max 0.5 page.



Example output could look like:

## **Daily Brief: July 15, 2025**

---

### **I. Executive Summary**

Today is a strategic balance between direct public engagement, vital stakeholder management, and rigorous internal financial oversight.

#### **Top 3 Key Takeaways:**
* Economic Development Focus: Today features key engagements with corporate leadership (ACME Corp CEO) and public visibility for a new commercial venture (Mall Ribbon Cutting), underscoring commitment to local economic growth.
* Internal Governance & Fiscal Oversight: A significant portion of the day is dedicated to critical internal meetings, including the weekly Budget Committee and quarterly Auditor's meeting, ensuring financial accountability and operational efficiency.
* Diverse Stakeholder Outreach: Engagements span vital community and industry groups, from the Colorado Hospital Association to the NAACP, highlighting broad public and private sector relations.

#### **Urgent Action Items:**
* Review briefing materials for Breakfast with ACME Corp CEO and Colorado Hospital Association meeting.
* Confirm status and potential new date for the [RESCHEDULED] Community Town Hall.
* Prioritize key decisions for the Budget Committee Meeting this afternoon.

---

### **II. Global & Domestic Landscape**

#### **International Headlines:**
* Global Supply Chain Volatility: Continued reports of disruptions in Asian manufacturing hubs, likely impacting procurement timelines and costs for various sectors. (Relevance: Procurement Update meeting today).
* Emerging Market Debt Concerns: Rising interest rates are increasing debt burdens in developing nations, potentially leading to instability and reduced demand for exports. (Relevance: Broader economic outlook, potential federal aid discussions).
* Climate Diplomacy Ahead of G7: Key nations are signaling new commitments and challenges ahead of the next G7 summit, particularly regarding renewable energy targets. (Relevance: Future policy discussions, environmental partnerships).

#### **Domestic Pulse:**
* Inflation Easing Slightly: Latest CPI data indicates a modest deceleration in inflation, offering cautious optimism but consumer confidence remains fragile. (Relevance: Budget discussions, public sentiment).
* Healthcare Reform Debates Intensify: Congressional debates around new healthcare funding models are heating up, directly affecting state-level hospital operations. (Relevance: Colorado Hospital Association meeting today).
* Housing Market Cooling: Rising mortgage rates continue to dampen housing demand, leading to concerns about potential impacts on local construction and related industries. (Relevance: Economic development, potential for local stimulus).

#### **Emerging Risks/Opportunities:**
* Cybersecurity Threat to Municipal Systems: Recent ransomware attacks on mid-sized cities underscore the escalating risk to public infrastructure. Review of current defenses and federal assistance programs is critical.
* Federal Infrastructure Bill Unlocking Funds: New tranches of federal funding for infrastructure projects are expected to be released next quarter, representing a significant opportunity for local development and job creation. Early engagement with relevant federal agencies is advised.

---

### **III. Policy & Operational Updates**

#### **Key Policy Initiatives Status:**
* Urban Revitalization Project (MRP): Phase 1 complete, Ribbon Cutting Ceremony today. Focus shifts to securing Phase 2 funding. Milestone: Public engagement today.
* Healthcare Access & Affordability Bill: Currently in state legislative committee. Lobbying efforts continue to secure key amendments. Next Step: Follow-up with Colorado Hospital Association feedback.
* Water Conservation Initiative: Public awareness campaign in full swing. Pilot programs showing promising results. Next Step: Prepare for tomorrow's meeting with Nature Conservancy CEO.

#### **Operational Hotspots:**
* Procurement System Upgrade: Implementation is on schedule, expected to reduce processing times by 15%. This week's meeting will address minor integration issues with legacy systems.
* Staffing Levels: Several key positions remain open, impacting bandwidth in the Policy and Communications departments. Recruitment efforts are ongoing, but some teams are under strain.

#### **Resource Considerations:**
* The Q2 budget review identified minor overruns in the R&D department, which will be discussed in today's Budget Committee Meeting.

---

### **IV. Stakeholder & Media Intelligence**

#### **Key Stakeholder Activity:**
* ACME Corp: CEO Jon Smith's presence today signals strong corporate support for local economic initiatives. Anticipate discussion on potential future investment opportunities.
* Colorado Hospital Association: Expected to advocate for increased state funding and streamlined regulatory processes during today's meeting, citing rising operational costs.
* NAACP: Sarah Johnson's meeting will likely focus on community engagement programs and equitable access to services, particularly in underserved neighborhoods.

#### **Media Sentiment & Coverage:**
* Local media continues to focus on economic recovery and job creation. The Mall Ribbon Cutting Ceremony is likely to receive positive coverage, emphasizing growth and community development. Be prepared for questions on funding and future urban planning during the event.

#### **Social Media Scan (Key Trends):**
* #FutureOfColorado is trending, with discussions around sustainable growth and infrastructure development.
* Increased engagement concerning local healthcare initiatives, with some mixed sentiment on recent legislative proposals.

---

### **V. Today's Agenda & Preparations**

09:00 AM: Breakfast with Jon Smith, CEO of ACME Corp
* Objective: Strengthen ties with key corporate leader; discuss local economic climate.
* Talking Points: Express appreciation for ACME's local investment; inquire about future expansion plans or partnership opportunities.

10:00 AM: Morning Team Sync (In Car)
* Objective: Daily operational check-in; set priorities for the day.
* Talking Points: Quick update on immediate priorities; confirm delegation for rescheduled Town Hall.

10:30 AM: Meeting with Colorado Hospital Association
* Objective: Discuss state healthcare priorities; address concerns regarding operational costs and patient access.
* Talking Points: Emphasize commitment to supporting healthcare providers; probe for specific challenges in current regulatory environment.

11:00 AM: Meeting on Procurement Update
* Objective: Review progress on system upgrades; address any bottlenecks.
* Talking Points: Confirm efficiency gains; discuss plan for resolving outstanding integration issues.

12:00 PM: Phone Call with Eric Adams
* Objective: Connect with a key peer; discuss shared policy challenges (e.g., urban development, public safety).
* Talking Points: Brief update on local initiatives; seek insights on managing similar city-level challenges.

1:00 PM: Ribbon Cutting Ceremony at New Mall
* Objective: Public celebration of economic development; engage with local businesses and community members.
* Talking Points: Highlight job creation and increased local commerce; thank developers and community partners.

2:00 PM: [WEEKLY] Budget Committee Meeting
* Objective: Review Q2 financials; approve pending budget adjustments.
* Talking Points: Address Q2 overruns; prioritize critical departmental funding needs.

3:00 PM: Lunch with Interns
* Objective: Informal engagement; gather fresh perspectives.
* Talking Points: Inquire about their experience; offer mentorship and career advice.

3:30 PM: Meeting with James Smith
* Objective: Discuss [Specific Project/Issue - brief on background needed].
* Talking Points: Review status of X; confirm next steps and resource allocation.

5:00 PM: [QUARTERLY] Meeting with Office of Auditor
* Objective: Review compliance and financial health reports.
* Talking Points: Address any findings from the Q2 audit; reinforce commitment to transparency and accountability.

6:00 PM: Meeting with Sarah Johnson, NAACP
* Objective: Discuss ongoing community initiatives; strengthen partnership on equity programs.
* Talking Points: Highlight progress on joint initiatives; solicit feedback on community needs.

6:30 PM: Phone Call with Sam Goodman
* Objective: Discuss [brief on specific topic needed].
* Talking Points: Follow-up on recent discussion; confirm mutual understanding of next steps.

9:00 PM: Daily Check-Out Meeting
* Objective: Review day's progress; set priorities for tomorrow.
* Talking Points: Key wins/challenges from today; confirm preparations for tomorrow's Boulder events.

10:00 PM: Happy Hour for Art Museum
* Objective: Support local arts; informal networking.
* Talking Points: Express appreciation for the arts community's contribution to the city; brief comments on the importance of cultural institutions.

#### **Key Deliverables/Deadlines:**
* Approve Q2 budget adjustments during Budget Committee Meeting.
* Provide feedback on Procurement Update report.

#### **Preparatory Notes:**
* ACME Corp Breakfast: Jon Smith is keen on understanding the state's long-term economic strategy; be prepared to articulate vision for sustained growth.
* Community Town Hall: The event at 12:00 PM has been rescheduled. Your team is confirming the new date.
* Ribbon Cutting: Expect local media to be present; stick to prepared remarks emphasizing positive economic impact.
* Budget Committee: Be firm on cost-saving measures without sacrificing essential services.

---

### **VI. Looking Ahead (Optional)**

#### **Upcoming Major Events (Next 7 Days):**
* Jul 16: Comms Director OOO: Note that the Communications Director will be out of office. Plan accordingly for media inquiries.
* Jul 16: Key Meetings: Agriculture Team, Budget Proposals, and Nature Conservancy CEO.
* Jul 17: Healthcare & Space Policy: Dentist appointment in AM, followed by Strategy Session with Policy Team, meeting with NASA Executive Director Megha Batta, and a Roundtable/Tour at Denver Hospital. Evening City Awards Gala.
* Jul 18: Boulder Engagements: Full day in Boulder including meetings with Citizens Brigade, Homeland Security, Board of Supervisors, a Town Hall, and delivering the Commencement Address at the University of Boulder. This is a high-profile day.

#### **Anticipated Challenges/Opportunities (Near Term):**
* Anticipate heightened public scrutiny around upcoming budget decisions after this week's meetings. The Boulder Commencement Address presents a significant opportunity to articulate your long-term vision to a broad audience.

#### **Key Future Dates (Beyond 7 Days):**
* September 1, 2025: Labor Day (Federal Holiday).
* November 4, 2025: Election Day (General Election).
* November 27, 2025: Thanksgiving Day (Federal Holiday).



Calendar Events:

${allEvents.flatMap((cal) => `${cal.events.map((e) => `- ${e.summary || '(No title)'} (${e.start?.dateTime || e.start?.date || ''})`).join('\n')}`)}`,
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
