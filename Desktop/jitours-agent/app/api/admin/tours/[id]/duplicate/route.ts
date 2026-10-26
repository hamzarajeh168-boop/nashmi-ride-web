import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

function asInputJson(value: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const source = await db.tour.findUnique({ where: { id: params.id }, include: { prices: true } });
  if (!source) return NextResponse.json({ error: "Tour not found." }, { status: 404 });
  const { id, createdAt, updatedAt, prices, ...data } = source;
  const copy = await db.tour.create({
    data: {
      ...data,
      cities: asInputJson(data.cities),
      gallery: asInputJson(data.gallery),
      itinerary: asInputJson(data.itinerary),
      included: asInputJson(data.included),
      excluded: asInputJson(data.excluded),
      translations: asInputJson(data.translations),
      title: `${source.title} (copy)`,
      slug: `${source.slug}-copy-${Date.now().toString(36)}`,
      status: "DRAFT",
      isSample: false,
      prices: { create: prices.map(({ id: _id, tourId: _tourId, ...price }) => price) },
    },
  });
  return NextResponse.json(copy, { status: 201 });
}
