import { db } from "@/lib/db";
import { TourTable } from "@/components/TourTable";

export const dynamic = "force-dynamic";

export default async function DayTripsPage() {
  const tours = await db.tour.findMany({ where: { category: "Day Trip" }, include: { prices: true }, orderBy: { updatedAt: "desc" } });
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">SHORT ON TIME, BIG ON WONDER</span><h1>Day trips</h1><p>Manage day trips in the same rich tour catalogue.</p></div></div><TourTable tours={tours} /></>;
}
