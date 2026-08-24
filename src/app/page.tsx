import React from "react";
import Link from "next/link";
import { HomeOverview } from "@/components/home/home-overview";

const SHORTCUTS = [
  {
    href: "/properties",
    title: "Propiedades",
    description: "Administra tu inventario, multimedia y publicación de inmuebles.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    ),
    accent: "from-indigo-500 to-violet-600"
  },
  {
    href: "/leads",
    title: "CRM de Leads",
    description: "Da seguimiento a contactos, estados y próximos recordatorios.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    ),
    accent: "from-sky-500 to-cyan-600"
  },
  {
    href: "/publications",
    title: "Programador de Publicaciones",
    description: "Programa y publica contenido en Facebook, Instagram y WhatsApp.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
    ),
    accent: "from-emerald-500 to-teal-600"
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "KPIs consolidados de propiedades, multimedia y leads.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    ),
    accent: "from-amber-500 to-orange-600"
  }
];

export default function HomePage() {
  return (
    <div className="relative">
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-white via-indigo-50/70 to-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(#c7d2fe_1px,transparent_1px)] [background-size:26px_26px] opacity-50" />
        <div className="absolute -top-40 left-1/2 h-96 w-[70rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-300/50 via-violet-300/40 to-sky-300/50 blur-3xl" />
        <div className="absolute top-1/2 -left-48 h-96 w-96 rounded-full bg-violet-200/50 blur-3xl" />
        <div className="absolute -right-48 bottom-0 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
      </div>

      <div className="grid gap-8">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 px-6 py-10 shadow-xl sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Plataforma inmobiliaria</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">CFDIGITAL</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Gestiona propiedades, nutre tus leads y programa publicaciones en redes sociales desde un solo panel
            profesional.
          </p>
        </section>

      <HomeOverview />

      <section aria-label="Accesos directos">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Módulos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${shortcut.accent} text-white shadow-md`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
                  {shortcut.icon}
                </svg>
              </span>
              <p className="mt-4 font-semibold text-slate-900 group-hover:text-indigo-600">{shortcut.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{shortcut.description}</p>
            </Link>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}
