import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const company = await db.companyInfo.findUnique({ where: { id: "company" }, select: { whatsapp: true } });
  const agent = await db.agentSettings.findUnique({ where: { id: "agent" }, select: { name: true, whatsapp: true } });
  return NextResponse.json({
    whatsapp: agent?.whatsapp || company?.whatsapp || "",
    agentName: agent?.name || "Jordan Inspiration Tours",
  });
}
