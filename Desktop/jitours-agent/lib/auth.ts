import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "jitours_session";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be configured.");
  return new TextEncoder().encode(value || "local-demo-secret-change-before-production");
}

export async function createSession(role: "admin" | "customer", email: string) {
  return new SignJWT({ role, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "admin" && payload.role !== "customer") return null;
    return { role: payload.role, email: String(payload.email || "") };
  } catch {
    return null;
  }
}
