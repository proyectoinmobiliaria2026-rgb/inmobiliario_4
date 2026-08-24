import React from "react";
import { LeadsWorkbench } from "@/components/leads/leads-workbench";

export default function LeadsPage() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM de Leads</h1>
        <p className="panel-subtitle">Organiza contactos, estados y próximos seguimientos.</p>
      </header>
      <LeadsWorkbench />
    </div>
  );
}
