import { z } from "zod";

const imageValue = z.string().min(1).refine((value) => {
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(value)) return value.length <= 7_000_000;
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
}, "Use a public image URL or an image upload up to 5 MB.");

export const tourSchema = z.object({
  title: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  destination: z.enum(["Jordan", "Egypt", "Holy Land", "Saudi Arabia", "Turkey", "Lebanon", "Oman"]),
  cities: z.array(z.string().trim().min(1)).default([]),
  category: z.string().min(1),
  durationDays: z.coerce.number().int().min(1),
  durationNights: z.coerce.number().int().min(0),
  hotelClass: z.string().default("4 star"),
  shortDescription: z.string().min(1).max(280),
  description: z.string().min(1),
  coverImage: imageValue,
  gallery: z.array(imageValue).default([]),
  status: z.enum(["PUBLISHED", "DRAFT"]),
  itinerary: z.array(z.object({
    day: z.coerce.number().int().min(1),
    title: z.string().trim().min(1),
    description: z.string().default(""),
    overnight: z.string().default(""),
    meals: z.array(z.enum(["B", "L", "D"])).default([]),
  })).default([]),
  prices: z.array(z.object({
    groupSize: z.string(),
    adult: z.coerce.number().min(0),
    child: z.coerce.number().min(0),
    infant: z.coerce.number().min(0),
  })).default([]),
  singleSupplement: z.coerce.number().min(0).default(0),
  currency: z.string().default("USD"),
  seasonalNote: z.string().default(""),
  priceOnRequest: z.boolean().default(false),
  included: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
  startPoint: z.string().default(""),
  endPoint: z.string().default(""),
  availableDates: z.string().default("Daily"),
  minGroupSize: z.coerce.number().int().min(1).default(1),
  maxGroupSize: z.coerce.number().int().min(1).default(20),
  difficulty: z.string().default("Easy"),
  whatToBring: z.string().default(""),
  practicalNotes: z.string().default(""),
  agentNotes: z.string().default(""),
}).refine((tour) => tour.maxGroupSize >= tour.minGroupSize, {
  path: ["maxGroupSize"],
  message: "Maximum group size must be equal to or larger than minimum group size.",
});
