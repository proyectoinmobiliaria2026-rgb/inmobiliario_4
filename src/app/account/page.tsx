import type { Profile } from "@/lib/auth/profile-client";
import { fetchProfile } from "@/lib/auth/profile-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirst = searchParams.get("first") === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchProfile().then((data) => {
      if (!data) {
        setError("No se pudo cargar tu sesión.");
        return;
      }
      setProfile(data);
      setFullName(data.full_name);
      setPhone(data.phone);
      setCompany(data.company);
    });
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ full_name: fullName, phone, company })
      });
      const payload = (await response.json()) as { ok: boolean; reason?: string };
      if (!payload.ok) {
        setError(payload.reason ?? "No se pudo guardar tu perfil.");
        return;
      }
      setNotice(isFirst ? "¡Perfil listo! Ya puedes usar la plataforma." : "Perfil actualizado.");
      if (isFirst) {
        setTimeout(() => router.push("/"), 900);
      }
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: newPassword })
      });
      const payload = (await response.json()) as { ok: boolean; reason?: string };
      if (!payload.ok) {
        setError(payload.reason ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setNotice("Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <section className="workbench">
        <div className="card card-pad mx-auto w-full max-w-md">
          <h2 className="panel-title">Mi cuenta</h2>
          <p className="panel-subtitle mt-1">{error || "Cargando…"}</p>
          <div className="actions mt-4">
            <Link href="/" className="btn-secondary">Volver al inicio</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="workbench">
      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {isFirst && (
        <div className="card card-pad border-indigo-300 bg-indigo-50">
          <p className="text-sm font-medium text-indigo-800">
            Bienvenido. Completa tus datos de contacto para empezar a usar la plataforma.
          </p>
        </div>
      )}

      <form className="card card-pad" onSubmit={saveProfile} data-testid="profile-form">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="panel-title">Mis datos de contacto</h2>
          <span className="badge badge-new">Perfil</span>
        </div>
        <div className="form-grid">
          <label className="field">
            Nombre completo
            <input className="input" aria-label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="field">
            Teléfono
            <input className="input" aria-label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="field">
            Empresa / Inmobiliaria
            <input className="input" aria-label="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <label className="field">
            Email
            <input className="input bg-slate-50" aria-label="Email" value={profile.email ?? ""} disabled />
          </label>
        </div>
        <div className="actions">
          <button type="submit" className="btn-primary" disabled={busy}>Guardar datos</button>
        </div>
      </form>

      <form className="card card-pad" onSubmit={changePassword} data-testid="password-form">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="panel-title">Cambiar contraseña</h2>
          <span className="badge badge-contacted">Seguridad</span>
        </div>
        <div className="form-grid">
          <label className="field sm:col-span-3">
            Nueva contraseña
            <input className="input" aria-label="Nueva contraseña" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <label className="field sm:col-span-3">
            Confirmar nueva contraseña
            <input className="input" aria-label="Confirmar nueva contraseña" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
        </div>
        <div className="actions">
          <button type="submit" className="btn-primary" disabled={busy}>Actualizar contraseña</button>
        </div>
      </form>
    </section>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="card card-pad">Cargando…</div>}>
      <AccountContent />
    </Suspense>
  );
}
