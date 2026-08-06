import type { DocPage } from "../types";
import { h2, p, ul, ol, code, table, note, tip, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "introduction",
    title: "Introduction",
    description:
      "Everything you need to deploy, configure, and operate PRAXIS across your organization.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS is an enterprise compliance platform for firms regulated by SEBI. It ingests regulatory instruments such as circulars, notifications, orders and policies, and turns the text into a working compliance system: discrete obligations, assigned tasks, evidence requirements, risk signals and an audit trail that regulators can trust.",
      ),
      p(
        "The platform is designed for a compliance officer, not a data scientist. Regulation arrives, obligations are identified for review, approved items become rules, tasks and evidence requirements, and the whole chain is tracked from source paragraph to the evidence on file.",
      ),
      h2("What PRAXIS does"),
      ul([
        "Ingests regulatory documents in PDF, DOCX and text form, including large master circulars.",
        "Identifies every discrete compliance obligation with a verbatim source reference.",
        "Puts a human review gate between detection and action — nothing is ever auto-approved.",
        "Maps obligations to departments, tasks, deadlines and evidence requirements.",
        "Maintains a compliance graph showing how regulations, obligations, risks and evidence connect.",
        "Provides a risk register, analytics, filing tracking and a compliance Copilot for questions.",
        "Keeps an append-only audit log with regulator-ready PDF and XLSX exports.",
      ]),
      h2("Who it is for"),
      table(
        ["Role", "What they use PRAXIS for"],
        [
          ["Compliance officers", "Reviewing obligations, approving or rejecting items, managing evidence and filings."],
          ["Operations & legal teams", "Completing assigned tasks and gathering required evidence on deadline."],
          ["Chief compliance officers", "Monitoring risk, coverage and activity across departments and regulations."],
          ["Internal audit & regulators", "Following the audit trail from regulatory text to evidence and decisions."],
          ["IT & administrators", "Managing users, roles, integrations, SSO and system settings."],
        ],
      ),
      h2("How to read this documentation"),
      p(
        "Start with Installation and First Workspace to get PRAXIS running. Read Core Concepts to understand the domain model, then Compliance Workflow for how a circular becomes obligations, tasks and evidence. Modules covers every screen in the product. Administration, Security and Deployment are for the people running the platform.",
      ),
      tip("New to PRAXIS?", "The Quick Tour walks through the main screens in under ten minutes."),
    ],
  },

  {
    slug: "installation",
    title: "Installation",
    description:
      "Deploy PRAXIS on your own infrastructure with Docker, or run the development stack locally.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS ships as a Docker Compose stack for production, and as a local development stack for evaluation and customization. Both run the same core: an API server, a database, a queue and a frontend console.",
      ),
      h2("Prerequisites"),
      ul([
        "Docker and Docker Compose (v2 or later) for containerized deployment.",
        "Node.js 20+ and Python 3.11+ for running from source.",
        "A local analysis engine (Ollama) for analytical document review — see System Requirements.",
        "Network access to download container images and the language model on first run.",
      ]),
      h2("Option 1 — Docker Compose"),
      code(
        "git clone https://github.com/your-org/praxis.git\ncd praxis\ndocker compose up -d",
        "bash",
      ),
      p(
        "This starts the API, frontend, database, queue, and a bundled identity provider. The first launch pulls images and provisions the database; subsequent launches are fast. See Deployment → Docker for the full service list and configuration.",
      ),
      h2("Option 2 — Run from source"),
      code(
        "cd backend\npython -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt\nuvicorn api.main:app --port 8080",
        "bash",
      ),
      code(
        "cd frontend\nnpm install\nnpm run dev",
        "bash",
      ),
      p("The API runs on port 8080 and the frontend on port 5173. Open http://localhost:5173 to sign in."),
      h2("Verify the installation"),
      ul([
        "Open http://localhost:8080/api/health — it returns service status, queue depth and analysis engine availability.",
        "Open http://localhost:5173 and sign in with the default administrator account shown on the login screen.",
        "In Settings, check that the analysis engine shows as online before uploading documents.",
      ]),
      note(
        "Demo credentials",
        "The demo administrator account is admin@praxis.local / admin123. Change this before any production use.",
      ),
    ],
  },

  {
    slug: "infrastructure-requirements",
    title: "Infrastructure Requirements",
    description:
      "Hardware, software and service requirements for running PRAXIS in development and production.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS is a self-hostable platform. The requirements below cover the reference deployment; scale the components to match the size of your regulatory corpus and team.",
      ),
      h2("Software"),
      table(
        ["Component", "Requirement"],
        [
          ["Operating system", "Linux (recommended), macOS or Windows via WSL2"],
          ["Runtime", "Python 3.11+, Node.js 20+"],
          ["Database", "SQLite (local) or PostgreSQL 14+ (production)"],
          ["Queue", "Redis 6+ (background processing)"],
          ["Analysis engine", "Ollama with llama3.1:8b (see note below)"],
          ["Identity provider", "Keycloak 22+ (SSO, optional)"],
          ["Containers", "Docker 24+ with Docker Compose v2"],
        ],
      ),
      h2("Hardware (reference)",
      ),
      table(
        ["Workload", "CPU", "Memory", "Disk"],
        [
          ["Development", "2 cores", "8 GB", "20 GB"],
          ["Small production (< 10k obligations)", "4 cores", "16 GB", "100 GB"],
          ["Large production", "8+ cores", "32 GB", "500 GB+"],
        ],
      ),
      note(
        "Analysis engine sizing",
        "The analytical review of documents runs on a local model, keeping regulatory content inside your boundary. A single GPU workstation or a CPU-only machine with 16 GB RAM is sufficient for typical document volumes.",
      ),
      h2("Network"),
      ul([
        "Outbound access to the SEBI website for regulatory watch and document downloads (optional but recommended).",
        "SMTP access for email notifications if you connect an email provider.",
        "Inbound HTTPS for the frontend and API when exposing PRAXIS to users.",
      ]),
      h2("Browser support"),
      p("PRAXIS supports the current and previous major versions of Chrome, Edge, Firefox and Safari."),
    ],
  },

  {
    slug: "first-workspace",
    title: "First Workspace",
    description:
      "Configure your organization, departments and team before processing your first regulation.",
    updated: UPDATED,
    sections: [
      p(
        "The first time you sign in to PRAXIS, you configure your organization, upload your first regulatory document, and invite team members. Taking a few minutes to configure your workspace correctly makes future compliance tracking much easier.",
      ),
      h2("Create Organization"),
      p(
        "Open Settings → Organization and set your firm name, firm type and the intermediary classes you operate under. PRAXIS uses these to interpret which regulatory instruments apply to you. Intermediary classes are available for the categories SEBI regulates, such as stockbroker, depository participant, investment adviser and portfolio manager.",
      ),
      h2("Configure Departments"),
      p(
        "Departments (functional areas) determine where obligations, tasks and evidence are routed. PRAXIS ships with the standard set — Operations, Technology, Compliance, Legal, Finance, Client Services and Human Resources — and you can add, rename or disable areas. For each department, assign a primary owner and reviewer so tasks and escalations reach the right person.",
      ),
      h2("Upload Your First Circular"),
      p(
        "With your organization configured, upload a circular from the Documents screen. PRAXIS will identify obligations for review. Upload the most representative instrument for your firm type first — for example, the relevant master circular — so the initial review queue reflects your real obligations.",
      ),
      h2("Invite Team Members"),
      p(
        "Open Settings → Users to create accounts and assign roles. Every person who will review obligations, complete tasks, gather evidence or run reports should have an account before real documents are processed. Invite via email, or connect SSO so people sign in with their existing corporate credentials.",
      ),
      h2("Review Dashboard"),
      p(
        "The Dashboard gives a live view of your compliance position: coverage, pending review, overdue tasks and recent activity. Check it after your first processing run to confirm obligations, tasks and evidence were created as expected.",
      ),
      ol([
        "Configure organization and departments.",
        "Upload your first circular and review the obligations it produces.",
        "Invite team members and assign roles.",
        "Confirm the Dashboard reflects real data.",
      ]),
      tip("Start small", "Configure with one circular before scaling up. It is much easier to validate the setup with a single document."),
    ],
  },

  {
    slug: "upload-first-circular",
    title: "Upload First Circular",
    description:
      "From a SEBI circular to a reviewable set of obligations, step by step.",
    updated: UPDATED,
    sections: [
      p(
        "This guide takes a single regulatory circular from upload to a reviewed, approved obligation with tasks and evidence. Plan on ten to fifteen minutes.",
      ),
      h2("1. Upload the document"),
      p("Open the Regulations (Documents) screen and upload a circular in PDF or DOCX. Give it a title and a reference such as the SEBI circular number."),
      h2("2. Processing"),
      p(
        "PRAXIS reads the document, splits it into sections, and identifies obligations — with a verbatim reference for each one. The Processing summary on the document card shows how many sections were read and how many obligations were found. Large master circulars take longer than short notifications.",
      ),
      h2("3. Review the obligations"),
      p(
        "Open the Obligations screen and filter to the new document. Each obligation shows the source text it was drawn from. Review and approve items that are genuine obligations for your firm, edit functional areas or descriptions where needed, and reject anything that does not apply.",
      ),
      h2("4. Generate rules, tasks and evidence"),
      p(
        "Once obligations are approved, run Generate on the document. PRAXIS creates a compliance rule for each approved obligation, assigns tasks to departments with deadlines, and defines the evidence that demonstrates compliance.",
      ),
      h2("5. Track progress"),
      ul([
        "Tasks appear on the Tasks screen and Calendar with owners and deadlines.",
        "Evidence requirements appear in the Evidence Center with required content and retention periods.",
        "The Compliance Map shows the new obligations connected to your departments, tasks and evidence.",
        "The Risk Register ranks the obligations by computed risk.",
      ]),
      h2("6. What to check afterwards"),
      ul([
        "The Dashboard's pending review and overdue counts reflect your new obligations.",
        "No task, rule or evidence requirement exists for anything you did not approve.",
        "The audit trail records every action from upload onward.",
      ]),
      note(
        "Review gate",
        "PRAXIS never creates rules, tasks or evidence from an unapproved obligation. The review step is mandatory, not optional.",
      ),
    ],
  },

  {
    slug: "quick-tour",
    title: "Quick Tour",
    description:
      "A ten-minute walkthrough of the main PRAXIS screens.",
    updated: UPDATED,
    sections: [
      p("This tour visits the core screens once, in the order a compliance officer would naturally use them."),
      h2("Dashboard"),
      p(
        "The Command Center shows your compliance coverage, how many obligations need review, overdue tasks, document counts and a live activity feed of what PRAXIS has done — imports, obligation identification and reviews.",
      ),
      h2("Regulations (Documents)"),
      p("Every regulatory document lives here. Upload circulars, follow processing, and open documents to review the obligations extracted from them."),
      h2("Obligations"),
      p("The review workspace. Approve, edit or reject identified obligations, then assign functional areas. This is the decision point that drives everything downstream."),
      h2("Tasks and Calendar"),
      p("Approved obligations generate tasks with owners and deadlines. Tasks appear on the Calendar with their due dates; overdue items surface on the Dashboard."),
      h2("Evidence Center"),
      p("The required evidence for each obligation — documents, certificates, reports — with retention periods. Attach the artefact that proves compliance."),
      h2("Compliance Map"),
      p("A relationship view of regulations, obligations, departments, tasks, evidence and risks. Filter by document and follow how a change propagates."),
      h2("Risk Register"),
      p("Every obligation ranked by computed risk level, filterable by department and status. This is where you decide what needs attention first."),
      h2("Copilot"),
      p("Ask questions in plain language — about deadlines, obligations, overdue items or a specific circular — and get answers grounded in your compliance records."),
      h2("Analytics and Reports"),
      p("Trends, coverage and activity across the platform, plus regulator-ready audit packages for a document, obligation or the whole firm."),
      h2("Administration"),
      p("Users, roles, departments, integrations, notifications and settings all live under Settings. The Audit Trail under Records is the permanent log of every action."),
    ],
  },
];
