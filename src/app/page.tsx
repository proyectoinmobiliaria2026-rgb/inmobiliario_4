import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-white via-slate-100 to-slate-300">
        <div className="absolute -top-40 left-1/2 h-96 w-[70rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-300/50 via-red-200/40 to-blue-300/50 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-96 w-96 rounded-full bg-red-200/50 blur-3xl" />
        <div className="absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      </div>

      <div className="grid place-items-center py-10">
        <section className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-slate-950 via-blue-950 to-red-950 px-6 py-12 shadow-xl sm:px-12">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-40"
            style={{ backgroundImage: "url('/images/hero-apartment.svg')" }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/80 via-blue-950/55 to-red-950/30"
          />
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-white ring-1 ring-white/30">CF</span>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Plataforma inmobiliaria</p>
          </div>
          <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">CF Digital</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-100 sm:text-base">
            El expediente de cada propiedad en un solo lugar: datos, fotos, staging, reel, ficha técnica,
            copies con IA y publicación. Sin simulaciones presentadas como terminadas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/properties" className="btn-primary">Crear propiedad</Link>
            <Link href="/dashboard" className="btn-ghost">Ver dashboard</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
