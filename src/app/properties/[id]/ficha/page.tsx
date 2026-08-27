"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AMENITY_LABELS,
  OPERATION_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  RENTAL_REQUIREMENT_LABELS
} from "@/lib/types/property";

type ApiResponse<T> = { ok: boolean; data?: T; reason?: string };

type FichaProperty = {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  operation_type: string;
  status: string;
  folio: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  price_amount: number | null;
  price_currency: string | null;
  amenities: string[] | null;
  rental_requirements: string[] | null;
};

export default function PropertyFichaPage() {
  const params = useParams<{ id: string }>();
  const [property, setProperty] = useState<FichaProperty | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/properties/${params.id}`, { credentials: "same-origin" }).then(async (response) => {
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      const payload = (await response.json()) as ApiResponse<FichaProperty>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo cargar la propiedad");
        return;
      }
      setProperty(payload.data);
    });
  }, [params.id]);

  if (unauthorized) {
    return (
      <div className="card card-pad mx-auto max-w-md text-center">
        <p className="panel-subtitle">Inicia sesión para ver la ficha de la propiedad.</p>
        <Link href="/properties" className="btn-primary mt-3 inline-flex">Ir a iniciar sesión</Link>
      </div>
    );
  }

  if (error) return <div className="notice notice-error">{error}</div>;
  if (!property) return <p className="muted">Cargando ficha...</p>;

  const amenities = property.amenities ?? [];
  const requirements = property.rental_requirements ?? [];
  const features = [
    property.bedrooms ? `${property.bedrooms} recámaras` : null,
    property.bathrooms ? `${property.bathrooms} baños` : null,
    property.parking_spots ? `${property.parking_spots} estacionamiento(s)` : null
  ].filter((item): item is string => item !== null);

  return (
    <div className="print-sheet mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end print:hidden">
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Imprimir / Guardar como PDF
        </button>
        <span className="ml-3 self-center text-xs text-slate-500">Vista imprimible disponible (no es un PDF automático)</span>
      </div>

      <article className="card card-pad">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-red-700 text-sm font-black text-white">CF</span>
            <span className="text-lg font-bold tracking-tight text-slate-900">CF Digital</span>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Ficha de propiedad</p>
            <p>{property.folio ? `Folio ${property.folio}` : ""} · {new Date().toLocaleDateString()}</p>
          </div>
        </header>

        <div className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-draft">{PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type}</span>
            <span className="badge badge-scheduled">{OPERATION_TYPE_LABELS[property.operation_type] ?? property.operation_type}</span>
            <span className={`badge badge-${property.status}`}>{PROPERTY_STATUS_LABELS[property.status] ?? property.status}</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{property.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {[property.address_line, property.city, property.state, property.country].filter(Boolean).join(", ") || "Dirección por definir"}
          </p>
          <p className="mt-3 text-3xl font-black text-slate-900">
            {property.price_amount ? `${property.price_amount.toLocaleString()} ${property.price_currency ?? ""}` : "Precio a consultar"}
          </p>

          {features.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {features.map((feature) => (
                <span key={feature} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">{feature}</span>
              ))}
            </div>
          )}

          {amenities.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Amenidades</h2>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-emerald-600">✓</span> {AMENITY_LABELS[amenity] ?? amenity}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {requirements.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Requisitos de contratación</h2>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {requirements.map((requirement) => (
                  <li key={requirement} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-indigo-600">✓</span> {RENTAL_REQUIREMENT_LABELS[requirement] ?? requirement}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {property.description && (
            <section className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Descripción</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{property.description}</p>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
