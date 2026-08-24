import React from "react";
import { DashboardSummaryView } from "@/components/dashboard/dashboard-summary";

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="panel-subtitle">Resumen con datos reales de tu cuenta.</p>
      </header>
      <DashboardSummaryView />
    </div>
  );
}
