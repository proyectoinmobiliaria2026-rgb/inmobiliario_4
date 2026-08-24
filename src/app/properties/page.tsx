import React from "react";
import { PropertiesWorkbench } from "@/components/properties/properties-workbench";

export default function PropertiesPage() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Propiedades</h1>
        <p className="panel-subtitle">Inventario, multimedia y contenido con IA para cada inmueble.</p>
      </header>
      <PropertiesWorkbench />
    </div>
  );
}
