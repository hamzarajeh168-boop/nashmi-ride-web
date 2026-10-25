"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpenCheck, Building2, Compass, LifeBuoy, LogOut, MessageSquareText, Settings2, ShieldCheck, Sparkles, Ticket } from "lucide-react";

const nav = [
  { href: "/admin", title: "Dashboard", icon: BarChart3 },
  { href: "/admin/tours", title: "Tours", icon: Ticket },
  { href: "/admin/day-trips", title: "Day trips", icon: Compass },
  { href: "/admin/faqs", title: "FAQs & policies", icon: LifeBuoy },
  { href: "/admin/company", title: "Company info", icon: Building2 },
  { href: "/admin/knowledge", title: "Agent knowledge", icon: BookOpenCheck },
  { href: "/admin/agent", title: "Agent settings", icon: Settings2 },
  { href: "/admin/chat-logs", title: "Chat logs", icon: MessageSquareText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login?mode=admin");
    router.refresh();
  }
  return <div className="admin-app"><aside className="admin-sidebar"><Link className="admin-logo" href="/"><span className="admin-logo-symbol"><Compass size={22} /></span><span><b>JI TOURS</b><small>TRAVEL STUDIO</small></span></Link><div className="sidebar-label">WORKSPACE</div><nav>{nav.map(({ href, title, icon: Icon }) => <Link href={href} key={href} className={`admin-nav-link${pathname === href || href !== "/admin" && pathname.startsWith(href) ? " active" : ""}`}><Icon size={18} /><span>{title}</span>{title === "Agent knowledge" && <Sparkles size={13} className="nav-spark" />}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-support"><span className="support-icon"><ShieldCheck size={17} /></span><span><b>Your data stays yours</b><small>Knowledge is managed by your team.</small></span></div><Link href="/" className="view-site-link"><Compass size={16} /> View public site <span>↗</span></Link></div></aside><div className="admin-main"><header className="admin-topbar"><div><span className="admin-top-label">JORDAN INSPIRATION TOURS</span><span className="admin-breadcrumb"> / Admin</span></div><div className="admin-user"><span className="admin-avatar">A</span><span><b>Admin</b><small>Administrator</small></span><button className="logout-button" onClick={logout} title="Log out" aria-label="Log out"><LogOut size={17} /></button></div></header><main className="admin-content">{children}</main></div></div>;
}
