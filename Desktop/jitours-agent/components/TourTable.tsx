"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, Edit3, Plus, Search, Trash2 } from "lucide-react";

type TourRow = { id: string; title: string; slug: string; destination: string; category: string; durationDays: number; coverImage: string; status: string; priceOnRequest: boolean; currency: string; prices: Array<{ adult: number }> };

export function TourTable({ tours: initial }: { tours: TourRow[] }) {
  const [tours, setTours] = useState(initial);
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("All destinations");
  const [category, setCategory] = useState("All categories");
  const [deleteTarget, setDeleteTarget] = useState<TourRow | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const destinations = [...new Set(tours.map((tour) => tour.destination))];
  const categories = [...new Set(tours.map((tour) => tour.category))];
  const visible = useMemo(() => tours.filter((tour) =>
    (destination === "All destinations" || tour.destination === destination) &&
    (category === "All categories" || tour.category === category) &&
    `${tour.title} ${tour.destination} ${tour.category}`.toLowerCase().includes(query.toLowerCase())), [tours, query, destination, category]);
  async function duplicate(tour: TourRow) {
    const response = await fetch(`/api/admin/tours/${tour.id}/duplicate`, { method: "POST" });
    if (!response.ok) { setNotice("Could not duplicate this tour."); return; }
    const copy = await response.json(); setTours((value) => [copy, ...value]); setNotice("Draft duplicate created.");
  }
  async function remove() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/tours/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete this tour.");
      setTours((value) => value.filter((tour) => tour.id !== deleteTarget.id)); setNotice("Tour deleted."); setDeleteTarget(null);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Delete failed."); }
    finally { setBusy(false); }
  }
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">YOUR ITINERARIES</span><h1>Tours & day trips</h1><p>Build, edit and publish the journeys your guests will discover.</p></div><Link className="button admin-button-primary" href="/admin/tours/new"><Plus size={17} /> Create a tour</Link></div>{notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}<section className="admin-card tour-list-card"><div className="tour-filters"><label className="admin-search"><Search size={17} /><input placeholder="Search tours…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="Filter destination"><option>All destinations</option>{destinations.map((item) => <option key={item}>{item}</option>)}</select><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter category"><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><span className="table-count">{visible.length} tours</span></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>TOUR</th><th>DESTINATION</th><th>DURATION</th><th>STARTING PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{visible.map((tour) => <tr key={tour.id}><td><div className="table-tour"><img src={tour.coverImage} alt="" /><span><b>{tour.title}</b><small>{tour.category}</small></span></div></td><td>{tour.destination}</td><td>{tour.durationDays} days</td><td>{tour.priceOnRequest ? "On request" : `${tour.currency} ${tour.prices.length ? Math.min(...tour.prices.map((item) => item.adult)) : "—"}`}</td><td><span className={`status-pill ${tour.status === "PUBLISHED" ? "published" : "draft"}`}><i />{tour.status === "PUBLISHED" ? "Published" : "Draft"}</span></td><td><div className="row-actions"><Link href={`/admin/tours/${tour.id}/edit`} aria-label={`Edit ${tour.title}`} title="Edit"><Edit3 size={16} /></Link><button onClick={() => void duplicate(tour)} aria-label={`Duplicate ${tour.title}`} title="Duplicate"><Copy size={16} /></button><button className="danger-action" onClick={() => setDeleteTarget(tour)} aria-label={`Delete ${tour.title}`} title="Delete"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{visible.length === 0 && <div className="table-empty">No tours match your filters.</div>}</section>{deleteTarget && <div className="confirm-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><span className="confirm-icon"><Trash2 size={20} /></span><h2 id="delete-title">Delete this tour?</h2><p><b>{deleteTarget.title}</b> will be removed permanently. This cannot be undone.</p><div><button className="admin-button-secondary" onClick={() => setDeleteTarget(null)} disabled={busy}>Keep tour</button><button className="admin-button-danger" onClick={() => void remove()} disabled={busy}>{busy ? "Deleting…" : "Delete tour"}</button></div></section></div>}</>;
}
