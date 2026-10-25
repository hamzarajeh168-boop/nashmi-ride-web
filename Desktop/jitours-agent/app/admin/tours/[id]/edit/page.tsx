import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { TourEditor } from "@/components/TourEditor";

export const dynamic = "force-dynamic";

export default async function EditTourPage({ params }: { params: { id: string } }) {
  const tour = await db.tour.findUnique({ where: { id: params.id }, include: { prices: true } });
  if (!tour) notFound();
  return <><Link href="/admin/tours" className="admin-back"><ArrowLeft size={15} /> All tours</Link><div className="admin-page-heading"><div><span className="admin-eyebrow">EDIT YOUR ITINERARY</span><h1>{tour.title}</h1><p>Update details for your team and travellers.</p></div></div><TourEditor tour={JSON.parse(JSON.stringify(tour))} /></>;
}
