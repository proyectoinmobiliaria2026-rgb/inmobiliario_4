"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionUser = { id: string; email: string | null };

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Propiedades" },
  { href: "/leads", label: "Leads" },
  { href: "/publications", label: "Publicaciones" }
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void fetch("/api/auth/session", { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as { ok: boolean; data?: SessionUser };
      if (payload.ok && payload.data) setUser(payload.data);
    });
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
    router.refresh();
  }

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white shadow-lg shadow-indigo-500/30">
            CF
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            CFDIGITAL
            <span className="ml-2 hidden rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 sm:inline">
              Inmobiliaria SaaS
            </span>
          </span>
        </Link>

        <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-none sm:mx-0 sm:w-auto sm:pb-0">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden items-center gap-2.5 rounded-full border border-slate-700 bg-slate-800/80 py-1 pl-1 pr-3 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-bold text-white">
                  {initial}
                </span>
                <span className="max-w-40 truncate text-xs font-medium text-slate-200">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/properties"
              className="rounded-lg bg-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400"
            >
              Acceder
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
