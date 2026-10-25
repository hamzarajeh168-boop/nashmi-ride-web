"use client";

import { useEffect, useState } from "react";

const supportedLanguages = ["EN", "AR", "ES", "DE", "FR", "IT"];

export function LanguageSwitcher() {
  const [language, setLanguage] = useState("EN");
  useEffect(() => {
    const saved = window.localStorage.getItem("jitours-language");
    if (saved && supportedLanguages.includes(saved)) { setLanguage(saved); apply(saved); }
  }, []);
  function apply(language: string) {
    document.documentElement.lang = language.toLowerCase();
    document.documentElement.dir = language === "AR" ? "rtl" : "ltr";
    window.localStorage.setItem("jitours-language", language);
  }
  return <label className="language-select"><span className="sr-only">Language and text direction</span><select value={language} aria-label="Language" onChange={(event) => { setLanguage(event.target.value); apply(event.target.value); }}><option>EN</option><option>AR</option><option>ES</option><option>DE</option><option>FR</option><option>IT</option></select></label>;
}
