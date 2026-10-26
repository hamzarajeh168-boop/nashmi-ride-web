import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, MessageCircle, X } from "lucide-react";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/PublicLayout";
import { ChatWidget } from "@/components/ChatExperience";
import { T } from "@/components/LocaleProvider";

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
  return <>
    <PublicHeader />
    <main className="detail-page">
      <div className="detail-hero">
        <img src={tour.coverImage} alt={tour.title} /><div className="detail-hero-shade" />
        <div className="detail-hero-content">
          <Link href="/#tours" className="back-link"><ArrowLeft size={15} /> <T>All journeys</T></Link>
          <div className="detail-meta"><span>{tour.destination}</span><span><T>{tour.category}</T></span><span>{tour.durationDays} <T>days</T> · {tour.durationNights} <T>nights</T></span></div>
          <h1>{tour.title}</h1><p>{tour.shortDescription}</p>
          <Link href={`/chat?tour=${tour.slug}`} className="button button-light"><MessageCircle size={16} /> <T>Ask the assistant about this tour</T></Link>
        </div>
      </div>
      <div className="detail-layout">
        <article className="detail-main">
          <div className="detail-section"><span className="eyebrow"><T>THE JOURNEY</T></span><h2><T>A little more about your trip.</T></h2><p className="detail-description">{tour.description}</p>
            <div className="detail-facts"><span><b><T>Destination</T></b>{tour.destination}</span><span><b><T>Places</T></b>{cities.join(" · ")}</span><span><b><T>Hotel class</T></b>{tour.hotelClass}</span><span><b><T>Group size</T></b>{tour.minGroupSize}–{tour.maxGroupSize}</span></div>
          </div>
          {!!gallery.length && <div className="detail-gallery">{gallery.slice(0, 3).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${tour.title} gallery ${index + 1}`} />)}</div>}
          <section className="detail-section"><span className="eyebrow"><T>DAY BY DAY</T></span><h2><T>Your itinerary.</T></h2>
            <div className="itinerary-list">{itinerary.map((day) => <details key={day.day} open={day.day === 1}><summary><span className="day-number"><T>DAY</T> {day.day}</span><strong>{day.title}</strong><span className="accordion-mark">+</span></summary><div className="itinerary-copy"><p>{day.description}</p><div className="itinerary-meta"><span><T>Overnight:</T> {day.overnight}</span><span><T>Meals:</T> {day.meals?.length ? day.meals.join(", ") : <T>Not included</T>}</span></div></div></details>)}</div>
          </section>
          <section className="detail-section"><div className="included-grid"><div><span className="eyebrow"><T>WHAT&apos;S INCLUDED</T></span><h2><T>The good-to-knows.</T></h2>{included.map((item) => <p className="included-item" key={item}><Check size={16} />{item}</p>)}</div><div className="not-included"><span className="eyebrow"><T>NOT INCLUDED</T></span><h2><T>Plan for these.</T></h2>{excluded.map((item) => <p className="included-item" key={item}><X size={15} />{item}</p>)}</div></div></section>
          <section className="detail-section"><span className="eyebrow"><T>BEFORE YOU GO</T></span><h2><T>Practical details.</T></h2><div className="practical-grid"><div><b><T>Start & finish</T></b><p>{tour.startPoint} → {tour.endPoint}</p></div><div><b><T>Available dates</T></b><p>{tour.availableDates}</p></div><div><b><T>Difficulty</T></b><p>{tour.difficulty}</p></div><div><b><T>What to bring</T></b><p>{tour.whatToBring || <T>Ask our team for recommendations.</T>}</p></div><div><b><T>Notes</T></b><p>{tour.practicalNotes || <T>Contact our team for details.</T>}</p></div></div></section>
        </article>
        <aside className="detail-sidebar"><div className="price-box"><span className="eyebrow"><T>YOUR JORDAN STARTS HERE</T></span><p><T>{tour.priceOnRequest ? "Personalised quote" : "Starting from"}</T></p><strong>{tour.priceOnRequest ? <T>Price on request</T> : `${tour.currency} ${tour.prices.length ? Math.min(...tour.prices.map((item) => item.adult)) : "—"}`}</strong><small><T>per adult · varies by group size</T></small><a className="button button-dark" href={`/chat?tour=${tour.slug}`}><T>Ask about this tour</T> <ArrowUpRight size={16} /></a><Link className="whatsapp-link" href={`/chat?tour=${tour.slug}`}><T>Talk to our travel team →</T></Link></div>
          <div className="price-table-wrap"><h3><T>Starting price by group</T></h3>{tour.priceOnRequest ? <p><T>The team will prepare a personalised quote for you.</T></p> : <table className="price-table"><thead><tr><th><T>Travellers</T></th><th><T>Adult</T></th><th><T>Child (6–11)</T></th></tr></thead><tbody>{tour.prices.map((price) => <tr key={price.id}><td>{price.groupSize}</td><td>{tour.currency} {price.adult}</td><td>{tour.currency} {price.child}</td></tr>)}</tbody></table>}{tour.seasonalNote && <p className="season-note">{tour.seasonalNote}</p>}</div>
        </aside>
      </div>
    </main>
    <PublicFooter /><ChatWidget />
  </>;
}
