import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { routeLoaders } from "@/lib/routePreload";

const Dashboard = lazy(routeLoaders.dashboard);
const Documents = lazy(routeLoaders.documents);
const Review = lazy(routeLoaders.review);
const Obligations = lazy(routeLoaders.obligations);
const ObligationWorkspace = lazy(routeLoaders.obligationWorkspace);
const Tasks = lazy(routeLoaders.tasks);
const KnowledgeGraphPage = lazy(routeLoaders.knowledgeGraph);
const CopilotPage = lazy(routeLoaders.copilot);
const Analytics = lazy(routeLoaders.analytics);
const Reports = lazy(routeLoaders.reports);
const AuditTrail = lazy(routeLoaders.auditTrail);
const Settings = lazy(routeLoaders.settings);
const Login = lazy(() => import("@/pages/Login"));
const Landing = lazy(() => import("@/pages/Landing"));
const ProductTour = lazy(() => import("@/pages/ProductTour"));
const Users = lazy(routeLoaders.users);
const EvidenceCenter = lazy(routeLoaders.evidence);
const Calendar = lazy(routeLoaders.calendar);
const RiskRegister = lazy(routeLoaders.riskRegister);
const FirmProfile = lazy(routeLoaders.firmProfile);
const Departments = lazy(routeLoaders.departments);
const Filings = lazy(routeLoaders.filings);
const ApiKeys = lazy(routeLoaders.apiKeys);
const DataRetention = lazy(routeLoaders.dataRetention);
const Watch = lazy(routeLoaders.watch);
const Notifications = lazy(routeLoaders.notifications);
const DocsHome = lazy(routeLoaders.docsHome);
const DocsPage = lazy(routeLoaders.docsPage);

function PageLoader() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <span className="sr-only">Loading page</span>
      <div className="space-y-2" aria-hidden="true">
        <div className="h-7 w-52 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-sm animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl border bg-muted/40" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl border bg-muted/40" aria-hidden="true" />
    </div>
  );
}

function AppLayout() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/docs" element={<DocsHome />} />
        <Route path="/docs/:slug" element={<DocsPage />} />
        <Route path="/docs/*" element={<Navigate to="/docs" replace />} />
        <Route path="/tour" element={<ProductTour />} />

        {isAuthenticated ? (
          <Route element={<AppLayout />}>
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
            <Route path="/settings/users" element={<Users />} />
            <Route path="/settings/firm" element={<FirmProfile />} />
            <Route path="/settings/departments" element={<Departments />} />
            <Route path="/settings/api-keys" element={<ApiKeys />} />
            <Route path="/settings/data" element={<DataRetention />} />
            <Route path="/risk-register" element={<RiskRegister />} />
            <Route path="/filings" element={<Filings />} />
            <Route path="/evidence" element={<EvidenceCenter />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/watch" element={<Watch />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
