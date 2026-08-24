import React from "react";
import { PublicationsWorkbench } from "@/components/publications/publications-workbench";

export default function PublicationsPage() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publicaciones y scheduler</h1>
        <p className="panel-subtitle">Programa y publica contenido en redes sociales.</p>
      </header>
      <PublicationsWorkbench />
    </div>
  );
}
