import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/context/AuthContext";

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
const Login = lazy(() => import("@/pages/Login"));
const Users = lazy(() => import("@/pages/Users"));
const EvidenceCenter = lazy(() => import("@/pages/EvidenceCenter"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const RiskRegister = lazy(() => import("@/pages/RiskRegister"));
const FirmProfile = lazy(() => import("@/pages/FirmProfile"));
const Departments = lazy(() => import("@/pages/Departments"));
const Filings = lazy(() => import("@/pages/Filings"));
const ApiKeys = lazy(() => import("@/pages/ApiKeys"));
const DataRetention = lazy(() => import("@/pages/DataRetention"));
const Watch = lazy(() => import("@/pages/Watch"));
const Notifications = lazy(() => import("@/pages/Notifications"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }
  return (
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
        </Routes>
      </Suspense>
    </Layout>
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
