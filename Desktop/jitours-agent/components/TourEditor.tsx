"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LoaderCircle, Save } from "lucide-react";

type PriceRow = { groupSize: string; adult: string; child: string; infant: string };
type ItineraryDay = { day: number; title: string; description: string; overnight: string; meals: string[] };
type TourFormState = {
  title: string; slug: string; destination: string; cities: string; category: string; durationDays: string; durationNights: string;
  hotelClass: string; shortDescription: string; description: string; coverImage: string; gallery: string; status: string;
  singleSupplement: string; currency: string; seasonalNote: string; priceOnRequest: boolean;
  included: string; excluded: string; startPoint: string; endPoint: string; availableDates: string; minGroupSize: string;
  maxGroupSize: string; difficulty: string; whatToBring: string; practicalNotes: string; agentNotes: string;
};
type TourRecord = Partial<TourFormState> & { id?: string; cities?: unknown; gallery?: unknown; itinerary?: unknown; included?: unknown; excluded?: unknown; prices?: Array<{ groupSize: string; adult: number; child: number; infant: number }> };

const categories = ["Classic", "Small Group", "Private", "Women Only", "Family", "Adventure/Hiking", "Religious", "Multi-Country", "Day Trip"];
const groupSizes = ["1", "2", "3", "4", "5", "6+"];
const empty: TourFormState = {
  title: "", slug: "", destination: "Jordan", cities: "", category: "Classic", durationDays: "5", durationNights: "4",
  hotelClass: "4 star", shortDescription: "", description: "", coverImage: "https://images.unsplash.com/photo-1579606032821-4e6161c81bd3?auto=format&fit=crop&w=1400&q=85",
  gallery: "", status: "DRAFT",   singleSupplement: "0", currency: "USD", seasonalNote: "", priceOnRequest: false, included: "", excluded: "",
  startPoint: "", endPoint: "", availableDates: "Daily", minGroupSize: "1", maxGroupSize: "20", difficulty: "Easy",
  whatToBring: "", practicalNotes: "", agentNotes: "",
};
const tabs = ["Basics", "Itinerary", "Pricing", "Included / not included", "Practical info", "Agent notes"];

function initialForm(tour?: TourRecord): TourFormState {
  if (!tour) return empty;
  return {
    ...empty,
    ...Object.fromEntries(Object.entries(tour).filter(([key]) => key in empty)),
    cities: Array.isArray(tour.cities) ? tour.cities.join(", ") : "",
    gallery: Array.isArray(tour.gallery) ? tour.gallery.join("\n") : "",
    included: Array.isArray(tour.included) ? tour.included.join("\n") : "",
    excluded: Array.isArray(tour.excluded) ? tour.excluded.join("\n") : "",
    durationDays: String(tour.durationDays ?? 5), durationNights: String(tour.durationNights ?? 4),
    singleSupplement: String(tour.singleSupplement ?? 0), minGroupSize: String(tour.minGroupSize ?? 1),
    maxGroupSize: String(tour.maxGroupSize ?? 20), priceOnRequest: tour.priceOnRequest ?? false,
  } as TourFormState;
}

function lines(value: string) { return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }

export function TourEditor({ tour }: { tour?: TourRecord }) {
  const router = useRouter();
  const [form, setForm] = useState<TourFormState>(() => initialForm(tour));
  // Keep a tour's own rows (e.g. "2 travellers · 4-star") so saving never replaces them with the default sizes.
  const [prices, setPrices] = useState<PriceRow[]>(() => tour?.prices?.length
    ? [...tour.prices].sort((left, right) => left.groupSize.localeCompare(right.groupSize, undefined, { numeric: true }))
      .map((item) => ({ groupSize: item.groupSize, adult: String(item.adult), child: String(item.child), infant: String(item.infant) }))
    : groupSizes.map((groupSize) => ({ groupSize, adult: "0", child: "0", infant: "0" })));
  const [tab, setTab] = useState(0);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(() => {
    if (Array.isArray(tour?.itinerary)) return tour.itinerary as ItineraryDay[];
    return [{ day: 1, title: "Arrival", description: "", overnight: "", meals: ["B"] }];
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(tour?.slug));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function update<K extends keyof TourFormState>(key: K, value: TourFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function titleChange(value: string) {
    setForm((current) => ({ ...current, title: value, slug: slugTouched ? current.slug : value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
  }
  function changePrice(index: number, field: "groupSize" | "adult" | "child" | "infant", value: string) {
    setPrices((current) => current.map((item, position) => position === index ? { ...item, [field]: value } : item));
  }
  function changeDay(index: number, field: "day" | "title" | "description" | "overnight", value: string) {
    setItinerary((current) => current.map((item, position) => position === index ? { ...item, [field]: field === "day" ? Number(value) : value } : item));
  }
  function toggleMeal(index: number, meal: string) {
    setItinerary((current) => current.map((item, position) => position === index
      ? { ...item, meals: item.meals.includes(meal) ? item.meals.filter((value) => value !== meal) : [...item.meals, meal] }
      : item));
  }
  function addDay() {
    setItinerary((current) => [...current, { day: current.length + 1, title: "", description: "", overnight: "", meals: [] }]);
  }
  function uploadImage(file: File | undefined, target: "coverImage" | "gallery") {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setNotice("Choose an image file no larger than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") { setNotice("Could not read this image file."); return; }
      if (target === "coverImage") update("coverImage", reader.result);
      else setForm((current) => ({ ...current, gallery: `${current.gallery}${current.gallery.trim() ? "\n" : ""}${reader.result}` }));
      setNotice("Image ready. Save the tour to keep this change.");
    };
    reader.onerror = () => setNotice("Could not read this image file.");
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    const body = {
      ...form,
      durationDays: Number(form.durationDays), durationNights: Number(form.durationNights),
      singleSupplement: Number(form.singleSupplement), minGroupSize: Number(form.minGroupSize), maxGroupSize: Number(form.maxGroupSize),
      cities: form.cities.split(",").map((item) => item.trim()).filter(Boolean),
      gallery: lines(form.gallery), itinerary,
      included: lines(form.included), excluded: lines(form.excluded),
      prices: prices.filter((item) => item.groupSize.trim()).map((item) => ({ ...item, groupSize: item.groupSize.trim(), adult: Number(item.adult || 0), child: Number(item.child || 0), infant: Number(item.infant || 0) })),
    };
    try {
      const response = await fetch(tour?.id ? `/api/admin/tours/${tour.id}` : "/api/admin/tours", {
        method: tour?.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        const message = typeof result.error === "string" ? result.error : "Please check the required fields and try again.";
        throw new Error(message);
      }
      setNotice("Tour saved. Your assistant will use these details on its next reply.");
      if (!tour?.id) router.push(`/admin/tours/${result.id}/edit`);
      router.refresh();
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Unable to save tour."); }
    finally { setBusy(false); }
  }

  const input = (label: string, key: keyof TourFormState, options: { required?: boolean; type?: string; hint?: string } = {}) => <label className="editor-field">{label}{options.hint && <small>{options.hint}</small>}<input type={options.type || "text"} value={String(form[key])} onChange={(event) => key === "title" ? titleChange(event.target.value) : key === "slug" ? (setSlugTouched(true), update("slug", event.target.value)) : update(key, event.target.value)} required={options.required} /></label>;
  const textarea = (label: string, key: keyof TourFormState, options: { required?: boolean; hint?: string; rows?: number } = {}) => <label className="editor-field editor-field-wide">{label}{options.hint && <small>{options.hint}</small>}<textarea value={String(form[key])} onChange={(event) => update(key, event.target.value)} rows={options.rows ?? 4} required={options.required} /></label>;

  return <form className="tour-editor" onSubmit={save} noValidate={false}>
    <div className="editor-tabs" role="tablist">{tabs.map((title, index) => <button type="button" role="tab" aria-selected={tab === index} className={tab === index ? "selected" : ""} key={title} onClick={() => { setTab(index); setNotice(""); }}><span>{index + 1}</span>{title}</button>)}</div>
    {notice && <div className={`admin-notice${notice.startsWith("Tour saved") ? " success" : " error"}`} role="status"><span>{notice.startsWith("Tour saved") ? <Check size={16} /> : null}{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    <div className="editor-card">
      {tab === 0 && <div className="editor-grid"><div className="editor-section-title"><span className="admin-eyebrow">THE ESSENTIALS</span><h2>Start with the story.</h2><p>Make your tour easy to find and easy to understand.</p></div>{input("Tour title", "title", { required: true })}{input("URL slug", "slug", { required: true, hint: "Auto-created from the title. You can edit it." })}<label className="editor-field">Destination country<select value={form.destination} onChange={(event) => update("destination", event.target.value)}>{["Jordan", "Egypt", "Holy Land", "Saudi Arabia", "Turkey", "Lebanon", "Oman"].map((item) => <option key={item}>{item}</option>)}</select></label>{input("Cities visited", "cities", { hint: "Separate places with commas." })}<label className="editor-field">Category<select value={form.category} onChange={(event) => update("category", event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="editor-two-fields">{input("Duration (days)", "durationDays", { type: "number", required: true })}{input("Nights", "durationNights", { type: "number", required: true })}</div><label className="editor-field">Hotel class<select value={form.hotelClass} onChange={(event) => update("hotelClass", event.target.value)}>{["3 star", "4 star", "5 star", "—"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="editor-field">Status<select value={form.status} onChange={(event) => update("status", event.target.value)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label>{textarea("Short description", "shortDescription", { required: true, rows: 2, hint: "A concise introduction for tour cards." })}{textarea("Full description", "description", { required: true, rows: 5 })}{input("Cover image URL", "coverImage", { required: true, hint: "Paste a publicly accessible image URL or select an image file." })}<label className="editor-field">Upload cover image<input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0], "coverImage")} /><small>Maximum file size: 5 MB. Image is stored with this demo tour.</small></label>{textarea("Gallery image URLs", "gallery", { rows: 3, hint: "One URL per line, or upload multiple images below." })}<label className="editor-field">Upload gallery images<input type="file" accept="image/*" multiple onChange={(event) => Array.from(event.target.files || []).forEach((file) => uploadImage(file, "gallery"))} /><small>Each uploaded file must be 5 MB or smaller.</small></label></div>}
        {tab === 1 && <div className="editor-grid"><div className="editor-section-title"><span className="admin-eyebrow">DAY BY DAY</span><h2>Map out the journey.</h2><p>Add repeatable day blocks with a title, description, overnight stop and included meals.</p></div><div className="itinerary-editor-list editor-field-wide">{itinerary.map((day, index) => <article className="itinerary-editor-day" key={index}><div className="itinerary-editor-heading"><span>DAY {index + 1}</span><button type="button" className="danger-text-button" onClick={() => setItinerary((current) => current.filter((_, row) => row !== index))}>Remove day</button></div><div className="editor-two-fields"><label className="editor-field">Day number<input type="number" min="1" value={day.day} onChange={(event) => changeDay(index, "day", event.target.value)} required /></label><label className="editor-field">Day title<input value={day.title} onChange={(event) => changeDay(index, "title", event.target.value)} required /></label></div><label className="editor-field">Description<textarea rows={3} value={day.description} onChange={(event) => changeDay(index, "description", event.target.value)} /></label><label className="editor-field">Overnight location<input value={day.overnight} onChange={(event) => changeDay(index, "overnight", event.target.value)} /></label><fieldset className="meal-fieldset"><legend>Meals included</legend>{["B", "L", "D"].map((meal) => <label key={meal}><input type="checkbox" checked={day.meals.includes(meal)} onChange={() => toggleMeal(index, meal)} />{meal === "B" ? "Breakfast" : meal === "L" ? "Lunch" : "Dinner"}</label>)}</fieldset></article>)}<button className="admin-button-secondary" type="button" onClick={addDay}>＋ Add day</button></div><div className="inline-hint editor-field-wide">Guests see each day as an expandable itinerary block.</div></div>}
      {tab === 2 && <div className="editor-grid"><div className="editor-section-title"><span className="admin-eyebrow">CLEAR & HONEST PRICING</span><h2>Set the right expectations.</h2><p>Enter the price per traveller for each group size. Set price on request if a quote is needed.</p></div><label className="toggle-card"><input type="checkbox" checked={form.priceOnRequest} onChange={(event) => update("priceOnRequest", event.target.checked)} /><span><b>Price on request</b><small>Guests will be asked to contact your team for a quote.</small></span></label><div className="price-editor-wrap"><table className="price-editor-table"><thead><tr><th>Travellers</th><th>Adult</th><th>Child (6–11)</th><th>Infant</th></tr></thead><tbody>{prices.map((price, index) => <tr key={index}><td><input aria-label={`Travellers label for row ${index + 1}`} value={price.groupSize} onChange={(event) => changePrice(index, "groupSize", event.target.value)} /></td>{(["adult", "child", "infant"] as const).map((field) => <td key={field}><input type="number" min="0" step="0.01" aria-label={`${field} price for ${price.groupSize} travellers`} value={price[field]} onChange={(event) => changePrice(index, field, event.target.value)} /></td>)}</tr>)}</tbody></table></div><div className="editor-two-fields">{input("Currency", "currency", { required: true })}{input("Single supplement", "singleSupplement", { type: "number" })}</div>{textarea("Seasonal note", "seasonalNote", { rows: 2 })}</div>}
      {tab === 3 && <div className="editor-grid"><div className="editor-section-title"><span className="admin-eyebrow">WHAT&apos;S INCLUDED</span><h2>Set out what guests can expect.</h2><p>Use one bullet point per line.</p></div>{textarea("Included", "included", { rows: 7, hint: "Each line becomes a separate inclusion." })}{textarea("Not included", "excluded", { rows: 7, hint: "Each line becomes a separate exclusion." })}</div>}
      {tab === 4 && <div className="editor-grid"><div className="editor-section-title"><span className="admin-eyebrow">THE PRACTICAL DETAILS</span><h2>Help guests get ready.</h2><p>Share the details your travellers and the assistant need before departure.</p></div>{input("Start point", "startPoint")}{input("End point", "endPoint")}{input("Available dates", "availableDates", { hint: 'Use "Daily" or describe a confirmed schedule.' })}<div className="editor-two-fields">{input("Minimum group size", "minGroupSize", { type: "number" })}{input("Maximum group size", "maxGroupSize", { type: "number" })}</div><label className="editor-field">Difficulty level<select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}>{["Easy", "Moderate", "Challenging", "Varies"].map((item) => <option key={item}>{item}</option>)}</select></label>{textarea("What to bring", "whatToBring", { rows: 3 })}{textarea("Practical notes", "practicalNotes", { rows: 3 })}</div>}
      {tab === 5 && <div className="editor-grid"><div className="editor-section-title"><span className="admin-eyebrow">PRIVATE NOTES FOR THE ASSISTANT</span><h2>Give your agent the context.</h2><p>Only your assistant sees these notes. Use them for selling points, thoughtful suggestions, and details it should not promise.</p></div>{textarea("Agent notes", "agentNotes", { rows: 9, hint: "Example: Highlight the family-friendly pace. Never guarantee a hotel or departure date until our team confirms it." })}</div>}
      <div className="editor-footer"><Link href="/admin/tours" className="admin-button-secondary"><ArrowLeft size={15} /> Cancel</Link><div><button type="button" className="admin-button-secondary" onClick={() => setTab((value) => Math.max(0, value - 1))} disabled={tab === 0}>Previous</button>{tab < tabs.length - 1 ? <button type="button" className="admin-button-primary" onClick={() => setTab((value) => value + 1)}>Next step <span>→</span></button> : <button className="admin-button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{busy ? "Saving…" : "Save tour"}</button>}</div></div>
    </div>
  </form>;
}
