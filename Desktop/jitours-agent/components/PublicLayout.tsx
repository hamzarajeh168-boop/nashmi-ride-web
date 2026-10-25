import Link from "next/link";
import { Compass, Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function PublicHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Jordan Inspiration Tours home">
        <span className="brand-mark"><Compass size={25} /></span>
        <span className="brand-copy"><strong>JORDAN INSPIRATION</strong><small>TOURS · TRAVEL YOUR WAY</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/">Home</Link><details className="nav-dropdown"><summary>Tours</summary><div>{["Classic", "Small Group", "Private", "Women Only", "Family", "Adventure/Hiking", "Religious", "Day Trip"].map((category) => <Link key={category} href={`/tours?category=${encodeURIComponent(category)}`}>{category}</Link>)}</div></details><Link href="/#destinations">Destinations</Link><Link href="/#about">About</Link><Link href="/#contact">Contact</Link>
      </nav>
      <details className="mobile-nav"><summary aria-label="Open main navigation">Menu</summary><nav aria-label="Mobile navigation"><Link href="/">Home</Link><Link href="/tours">All tours</Link><Link href="/#destinations">Destinations</Link><Link href="/#about">About</Link><Link href="/#contact">Contact</Link></nav></details>
      <div className="header-actions">
        <LanguageSwitcher />
        <Link className="button button-dark button-small" href="/login?mode=customer">Book now</Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-grid">
        <div><Link href="/" className="brand footer-brand"><span className="brand-mark"><Compass size={25} /></span><span className="brand-copy"><strong>JORDAN INSPIRATION</strong><small>TOURS · TRAVEL YOUR WAY</small></span></Link><p>Local knowledge. Meaningful journeys. Your Jordan, your way.</p><div className="socials"><a href="https://instagram.com" aria-label="Instagram"><Instagram size={17} /></a><a href="https://facebook.com" aria-label="Facebook"><Facebook size={17} /></a></div></div>
        <div><h3>Explore</h3><Link href="/#tours">Our tours</Link><Link href="/#destinations">Destinations</Link><Link href="/#about">About us</Link></div>
        <div><h3>Here to help</h3><a href="tel:+96265550100"><Phone size={15} /> +962 6 555 0100</a><a href="mailto:hello@jitours.demo"><Mail size={15} /> hello@jitours.demo</a><a href="/chat">Ask our travel assistant</a></div>
        <div><h3>Find your Jordan</h3><Link href="/#destinations">Petra</Link><Link href="/#destinations">Wadi Rum</Link><Link href="/#destinations">Dead Sea</Link><Link href="/#destinations">Amman</Link></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Jordan Inspiration Tours · Demo experience</span><span><MapPin size={14} /> Amman, Jordan</span></div>
    </footer>
  );
}
