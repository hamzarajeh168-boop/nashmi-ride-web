"use client";

import { useLocale, type Language } from "@/components/LocaleProvider";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLocale();
  return <label className="language-select"><span className="sr-only">Language and text direction</span><select value={language} aria-label="Language" onChange={(event) => setLanguage(event.target.value as Language)}><option>EN</option><option>AR</option><option>ES</option><option>DE</option><option>FR</option><option>IT</option></select></label>;
}
