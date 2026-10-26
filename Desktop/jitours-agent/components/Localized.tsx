"use client";

import { useLocale } from "@/components/LocaleProvider";

type Translations = Record<string, Record<string, unknown> | undefined> | undefined;

// Shows the translated tour field (e.g. "title" or "itinerary.2.description") for the chosen language, else the English text.
export function Localized({ tr, path, children }: { tr: Translations; path: string; children: string }) {
  const { language } = useLocale();
  let value: unknown = tr?.[language.toLowerCase()];
  for (const key of path.split(".")) value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
  return <>{typeof value === "string" && value.trim() ? value : children}</>;
}

const groupWords: Record<string, [RegExp, string][]> = {
  AR: [[/1 traveller \(solo\)/, "مسافر واحد"], [/(\S+) travellers/, "$1 مسافرين"], [/Per person/, "للشخص"], [/(\d)-star/, "$1 نجوم"]],
  ES: [[/1 traveller \(solo\)/, "1 viajero (solo)"], [/travellers/, "viajeros"], [/Per person/, "Por persona"], [/(\d)-star/, "$1 estrellas"]],
  DE: [[/1 traveller \(solo\)/, "1 Reisender (allein)"], [/travellers/, "Reisende"], [/Per person/, "Pro Person"], [/(\d)-star/, "$1 Sterne"]],
  FR: [[/1 traveller \(solo\)/, "1 voyageur (seul)"], [/travellers/, "voyageurs"], [/Per person/, "Par personne"], [/(\d)-star/, "$1 étoiles"]],
  IT: [[/1 traveller \(solo\)/, "1 viaggiatore (da solo)"], [/travellers/, "viaggiatori"], [/Per person/, "A persona"], [/(\d)-star/, "$1 stelle"]],
};

// Price-row labels like "2 travellers · 4-star".
export function GroupLabel({ children }: { children: string }) {
  const { language } = useLocale();
  return <>{(groupWords[language] || []).reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), children)}</>;
}
