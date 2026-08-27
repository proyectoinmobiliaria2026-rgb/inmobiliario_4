"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password, full_name: fullName })
      });
      const payload = (await response.json()) as { ok: boolean; needsConfirmation?: boolean; reason?: string };
      if (!payload.ok) {
        setError(payload.reason ?? "No se pudo crear la cuenta.");
        return;
      }
      if (payload.needsConfirmation) {
        setNotice("Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.");
        setTimeout(() => router.push("/properties"), 2600);
      } else {
        setNotice("Cuenta creada. Redirigiendo…");
        setTimeout(() => router.push("/account?first=1"), 900);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workbench">
      <div className="card card-pad mx-auto w-full max-w-md">
        <h2 className="panel-title">Crear mi cuenta</h2>
        <p className="panel-subtitle mt-1">Regístrate con tu propio correo y contraseña.</p>

        {error && <div className="notice notice-error mt-4">{error}</div>}
        {notice && <div className="notice mt-4">{notice}</div>}

        <form className="mt-4 form-grid" onSubmit={register}>
          <label className="field sm:col-span-2">
            Nombre completo
            <input className="input" aria-label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="field sm:col-span-2">
            Correo electrónico
            <input className="input" aria-label="Correo electrónico" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field sm:col-span-1">
            Contraseña
            <input className="input" aria-label="Contraseña" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="field sm:col-span-1">
            Confirmar contraseña
            <input className="input" aria-label="Confirmar contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <div className="actions sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={busy}>Crear cuenta</button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/properties" className="font-semibold text-indigo-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </section>
  );
}
