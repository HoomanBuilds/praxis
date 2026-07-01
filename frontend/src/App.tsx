import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import Review from "@/pages/Review";
import Obligations from "@/pages/Obligations";
import ObligationWorkspace from "@/pages/ObligationWorkspace";
import Tasks from "@/pages/Tasks";
import KnowledgeGraphPage from "@/pages/KnowledgeGraph";
import CopilotPage from "@/pages/CopilotPage";
import Analytics from "@/pages/Analytics";
import Reports from "@/pages/Reports";
import AuditTrail from "@/pages/AuditTrail";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Layout>
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
    </Layout>
  );
}
