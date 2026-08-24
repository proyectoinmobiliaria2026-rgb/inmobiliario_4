import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CFDIGITAL · Plataforma inmobiliaria",
  description: "SaaS inmobiliario: propiedades, CRM de leads y publicaciones en redes sociales."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          CFDIGITAL · Plataforma de marketing inmobiliario
        </footer>
      </body>
    </html>
  );
}
