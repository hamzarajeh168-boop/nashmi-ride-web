import Link from "next/link";
import { Compass, Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { T } from "@/components/LocaleProvider";

export function PublicHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Jordan Inspiration Tours home">
        <span className="brand-mark"><Compass size={25} /></span>
        <span className="brand-copy"><strong>JORDAN INSPIRATION</strong><small>TOURS · TRAVEL YOUR WAY</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/"><T>Home</T></Link><details className="nav-dropdown"><summary><T>Tours</T></summary><div>{["Classic", "Small Group", "Private", "Women Only", "Family", "Adventure/Hiking", "Religious", "Day Trip"].map((category) => <Link key={category} href={`/tours?category=${encodeURIComponent(category)}`}><T>{category}</T></Link>)}</div></details><Link href="/#destinations"><T>Destinations</T></Link><Link href="/#about"><T>About</T></Link><Link href="/#contact"><T>Contact</T></Link>
      </nav>
      <details className="mobile-nav"><summary aria-label="Open main navigation"><T>Menu</T></summary><nav aria-label="Mobile navigation"><Link href="/"><T>Home</T></Link><Link href="/tours"><T>All tours</T></Link><Link href="/#destinations"><T>Destinations</T></Link><Link href="/#about"><T>About</T></Link><Link href="/#contact"><T>Contact</T></Link></nav></details>
      <div className="header-actions">
        <LanguageSwitcher />
        <Link className="button button-dark button-small" href="/login?mode=customer"><T>Book now</T></Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-grid">
        <div><Link href="/" className="brand footer-brand"><span className="brand-mark"><Compass size={25} /></span><span className="brand-copy"><strong>JORDAN INSPIRATION</strong><small>TOURS · TRAVEL YOUR WAY</small></span></Link><p><T>Local knowledge. Meaningful journeys. Your Jordan, your way.</T></p><div className="socials"><a href="https://instagram.com" aria-label="Instagram"><Instagram size={17} /></a><a href="https://facebook.com" aria-label="Facebook"><Facebook size={17} /></a></div></div>
        <div><h3><T>Explore</T></h3><Link href="/#tours"><T>Our tours</T></Link><Link href="/#destinations"><T>Destinations</T></Link><Link href="/#about"><T>About us</T></Link></div>
        <div><h3><T>Here to help</T></h3><a href="tel:+96265550100"><Phone size={15} /> +962 6 555 0100</a><a href="mailto:hello@jitours.demo"><Mail size={15} /> hello@jitours.demo</a><a href="/chat"><T>Ask our travel assistant</T></a></div>
        <div><h3><T>Find your Jordan</T></h3><Link href="/#destinations"><T>Petra</T></Link><Link href="/#destinations"><T>Wadi Rum</T></Link><Link href="/#destinations"><T>Dead Sea</T></Link><Link href="/#destinations"><T>Amman</T></Link></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Jordan Inspiration Tours · Demo experience</span><span><MapPin size={14} /> <T>Amman</T>, Jordan</span></div>
    </footer>
  );
}
