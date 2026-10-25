import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, MessageCircle, X } from "lucide-react";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/PublicLayout";
import { ChatWidget } from "@/components/ChatExperience";

export const dynamic = "force-dynamic";

function list(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function days(value: unknown): Array<{ day: number; title: string; description: string; overnight: string; meals: string[] }> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { day: number; title: string; description: string; overnight: string; meals: string[] } => !!item && typeof item === "object" && "day" in item);
}

export default async function TourDetailPage({ params }: { params: { slug: string } }) {
  const tour = await db.tour.findUnique({ where: { slug: params.slug }, include: { prices: { orderBy: { groupSize: "asc" } } } });
  if (!tour || tour.status !== "PUBLISHED") notFound();
  const gallery = list(tour.gallery);
  const itinerary = days(tour.itinerary);
  const included = list(tour.included);
  const excluded = list(tour.excluded);
  const cities = list(tour.cities);
  return <><PublicHeader /><main className="detail-page"><div className="detail-hero"><img src={tour.coverImage} alt={tour.title} /><div className="detail-hero-shade" /><div className="detail-hero-content"><Link href="/#tours" className="back-link"><ArrowLeft size={15} /> All journeys</Link><div className="detail-meta"><span>{tour.destination}</span><span>{tour.category}</span><span>{tour.durationDays} days · {tour.durationNights} nights</span></div><h1>{tour.title}</h1><p>{tour.shortDescription}</p><Link href={`/chat?tour=${tour.slug}`} className="button button-light"><MessageCircle size={16} /> Ask the assistant about this tour</Link></div></div>
    <div className="detail-layout"><article className="detail-main"><div className="detail-section"><span className="eyebrow">THE JOURNEY</span><h2>A little more about your trip.</h2><p className="detail-description">{tour.description}</p><div className="detail-facts"><span><b>Destination</b>{tour.destination}</span><span><b>Places</b>{cities.join(" · ")}</span><span><b>Hotel class</b>{tour.hotelClass}</span><span><b>Group size</b>{tour.minGroupSize}–{tour.maxGroupSize}</span></div></div>
      {!!gallery.length && <div className="detail-gallery">{gallery.slice(0, 3).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${tour.title} gallery ${index + 1}`} />)}</div>}
      <section className="detail-section"><span className="eyebrow">DAY BY DAY</span><h2>Your itinerary.</h2><div className="itinerary-list">{itinerary.map((day) => <details key={day.day} open={day.day === 1}><summary><span className="day-number">DAY {day.day}</span><strong>{day.title}</strong><span className="accordion-mark">+</span></summary><div className="itinerary-copy"><p>{day.description}</p><div className="itinerary-meta"><span>Overnight: {day.overnight}</span><span>Meals: {day.meals?.length ? day.meals.join(", ") : "Not included"}</span></div></div></details>)}</div></section>
      <section className="detail-section"><div className="included-grid"><div><span className="eyebrow">WHAT&apos;S INCLUDED</span><h2>The good-to-knows.</h2>{included.map((item) => <p className="included-item" key={item}><Check size={16} />{item}</p>)}</div><div className="not-included"><span className="eyebrow">NOT INCLUDED</span><h2>Plan for these.</h2>{excluded.map((item) => <p className="included-item" key={item}><X size={15} />{item}</p>)}</div></div></section>
      <section className="detail-section"><span className="eyebrow">BEFORE YOU GO</span><h2>Practical details.</h2><div className="practical-grid"><div><b>Start & finish</b><p>{tour.startPoint} → {tour.endPoint}</p></div><div><b>Available dates</b><p>{tour.availableDates}</p></div><div><b>Difficulty</b><p>{tour.difficulty}</p></div><div><b>What to bring</b><p>{tour.whatToBring || "Ask our team for recommendations."}</p></div><div><b>Notes</b><p>{tour.practicalNotes || "Contact our team for details."}</p></div></div></section></article>
      <aside className="detail-sidebar"><div className="price-box"><span className="eyebrow">YOUR JORDAN STARTS HERE</span><p>{tour.priceOnRequest ? "Personalised quote" : "Starting from"}</p><strong>{tour.priceOnRequest ? "Price on request" : `${tour.currency} ${tour.prices.length ? Math.min(...tour.prices.map((item) => item.adult)) : "—"}`}</strong><small>per adult · varies by group size</small><a className="button button-dark" href={`/chat?tour=${tour.slug}`}>Ask about this tour <ArrowUpRight size={16} /></a><Link className="whatsapp-link" href={`/chat?tour=${tour.slug}`}>Talk to our travel team →</Link></div><div className="price-table-wrap"><h3>Starting price by group</h3>{tour.priceOnRequest ? <p>The team will prepare a personalised quote for you.</p> : <table className="price-table"><thead><tr><th>Travellers</th><th>Adult</th><th>Child (6–11)</th></tr></thead><tbody>{tour.prices.map((price) => <tr key={price.id}><td>{price.groupSize}</td><td>{tour.currency} {price.adult}</td><td>{tour.currency} {price.child}</td></tr>)}</tbody></table>}{tour.seasonalNote && <p className="season-note">{tour.seasonalNote}</p>}</div></aside></div></main><PublicFooter /><ChatWidget /></>;
}
