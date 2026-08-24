export const ACCESS_TOKEN_COOKIE = "cfd_access_token";
export const REFRESH_TOKEN_COOKIE = "cfd_refresh_token";

function resolveSecureFlag(): boolean {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === "true";
  }
  return process.env.NODE_ENV === "production";
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  get secure() {
    return resolveSecureFlag();
  },
  path: "/"
};
