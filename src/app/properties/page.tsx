import React from "react";
import Link from "next/link";
import { PropertiesWorkbench } from "@/components/properties/properties-workbench";

export default function PropertiesPage() {
  return (
    <main className="container">
      <h1>Propiedades</h1>
      <p>Administra tus propiedades y su multimedia.</p>
      <Link href="/">Volver al inicio</Link>
      <PropertiesWorkbench />
    </main>
  );
}
