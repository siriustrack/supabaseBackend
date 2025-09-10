export function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return e.length ? e : null;
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D+/g, "");
  return digits.length ? digits : null;
}

export function normalizeDocument(doc?: string | null): string | null {
  if (!doc || typeof doc !== "string") return null;
  const digits = doc.replace(/\D+/g, "");
  return digits.length ? digits : null;
}
