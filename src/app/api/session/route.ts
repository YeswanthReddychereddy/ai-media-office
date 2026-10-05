import { NextRequest, NextResponse } from "next/server";
import {
  checkOrigin,
  cookieName,
  makeSession,
  passwordMatches,
  validSession,
} from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let failed = 0,
  windowStart = 0;
export async function GET(req: NextRequest) {
  try {
    checkOrigin(req);
    return NextResponse.json({
      authenticated:
        !process.env.FOUNDER_PASSWORD ||
        validSession(req.cookies.get(cookieName)?.value || ""),
      required: !!process.env.FOUNDER_PASSWORD,
    });
  } catch {
    return NextResponse.json(
      { error: "Loopback access required" },
      { status: 403 },
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req, true);
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      failed = 0;
    }
    if (failed >= 5)
      return NextResponse.json(
        { error: "Too many attempts. Wait one minute." },
        { status: 429 },
      );
    const body = await req.json();
    if (
      typeof body.password !== "string" ||
      body.password.length > 1024 ||
      !passwordMatches(body.password)
    ) {
      failed++;
      return NextResponse.json(
        { error: "Incorrect Founder passphrase" },
        { status: 401 },
      );
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName, makeSession(), {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      path: "/",
      maxAge: 43200,
    });
    failed = 0;
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sign-in failed" },
      { status: 400 },
    );
  }
}
export async function DELETE(req: NextRequest) {
  try {
    checkOrigin(req, true);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(cookieName);
    return res;
  } catch {
    return NextResponse.json(
      { error: "Same-origin access required" },
      { status: 403 },
    );
  }
}
