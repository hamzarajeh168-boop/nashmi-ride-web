import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return <Suspense fallback={<div className="login-loading">Loading sign in…</div>}><LoginForm /></Suspense>;
}
