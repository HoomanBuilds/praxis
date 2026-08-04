import type { DocPage } from "../types";
import { h2, p, ul, ol, table, note, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "organizations",
    title: "Organizations",
    description:
      "The top-level entity in PRAXIS — your firm, its intermediary classes and its departments.",
    updated: UPDATED,
    sections: [
      p(
        "An Organization represents your firm in PRAXIS. It carries the firm name, firm type and the SEBI intermediary classes the firm operates under, plus the departments that obligations, tasks and evidence are routed to.",
      ),
      h2("Firm type and intermediary classes"),
      p(
        "The intermediary classes determine how regulatory instruments are interpreted for your firm. When a document is processed, PRAXIS uses the classes to decide which obligations apply. Configure these accurately — they shape what ends up in your review queue.",
      ),
      table(
        ["Class", "Example obligation it drives"],
        [
          ["Stockbroker", "Segregation of client funds, contract note retention"],
          ["Depository participant", "DP registration and compliance reports"],
          ["Investment adviser", "Client segregation, certification, record-keeping"],
          ["Portfolio manager", "Fund management and disclosure requirements"],
        ],
      ),
      h2("Departments"),
      p(
        "Departments are the functional areas of your firm. Each department can have a primary owner and a reviewer, used when tasks are assigned and when escalations need a route. The default set covers the standard compliance organization; rename or add areas to match your firm.",
      ),
      h2("Managing your organization"),
      ul([
        "Organization profile and classes: Settings → Organization.",
        "Departments, owners and reviewers: Settings → Departments.",
        "Only administrators can change organization-level settings.",
      ]),
    ],
  },

  {
    slug: "regulations",
    title: "Regulations",
    description:
      "The regulatory documents — circulars, notifications, orders and policies — that drive your compliance program.",
    updated: UPDATED,
    sections: [
      p(
        "A Regulation is a source document in PRAXIS: a SEBI circular, notification, order, policy or any other instrument that creates obligations for your firm. Regulations are the top of the compliance chain — every obligation, rule, task and evidence item traces back to one.",
      ),
      h2("What makes a regulation"),
      ul([
        "A title and a reference (for example the SEBI circular number).",
        "The source file, stored for download and audit.",
        "A processing record: sections read, text quality, obligations identified.",
        "Version history, so a revised instrument is tracked as an update rather than a duplicate.",
      ]),
      h2("Supported formats"),
      table(
        ["Format", "Notes"],
        [
          ["PDF", "Text layer read directly; poor-quality scans are processed with OCR."],
          ["DOCX", "Microsoft Word documents supported."],
          ["Text", "Plain text files supported."],
        ],
      ),
      h2("Document lifecycle"),
      ol([
        "Upload the document with a title and reference.",
        "Processing identifies sections and obligations for review.",
        "Review obligations, approving, editing or rejecting each one.",
        "Generate rules, tasks and evidence for the approved obligations.",
        "The regulation remains available for revision, re-processing and audit export.",
      ]),
      h2("Revisions and updates"),
      p(
        "When you upload a revised version of an instrument, PRAXIS compares it against the previous version. Unchanged obligations are left untouched; only the changed sections are re-processed. The compliance graph records the relationship between superseded and current obligations.",
      ),
    ],
  },

  {
    slug: "obligations",
    title: "Obligations",
    description:
      "A discrete, trackable compliance requirement drawn from a regulation, with a verbatim source reference.",
    updated: UPDATED,
    sections: [
      p(
        "An Obligation is the core unit of compliance in PRAXIS: a single, trackable requirement extracted from a regulatory document. Each obligation carries the verbatim source text it came from, so an officer can always verify it against the original instrument.",
      ),
      h2("How obligations are created"),
      p(
        "Obligations are identified when a document is processed. Clear mandatory requirements are extracted automatically; requirements that need interpretation are flagged for analytical review. Every obligation is recorded with its source paragraph reference, the functional area it belongs to, and an assurance score.",
      ),
      h2("The review process"),
      ol([
        "Obligations appear in the review queue with their source text and assurance.",
        "The officer approves genuine obligations, edits descriptions or areas, or rejects items that do not apply.",
        "Approved obligations move to pending implementation; rejected items stay on record with the reviewer and reason.",
      ]),
      h2("Lifecycle statuses"),
      table(
        ["Status", "Meaning"],
        [
          ["Pending review", "Identified, waiting for a compliance officer."],
          ["Approved", "Accepted as a genuine obligation for the firm."],
          ["Rejected", "Not applicable; the reviewer and reason are recorded."],
          ["Edited", "Approved with changes to description, area or type."],
          ["Implemented", "Tasks complete and evidence on file."],
        ],
      ),
      h2("Fields on an obligation"),
      ul([
        "Identifier and description in plain language.",
        "Verbatim source text and paragraph reference.",
        "Functional area (department) and modification type.",
        "Assurance score and deadline hint, when present in the source.",
        "Linked prior obligation, when a requirement supersedes an earlier one.",
      ]),
      note(
        "Nothing downstream runs on an unapproved obligation",
        "Rules, tasks and evidence are only generated for approved obligations. The review gate is structural.",
      ),
    ],
  },

  {
    slug: "evidence",
    title: "Evidence",
    description:
      "The artefacts that demonstrate compliance, from policies and reports to certificates and audit files.",
    updated: UPDATED,
    sections: [
      p(
        "Evidence is what proves an obligation has been met. For each approved obligation, PRAXIS defines the evidence that should be collected, what it must contain, who collects it, and how long it must be retained.",
      ),
      h2("Types of evidence"),
      ul([
        "Policies and board-approved documentation.",
        "System reports and logs.",
        "Certificates of completion or registration.",
        "Filing acknowledgements and receipts.",
        "Meeting minutes and sign-off records.",
        "Audit reports and inspection results.",
      ]),
      h2("Evidence requirements"),
      p(
        "Each obligation maps to one or more evidence requirements. A requirement specifies the document type, the required content, the responsible collector and the retention period (for example five years). This makes it clear exactly what demonstrates compliance.",
      ),
      h2("Attaching evidence"),
      p(
        "From the Evidence Center, attach the file that satisfies a requirement. Uploaded evidence is linked to the obligation and recorded in the audit trail with the person who uploaded it and when.",
      ),
      h2("Coverage",
      ),
      p(
        "The Evidence Center shows which requirements still need artefacts. Evidence coverage is one of the signals in Analytics, so management can see where compliance proof is thin across departments and regulations.",
      ),
    ],
  },

  {
    slug: "tasks",
    title: "Tasks",
    description:
      "The assigned work that implements an obligation, with owners, reviewers and deadlines.",
    updated: UPDATED,
    sections: [
      p(
        "A Task is an assigned piece of work that helps implement an approved obligation — for example, drafting a policy, obtaining a certification or setting up a control. Tasks give obligations owners and deadlines.",
      ),
      h2("How tasks are created"),
      p(
        "When a document's approved obligations are generated into rules, each rule is mapped to the departments and workflow of your organization. That produces tasks with a primary owner, a reviewer and a deadline.",
      ),
      h2("Deadlines",
      ),
      p(
        "Deadlines are computed from the effective date in the regulation, with an implementation buffer so work completes before the requirement is live. Where the source states a specific deadline, that verbatim deadline is used.",
      ),
      h2("Dependent tasks",
      ),
      p(
        "Some obligations produce a chain of dependent work. For example, an operational obligation that also needs board-approved documentation creates a dependent approval task. The chain is visible on the obligation and in the compliance graph.",
      ),
      h2("Task fields",
      ),
      table(
        ["Field", "Meaning"],
        [
          ["Title", "The work to be done."],
          ["Primary owner", "The person responsible for completion."],
          ["Reviewer", "The person who signs off."],
          ["Workflow", "The department workflow the task belongs to."],
          ["Deadline", "When the work must be complete."],
          ["Dependency", "Work that must finish first."],
          ["Status", "Open, in progress, complete, overdue."],
        ],
      ),
      h2("Working with tasks",
      ),
      ul([
        "The Tasks screen filters by status, owner and obligation.",
        "Overdue tasks appear on the Dashboard and Calendar.",
        "Completing a task is recorded in the audit trail with the owner and timestamp.",
      ]),
    ],
  },

  {
    slug: "risk-register",
    title: "Risk Register",
    description:
      "Every obligation ranked by computed risk level, so attention goes where it matters first.",
    updated: UPDATED,
    sections: [
      p(
        "The Risk Register ranks every obligation by a computed risk level derived from objective compliance signals — not subjective judgement. It answers the question a compliance team asks constantly: what needs attention first?",
      ),
      h2("How risk is computed",
      ),
      p(
        "Risk is derived deterministically from the obligation's own characteristics and its context in your firm, including the functional area, modification type, deadlines and the underlying regulation. Because the score is computed from objective signals, it is reproducible and explainable.",
      ),
      h2("Risk levels",
      ),
      table(
        ["Level", "Meaning"],
        [
          ["Critical", "Immediate action required — e.g. a deadline within days or a high-impact requirement."],
          ["High", "Priority attention this cycle."],
          ["Medium", "Standard obligation with normal implementation work."],
          ["Low", "Lower-impact or informational requirement."],
          ["Minimal", "Recorded but minimal action expected."],
        ],
      ),
      h2("Using the register",
      ),
      ul([
        "Filter by department, status or risk level.",
        "Open any obligation to see why it was ranked as it was.",
        "The same score drives the risk nodes in the Compliance Map.",
        "Export the register as part of a compliance report.",
      ]),
      h2("Review cycle",
      ),
      p(
        "Risk is re-computed as obligations change — when statuses move, deadlines are set or regulations are revised. The register therefore reflects your current position rather than a static list.",
      ),
    ],
  },

  {
    slug: "compliance-graph",
    title: "Compliance Graph",
    description:
      "A relationship view of regulations, obligations, risks, filings, evidence and departments.",
    updated: UPDATED,
    sections: [
      p(
        "The Compliance Graph connects everything in your compliance program into one navigable picture. Regulations feed obligations; obligations carry risk, drive tasks, produce filings and require evidence; departments and owners are connected throughout.",
      ),
      h2("What the graph shows",
      ),
      ul([
        "Regulations and the obligations they create.",
        "Obligations and the departments that own them.",
        "Obligations and the tasks, filings and evidence they produce.",
        "Risk associated with each obligation.",
        "Relationships between obligations — including when a requirement supersedes an earlier one.",
      ]),
      h2("Nodes",
      ),
      p(
        "The graph uses typed nodes: Regulation, Obligation, Department, Risk, Rule, Task, Owner and Evidence. Each node links to the record behind it, so you can jump from the map to the actual work.",
      ),
      h2("Relationships",
      ),
      table(
        ["Relationship", "Meaning"],
        [
          ["creates", "A regulation creates an obligation."],
          ["is governed by", "An obligation is governed by a regulation."],
          ["is implemented by", "An obligation is implemented by rules and tasks."],
          ["carries risk", "An obligation carries a risk rating."],
          ["is assigned to", "Tasks and obligations are assigned to departments and owners."],
          ["amends", "A revised obligation supersedes an earlier one."],
        ],
      ),
      h2("Filtering",
      ),
      p(
        "Filter the graph by document to see one instrument's footprint, or view the whole firm. Node density controls how much is shown on screen at once.",
      ),
      h2("Dependency analysis",
      ),
      p(
        "When a regulation changes, the graph shows the obligations affected and, from there, the departments, tasks and evidence downstream. This is the fastest way to answer \u201chow does this regulatory change affect us?\u201d.",
      ),
      h2("Export",
      ),
      p(
        "The graph can be exported in GraphML format for external graph tools and documentation.",
      ),
      note(
        "Always consistent",
        "The graph is a projection of the underlying records, so it can never disagree with the audit trail or the obligations screen.",
      ),
    ],
  },
];
