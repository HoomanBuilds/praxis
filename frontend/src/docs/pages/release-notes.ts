import type { DocPage } from "../types";
import { h2, p, ul, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "latest-release",
    title: "Latest Release",
    description:
      "Version 1.0 — the first production release of PRAXIS.",
    updated: UPDATED,
    sections: [
      p(
        "Version 1.0 is the first production release of PRAXIS. It delivers the complete compliance lifecycle — from regulatory document to reviewable obligations, rules, tasks, evidence and regulator-ready audit export.",
      ),
      h2("New features",
      ),
      ul([
        "Document ingestion for PDF, DOCX and text, including very large master circulars.",
        "Obligation identification with verbatim source references and assurance scores.",
        "The human review gate — approve, edit or reject before anything becomes actionable.",
        "Rules, tasks and evidence generation from approved obligations.",
        "Compliance Map with typed nodes, relationships and GraphML export.",
        "Risk Register with objective, explainable risk scoring.",
        "Dashboard with coverage, pending review, overdue work and a live activity feed.",
        "Copilot with answers grounded in your compliance records.",
        "Analytics, filing tracking, calendar, reports and notifications.",
        "Audit Trail with regulator-ready PDF and XLSX exports.",
        "SSO (OpenID Connect), LDAP and role-based access control.",
        "Email, calendar, Slack and Teams integrations, plus a REST API.",
        "Regulatory watch on SEBI publications.",
      ]),
      h2("Improvements over evaluation",
      ),
      ul([
        "Business vocabulary throughout the interface — no engineering jargon.",
        "Compliance Map densified to include obligations and rules.",
        "Animated coverage metric on the Dashboard.",
        "Resilient processing with recovery from long-running work.",
      ]),
      h2("Bug fixes",
      ),
      ul([
        "Stable concurrent processing with the database.",
        "Robust document processing for scanned PDFs.",
        "Correct actor attribution throughout the audit feed.",
      ]),
      h2("Known issues",
      ),
      ul([
        "Document processing of very large scans is slower than text-native PDFs.",
        "Some integration cards require a real external account to complete their connection test.",
      ]),
      h2("Migration notes",
      ),
      p(
        "If you are upgrading from an evaluation build, back up the database and document store before upgrading. The schema migrates automatically on startup.",
      ),
    ],
  },

  {
    slug: "changelog",
    title: "Changelog",
    description:
      "A history of changes to PRAXIS.",
    updated: UPDATED,
    sections: [
      h2("1.0.0 — August 2026",
      ),
      ul([
        "Initial production release.",
        "Full compliance lifecycle, integrations, security and documentation.",
      ]),
      h2("0.9.0 — July 2026",
      ),
      ul([
        "Final evaluation build.",
        "Regulatory watch, filing tracker and compliance map improvements.",
      ]),
      h2("0.8.0 — July 2026",
      ),
      ul([
        "Copilot with grounded answers and citations.",
        "Analytics with coverage and automation metrics.",
      ]),
      h2("0.7.0 — June 2026",
      ),
      ul([
        "Risk register with computed risk scoring.",
        "SSO and LDAP integration.",
      ]),
    ],
  },

  {
    slug: "roadmap",
    title: "Roadmap",
    description:
      "Where PRAXIS is heading next.",
    updated: UPDATED,
    sections: [
      p(
        "The roadmap reflects where the product is going. Timelines are indicative and priorities follow customer feedback.",
      ),
      h2("Next",
      ),
      ul([
        "Deepened Microsoft 365 and Google Workspace integrations.",
        "Templated reports for common regulator formats.",
        "Scheduled review automation with configurable cycles.",
      ]),
      h2("Later",
      ),
      ul([
        "Expanded intermediary coverage beyond the current classes.",
        "Multi-region deployment templates.",
        "Advanced escalation rules and approval delegation.",
      ]),
      h2("Always",
      ),
      p(
        "Honesty in the interface, human control of decisions, and regulatory content that never leaves your boundary.",
      ),
    ],
  },
];
