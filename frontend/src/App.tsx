import { useState } from "react";
import { PortfolioProvider } from "./context/PortfolioContext";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Portfolio } from "./components/Portfolio";
import { StressTest } from "./components/StressTest";
import { RiskExplained } from "./components/RiskExplained";
import type { View } from "./types";

function AppContent() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar currentView={view} onNavigate={setView} />
      <main className="flex-1 overflow-y-auto">
        {view === "dashboard" && <Dashboard />}
        {view === "portfolio" && <Portfolio />}
        {view === "stresstest" && <StressTest />}
        {view === "explained" && <RiskExplained />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}
