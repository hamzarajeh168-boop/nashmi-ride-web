"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, LoaderCircle, Plus, Trash2 } from "lucide-react";

type Section = "faqs" | "company" | "agent" | "knowledge";
type FAQItem = { id?: string; topic: string; question: string; answer: string };
type Knowledge = { id: string; topic: string; content: string; active: boolean };
type Fields = Record<string, string | boolean>;
const companyFields = [
  ["name", "Company name", "text"], ["about", "About your company", "textarea"],
  ["phone", "Phone", "tel"], ["whatsapp", "WhatsApp number", "tel"], ["email", "Email", "email"],
  ["address", "Address", "text"], ["officeHours", "Office hours", "text"],
  ["bookingSteps", "Booking steps", "textarea"], ["cancellationPolicy", "Cancellation policy", "textarea"],
];
const agentDefaults: Fields = {
  name: "Nashmi", greeting: "Ahlan! I'm Nashmi, your Jordan travel companion.", tone: "friendly",
  replyLength: "short", handoverMessage: "Our travel team can help with availability and a personal quote.",
  whatsapp: "", collectLeadDetails: true,
};

export function AdminContentEditor({ section }: { section: Section }) {
  const [fields, setFields] = useState<Fields>({});
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editing, setEditing] = useState<Knowledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/admin/content").then(async (response) => {
      if (!response.ok) throw new Error("Could not load admin data.");
      return response.json();
    }).then((data) => {
      setFaqs(data.faqs || []); setKnowledge(data.knowledge || []);
      if (section === "company") setFields({ ...(data.company || {}) });
      if (section === "agent") setFields({
        ...agentDefaults,
        ...(data.agent || {}),
        aiApiKey: "",
        clearAiApiKey: false,
        adminAiKeyConfigured: data.adminAiKeyConfigured === true,
        environmentAiKeyConfigured: data.environmentAiKeyConfigured === true,
      });
    }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Could not load information."))
      .finally(() => setLoading(false));
  }, [section]);

  function update(key: string, value: string | boolean) { setFields((current) => ({ ...current, [key]: value })); }
  function updateFAQ(index: number, key: keyof FAQItem, value: string) {
    setFaqs((current) => current.map((item, row) => row === index ? { ...item, [key]: value } : item));
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(section === "faqs" ? { section, items: faqs } : { section, values: fields }) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not save. Check all required fields.");
      if (section === "agent") setFields((current) => ({
        ...current,
        aiApiKey: "",
        clearAiApiKey: false,
        adminAiKeyConfigured: result.adminAiKeyConfigured === true,
        environmentAiKeyConfigured: result.environmentAiKeyConfigured === true,
      }));
      setNotice(section === "faqs" ? "FAQs and policies saved." : section === "company" ? "Company information saved." : "Agent settings saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save your changes."); }
    finally { setBusy(false); }
  }
  async function saveKnowledge(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/knowledge", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(editing ? { id: editing.id } : {}), topic: newTopic, content: newContent }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this information.");
      setKnowledge((current) => editing ? current.map((item) => item.id === result.id ? result : item) : [result, ...current]);
      setNewTopic(""); setNewContent(""); setEditing(null); setNotice("Agent information saved. It will be available in the next chat reply.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save agent information."); }
    finally { setBusy(false); }
  }
  async function toggleKnowledge(item: Knowledge) {
    const response = await fetch("/api/admin/knowledge", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, active: !item.active }) });
    if (!response.ok) { setNotice("Could not change this item."); return; }
    const updated = await response.json(); setKnowledge((items) => items.map((entry) => entry.id === item.id ? updated : entry));
  }
  async function deleteKnowledge(item: Knowledge) {
    const response = await fetch(`/api/admin/knowledge?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (!response.ok) { setNotice("Could not remove this item."); return; }
    setKnowledge((items) => items.filter((entry) => entry.id !== item.id)); setNotice("Agent information removed.");
  }

  const title = { faqs: "FAQs & policies", company: "Company information", agent: "Agent settings", knowledge: "Agent knowledge" }[section];
  const eyebrow = { faqs: "ANSWERS, ALL IN ONE PLACE", company: "THE PEOPLE BEHIND THE JOURNEY", agent: "YOUR TRAVEL ASSISTANT", knowledge: "YOUR AGENT'S LIVING KNOWLEDGE BASE" }[section];
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{section === "knowledge" ? "Add your own facts, policies and helpful notes. Active information is used by the assistant immediately." : section === "faqs" ? "Maintain the answers your guests and travel assistant rely on." : section === "company" ? "Keep your team details and guest-facing booking information up to date." : "Set how your assistant welcomes guests, replies and hands off to your team."}</p></div>{section !== "knowledge" && <button form="content-save" className="button admin-button-primary" disabled={loading || busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{busy ? "Saving…" : "Save changes"}</button>}</div>
    {notice && <div className={`admin-notice${notice.includes("saved") ? " success" : " error"}`} role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {loading ? <div className="admin-card loading-card">Loading your information…</div> : section === "faqs" ? <form className="admin-card content-form faq-editor" id="content-save" onSubmit={save}><div className="admin-card-heading"><div><h2>Guest questions</h2><p>Questions and answers are included in the assistant’s database context.</p></div><button type="button" className="admin-button-secondary" onClick={() => setFaqs((items) => [...items, { topic: "Other", question: "", answer: "" }])}><Plus size={15} /> Add question</button></div><div className="faq-list">{faqs.map((item, index) => <article className="faq-admin-row" key={item.id || index}><div className="faq-row-heading"><span>QUESTION {String(index + 1).padStart(2, "0")}</span><button type="button" className="danger-text-button" aria-label="Remove question" onClick={() => setFaqs((items) => items.filter((_, row) => row !== index))}><Trash2 size={15} /> Remove</button></div><label className="editor-field">Topic<input required value={item.topic} onChange={(event) => updateFAQ(index, "topic", event.target.value)} placeholder="Payment" /></label><label className="editor-field">Question<input required value={item.question} onChange={(event) => updateFAQ(index, "question", event.target.value)} /></label><label className="editor-field">Answer<textarea required rows={3} value={item.answer} onChange={(event) => updateFAQ(index, "answer", event.target.value)} /></label></article>)}</div><button className="admin-button-primary" disabled={busy}>{busy ? "Saving…" : "Save FAQs & policies"}</button></form>
      : section === "company" || section === "agent" ? <form className="admin-card content-form" id="content-save" onSubmit={save}><div className="editor-grid content-fields">{(section === "company" ? companyFields : [["name", "Agent name", "text"], ["greeting", "Welcome greeting", "textarea"], ["tone", "Tone", "select-tone"], ["replyLength", "Reply length", "select-length"], ["handoverMessage", "Handover message", "textarea"], ["whatsapp", "Handover WhatsApp", "tel"]]).map(([key, label, type]) => <label className={`editor-field${type === "textarea" ? " editor-field-wide" : ""}`} key={key}>{label}{type === "textarea" ? <textarea required rows={4} value={String(fields[key] || "")} onChange={(event) => update(key, event.target.value)} /> : type === "select-tone" ? <select value={String(fields[key] || "friendly")} onChange={(event) => update(key, event.target.value)}><option value="friendly">Friendly and warm</option><option value="formal">Formal and polished</option></select> : type === "select-length" ? <select value={String(fields[key] || "short")} onChange={(event) => update(key, event.target.value)}><option value="short">Short</option><option value="detailed">Detailed</option></select> : <input required={["name", "email"].includes(key)} type={type} value={String(fields[key] || "")} onChange={(event) => update(key, event.target.value)} />}</label>)}
        {section === "agent" && <section className="editor-field-wide admin-card"><div className="admin-card-heading"><div><h2>Claude API connection</h2><p>Add an Anthropic API key to enable Claude-powered replies. It takes effect on the next chat message.</p></div></div><label className="editor-field">Anthropic API key<input type="password" autoComplete="new-password" maxLength={500} value={String(fields.aiApiKey || "")} onChange={(event) => update("aiApiKey", event.target.value)} placeholder={fields.adminAiKeyConfigured ? "A key is saved; enter a new one to replace it" : "sk-ant-…"} /><small>The key is encrypted before it is saved, never sent back to this page, and only used by the server.</small></label><p className="agent-key-status">{fields.adminAiKeyConfigured ? "An admin-saved key is active." : fields.environmentAiKeyConfigured ? "Using the server’s ANTHROPIC_API_KEY environment setting." : "No API key configured. Chat will use the demo fallback."}</p>{fields.adminAiKeyConfigured === true && <label className="toggle-card"><input type="checkbox" checked={fields.clearAiApiKey === true} onChange={(event) => update("clearAiApiKey", event.target.checked)} /><span><b>Remove saved API key</b><small>After removal, the server environment key is used if one is configured.</small></span></label>}</section>}
        {section === "agent" && <label className="toggle-card editor-field-wide"><input type="checkbox" checked={fields.collectLeadDetails === true} onChange={(event) => update("collectLeadDetails", event.target.checked)} /><span><b>Collect lead details</b><small>Allow the assistant to ask one question at a time and save details the traveller shares.</small></span></label>}
        {section === "company" && <label className="toggle-card editor-field-wide"><span><b>Booking details stay grounded</b><small>Tell the agent only what your team has confirmed; it will not promise unverified bookings.</small></span></label>}</div><button className="admin-button-primary" disabled={busy}>{busy ? "Saving…" : section === "company" ? "Save company information" : "Save agent settings"}</button></form>
      : <div className="knowledge-layout"><form className="admin-card knowledge-form" onSubmit={saveKnowledge}><div className="admin-card-heading"><div><h2>{editing ? "Edit agent information" : "Add a helpful fact"}</h2><p>Share information you want the assistant to use when replying to guests.</p></div></div><label className="editor-field">Topic<input required value={newTopic} onChange={(event) => setNewTopic(event.target.value)} placeholder="Airport pickup" /></label><label className="editor-field">Information for your agent<textarea rows={7} required value={newContent} onChange={(event) => setNewContent(event.target.value)} placeholder="Write the confirmed details your assistant should share…" /></label><div className="knowledge-form-actions">{editing && <button type="button" className="admin-button-secondary" onClick={() => { setEditing(null); setNewTopic(""); setNewContent(""); }}>Cancel edit</button>}<button className="admin-button-primary" disabled={busy}>{busy ? "Saving…" : <><Plus size={16} /> {editing ? "Save agent information" : "Add to agent knowledge"}</>}</button></div><div className="knowledge-note"><b>Only active entries are used.</b><span>Changes are loaded from the database on every chat reply—no rebuild required.</span></div></form><section className="admin-card knowledge-list"><div className="admin-card-heading"><div><h2>Your information</h2><p>{knowledge.length} saved notes</p></div></div>{knowledge.length ? knowledge.map((item) => <article className="knowledge-item" key={item.id}><div className="knowledge-item-top"><div><span className="knowledge-topic">{item.topic}</span><p>{item.content}</p></div><span className={`knowledge-state${item.active ? " active" : ""}`}>{item.active ? "Active" : "Paused"}</span></div><div className="knowledge-item-actions"><button className="admin-button-secondary" onClick={() => { setEditing(item); setNewTopic(item.topic); setNewContent(item.content); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button className="admin-button-secondary" onClick={() => void toggleKnowledge(item)}>{item.active ? "Pause" : "Activate"}</button><button className="danger-text-button" onClick={() => void deleteKnowledge(item)}><Trash2 size={14} /> Remove</button></div></article>) : <div className="admin-empty"><Plus size={24} /><b>No agent notes yet</b><p>Add travel details, policies or guidance for your assistant.</p></div>}</section></div>}
  </>;
}
