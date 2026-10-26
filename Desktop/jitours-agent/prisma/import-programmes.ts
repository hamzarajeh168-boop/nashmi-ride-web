// Imports the JIT-xx programme files in data/programmes into the tour tables.
// Safe to re-run: tours are upserted by slug and their price rows are replaced.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const json = (value: unknown) => value as Prisma.InputJsonValue;
const dir = path.resolve(process.cwd(), process.argv[2] || "data/programmes");
// Optional per-slug cover photos (e.g. for tours outside Jordan); others get a photo chosen by category.
const coverOverrides: Record<string, string> = existsSync(path.join(dir, "images.json")) ? JSON.parse(readFileSync(path.join(dir, "images.json"), "utf8")) : {};

// The original demo tours overlap with these programmes, so they are unpublished (not deleted).
const replacedSampleSlugs = ["5-day-jordan-classic", "7-day-jordan-highlights", "small-group-jordan-5-days", "8-day-women-only-jordan", "petra-day-trip-from-aqaba"];

const image = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1500&q=85`;
const images = {
  petra: image("1579606032821-4e6161c81bd3"), wadiRum: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Wadi_Rum_landscape_%2812465264714%29.jpg/1920px-Wadi_Rum_landscape_%2812465264714%29.jpg", deadSea: image("1544986581-efac024faf62"),
  classic: image("1548786811-dd6e453ccca7"), group: image("1512632578888-169bbbc64f33"), hiking: image("1470770841072-f978cf4d019e"),
  dayTrip: image("1603565816030-6b389eeb23cb"), women: image("1516483638261-f4dbaf036963"),
};

const categoryMap: Record<string, string> = {
  "short break": "Private", classic: "Classic", "classic + beach": "Classic", "in-depth": "Classic", "budget / small group": "Small Group",
  "women only": "Women Only", family: "Family", hiking: "Adventure/Hiking", adventure: "Adventure/Hiking", "religious – christian": "Religious",
  "religious – islamic": "Religious", luxury: "Private", "honeymoon / romantic": "Private", "beach & diving": "Adventure/Hiking",
  "wellness": "Private", culinary: "Private", accessible: "Private", photography: "Private", festive: "Classic", "adventure – cycling": "Adventure/Hiking",
  "multi-country": "Multi-Country", "multi-country – holy land": "Multi-Country", "day trip": "Day Trip", "day trip – cruise": "Day Trip", "day trip – biblical": "Day Trip",
};

function cells(line: string) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function tableAfter(lines: string[], start: number) {
  const rows: string[][] = [];
  let index = start;
  while (index < lines.length && !lines[index].trim().startsWith("|")) index += 1;
  for (; index < lines.length && lines[index].trim().startsWith("|"); index += 1) {
    if (/^\|[\s|:-]+\|$/.test(lines[index].trim())) continue;
    rows.push(cells(lines[index]));
  }
  return rows;
}

function sections(markdown: string) {
  const result: Record<string, string[]> = {};
  let current = "_head";
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## (.+)$/);
    if (heading) { current = heading[1].trim(); result[current] = []; continue; }
    (result[current] ||= []).push(line);
  }
  return result;
}

const bullets = (lines: string[] = []) => lines.filter((line) => line.startsWith("- ")).map((line) => line.slice(2).trim());
const money = (value: string) => Number(value.replace(/[^0-9.]/g, ""));
const round = (value: number) => Math.round(value * 100) / 100;

function parseItinerary(lines: string[] = []) {
  const days: Array<{ day: number; title: string; description: string; overnight: string; meals: string[] }> = [];
  for (const line of lines) {
    const heading = line.match(/^### Day (\d+) – (.+)$/);
    if (heading) { days.push({ day: Number(heading[1]), title: heading[2].trim(), description: "", overnight: "", meals: [] }); continue; }
    const day = days[days.length - 1];
    if (!day || !line.trim()) continue;
    if (line.startsWith("**Overnight:**") || line.startsWith("**Meals:**")) {
      const overnight = line.match(/\*\*Overnight:\*\*\s*([^·(]+)/);
      if (overnight) day.overnight = overnight[1].trim();
      const meals = line.match(/\*\*Meals:\*\*\s*(.+)$/);
      if (meals) day.meals = (["B", "L", "D"] as const).filter((code) => new RegExp({ B: "breakfast", L: "lunch", D: "dinner" }[code], "i").test(meals[1]));
    } else if (line.startsWith("**Highlights:**")) {
      day.description += `\nHighlights: ${line.replace("**Highlights:**", "").trim()}`;
    } else {
      day.description += (day.description ? " " : "") + line.trim();
    }
  }
  return days.map((day) => ({ ...day, description: day.description.trim() }));
}

function parseProgramme(file: string) {
  const markdown = readFileSync(path.join(dir, file), "utf8");
  const lines = markdown.split(/\r?\n/);
  const header = lines[0].match(/^# (JIT-\d+) · (.+)$/);
  if (!header) throw new Error(`${file}: missing "# JIT-xx · Title" heading`);
  const [, code, title] = header;
  const slug = file.replace(/^JIT-\d+-/, "").replace(/\.md$/, "");
  const parts = sections(markdown);
  const facts = Object.fromEntries(tableAfter(parts._head, 0).slice(1).map(([key, value]) => [key, value]));
  const intro = parts._head.map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && !line.startsWith("|") && !line.startsWith("*"))[0] || "";

  const priceLines = parts["Tour price"] || [];
  const priceBasis = priceLines.find((line) => line.trim() && !line.startsWith("|") && !line.startsWith("**")) || "";
  const [priceHeader, ...priceRows] = tableAfter(priceLines, 0);
  const basisClass = priceBasis.match(/\((\d-star)\)/)?.[1];
  const prices = priceRows.flatMap(([size, ...values]) => values.map((value, column) => {
    const columnName = priceHeader[column + 1];
    const hotelClass = /star/i.test(columnName) ? columnName : basisClass;
    const adult = money(value);
    // Programme notes: children 6–11 sharing with two adults get 25% off; under 6 travel free.
    return { groupSize: hotelClass ? `${size} · ${hotelClass}` : size, adult, child: round(adult * 0.75), infant: 0 };
  }));
  const classes = priceHeader.slice(1).filter((name) => /star/i.test(name));
  const supplementLine = priceLines.find((line) => line.startsWith("**Single room supplement:**"))?.replace("**Single room supplement:**", "").trim() || "";
  const supplements = (supplementLine.match(/(\d[\d,]*)\s*US\$/g) || []).map(money);

  const accommodationRows = tableAfter(parts.Accommodations || [], 0);
  const accommodations = accommodationRows.slice(1).map((row) => accommodationRows[0].map((name, index) => `${name}: ${row[index]}`).join(" · "));
  const notes = bullets(parts.Notes);
  const extras = bullets(parts["Optional extras (extra cost)"]);
  const tourType = facts["Tour type"] || "";
  const sourceCategory = facts.Category || "";
  const category = categoryMap[sourceCategory.toLowerCase()];
  if (!category) throw new Error(`${file}: unknown category "${sourceCategory}"`);
  const route = facts.Route || "";
  const groupRange = prices.map((price) => price.groupSize.match(/\((\d+)–(\d+) travellers\)/)).find(Boolean);
  const maxFromType = tourType.match(/max (\d+)/)?.[1];
  const season = facts["Best season"] || "";
  const durationDays = Number(facts.Duration?.match(/(\d+) day/)?.[1] || 1);
  const durationNights = Number(facts.Duration?.match(/(\d+) night/)?.[1] || 0);
  const destination = /Jerusalem/.test(route) ? "Holy Land" : /Cairo/.test(route) ? "Egypt" : /AlUla/.test(route) ? "Saudi Arabia"
    : /Beirut/.test(route) ? "Lebanon" : /Istanbul/.test(route) ? "Turkey" : /Muscat/.test(route) ? "Oman" : "Jordan";
  const cover = coverOverrides[slug] || (category === "Day Trip" ? images.dayTrip : category === "Women Only" ? images.women : category === "Small Group" ? images.group
    : category === "Adventure/Hiking" ? images.hiking : /^Dead Sea/.test(route) ? images.deadSea : /^Petra|^Aqaba/.test(route) ? images.petra
    : category === "Classic" ? images.classic : images.wadiRum);

  return {
    code,
    data: {
      title, slug, destination, category, durationDays, durationNights,
      cities: route.split(/\s+–\s+/).map((city) => city.trim()).filter(Boolean),
      hotelClass: classes.length ? classes[0].replace("-", " ") : basisClass ? basisClass.replace("-", " ") : "—",
      shortDescription: intro.slice(0, 280),
      description: [intro, `Ideal for: ${facts["Ideal for"] || "—"}.`, `Tour type: ${tourType}. Route: ${route}.`].join("\n\n"),
      coverImage: cover, gallery: [cover], status: "PUBLISHED",
      itinerary: parseItinerary(parts.Itinerary),
      singleSupplement: supplements[0] || 0, currency: "USD",
      seasonalNote: season ? `Best season: ${season}` : "", priceOnRequest: prices.length === 0,
      included: bullets(parts.Inclusions), excluded: bullets(parts.Exclusions),
      startPoint: facts.Starts || "", endPoint: facts.Ends || "",
      availableDates: /^(Weekly|Departures)/.test(season) ? season : "On request – the team confirms availability for your dates",
      minGroupSize: Number(groupRange?.[1] || 1), maxGroupSize: Number(groupRange?.[2] || maxFromType || 6),
      difficulty: facts.Difficulty || "Easy", whatToBring: "",
      practicalNotes: [
        priceBasis.trim(),
        supplementLine && `Single room supplement: ${supplementLine}`,
        accommodations.length && `Accommodations:\n${accommodations.map((row) => `- ${row}`).join("\n")}\nMeal plans: BB = bed & breakfast · HB = breakfast & dinner · FB = all meals`,
        notes.length && `Notes:\n${notes.map((note) => `- ${note}`).join("\n")}`,
      ].filter(Boolean).join("\n\n"),
      agentNotes: [
        `Programme code ${code}. Tour type: ${tourType}. Original category: ${sourceCategory}. Ideal for: ${facts["Ideal for"] || "—"}.`,
        classes.length > 1 ? `Available as ${classes.join(", ")}; each price row is labelled with its group size and hotel class. Ask which hotel class the traveller prefers.` : "",
        groupRange ? "" : "The price table covers groups of 1–6 travellers; for larger groups the team prepares a quote.",
        extras.length ? `Optional extras at extra cost: ${extras.join("; ")}.` : "",
      ].filter(Boolean).join("\n"),
      isSample: true,
    },
    prices,
  };
}

async function main() {
  const files = readdirSync(dir).filter((file) => /^JIT-\d+-.+\.md$/.test(file)).sort();
  if (!files.length) throw new Error(`No JIT-xx programme files found in ${dir}`);
  const programmes = files.map(parseProgramme);
  for (const { code, data, prices } of programmes) {
    const values = { ...data, cities: json(data.cities), gallery: json(data.gallery), itinerary: json(data.itinerary), included: json(data.included), excluded: json(data.excluded) };
    await db.$transaction(async (tx) => {
      const tour = await tx.tour.upsert({ where: { slug: data.slug }, create: values, update: values });
      await tx.tourPrice.deleteMany({ where: { tourId: tour.id } });
      await tx.tourPrice.createMany({ data: prices.map((price) => ({ ...price, tourId: tour.id })) });
    });
    console.log(`${code}  ${data.slug}  (${prices.length} prices, ${data.itinerary.length} days)`);
  }
  const hidden = await db.tour.updateMany({ where: { slug: { in: replacedSampleSlugs } }, data: { status: "DRAFT" } });
  console.log(`Imported ${programmes.length} programmes; moved ${hidden.count} older sample tours to draft.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
