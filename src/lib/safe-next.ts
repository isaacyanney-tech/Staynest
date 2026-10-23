/**
 * Returns a same-site path to send someone to after signing in, or null.
 * Rejects absolute URLs, protocol-relative URLs and backslash tricks so the
 * ?next= parameter cannot be used as an open redirect.
 */
export function safeNext(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(v) || v.length > 500) return null;
  return v;
}
