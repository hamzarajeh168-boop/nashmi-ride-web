import { createHash } from "node:crypto";

export const tourLanguages = ["ar", "es", "de", "fr", "it"] as const;
export type TourLanguage = (typeof tourLanguages)[number];

type Day = { title?: string; description?: string; overnight?: string };
export type TourSummaryText = { title: string; shortDescription: string };
export type TourFullText = {
  description: string; cities: string[]; itinerary: Day[]; included: string[]; excluded: string[];
  startPoint: string; endPoint: string; availableDates: string; difficulty: string;
  whatToBring: string; practicalNotes: string; seasonalNote: string;
};
// Stored per language in Tour.translations; each part keeps the hash of the English it was made from.
export type StoredTranslation = Partial<TourSummaryText & TourFullText> & { summaryHash?: string; fullHash?: string };
export type TourTranslations = Partial<Record<TourLanguage, Partial<TourSummaryText & TourFullText>>>;

type TourSource = {
  title: string; shortDescription: string; description: string; cities: unknown; itinerary: unknown; included: unknown; excluded: unknown;
  startPoint: string; endPoint: string; availableDates: string; difficulty: string; whatToBring: string; practicalNotes: string; seasonalNote: string;
};

const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const hash = (value: unknown) => createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 16);

export function summarySource(tour: TourSource): TourSummaryText {
  return { title: tour.title, shortDescription: tour.shortDescription };
}

export function fullSource(tour: TourSource): TourFullText {
  const itinerary = Array.isArray(tour.itinerary) ? tour.itinerary as Day[] : [];
  return {
    description: tour.description, cities: strings(tour.cities),
    itinerary: itinerary.map(({ title = "", description = "", overnight = "" }) => ({ title, description, overnight })),
    included: strings(tour.included), excluded: strings(tour.excluded),
    startPoint: tour.startPoint, endPoint: tour.endPoint, availableDates: tour.availableDates, difficulty: tour.difficulty,
    whatToBring: tour.whatToBring, practicalNotes: tour.practicalNotes, seasonalNote: tour.seasonalNote,
  };
}

export const summaryHash = (tour: TourSource) => hash(summarySource(tour));
export const fullHash = (tour: TourSource) => hash(fullSource(tour));

// Returns only translations that still match the current English, so edited tours fall back to English until re-translated.
export function currentTranslations(tour: TourSource & { translations: unknown }): TourTranslations {
  const stored = (tour.translations && typeof tour.translations === "object" ? tour.translations : {}) as Partial<Record<TourLanguage, StoredTranslation>>;
  const summary = summaryHash(tour);
  const full = fullHash(tour);
  const result: TourTranslations = {};
  for (const language of tourLanguages) {
    const entry = stored[language];
    if (!entry) continue;
    const { summaryHash: entrySummary, fullHash: entryFull, title, shortDescription, ...rest } = entry;
    result[language] = {
      ...(entryFull === full ? rest : {}),
      ...(entrySummary === summary ? { title, shortDescription } : {}),
    };
  }
  return result;
}
