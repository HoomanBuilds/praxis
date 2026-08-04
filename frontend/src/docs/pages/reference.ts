import type { DocPage } from "../types";
import { h2, p, table, note, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "terminology",
    title: "Terminology",
    description:
      "The words PRAXIS uses, defined the way a compliance officer would use them.",
    updated: UPDATED,
    sections: [
      p("A glossary of the terms used across the platform and this documentation."),
      h2("Core terms",
      ),
      table(
        ["Term", "Definition"],
        [
          ["Regulation", "A regulatory instrument — circular, notification, order or policy — that creates obligations."],
          ["Obligation", "A single, trackable compliance requirement drawn from a regulation."],
          ["Rule", "A structured statement of what an obligation requires, used to evaluate compliance."],
          ["Task", "An assigned piece of work that implements an obligation."],
          ["Evidence", "The artefact that demonstrates an obligation is met."],
          ["Filing", "A periodic submission or disclosure required by a regulation."],
          ["Department", "A functional area of your firm that owns obligations and tasks."],
        ],
      ),
      h2("Process terms",
      ),
      table(
        ["Term", "Definition"],
        [
          ["Processing", "Reading a document and identifying its obligations."],
          ["Review gate", "The human decision point between identification and action."],
          ["Assurance", "A calibrated score of how certain an identification is."],
          ["Workflow", "The mapping of an obligation to your departments and owners."],
          ["Analysis engine", "The local service that performs analytical document review."],
          ["Compliance Map", "The relationship view of your compliance program."],
        ],
      ),
      h2("Status terms",
      ),
      p(
        "The exact status values for obligations, documents and tasks are listed on the Status Definitions page.",
      ),
      note(
        "Terminology stays consistent",
        "The platform and this documentation use the same vocabulary. The internal names of technical components are never shown to users.",
      ),
    ],
  },

  {
    slug: "status-definitions",
    title: "Status Definitions",
    description:
      "Every status an obligation, document, task or filing can be in, and what it means.",
    updated: UPDATED,
    sections: [
      h2("Obligation statuses",
      ),
      table(
        ["Status", "Meaning"],
        [
          ["Pending review", "Identified, waiting for a compliance officer's decision."],
          ["Approved", "Accepted as a genuine obligation; eligible for rules, tasks and evidence."],
          ["Rejected", "Not applicable to the firm; reviewer and reason recorded."],
          ["Edited", "Approved with changes to description, area or type."],
          ["Implemented", "Rules, tasks and evidence in place."],
        ],
      ),
      h2("Document statuses",
      ),
      table(
        ["Status", "Meaning"],
        [
          ["Queued", "Waiting for a background worker."],
          ["Processing", "Being read and analysed."],
          ["Awaiting review", "Obligations identified, awaiting review."],
          ["Generated", "Rules, tasks and evidence created."],
          ["Failed", "Processing did not complete."],
        ],
      ),
      h2("Task statuses",
      ),
      table(
        ["Status", "Meaning"],
        [
          ["Open", "Assigned, not started."],
          ["In progress", "Work underway."],
          ["Complete", "Done and reviewed."],
          ["Overdue", "Past deadline without completion."],
        ],
      ),
      h2("Filing statuses",
      ),
      table(
        ["Status", "Meaning"],
        [
          ["Due", "Not yet submitted."],
          ["Submitted", "Filed with the regulator."],
          ["Acknowledged", "Receipt confirmed."],
          ["Overdue", "Due date passed without submission."],
        ],
      ),
      h2("Risk levels",
      ),
      table(
        ["Level", "Meaning"],
        [
          ["Critical", "Immediate action required."],
          ["High", "Priority attention this cycle."],
          ["Medium", "Standard implementation work."],
          ["Low", "Lower-impact requirement."],
          ["Minimal", "Recorded, minimal action expected."],
        ],
      ),
    ],
  },

  {
    slug: "error-codes",
    title: "Error Codes",
    description:
      "The HTTP status codes PRAXIS returns, and what to do about each.",
    updated: UPDATED,
    sections: [
      p("PRAXIS returns standard HTTP status codes with a JSON detail message."),
      h2("4xx — client errors",
      ),
      table(
        ["Code", "Meaning", "Action"],
        [
          ["400", "Bad request — the request was malformed.", "Check the request body and parameters."],
          ["401", "Unauthenticated — no valid token or key.", "Sign in, or use a valid API key."],
          ["403", "Forbidden — authenticated but not permitted.", "Ask an administrator for the role."],
          ["404", "Not found — the record does not exist.", "Check the identifier."],
          ["409", "Conflict — duplicate or inconsistent state.", "Check for an existing record first."],
          ["422", "Validation failed.", "Correct the fields reported in the detail."],
        ],
      ),
      h2("5xx — server errors",
      ),
      table(
        ["Code", "Meaning", "Action"],
        [
          ["500", "Internal error.", "Retry; if it persists, check the server log."],
          ["502", "Bad gateway.", "Check upstream services."],
          ["503", "Unavailable — a dependency is down.", "Check the health endpoint and service status."],
        ],
      ),
      h2("Domain failures",
      ),
      p(
        "Some failures carry a domain message rather than a bare status: a document that failed processing shows the reason on the document; an integration card shows the connection error it hit.",
      ),
    ],
  },

  {
    slug: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    description:
      "Keys that move you around PRAXIS faster.",
    updated: UPDATED,
    sections: [
      h2("Global",
      ),
      table(
        ["Shortcut", "Action"],
        [
          ["Cmd/Ctrl + K", "Open the command palette — search records and jump between screens."],
          ["Esc", "Close the command palette or current overlay."],
        ],
      ),
      h2("Command palette",
      ),
      p(
        "Type to search across documents, obligations and navigation. Arrow keys move through results; Enter opens the selected item; Cmd/Ctrl + K reopens it from anywhere.",
      ),
      note(
        "Keep it simple",
        "PRAXIS favours a mouse-first interface with one global shortcut to rule them all — the command palette.",
      ),
    ],
  },

  {
    slug: "faq",
    title: "FAQ",
    description:
      "Common questions about running PRAXIS.",
    updated: UPDATED,
    sections: [
      h2("Do I have to review every obligation?",
      ),
      p(
        "Yes. Nothing becomes a rule, task or evidence item until an officer approves it. The review gate is structural — there is no auto-approve path.",
      ),
      h2("Where do my documents go?",
      ),
      p(
        "Regulatory documents, obligations and evidence stay in your deployment — your database, storage and analysis engine. Regulatory content does not leave your boundary.",
      ),
      h2("Can PRAXIS handle a 400-page master circular?",
      ),
      p(
        "Yes. PRAXIS is designed for very large instruments and only applies analytical review where it is genuinely needed, so processing stays fast and predictable on big documents.",
      ),
      h2("What happens when a circular is revised?",
      ),
      p(
        "Upload the revised version. Unchanged obligations are preserved, only the changed sections are re-processed, and superseded obligations are linked to their replacements in the Compliance Map.",
      ),
      h2("Can I export records for a regulator?",
      ),
      p(
        "Yes. Generate an audit package for an obligation, a document, or the whole firm in PDF and XLSX, with the full traceable chain from source text to evidence.",
      ),
      h2("What is the analysis engine?",
      ),
      p(
        "It is the local service that performs analytical review of documents. It runs inside your deployment, keeping regulatory content on your infrastructure.",
      ),
      h2("How do I add users?",
      ),
      p(
        "Settings → Users. Assign a role per person, or connect SSO so people use their corporate identity.",
      ),
      h2("Where can I see who did what?",
      ),
      p(
        "The Audit Trail under Records is the permanent record of every action, searchable by person, action and record.",
      ),
    ],
  },
];
