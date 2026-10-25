import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TourEditor } from "@/components/TourEditor";

export default function NewTourPage() {
  return <><Link href="/admin/tours" className="admin-back"><ArrowLeft size={15} /> All tours</Link><div className="admin-page-heading"><div><span className="admin-eyebrow">A NEW JOURNEY</span><h1>Create a tour</h1><p>Complete tour details also help your travel assistant answer questions accurately.</p></div></div><TourEditor /></>;
}
