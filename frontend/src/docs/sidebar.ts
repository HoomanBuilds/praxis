import type { DocsNavSection } from "./types";

/** Sidebar structure — section order and page order define prev/next navigation. */
export const DOCS_NAV: DocsNavSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    pages: [
      { slug: "introduction", title: "Introduction" },
      { slug: "installation", title: "Installation" },
      { slug: "system-requirements", title: "System Requirements" },
      { slug: "first-workspace", title: "First Workspace" },
      { slug: "upload-first-circular", title: "Upload Your First Circular" },
      { slug: "quick-tour", title: "Quick Tour" },
    ],
  },
  {
    id: "core-concepts",
    title: "Core Concepts",
    pages: [
      { slug: "organizations", title: "Organizations" },
      { slug: "regulations", title: "Regulations" },
      { slug: "obligations", title: "Obligations" },
      { slug: "evidence", title: "Evidence" },
      { slug: "tasks", title: "Tasks" },
      { slug: "risk-register", title: "Risk Register" },
      { slug: "compliance-graph", title: "Compliance Graph" },
    ],
  },
  {
    id: "compliance-workflow",
    title: "Compliance Workflow",
    pages: [
      { slug: "processing-pipeline", title: "Processing Pipeline" },
      { slug: "document-ingestion", title: "Document Ingestion" },
      { slug: "obligation-detection", title: "Obligation Detection" },
      { slug: "evidence-collection", title: "Evidence Collection" },
      { slug: "risk-assessment", title: "Risk Assessment" },
      { slug: "filing-management", title: "Filing Management" },
      { slug: "regulatory-watch", title: "Regulatory Watch" },
    ],
  },
  {
    id: "modules",
    title: "Modules",
    pages: [
      { slug: "dashboard", title: "Dashboard" },
      { slug: "documents", title: "Documents" },
      { slug: "obligations-module", title: "Obligations" },
      { slug: "evidence-center", title: "Evidence Center" },
      { slug: "tasks-module", title: "Tasks" },
      { slug: "calendar", title: "Calendar" },
      { slug: "filing-tracker", title: "Filing Tracker" },
      { slug: "compliance-map", title: "Compliance Map" },
      { slug: "risk-register-module", title: "Risk Register" },
      { slug: "analytics", title: "Analytics" },
      { slug: "copilot", title: "Copilot" },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    pages: [
      { slug: "users-and-roles", title: "Users & Roles" },
      { slug: "teams", title: "Teams" },
      { slug: "permissions", title: "Permissions" },
      { slug: "notifications", title: "Notifications" },
      { slug: "settings", title: "Settings" },
      { slug: "audit-logs", title: "Audit Logs" },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    pages: [
      { slug: "workflow-rules", title: "Workflow Rules" },
      { slug: "scheduled-reviews", title: "Scheduled Reviews" },
      { slug: "reminders", title: "Reminders" },
      { slug: "escalations", title: "Escalations" },
      { slug: "approval-flows", title: "Approval Flows" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    pages: [
      { slug: "microsoft-365", title: "Microsoft 365" },
      { slug: "google-workspace", title: "Google Workspace" },
      { slug: "email", title: "Email" },
      { slug: "slack", title: "Slack" },
      { slug: "teams", title: "Teams" },
      { slug: "webhooks", title: "Webhooks" },
      { slug: "rest-api", title: "REST API" },
    ],
  },
  {
    id: "developers",
    title: "Developers",
    pages: [
      { slug: "rest-api", title: "REST API" },
      { slug: "webhooks", title: "Webhooks" },
      { slug: "sdk", title: "SDK" },
      { slug: "authentication", title: "Authentication" },
      { slug: "rate-limits", title: "Rate Limits" },
    ],
  },
  {
    id: "deployment",
    title: "Deployment",
    pages: [
      { slug: "cloud", title: "Cloud" },
      { slug: "self-hosted", title: "Self Hosted" },
      { slug: "docker", title: "Docker" },
      { slug: "kubernetes", title: "Kubernetes" },
      { slug: "backup-recovery", title: "Backup & Recovery" },
    ],
  },
  {
    id: "security",
    title: "Security",
    pages: [
      { slug: "authentication-security", title: "Authentication" },
      { slug: "access-control", title: "Access Control" },
      { slug: "encryption", title: "Encryption" },
      { slug: "audit-trail", title: "Audit Trail" },
      { slug: "compliance-standards", title: "Compliance Standards" },
    ],
  },
  {
    id: "reference",
    title: "Reference",
    pages: [
      { slug: "terminology", title: "Terminology" },
      { slug: "status-definitions", title: "Status Definitions" },
      { slug: "error-codes", title: "Error Codes" },
      { slug: "keyboard-shortcuts", title: "Keyboard Shortcuts" },
      { slug: "faq", title: "FAQ" },
    ],
  },
  {
    id: "release-notes",
    title: "Release Notes",
    pages: [
      { slug: "latest-release", title: "Latest Release" },
      { slug: "changelog", title: "Changelog" },
      { slug: "roadmap", title: "Roadmap" },
    ],
  },
];

export const ALL_NAV_PAGES = DOCS_NAV.flatMap((s) => s.pages);
