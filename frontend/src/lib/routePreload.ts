import type { ComponentType } from "react";

type RouteModule = Promise<{ default: ComponentType }>;
type RouteLoader = () => RouteModule;

export const routeLoaders = {
  dashboard: () => import("@/pages/Dashboard"),
  documents: () => import("@/pages/Documents"),
  review: () => import("@/pages/Review"),
  obligations: () => import("@/pages/Obligations"),
  obligationWorkspace: () => import("@/pages/ObligationWorkspace"),
  tasks: () => import("@/pages/Tasks"),
  knowledgeGraph: () => import("@/pages/KnowledgeGraph"),
  copilot: () => import("@/pages/CopilotPage"),
  analytics: () => import("@/pages/Analytics"),
  reports: () => import("@/pages/Reports"),
  auditTrail: () => import("@/pages/AuditTrail"),
  settings: () => import("@/pages/Settings"),
  users: () => import("@/pages/Users"),
  evidence: () => import("@/pages/EvidenceCenter"),
  calendar: () => import("@/pages/Calendar"),
  riskRegister: () => import("@/pages/RiskRegister"),
  firmProfile: () => import("@/pages/FirmProfile"),
  departments: () => import("@/pages/Departments"),
  filings: () => import("@/pages/Filings"),
  apiKeys: () => import("@/pages/ApiKeys"),
  dataRetention: () => import("@/pages/DataRetention"),
  watch: () => import("@/pages/Watch"),
  notifications: () => import("@/pages/Notifications"),
  docsHome: () => import("@/pages/docs/DocsHome"),
  docsPage: () => import("@/pages/docs/DocsPage"),
} satisfies Record<string, RouteLoader>;

const workspaceRoutes: Record<string, RouteLoader> = {
  "/": routeLoaders.dashboard,
  "/documents": routeLoaders.documents,
  "/obligations": routeLoaders.obligations,
  "/tasks": routeLoaders.tasks,
  "/knowledge-graph": routeLoaders.knowledgeGraph,
  "/copilot": routeLoaders.copilot,
  "/analytics": routeLoaders.analytics,
  "/reports": routeLoaders.reports,
  "/audit": routeLoaders.auditTrail,
  "/settings": routeLoaders.settings,
  "/risk-register": routeLoaders.riskRegister,
  "/filings": routeLoaders.filings,
  "/evidence": routeLoaders.evidence,
  "/calendar": routeLoaders.calendar,
  "/watch": routeLoaders.watch,
  "/notifications": routeLoaders.notifications,
};

export function preloadRoute(path: string) {
  return workspaceRoutes[path]?.();
}

export function preloadWorkspaceRoutes() {
  return Promise.allSettled(Object.values(workspaceRoutes).map((load) => load()));
}
