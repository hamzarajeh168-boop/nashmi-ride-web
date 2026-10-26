"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

const slides = [
  { title: ["Find your own", "kind of wonder."], place: "Petra · The Nabataean city", image: "https://images.unsplash.com/photo-1579606032821-4e6161c81bd3?auto=format&fit=crop&w=2200&q=90", copy: "Ancient stories, endless desert skies, and the people who make you feel at home." },
  { title: ["Make room for", "the unexpected."], place: "Wadi Rum · A desert like no other", image: "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?auto=format&fit=crop&w=2200&q=90", copy: "Trade the everyday for red-sand horizons, quiet moments and a sky full of stars." },
  { title: ["Discover a place", "to exhale."], place: "Dead Sea · The lowest place on earth", image: "https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=2200&q=90", copy: "Find your own rhythm between remarkable landscapes and warm local welcome." },
];

export function HeroSlider() {
  const { translate: t } = useLocale();
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, []);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = new URLSearchParams();
    for (const key of ["destination", "category", "duration"]) {
      const value = String(data.get(key) || "");
      if (value) values.set(key, value);
    }
    window.location.href = `/tours${values.size ? `?${values.toString()}` : ""}`;
  }
  const slide = slides[active];
  return <section className="hero"><div className="hero-image" style={{ backgroundImage: `url("${slide.image}")` }} /><div className="hero-shade" /><div className="hero-copy"><span className="eyebrow eyebrow-light">{t("YOUR JORDAN, YOUR WAY")}</span><h1>{t(slide.title[0])}<br /><em>{t(slide.title[1])}</em></h1><p>{t(slide.copy)}</p><Link href="/#tours" className="button button-light">{t("Discover our journeys")} <ArrowUpRight size={16} /></Link><div className="hero-caption"><span>0{active + 1} / 0{slides.length}</span><span>{slide.place}</span><span className="hero-line" /></div></div><a href="#ways" className="hero-scroll" aria-label="Scroll to explore"><ArrowDown size={16} /></a><div className="hero-slider-controls"><button type="button" onClick={() => setActive((active + slides.length - 1) % slides.length)} aria-label="Previous slide">←</button><button type="button" onClick={() => setActive((active + 1) % slides.length)} aria-label="Next slide">→</button></div><form className="hero-search" onSubmit={search}><label><span>{t("WHERE TO?")}</span><select name="destination" defaultValue=""><option value="">{t("Anywhere in Jordan")}</option>{["Jordan", "Egypt", "Holy Land", "Saudi Arabia", "Turkey", "Lebanon", "Oman"].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>{t("TRAVEL YOUR WAY")}</span><select name="category" defaultValue=""><option value="">{t("Any experience")}</option>{["Classic", "Small Group", "Private", "Women Only", "Family", "Adventure/Hiking", "Religious", "Multi-Country", "Day Trip"].map((item) => <option key={item}>{t(item)}</option>)}</select></label><label><span>{t("HOW LONG?")}</span><select name="duration" defaultValue=""><option value="">{t("Any duration")}</option><option value="1-3">{t("1–3 days")}</option><option value="4-5">{t("4–5 days")}</option><option value="6+">6+ days</option></select></label><button type="submit">{t("Find your trip")} <ArrowUpRight size={15} /></button></form></section>;
}
