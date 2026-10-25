import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.topic !== "string" || !body.topic.trim() || typeof body?.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "A topic and agent information are required." }, { status: 400 });
  }
  return NextResponse.json(await db.knowledgeItem.create({
    data: { topic: body.topic.trim(), content: body.content.trim(), active: body.active !== false },
  }), { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") {
    return NextResponse.json({ error: "An item ID is required." }, { status: 400 });
  }
  if (typeof body.active === "boolean" && typeof body.topic !== "string" && typeof body.content !== "string") {
    return NextResponse.json(await db.knowledgeItem.update({ where: { id: body.id }, data: { active: body.active } }));
  }
  if (typeof body.topic !== "string" || !body.topic.trim() || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "A topic and agent information are required." }, { status: 400 });
  }
  return NextResponse.json(await db.knowledgeItem.update({
    where: { id: body.id },
    data: { topic: body.topic.trim(), content: body.content.trim() },
  }));
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "An item ID is required." }, { status: 400 });
  await db.knowledgeItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
