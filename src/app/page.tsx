import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>CFDIGITAL</h1>
      <p>Fase 10 en progreso: propiedades, leads, publicaciones y scheduler.</p>
      <Link href="/properties">Ir al modulo de propiedades</Link>
      <Link href="/dashboard">Ver dashboard</Link>
      <Link href="/leads">Seguimiento de leads</Link>
      <Link href="/publications">Publicaciones y scheduler</Link>
    </main>
  );
}
