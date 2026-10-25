import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/PublicLayout";
import { TourCard } from "@/components/TourCards";
import { ChatWidget } from "@/components/ChatExperience";

export const dynamic = "force-dynamic";

type Search = { destination?: string; category?: string; duration?: string };

export default async function ToursPage({ searchParams }: { searchParams: Search }) {
  const duration = searchParams.duration;
  const where = {
    status: "PUBLISHED",
    ...(searchParams.destination ? { destination: searchParams.destination } : {}),
    ...(searchParams.category ? { category: searchParams.category } : {}),
    ...(duration === "1-3" ? { durationDays: { gte: 1, lte: 3 } } : duration === "4-5" ? { durationDays: { gte: 4, lte: 5 } } : duration === "6+" ? { durationDays: { gte: 6 } } : {}),
  };
  const tours = await db.tour.findMany({ where, include: { prices: true }, orderBy: { updatedAt: "desc" } });
  return <><PublicHeader /><main className="catalogue-page"><div className="catalogue-intro"><Link href="/" className="text-link"><ArrowLeft size={15} /> Home</Link><span className="eyebrow">MAKE YOUR WAY THROUGH JORDAN</span><h1>{searchParams.category || "Journeys, your way."}</h1><p>Find the trip that feels like yours. Thoughtful details and local stories, shaped by our team.</p><form className="catalogue-filters" action="/tours"><label>Destination<select name="destination" defaultValue={searchParams.destination || ""}><option value="">Everywhere</option>{["Jordan", "Egypt", "Holy Land", "Saudi Arabia", "Turkey", "Lebanon", "Oman"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Experience<select name="category" defaultValue={searchParams.category || ""}><option value="">All experiences</option>{["Classic", "Small Group", "Private", "Women Only", "Family", "Adventure/Hiking", "Religious", "Multi-Country", "Day Trip"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Duration<select name="duration" defaultValue={duration || ""}><option value="">Any duration</option><option value="1-3">1–3 days</option><option value="4-5">4–5 days</option><option value="6+">6+ days</option></select></label><button className="button button-dark" type="submit">Find a journey <ArrowUpRight size={15} /></button></form></div><section className="catalogue-results"><div className="catalogue-result-heading"><h2>{tours.length} {tours.length === 1 ? "journey" : "journeys"} to explore</h2>{(searchParams.category || searchParams.destination || duration) && <Link href="/tours">Clear filters ×</Link>}</div>{tours.length ? <div className="tour-grid">{tours.map((tour) => <TourCard tour={tour} key={tour.id} />)}</div> : <div className="empty-tours"><h3>No published tours match those filters.</h3><p>Try another destination or ask our assistant to help you find the right trip.</p><Link href="/chat" className="button button-dark">Ask our travel assistant</Link></div>}</section></main><PublicFooter /><ChatWidget /></>;
}
