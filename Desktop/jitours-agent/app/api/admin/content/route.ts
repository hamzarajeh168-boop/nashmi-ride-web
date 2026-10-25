import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptAiApiKey } from "@/lib/ai-key";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("section") === "conversations") {
    const conversations = await db.conversation.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
    return NextResponse.json({ conversations });
  }
  const [faqs, company, agent, knowledge, aiSettings] = await Promise.all([
    db.fAQ.findMany({ orderBy: [{ topic: "asc" }, { sortOrder: "asc" }] }),
    db.companyInfo.findUnique({ where: { id: "company" } }),
    db.agentSettings.findUnique({ where: { id: "agent" } }),
    db.knowledgeItem.findMany({ orderBy: { updatedAt: "desc" } }),
    db.aiSettings.findUnique({ where: { id: "ai" } }),
  ]);
  return NextResponse.json({
    faqs, company, agent, knowledge,
    adminAiKeyConfigured: Boolean(aiSettings?.encryptedApiKey),
    environmentAiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !["faqs", "company", "agent"].includes(body.section)) {
    return NextResponse.json({ error: "Choose a valid content section." }, { status: 400 });
  }
  if (body.section === "faqs") {
    if (!Array.isArray(body.items)) return NextResponse.json({ error: "FAQs must be a list." }, { status: 400 });
    const entries = body.items.filter((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return typeof record.topic === "string" && record.topic.trim() && typeof record.question === "string" && record.question.trim() && typeof record.answer === "string" && record.answer.trim();
    });
    await db.$transaction([
      db.fAQ.deleteMany(),
      db.fAQ.createMany({ data: entries.map((item: { topic: string; question: string; answer: string }, index: number) => ({ topic: item.topic, question: item.question, answer: item.answer, sortOrder: index })) }),
    ]);
    return NextResponse.json({ ok: true });
  }
  if (!body.values || typeof body.values !== "object") return NextResponse.json({ error: "Values are required." }, { status: 400 });
  const values = body.values as Record<string, unknown>;
  if (body.section === "company") {
    const data = Object.fromEntries(["name", "about", "phone", "whatsapp", "email", "address", "officeHours", "bookingSteps", "cancellationPolicy"].map((key) => [key, String(values[key] ?? "")]));
    return NextResponse.json(await db.companyInfo.upsert({ where: { id: "company" }, create: { id: "company", ...data }, update: data }));
  }
  const data = {
    name: String(values.name ?? ""),
    greeting: String(values.greeting ?? ""),
    tone: values.tone === "formal" ? "formal" : "friendly",
    replyLength: values.replyLength === "detailed" ? "detailed" : "short",
    handoverMessage: String(values.handoverMessage ?? ""),
    whatsapp: String(values.whatsapp ?? ""),
    collectLeadDetails: values.collectLeadDetails === true,
  };
  const apiKey = typeof values.aiApiKey === "string" ? values.aiApiKey.trim() : "";
  if (apiKey.length > 500) return NextResponse.json({ error: "The AI API key is too long." }, { status: 400 });
  try {
    const encryptedApiKey = apiKey && values.clearAiApiKey !== true ? encryptAiApiKey(apiKey) : null;
    await db.agentSettings.upsert({ where: { id: "agent" }, create: { id: "agent", ...data }, update: data });
    let aiSettings = await db.aiSettings.findUnique({ where: { id: "ai" } });
    if (values.clearAiApiKey === true) {
      aiSettings = await db.aiSettings.upsert({
        where: { id: "ai" }, create: { id: "ai", encryptedApiKey: null }, update: { encryptedApiKey: null },
      });
    } else if (apiKey) {
      aiSettings = await db.aiSettings.upsert({
        where: { id: "ai" }, create: { id: "ai", encryptedApiKey },
        update: { encryptedApiKey },
      });
    }
    return NextResponse.json({
      ok: true,
      adminAiKeyConfigured: Boolean(aiSettings?.encryptedApiKey),
      environmentAiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save agent settings." }, { status: 500 });
  }
}
