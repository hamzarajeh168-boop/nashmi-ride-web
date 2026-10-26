// Translates published tour content into the site languages with Claude and stores it in Tour.translations.
// Only missing or outdated translations are sent, so re-running is cheap.
//   npm run translate:tours                titles + short descriptions, all languages
//   npm run translate:tours -- --full      also descriptions, itineraries, inclusions and notes
//   npm run translate:tours -- --lang=ar --slug=5-day-classic-jordan-tour
import { Prisma, PrismaClient } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";
import { createAiClient } from "../lib/ai-client";
import { fullHash, fullSource, summaryHash, summarySource, tourLanguages, type StoredTranslation, type TourLanguage } from "../lib/tour-i18n";

const db = new PrismaClient();
const arg = (name: string) => process.argv.find((item) => item.startsWith(`--${name}=`))?.split("=")[1];
const full = process.argv.includes("--full");
const languages = (arg("lang")?.split(",") || tourLanguages) as TourLanguage[];
const names: Record<TourLanguage, string> = { ar: "Modern Standard Arabic", es: "Spanish", de: "German", fr: "French", it: "Italian" };

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("Set ANTHROPIC_API_KEY to translate tours.");
const { client, model } = createAiClient(apiKey);

const saveTool: Anthropic.Tool = {
  name: "save_translation",
  description: "Save the translated JSON. It must have exactly the same structure, keys and array lengths as the input.",
  input_schema: { type: "object", properties: { translation: { type: "object" } }, required: ["translation"] },
};

async function translate(language: TourLanguage, input: unknown) {
  const response = await client.messages.create({
    model, max_tokens: 8000, thinking: { type: "disabled" }, tools: [saveTool], tool_choice: { type: "auto" },
    system: `You translate tour content for a travel company's website from English into ${names[language]}. Translate every string value; keep JSON keys, slugs, numbers, prices, "US$", hotel names, the "·" separators and line breaks unchanged. Use the usual ${names[language]} names for places (e.g. Petra, Wadi Rum, Dead Sea). Always answer by calling save_translation once.`,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });
  const call = response.content.find((part) => part.type === "tool_use");
  const output = call && call.type === "tool_use" ? (call.input as { translation?: unknown }).translation : undefined;
  if (!output || typeof output !== "object") throw new Error(`No translation returned (${response.stop_reason}).`);
  return output as Record<string, unknown>;
}

async function main() {
  const slug = arg("slug");
  const tours = await db.tour.findMany({ where: { status: "PUBLISHED", ...(slug ? { slug } : {}) }, orderBy: { slug: "asc" } });
  const stored = new Map(tours.map((tour) => [tour.id, { ...(tour.translations as Record<string, StoredTranslation>) }]));
  let calls = 0;
  for (const language of languages) {
    // Titles and short descriptions go in batches of 15 tours per request.
    const pending = tours.filter((tour) => stored.get(tour.id)?.[language]?.summaryHash !== summaryHash(tour));
    for (let start = 0; start < pending.length; start += 15) {
      const batch = pending.slice(start, start + 15);
      const result = await translate(language, Object.fromEntries(batch.map((tour) => [tour.slug, summarySource(tour)])));
      calls += 1;
      for (const tour of batch) {
        const item = result[tour.slug] as { title?: string; shortDescription?: string } | undefined;
        if (!item?.title) { console.warn(`  ${language} ${tour.slug}: missing in reply, will retry next run`); continue; }
        const entries = stored.get(tour.id)!;
        entries[language] = { ...entries[language], title: item.title, shortDescription: item.shortDescription || "", summaryHash: summaryHash(tour) };
      }
      console.log(`${language}: titles ${Math.min(start + 15, pending.length)}/${pending.length}`);
    }
    if (!full) continue;
    for (const tour of tours) {
      const entries = stored.get(tour.id)!;
      if (entries[language]?.fullHash === fullHash(tour)) continue;
      try {
        const result = await translate(language, fullSource(tour));
        calls += 1;
        entries[language] = { ...entries[language], ...result, fullHash: fullHash(tour) };
        await db.tour.update({ where: { id: tour.id }, data: { translations: entries as Prisma.InputJsonValue } });
        console.log(`${language}: full ${tour.slug}`);
      } catch (error) {
        console.warn(`  ${language} ${tour.slug}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
  for (const tour of tours) await db.tour.update({ where: { id: tour.id }, data: { translations: stored.get(tour.id) as Prisma.InputJsonValue } });
  console.log(`Done: ${calls} translation requests for ${tours.length} tours.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
