import React from "react";
import Link from "next/link";
import { DashboardSummaryView } from "@/components/dashboard/dashboard-summary";

export default function DashboardPage() {
  return (
    <main className="container">
      <h1>Dashboard</h1>
      <p>Resumen con datos reales de tu cuenta.</p>
      <Link href="/">Volver al inicio</Link>
      <DashboardSummaryView />
    </main>
  );
}
