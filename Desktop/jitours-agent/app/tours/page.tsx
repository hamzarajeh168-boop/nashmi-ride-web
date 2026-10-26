import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { PublicHeader, PublicFooter } from "@/components/PublicLayout";
import { TourCard } from "@/components/TourCards";
import { ChatWidget } from "@/components/ChatExperience";
import { T } from "@/components/LocaleProvider";

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
  return <><PublicHeader /><main className="catalogue-page"><div className="catalogue-intro"><Link href="/" className="text-link"><ArrowLeft size={15} /> <T>Home</T></Link><span className="eyebrow"><T>MAKE YOUR WAY THROUGH JORDAN</T></span><h1>{searchParams.category ? <T>{searchParams.category}</T> : <T>Journeys, your way.</T>}</h1><p><T>Find the trip that feels like yours. Thoughtful details and local stories, shaped by our team.</T></p><form className="catalogue-filters" action="/tours"><label><T>Destination</T><select name="destination" defaultValue={searchParams.destination || ""}><option value=""><T>Everywhere</T></option>{["Jordan", "Egypt", "Holy Land", "Saudi Arabia", "Turkey", "Lebanon", "Oman"].map((item) => <option key={item}>{item}</option>)}</select></label><label><T>Experience</T><select name="category" defaultValue={searchParams.category || ""}><option value=""><T>All experiences</T></option>{["Classic", "Small Group", "Private", "Women Only", "Family", "Adventure/Hiking", "Religious", "Multi-Country", "Day Trip"].map((item) => <option key={item} value={item}><T>{item}</T></option>)}</select></label><label><T>Duration</T><select name="duration" defaultValue={duration || ""}><option value=""><T>Any duration</T></option><option value="1-3"><T>1–3 days</T></option><option value="4-5"><T>4–5 days</T></option><option value="6+"><T>6+ days</T></option></select></label><button className="button button-dark" type="submit"><T>Find a journey</T> <ArrowUpRight size={15} /></button></form></div><section className="catalogue-results"><div className="catalogue-result-heading"><h2>{tours.length} {tours.length === 1 ? <T>journey</T> : <T>journeys</T>} <T>to explore</T></h2>{(searchParams.category || searchParams.destination || duration) && <Link href="/tours"><T>Clear filters ×</T></Link>}</div>{tours.length ? <div className="tour-grid">{tours.map((tour) => <TourCard tour={tour} key={tour.id} />)}</div> : <div className="empty-tours"><h3><T>No published tours match those filters.</T></h3><p><T>Try another destination or ask our assistant to help you find the right trip.</T></p><Link href="/chat" className="button button-dark"><T>Ask our travel assistant</T></Link></div>}</section></main><PublicFooter /><ChatWidget /></>;
}
