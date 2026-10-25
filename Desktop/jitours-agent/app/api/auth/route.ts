import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const mode = body?.mode === "customer" ? "customer" : "admin";
  const email = String(body?.email || "").trim().toLowerCase();
  if (mode === "admin") {
    const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json({ error: "Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD." }, { status: 503 });
    }
    if (email !== expectedEmail || body?.password !== expectedPassword) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
  } else {
    const expectedEmail = process.env.CUSTOMER_EMAIL?.trim().toLowerCase();
    const expectedPassword = process.env.CUSTOMER_PASSWORD;
    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json({ error: "Customer demo credentials are not configured." }, { status: 503 });
    }
    if (email !== expectedEmail || body?.password !== expectedPassword) {
      return NextResponse.json({ error: "Customer email or password is incorrect." }, { status: 401 });
    }
  }

  const token = await createSession(mode, email);
  const response = NextResponse.json({ ok: true, redirect: mode === "admin" ? "/admin" : "/chat" });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
