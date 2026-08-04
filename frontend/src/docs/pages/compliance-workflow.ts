import type { DocPage } from "../types";
import { h2, p, ul, ol, table, tip, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "processing-pipeline",
    title: "Processing Pipeline",
    description:
      "How a regulatory document becomes obligations, rules, tasks and evidence — in two phases with a human gate between them.",
    updated: UPDATED,
    sections: [
      p(
        "Every document moves through the same processing pipeline in two phases. Phase A turns the document into reviewable obligations. After a human review gate, Phase B generates rules, tasks and evidence. The gate between the phases is what makes PRAXIS trustworthy: nothing becomes actionable until an officer approves it.",
      ),
      h2("Phase A — from document to obligations"),
      ol([
        "The document is read and split into numbered sections, with a quality check on the text.",
        "Regulatory context is resolved — applicable intermediary classes, whether the instrument is new, an amendment or a rescission, and its effective date.",
        "Each section is assessed for obligations. Clear mandatory requirements are extracted automatically; ambiguous ones are flagged for analytical review.",
        "Obligations are de-duplicated, linked to prior obligations where relevant, and assigned assurance scores.",
        "Low-assurance items are flagged so they surface first in the review queue.",
      ]),
      h2("Phase B — from approved obligations to action"),
      ol([
        "Each approved obligation is translated into a compliance rule.",
        "Rules map to departments, producing assigned tasks with deadlines.",
        "Evidence requirements are defined for each rule.",
        "The results are presented for review before tasks and evidence are created.",
      ]),
      h2("Scale-aware processing"),
      p(
        "PRAXIS is designed for very large instruments — master circulars run to hundreds of pages and thousands of sections. It does not run analytical review over every page. Only the sections that genuinely need interpretation receive it, which keeps processing fast and cost predictable on large documents.",
      ),
      h2("The review gate",
      ),
      table(
        ["Gate", "What passes", "What never passes"],
        [
          ["Obligation review", "Approved obligations become rules, tasks and evidence.", "Unapproved or rejected obligations."],
          ["Task & evidence review", "Assigned tasks and evidence requirements.", "Work on obligations not yet approved."],
        ],
      ),
      tip(
        "Incremental updates",
        "Re-uploading a revised instrument re-processes only the changed sections. Unchanged obligations are left untouched.",
      ),
    ],
  },

  {
    slug: "document-ingestion",
    title: "Document Ingestion",
    description:
      "Uploading and reading regulatory documents, with quality checks, version history and format support.",
    updated: UPDATED,
    sections: [
      p(
        "Document ingestion is the first step of the pipeline: a regulatory instrument arrives, PRAXIS reads it, and it becomes available for obligation identification.",
      ),
      h2("Supported formats",
      ),
      table(
        ["Format", "Handling"],
        [
          ["PDF", "Text layer read directly; scanned or poor-quality pages are processed with OCR at high resolution."],
          ["DOCX", "Word documents read natively."],
          ["Text", "Plain text supported."],
        ],
      ),
      h2("Reading quality",
      ),
      p(
        "PRAXIS measures how well a document was read, as a quality score. Documents that come out below the threshold are flagged for human attention rather than processed on, so a bad scan never silently produces bad obligations.",
      ),
      h2("Sections and references",
      ),
      p(
        "The document is split into numbered sections, keeping headings separate from body text. Cross-references inside the document — to prior circulars, regulations, sections and acts — are detected and recorded so they can be resolved during processing.",
      ),
      h2("Version history",
      ),
      p(
        "Regulations change. Uploading a revised instrument creates a new version rather than a duplicate. The previous version's obligations are compared against the new text, and superseded obligations are linked to their replacements.",
      ),
      h2("Uploading",
      ),
      ol([
        "Open the Regulations (Documents) screen.",
        "Upload the file and enter a title and reference.",
        "Choose whether to process immediately or queue the document for background processing.",
        "Follow the processing status on the document card until it reaches the review stage.",
      ]),
    ],
  },

  {
    slug: "obligation-detection",
    title: "Obligation Detection",
    description:
      "How PRAXIS identifies each discrete compliance obligation, with a verbatim source reference for every one.",
    updated: UPDATED,
    sections: [
      p(
        "Obligation detection is the analytical heart of the platform. From a processed document, PRAXIS produces the list of discrete, trackable obligations — each with a plain-language description, the verbatim source text, the paragraph it came from, and an assurance score.",
      ),
      h2("Two paths to an obligation",
      ),
      table(
        ["Path", "Used for", "Result"],
        [
          ["Automatic", "Clear mandatory clauses with explicit requirements.", "Extracted directly, high assurance."],
          ["Analytical review", "Qualitative, ambiguous or context-dependent clauses.", "Reviewed with interpretation, flagged for human confirmation."],
        ],
      ),
      h2("Every obligation records",
      ),
      ul([
        "A plain-language description.",
        "The verbatim source text and paragraph reference.",
        "The functional area it belongs to.",
        "Whether it is new, an amendment, a rescission or informational.",
        "An assurance score, calibrated and consistent.",
        "A deadline hint when the source states one.",
      ]),
      h2("Quality controls",
      ),
      ul([
        "De-duplication: near-identical obligations across a document collapse into one.",
        "Cross-linking: an obligation that supersedes an earlier one is linked to its predecessor.",
        "Flagging: low-assurance obligations are marked so reviewers see them first.",
      ]),
      h2("The review queue",
      ),
      p(
        "Detected obligations land in the review queue. Nothing downstream — no rule, task or evidence — is created until an officer approves the obligation. The identification stage is thorough, but the decision is always human.",
      ),
    ],
  },

  {
    slug: "evidence-collection",
    title: "Evidence Collection",
    description:
      "Defining, assigning and collecting the artefacts that demonstrate each obligation is met.",
    updated: UPDATED,
    sections: [
      p(
        "For every approved obligation, PRAXIS defines the evidence that demonstrates compliance. Evidence collection turns those definitions into a working checklist with responsible owners and retention periods.",
      ),
      h2("What gets defined",
      ),
      ul([
        "The document type required — a policy, a certificate, a filing receipt, an audit report.",
        "The required content — what the artefact must show.",
        "The collector — who is responsible for obtaining it.",
        "The retention period — how long it must be kept on file.",
      ]),
      h2("Evidence templates",
      ),
      p(
        "Common requirement types map to standard templates: filing acknowledgements, system reports, board-approved policies, periodic filing receipts, and standard operating procedures with sample records. Board-approved obligations additionally require a board-resolution artefact.",
      ),
      h2("Collecting evidence",
      ),
      p(
        "The Evidence Center shows every requirement and whether an artefact is on file. Attach the file directly to the requirement; the upload is recorded in the audit trail with the person and timestamp.",
      ),
      h2("Retention",
      ),
      p(
        "Retention periods come from the requirements — commonly five years for regulatory records. The data retention settings let administrators align storage with the firm's record-keeping obligations.",
      ),
    ],
  },

  {
    slug: "risk-assessment",
    title: "Risk Assessment",
    description:
      "How obligations are scored and ranked, and how the risk register stays current.",
    updated: UPDATED,
    sections: [
      p(
        "Risk assessment in PRAXIS is objective and reproducible. Each obligation receives a risk score computed from the obligation's own characteristics, and the register ranks every obligation by that score.",
      ),
      h2("What feeds the score",
      ),
      ul([
        "The functional area and its criticality in your firm.",
        "The modification type — whether the obligation is new, amended or informational.",
        "Deadlines and effective dates, including how close they are.",
        "The underlying regulation and its scope.",
        "The obligation's assurance level and status.",
      ]),
      h2("Why it is computed, not guessed",
      ),
      p(
        "A computed score is explainable: you can open an obligation and see why it was ranked the way it was. It also stays consistent — the same obligation under the same circumstances always produces the same result, which matters when a regulator or auditor asks how risk was decided.",
      ),
      h2("The register",
      ),
      p(
        "The Risk Register groups obligations into risk levels from Critical to Minimal, with filters for department, status and level. It is the operational starting point for deciding what to work on first.",
      ),
      h2("Staying current",
      ),
      p(
        "Scores re-compute as the underlying facts change: statuses move, deadlines approach, regulations are revised. The register always reflects the current position, and the same scores drive the risk nodes in the Compliance Map.",
      ),
    ],
  },

  {
    slug: "filing-management",
    title: "Filing Management",
    description:
      "Tracking periodic filings and disclosures to SEBI and other bodies, with deadlines and owners.",
    updated: UPDATED,
    sections: [
      p(
        "Many obligations are periodic: file a report, disclose a change, submit a return. Filing Management tracks these recurring requirements so a deadline is never missed.",
      ),
      h2("Filings in PRAXIS",
      ),
      p(
        "When an obligation implies a filing — a periodic report, a disclosure, an application — it is tracked as a filing with a due date, a responsible owner and a status.",
      ),
      h2("The Filing Tracker",
      ),
      ul([
        "Every filing with its due date and owner.",
        "Status per filing: due, submitted, acknowledged, overdue.",
        "Links back to the obligation and regulation that require it.",
        "A view of upcoming filings so the team can plan ahead.",
      ]),
      h2("Workflow",
      ),
      ol([
        "An approved obligation creates a filing requirement.",
        "The filing appears in the tracker with its deadline.",
        "The owner prepares and submits the filing.",
        "Evidence of submission is attached to the obligation.",
        "The audit trail records the whole sequence.",
      ]),
      h2("Integration",
      ),
      p(
        "Filing deadlines appear on the Calendar alongside task deadlines, and overdue filings surface on the Dashboard so they are visible at the top of the organization.",
      ),
    ],
  },

  {
    slug: "regulatory-watch",
    title: "Regulatory Watch",
    description:
      "Keeping an eye on SEBI publications and news so new instruments reach your compliance team early.",
    updated: UPDATED,
    sections: [
      p(
        "Regulatory Watch monitors public regulatory sources so that new circulars and announcements arrive in PRAXIS without anyone having to check the regulator's website.",
      ),
      h2("Sources",
      ),
      p(
        "Watch supports regulatory feeds and news sources. The SEBI monitor checks the regulator's publication stream for new circulars and announcements relevant to the securities market.",
      ),
      h2("How it works",
      ),
      ol([
        "Configure the sources you want monitored.",
        "PRAXIS checks for new items on a schedule.",
        "New instruments are flagged for review and can be brought straight into the document pipeline.",
        "You can review each hit, mark it relevant or dismiss it.",
      ]),
      h2("From watch to pipeline",
      ),
      p(
        "A new circular found by Watch can be opened and processed like any other document, turning a regulator publication into reviewed obligations in one flow.",
      ),
      h2("Deduplication",
      ),
      p(
        "Instruments already in PRAXIS are recognized, so a circular that arrives via Watch after a manual upload is not processed twice.",
      ),
    ],
  },
];
