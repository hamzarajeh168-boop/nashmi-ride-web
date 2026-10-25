import { jwtVerify } from "jose/jwt/verify";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("jitours_session")?.value;
  if (!token) return NextResponse.redirect(new URL("/login?mode=admin", request.url));
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "local-demo-secret-change-before-production");
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") return NextResponse.redirect(new URL("/login?mode=admin", request.url));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login?mode=admin", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
