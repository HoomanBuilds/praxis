import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Documents = lazy(() => import("@/pages/Documents"));
const Review = lazy(() => import("@/pages/Review"));
const Obligations = lazy(() => import("@/pages/Obligations"));
const ObligationWorkspace = lazy(() => import("@/pages/ObligationWorkspace"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const KnowledgeGraphPage = lazy(() => import("@/pages/KnowledgeGraph"));
const CopilotPage = lazy(() => import("@/pages/CopilotPage"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Reports = lazy(() => import("@/pages/Reports"));
const AuditTrail = lazy(() => import("@/pages/AuditTrail"));
const Settings = lazy(() => import("@/pages/Settings"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/:id/review" element={<Review />} />
            <Route path="/obligations" element={<Obligations />} />
            <Route path="/obligations/:id" element={<ObligationWorkspace />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/copilot" element={<CopilotPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit" element={<AuditTrail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}
