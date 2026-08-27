export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  phone: string;
  company: string;
};

export function isProfileIncomplete(profile: { full_name?: string | null } | null): boolean {
  return !profile || !profile.full_name?.trim();
}

export async function fetchProfile(): Promise<Profile | null> {
  const response = await fetch("/api/auth/session", { credentials: "same-origin" });
  if (!response.ok) return null;
  const payload = (await response.json()) as { ok: boolean; data?: Profile };
  return payload.ok && payload.data ? payload.data : null;
}
