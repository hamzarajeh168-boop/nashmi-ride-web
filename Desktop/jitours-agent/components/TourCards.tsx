import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { T } from "@/components/LocaleProvider";

type Tour = {
  id: string; title: string; slug: string; destination: string; cities: unknown; category: string;
  durationDays: number; shortDescription: string; coverImage: string; priceOnRequest: boolean;
  currency: string; prices: Array<{ adult: number }>;
};

export function TourCard({ tour }: { tour: Tour }) {
  const startingPrice = tour.prices.length ? Math.min(...tour.prices.map((price) => price.adult)) : null;
  return <article className="tour-card"><Link href={`/tours/${tour.slug}`} className="tour-image"><img src={tour.coverImage} alt={tour.title} /><span className="image-label"><T>{tour.category}</T></span></Link><div className="tour-card-body"><div className="tour-card-meta"><span>{tour.durationDays} <T>days</T></span><span>·</span><span>{tour.destination}</span></div><h3><Link href={`/tours/${tour.slug}`}>{tour.title}</Link></h3><p>{tour.shortDescription}</p><div className="tour-card-features"><span><Check size={14} /> <T>Local expertise</T></span><span><Check size={14} /> <T>Made for you</T></span></div><div className="tour-card-bottom"><div><small><T>{tour.priceOnRequest ? "Personalised quote" : "Starting from"}</T></small><strong><T>{tour.priceOnRequest ? "Price on request" : `${tour.currency} ${startingPrice ?? "—"}`}</T></strong></div><Link href={`/tours/${tour.slug}`} className="circle-link" aria-label={`Explore ${tour.title}`}><ArrowUpRight size={19} /></Link></div></div></article>;
}

export function Price({ currency, amount }: { currency: string; amount: number | null }) {
  return <>{amount === null ? "Price on request" : `${currency} ${amount}`}</>;
}
