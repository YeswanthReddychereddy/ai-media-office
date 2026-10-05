import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
const cookieName = "media-office-session";
export { cookieName };
const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
export function checkOrigin(req: NextRequest, mutation = false) {
  const requestUrl = new URL(req.url);
  const host = req.headers.get("host") || "";
  let hostname = "";
  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    throw new Error("Loopback access required");
  }
  if (!localHosts.has(hostname) || !localHosts.has(requestUrl.hostname))
    throw new Error("This studio accepts localhost access only");
  if (mutation) {
    const origin = req.headers.get("origin");
    if (!origin || new URL(origin).host !== host)
      throw new Error("Same-origin access required");
  }
}
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error(
      "Set SESSION_SECRET to at least 32 random characters before enabling sign-in",
    );
  return value;
}
function signature(v: string) {
  return createHmac("sha256", secret()).update(v).digest("hex");
}
function equals(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function makeSession() {
  const value = `${Date.now() + 12 * 60 * 60 * 1000}.${randomBytes(16).toString("hex")}`;
  return `${value}.${signature(value)}`;
}
export function validSession(token: string) {
  try {
    const [expires, nonce, sig] = token.split(".");
    return (
      !!nonce &&
      Number(expires) > Date.now() &&
      equals(sig || "", signature(`${expires}.${nonce}`))
    );
  } catch {
    return false;
  }
}
export function passwordMatches(value: string) {
  return equals(value, process.env.FOUNDER_PASSWORD || "");
}
export function authorize(req: NextRequest) {
  if (
    process.env.FOUNDER_PASSWORD &&
    !validSession(req.cookies.get(cookieName)?.value || "")
  )
    throw new Error("AUTH_REQUIRED");
}
