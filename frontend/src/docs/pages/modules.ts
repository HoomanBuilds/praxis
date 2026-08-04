import type { DocPage } from "../types";
import { h2, p, ul, ol, table, note, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "dashboard",
    title: "Dashboard",
    description:
      "The Command Center — a live view of your compliance position: coverage, pending review, overdue work and recent activity.",
    updated: UPDATED,
    sections: [
      p(
        "The Dashboard is the first screen you see after signing in. It summarizes the current state of your compliance program and what has happened recently, so a compliance officer can see at a glance where attention is needed.",
      ),
      h2("Compliance Coverage"),
      p("The percentage of obligations implemented out of your total obligation base, with the underlying counts. This is the headline number for how complete your compliance program is."),
      h2("Pending Review"),
      p("Obligations that have been identified but not yet approved or rejected. This is your decision queue — the faster it is cleared, the sooner work gets scheduled."),
      h2("Overdue Tasks"),
      p("Assigned tasks past their deadline. Overdue work is the operational risk signal: it tells you where implementation is slipping."),
      h2("Recent Circulars"),
      p("The latest documents processed, with their status, so you can confirm uploads and follow their progress."),
      h2("Activity Feed"),
      p("A live stream of what PRAXIS has done — regulation imports, obligations identified, reviews completed — with who performed each action. This is the real audit feed, not a marketing summary."),
      h2("Processing status"),
      p("The current state of the processing queue. When documents are being processed, the feed shows progress so you know work is moving."),
      note("What the Dashboard is for", "It is an operational cockpit, not a report. For trend analysis and coverage over time, use Analytics; for the permanent record, use the Audit Trail."),
    ],
  },

  {
    slug: "documents",
    title: "Documents",
    description:
      "The Regulations screen — upload, process and manage every regulatory instrument in your corpus.",
    updated: UPDATED,
    sections: [
      p(
        "The Documents screen manages every regulatory instrument in PRAXIS: circulars, notifications, orders and policies. Upload here, follow processing, and open any document to review its obligations.",
      ),
      h2("Uploading a document"),
      ol([
        "Click upload and select a PDF, DOCX or text file.",
        "Enter a title and the instrument reference (for example the SEBI circular number).",
        "Choose to process immediately or queue the document.",
        "The document card shows processing progress and status.",
      ]),
      h2("Processing status",
      ),
      table(
        ["Status", "Meaning"],
        [
          ["Queued", "Waiting for a background worker."],
          ["Processing", "Being read and analysed."],
          ["Awaiting review", "Obligations identified, waiting for a compliance officer."],
          ["Generated", "Rules, tasks and evidence created from approved obligations."],
          ["Failed", "Processing did not complete — see the document for the reason."],
        ],
      ),
      h2("Document detail",
      ),
      p(
        "Open a document to see its metadata, the processing summary (sections read, text quality, obligations found), and the list of obligations extracted from it. The original file is always available for download.",
      ),
      h2("Version history",
      ),
      p(
        "A revised instrument uploads as a new version of the same document. Unchanged obligations are preserved and only the changed sections are re-processed.",
      ),
      h2("Supported formats",
      ),
      ul(["PDF (including scanned documents, processed with OCR)", "DOCX", "Text"]),
      h2("Deleting or archiving",
      ),
      p(
        "Administrators can delete a document and its obligations. Deletion is recorded in the audit trail. Consider archiving rather than deleting when a regulation is superseded, to preserve history.",
      ),
    ],
  },

  {
    slug: "obligations-module",
    title: "Obligations",
    description:
      "The review workspace — approve, edit or reject identified obligations and drive everything downstream.",
    updated: UPDATED,
    sections: [
      p(
        "The Obligations screen is the decision point of the platform. Every obligation identified from your documents lands here for a compliance officer to review before it can drive rules, tasks and evidence.",
      ),
      h2("The review queue",
      ),
      p(
        "Filter by document, status or functional area. Low-assurance obligations surface first, so the items most likely to need human judgement are seen earliest. Each row shows the obligation, its department, method and status.",
      ),
      h2("Reviewing an obligation",
      ),
      p(
        "Open an obligation to see its description alongside the verbatim source text and paragraph reference, so you can verify it against the original instrument. The detail also shows the functional area, modification type, assurance score and any deadline hint in the source.",
      ),
      h2("Actions",
      ),
      table(
        ["Action", "Effect"],
        [
          ["Approve", "Marks the obligation as genuine. It becomes eligible for rule, task and evidence generation."],
          ["Edit", "Changes the description, functional area or modification type, then approves the corrected version."],
          ["Reject", "Records the obligation as not applicable, with the reviewer and a reason. Nothing downstream is created."],
        ],
      ),
      h2("Approval and assignment",
      ),
      p(
        "When you approve an obligation you confirm its functional area, which determines the department, owner and reviewer it will be assigned to. The assignment follows the department configuration in Settings → Departments.",
      ),
      h2("Status and due dates",
      ),
      p(
        "Obligations track status from pending review through approved, edited, rejected and implemented. Due dates come from the source instrument — either an explicit deadline in the text or a computed date with an implementation buffer before the effective date.",
      ),
      h2("Source references",
      ),
      p(
        "Every obligation carries its verbatim source text and paragraph reference. The reference is the provenance that makes the whole chain regulator-ready: from source paragraph to obligation to rule to task to evidence.",
      ),
    ],
  },

  {
    slug: "evidence-center",
    title: "Evidence Center",
    description:
      "The workspace for collecting and attaching the artefacts that prove each obligation is met.",
    updated: UPDATED,
    sections: [
      p(
        "The Evidence Center is where compliance proof is collected. It lists every evidence requirement across your obligations, what the artefact must contain, who collects it, and whether it is on file.",
      ),
      h2("What you see",
      ),
      ul([
        "Every obligation with an evidence requirement.",
        "The required document type and content.",
        "The responsible collector.",
        "The retention period for the artefact.",
        "Whether an artefact has been attached.",
      ]),
      h2("Attaching evidence",
      ),
      p(
        "Select a requirement and attach the file that satisfies it. Uploads are recorded in the audit trail with the person and time, and are linked back to the obligation and regulation.",
      ),
      h2("Supported evidence",
      ),
      ul([
        "Policies and board-approved documentation.",
        "Screenshots and system reports.",
        "Invoices and payment records.",
        "Meeting minutes and sign-off records.",
        "Audit reports and inspection results.",
        "Certificates of completion or registration.",
        "Filing acknowledgements and receipts.",
      ]),
      h2("Coverage at a glance",
      ),
      p(
        "The center shows which requirements still need artefacts, and Analytics summarizes evidence coverage across departments and regulations — the view management needs to see where proof is thin.",
      ),
      note(
        "Retention",
        "Retention periods come from the requirements and the firm's data retention settings. Records flagged for retention should not be deleted before the period ends.",
      ),
    ],
  },

  {
    slug: "tasks-module",
    title: "Tasks",
    description:
      "The assigned work that implements obligations — filter, complete and track against deadlines.",
    updated: UPDATED,
    sections: [
      p(
        "The Tasks screen shows every piece of assigned work across the organization. It is where implementation happens: complete tasks, track deadlines and see what is slipping.",
      ),
      h2("Filtering",
      ),
      p(
        "Filter tasks by status, owner, department and obligation. The default view shows open and in-progress work; overdue tasks are marked and also surface on the Dashboard.",
      ),
      h2("Task detail",
      ),
      p(
        "Each task shows its title, primary owner, reviewer, the workflow it belongs to, its deadline and any dependency. The task links back to the obligation and regulation that created it.",
      ),
      h2("Completing work",
      ),
      ul([
        "Update a task as it progresses from open to in progress to complete.",
        "The reviewer signs off on completion.",
        "Completed tasks are recorded in the audit trail with the owner and timestamp.",
        "Dependent tasks unlock once the work they depend on is done.",
      ]),
      h2("Deadlines",
      ),
      p(
        "Deadlines come from the regulation — a verbatim deadline in the source, or a computed date with an implementation buffer before the effective date. When a deadline is missed, the task is overdue and appears on the Dashboard and Calendar.",
      ),
    ],
  },

  {
    slug: "calendar",
    title: "Calendar",
    description:
      "Every task deadline and filing due date on one schedule, with ICS export for your own calendar.",
    updated: UPDATED,
    sections: [
      p(
        "The Calendar brings every deadline into one view: task deadlines from approved obligations and filing due dates. It is the operational schedule for the compliance team.",
      ),
      h2("What appears",
      ),
      ul([
        "Task deadlines across departments and owners.",
        "Filing due dates.",
        "Overdue items marked clearly.",
      ]),
      h2("Filtering",
      ),
      p(
        "Filter the calendar by department or team to see just the work relevant to you.",
      ),
      h2("Export",
      ),
      p(
        "Subscribe to the calendar as an ICS feed so PRAXIS deadlines appear in Microsoft Outlook, Google Calendar or Apple Calendar. This keeps compliance dates next to everyone's regular schedule.",
      ),
      h2("From deadline to action",
      ),
      p(
        "Select any calendar item to jump to the task or obligation behind it, review the source, and act on the work.",
      ),
    ],
  },

  {
    slug: "filing-tracker",
    title: "Filing Tracker",
    description:
      "Track periodic filings and disclosures to SEBI, with due dates, owners and submission status.",
    updated: UPDATED,
    sections: [
      p(
        "The Filing Tracker manages recurring filings and disclosures. Each row is a filing requirement tied to an obligation and regulation, with a due date, an owner and a status.",
      ),
      h2("Filing states",
      ),
      table(
        ["State", "Meaning"],
        [
          ["Due", "The filing has not been submitted yet."],
          ["Submitted", "The filing has been filed with the regulator."],
          ["Acknowledged", "The regulator has acknowledged receipt."],
          ["Overdue", "The due date has passed without submission."],
        ],
      ),
      h2("Working with filings",
      ),
      ol([
        "An approved obligation creates a filing requirement with a deadline.",
        "The owner prepares and submits the filing.",
        "Evidence of submission is attached to the obligation.",
        "The status is updated and the audit trail records it.",
      ]),
      h2("Planning ahead",
      ),
      p(
        "The upcoming view lists filings by due date so the team can see what is coming and prepare in advance — no filing surprises at month end.",
      ),
    ],
  },

  {
    slug: "compliance-map",
    title: "Compliance Map",
    description:
      "A relationship view of regulations, obligations, risks, filings, evidence and departments — and how a change propagates.",
    updated: UPDATED,
    sections: [
      p(
        "The Compliance Map provides a relationship view of regulations, obligations, risks, filings, evidence and departments. Use it to understand how a regulatory change affects downstream compliance.",
      ),
      h2("The picture",
      ),
      p(
        "Regulations create obligations; obligations carry risk, are implemented by rules and tasks, produce filings and require evidence; departments and owners are connected throughout. The map makes the chain from source instrument to evidence visible in one place.",
      ),
      h2("Nodes",
      ),
      p(
        "The map uses typed nodes — Regulation, Obligation, Department, Risk, Rule, Task, Owner and Evidence — each linking to the record behind it. Click any node to open the actual obligation, task or evidence item.",
      ),
      h2("Relationships",
      ),
      ul([
        "creates — a regulation creates an obligation.",
        "is governed by — an obligation sits under a regulation.",
        "is implemented by — rules and tasks implement an obligation.",
        "carries risk — the risk node for an obligation.",
        "is assigned to — tasks and obligations assigned to departments and owners.",
        "amends — a revised obligation supersedes an earlier one.",
      ]),
      h2("Filtering",
      ),
      p(
        "Filter by document to see one instrument's footprint across your organization, or view the whole firm. Adjust node density to keep the view readable.",
      ),
      h2("Risk propagation",
      ),
      p(
        "Risk flows through the map: open an obligation's risk node and see the departments, tasks and evidence affected by that risk. This is how a high-risk obligation becomes a coordinated response.",
      ),
      h2("Dependency analysis",
      ),
      p(
        "When a regulation is amended, the map shows the obligations affected and, downstream, the departments, tasks and evidence that change. Answering \u201chow does this affect us?\u201d is a matter of following the edges.",
      ),
      h2("Export",
      ),
      p(
        "The map exports to GraphML for use in external graph tools, documentation and board presentations.",
      ),
    ],
  },

  {
    slug: "risk-register-module",
    title: "Risk Register",
    description:
      "Every obligation ranked by computed risk — filter by department, status and level, and act on what matters first.",
    updated: UPDATED,
    sections: [
      p(
        "The Risk Register ranks every obligation by its computed risk level. It is the operational starting point for triage: what is critical, what is high, and what can wait.",
      ),
      h2("The ranking",
      ),
      p(
        "Every obligation receives a risk score derived from objective compliance signals. The register groups them into levels from Critical to Minimal and lets you filter by department and status.",
      ),
      h2("Using it daily",
      ),
      ul([
        "Clear the critical list first — these are the obligations that need action now.",
        "Filter by department to brief each owner on their risk profile.",
        "Open an obligation to see why it was ranked as it was.",
        "Watch the register after a new circular — new high-risk obligations land at the top.",
      ]),
      h2("Consistency",
      ),
      p(
        "Because risk is computed from objective signals, the ranking is reproducible and explainable — the same facts always produce the same score. That matters when a regulator asks how risk was assessed.",
      ),
      h2("Links",
      ),
      p(
        "The same scores drive the risk nodes in the Compliance Map, and the register feeds the Risk Distribution view in Analytics.",
      ),
    ],
  },

  {
    slug: "analytics",
    title: "Analytics",
    description:
      "Trends, coverage and performance across your compliance program — every chart explained.",
    updated: UPDATED,
    sections: [
      p(
        "Analytics turns the platform's records into the views management needs: is compliance improving, where is coverage thin, and what is being automated.",
      ),
      h2("Compliance Trend"),
      p("Coverage over time — the share of obligations implemented, tracked by date. This is the line that shows whether the program is moving in the right direction."),
      h2("Processing Activity"),
      p("What has been processed and reviewed over recent weeks — documents processed, obligations reviewed, approvals and corrections."),
      h2("Department Performance"),
      p("How each department is performing on its obligations and tasks — approvals, completions and overdue work by area."),
      h2("Evidence Coverage"),
      p("The share of evidence requirements with artefacts attached, by department and regulation. Thin coverage here means proof is missing."),
      h2("Regulatory Growth"),
      p("How the obligation base has grown as regulations are added — new obligations over time, and where they came from."),
      h2("Automation Metrics"),
      p("What the platform handled automatically versus what needed human judgement — the share of obligations processed without manual intervention, and the reviews and corrections people made."),
      h2("Risk Distribution"),
      p("The spread of obligations across risk levels, filterable by department. The shape of this chart shows where the organization's risk is concentrated."),
    ],
  },

  {
    slug: "copilot",
    title: "Copilot",
    description:
      "Ask questions about your compliance data in plain language and get grounded answers from your records.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS Copilot allows users to ask questions about regulations, obligations, deadlines, evidence and compliance status using natural language. Responses are generated using only the organization's compliance knowledge base.",
      ),
      h2("What you can ask",
      ),
      p(
        "Copilot answers from your actual records — obligations, rules, tasks, evidence and regulations. It does not answer from general knowledge, and it shows the sources it used so you can verify every answer.",
      ),
      h2("Example questions",
      ),
      ul([
        "Show overdue RBI filings.",
        "Which obligations are due next week?",
        "Summarize this circular.",
        "Show high-risk obligations.",
        "List pending evidence.",
        "Which obligations belong to the Compliance department?",
      ]),
      h2("Grounded answers",
      ),
      p(
        "Answers cite the specific obligations and sources they draw on. When a question cannot be answered from your records, Copilot says so rather than guessing.",
      ),
      h2("Starting a conversation",
      ),
      ol([
        "Open Copilot from the navigation.",
        "Type a question, or pick a suggested question to get started.",
        "Review the answer and its source citations.",
        "Ask a follow-up to refine the result.",
      ]),
      h2("Data boundary",
      ),
      p(
        "Copilot operates within the organization's compliance knowledge base. Regulatory content and your firm's records stay inside your deployment boundary.",
      ),
    ],
  },
];
