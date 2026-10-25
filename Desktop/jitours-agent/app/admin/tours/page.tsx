import { db } from "@/lib/db";
import { TourTable } from "@/components/TourTable";

export const dynamic = "force-dynamic";

export default async function ToursAdminPage() {
  const tours = await db.tour.findMany({ include: { prices: true }, orderBy: { updatedAt: "desc" } });
  return <TourTable tours={tours} />;
}
