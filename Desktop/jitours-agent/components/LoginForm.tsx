"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, LoaderCircle } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"admin" | "customer">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "customer") setMode("customer");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      router.push(result.redirect);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return <main className="login-page"><div className="login-photo"><div className="login-photo-copy"><span className="eyebrow eyebrow-light">A JOURNEY, YOUR WAY</span><h1>Some places<br />stay with you.</h1><p>Discover the stories, people and landscapes that make Jordan unforgettable.</p><span className="photo-credit">Petra · Jordan</span></div></div><section className="login-side"><Link className="brand login-brand" href="/"><span className="brand-mark"><Compass size={25} /></span><span className="brand-copy"><strong>JORDAN INSPIRATION</strong><small>TOURS · TRAVEL YOUR WAY</small></span></Link><div className="login-card"><span className="eyebrow">WELCOME TO THE JOURNEY</span><h2>{mode === "admin" ? "Team sign in" : "Let’s plan your trip"}</h2><p>{mode === "admin" ? "Access your tour and travel assistant workspace." : "Sign in to your demo traveller account and chat with our travel assistant."}</p><div className="login-tabs" role="tablist" aria-label="Choose account type"><button className={mode === "admin" ? "selected" : ""} onClick={() => { setMode("admin"); setError(""); }} type="button" role="tab" aria-selected={mode === "admin"}>Admin</button><button className={mode === "customer" ? "selected" : ""} onClick={() => { setMode("customer"); setError(""); }} type="button" role="tab" aria-selected={mode === "customer"}>Customer</button></div><form onSubmit={submit} className="login-fields"><label>{mode === "admin" ? "Email" : "Customer email"}<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={mode === "admin" ? "admin@jitours.demo" : "customer@jitours.demo"} /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark login-submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />}{mode === "admin" ? "Sign in to admin" : "Sign in as customer"} <span>→</span></button></form><p className="demo-hint">{mode === "admin" ? "Admin demo credentials are set in the deployment environment." : "Use the demo traveller email and password provided with this demo."}</p><Link href="/" className="back-home">← Back to the tours</Link></div></section></main>;
}
