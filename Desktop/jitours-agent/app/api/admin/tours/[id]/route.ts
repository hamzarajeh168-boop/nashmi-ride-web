import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tourSchema } from "@/lib/schemas";

type Context = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Context) {
  const parsed = tourSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { prices, ...tour } = parsed.data;
  try {
    const saved = await db.$transaction(async (tx) => {
      await tx.tourPrice.deleteMany({ where: { tourId: params.id } });
      return tx.tour.update({
        where: { id: params.id },
        data: { ...tour, prices: { create: prices } },
        include: { prices: true },
      });
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update this tour.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await db.tour.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tour not found." }, { status: 404 });
  }
}
