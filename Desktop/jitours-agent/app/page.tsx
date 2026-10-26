import Link from "next/link";
import { ArrowUpRight, Compass, HeartHandshake, MapPinned, ShieldCheck, Sparkles, Star, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/PublicLayout";
import { TourCard } from "@/components/TourCards";
import { ChatWidget } from "@/components/ChatExperience";
import { HeroSlider } from "@/components/HeroSlider";
import { T } from "@/components/LocaleProvider";

export const dynamic = "force-dynamic";

const categories = [
  { title: "Classic journeys", category: "Classic", image: "https://images.unsplash.com/photo-1548786811-dd6e453ccca7?auto=format&fit=crop&w=800&q=80" },
  { title: "Small group", category: "Small Group", image: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=800&q=80" },
  { title: "Adventure & hiking", category: "Adventure/Hiking", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80" },
  { title: "Day trips", category: "Day Trip", image: "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=800&q=80" },
];
const destinations = [
  ["Petra", "The rose-red city", "https://images.unsplash.com/photo-1579606032821-4e6161c81bd3?auto=format&fit=crop&w=900&q=80"],
  ["Wadi Rum", "Desert without end", "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=900&q=80"],
  ["Dead Sea", "A world below sea level", "https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=900&q=80"],
  ["Amman", "A city of many stories", "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=900&q=80"],
];

export default async function HomePage() {
  const tours = await db.tour.findMany({ where: { status: "PUBLISHED" }, include: { prices: true }, orderBy: { updatedAt: "desc" }, take: 6 });
  return <><PublicHeader /><main><HeroSlider />
    <section className="section travel-way" id="ways"><div className="section-heading"><div><span className="eyebrow"><T>A JOURNEY FOR EVERY YOU</T></span><h2><T>Travel your way.</T></h2></div><p><T>Go deep, go slow, or find a little bit of everything.</T><br /><T>There’s no wrong way to discover Jordan.</T></p></div><div className="category-grid">{categories.map((item, index) => <Link href={`/tours?category=${encodeURIComponent(item.category)}`} className="category-card" key={item.category}><img src={item.image} alt="" /><span className="category-number">0{index + 1}</span><span className="category-title"><T>{item.title}</T><ArrowUpRight size={17} /></span></Link>)}</div></section>
    <section className="section offers-section" id="tours"><div className="section-heading"><div><span className="eyebrow"><T>MADE FOR THE MOMENTS</T></span><h2><T>Journeys to remember.</T></h2></div><Link href="#tours" className="text-link"><T>Explore all tours</T> <ArrowUpRight size={16} /></Link></div>{tours.length ? <div className="tour-grid">{tours.map((tour) => <TourCard tour={tour} key={tour.id} />)}</div> : <div className="empty-tours"><Compass size={28} /><h3><T>Your next journey is taking shape.</T></h3><p><T>Published tours will appear here. Please check back soon.</T></p></div>}</section>
    <section className="section destinations-section" id="destinations"><div className="section-heading"><div><span className="eyebrow"><T>A LAND OF MANY WORLDS</T></span><h2><T>Where will you wander?</T></h2></div><p><T>From timeless cities to the stillness of the desert,</T><br /><T>let curiosity lead the way.</T></p></div><div className="destination-grid">{destinations.map(([name, desc, image]) => <Link className="destination-card" href="#tours" key={name}><img src={image} alt={name} /><span><small><T>DISCOVER</T></small><strong><T>{name}</T></strong><em><T>{desc}</T></em></span><ArrowUpRight size={19} /></Link>)}</div></section>
    <section className="cta-band"><img src="https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1900&q=85" alt="" /><div><span className="eyebrow eyebrow-light"><T>THE DESERT IS CALLING</T></span><h2><T>Ready for an</T><br /><T>unforgettable trip?</T></h2><p><T>Let’s make it yours, from the first hello to the last sunset.</T></p><Link href="/chat" className="button button-light"><T>Start planning</T> <ArrowUpRight size={16} /></Link></div></section>
    <section className="section why-section" id="about"><div className="section-heading centered"><span className="eyebrow"><T>THE JI TOURS DIFFERENCE</T></span><h2><T>Good travel feels personal.</T></h2><p><T>Thoughtful details. Local connections. Room to be surprised.</T></p></div><div className="why-grid">{[{ icon: <MapPinned />, title: "Local, always", text: "A team on the ground, with a real feel for the places you’ll go." }, { icon: <HeartHandshake />, title: "Made around you", text: "Private and small-group trips shaped around your kind of travel." }, { icon: <ShieldCheck />, title: "Here when it matters", text: "A real local team to help before and during your journey." }, { icon: <Sparkles />, title: "The thoughtful bits", text: "The little details that make an itinerary feel like yours." }, { icon: <Users />, title: "Meet the people", text: "Meaningful moments made possible through local connections." }, { icon: <Wallet />, title: "Clear from the start", text: "Straightforward tour details and transparent starting prices." }].map((item) => <article key={item.title}><span className="why-icon">{item.icon}</span><h3><T>{item.title}</T></h3><p><T>{item.text}</T></p></article>)}</div></section>
    <section className="review-band"><div className="review-stars" aria-label="5 out of 5 stars"><Star /><Star /><Star /><Star /><Star /></div><blockquote>“<T>Jordan felt less like a place we visited and more like a story we became part of.</T>”</blockquote><p>— <T>A traveller’s kind words</T> <span>·</span> <span className="sample-label"><T>Sample testimonial</T></span></p><div className="review-note"><T>Travellers first. Always.</T></div></section>
    <section className="partner-strip"><span><T>TRAVEL WITH TRUST</T></span><strong><T>LOCAL EXPERTS</T></strong><strong><T>THOUGHTFUL JOURNEYS</T></strong><strong><T>YOUR WAY, ALWAYS</T></strong></section></main><PublicFooter /><ChatWidget /></>;
}
