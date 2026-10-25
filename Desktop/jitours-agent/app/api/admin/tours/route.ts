import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tourSchema } from "@/lib/schemas";

export async function GET() {
  return NextResponse.json(await db.tour.findMany({ include: { prices: true }, orderBy: { updatedAt: "desc" } }));
}

export async function POST(request: NextRequest) {
  const parsed = tourSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { prices, ...tour } = parsed.data;
  try {
    const saved = await db.tour.create({
      data: { ...tour, prices: { create: prices } },
      include: { prices: true },
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save this tour.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
