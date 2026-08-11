import "server-only";

import { timingSafeEqual } from "node:crypto";

function sameSecret(submitted: string, expected: string) {
  const left = Buffer.from(submitted);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function requireFounderBasicAuth(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw Object.assign(new Error("Founder authentication is not configured."), { status: 503 });
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Basic\s+(.+)$/i.exec(authorization);
  if (!match) throw Object.assign(new Error("Founder authentication is required."), { status: 401 });
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const password = separator >= 0 ? decoded.slice(separator + 1) : "";
    if (!sameSecret(password, expected)) throw Object.assign(new Error("Founder authentication was rejected."), { status: 403 });
  } catch (error) {
    if (Number((error as { status?: number }).status)) throw error;
    throw Object.assign(new Error("Founder authentication was rejected."), { status: 403 });
  }
}
