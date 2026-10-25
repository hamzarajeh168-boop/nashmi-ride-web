"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, LoaderCircle, MessageCircle, RotateCcw, X } from "lucide-react";

type TourCard = { title: string; slug: string; coverImage: string; priceOnRequest: boolean; currency: string; price: number | null };
type Reply = { languageCode: string; languageName: string; reply: string; lead: Record<string, string>; tourCards: TourCard[]; conversationId: string };
type Message = { role: "user" | "assistant"; content: string; cards?: TourCard[] };
type StreamEvent = { type: "delta" | "done"; data: string | Reply };

export function ChatExperience() {
  return <ChatPanel />;
}

function ChatPanel({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) {
  const [tourSlug, setTourSlug] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState("");
  const [agentName, setAgentName] = useState("Jordan Inspiration Tours");
  const [conversationId, setConversationId] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setTourSlug(new URLSearchParams(window.location.search).get("tour")); }, []);
  useEffect(() => {
    fetch("/api/public/contact").then((response) => response.json()).then((contact) => {
      if (typeof contact.agentName === "string" && contact.agentName) setAgentName(contact.agentName);
    }).catch((reason: unknown) => console.error("Unable to load the travel assistant name.", reason));
  }, []);
  const suggested = tourSlug
    ? ["What is included?", "How much does it cost?", "Is this right for my family?"]
    : ["Plan a 5-day Jordan trip", "What is the best time to visit?", "Tell me about Petra"];

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const userMessage: Message = { role: "user", content: text.trim() };
    setMessages((current) => [...current, userMessage, { role: "assistant", content: "" }]);
    setDraft(""); setBusy(true); setError("");
    let streamed = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), conversationId, tourSlug }),
      });
      if (!response.ok || !response.body) {
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.error || "We couldn't send your message. Please try again.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed: Reply | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "delta" && typeof event.data === "string") {
            streamed += event.data;
            setMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: streamed } : item));
          }
          if (event.type === "done" && typeof event.data !== "string") completed = event.data;
        }
      }
      if (!completed) throw new Error("The assistant response ended unexpectedly. Please try again.");
      setConversationId(completed.conversationId);
      setLanguage(completed.languageName);
      setMessages((current) => current.map((item, index) => index === current.length - 1
        ? { ...item, content: completed!.reply, cards: completed!.tourCards }
        : item));
    } catch (reason) {
      const errorMessage = reason instanceof Error ? reason.message : "A chat error occurred.";
      setError(errorMessage);
      setMessages((current) => current[current.length - 1]?.content ? current : current.slice(0, -1));
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  function reset() {
    setMessages([]); setConversationId(""); setLanguage(""); setError("");
  }

  return (
    <section className={`chat-panel${embedded ? " chat-embedded" : " chat-full"}`} aria-label="Travel assistant">
      <div className="chat-heading">
        <div className="agent-avatar">J</div><div className="chat-heading-copy"><strong>{agentName}</strong><span><i /> Jordan Inspiration Tours assistant</span></div>
        {language && <span className="language-tag">Language detected: {language}</span>}
        <button type="button" className="icon-button" onClick={reset} aria-label="Reset conversation"><RotateCcw size={17} /></button>
        {embedded && <button type="button" className="icon-button" onClick={onClose} aria-label="Close chat"><X size={18} /></button>}
      </div>
      <div className="chat-content">
        {messages.length === 0 && <div className="chat-welcome"><div className="welcome-symbol">✳</div><h2>Ahlan! Where will your story take you?</h2><p>Ask me about Jordan, our tours, or planning your trip. I’ll use the latest information from our team.</p>{tourSlug && <p className="tour-context">I’m ready to help with <strong>{tourSlug.replaceAll("-", " ")}</strong>.</p>}<div className="suggestion-list">{suggested.map((item) => <button key={item} type="button" onClick={() => void send(item)}>{item} <span>↗</span></button>)}</div></div>}
        {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`message-row ${message.role}${message.role === "assistant" && language === "Arabic" ? " rtl" : ""}`}><div className="message-bubble" dir="auto">{message.content || (busy && index === messages.length - 1 ? <span className="typing"><i /><i /><i /></span> : null)}</div>{message.cards?.length ? <div className="chat-tour-cards">{message.cards.map((tour) => <Link key={tour.slug} className="chat-tour-card" href={`/tours/${tour.slug}`}><img src={tour.coverImage} alt="" /><span><b>{tour.title}</b><small>{tour.priceOnRequest ? "Price on request" : `From ${tour.currency} ${tour.price ?? "—"}`}</small></span><span aria-hidden>↗</span></Link>)}</div> : null}</div>)}
        {error && <p className="chat-error" role="alert">{error}</p>}
        <div ref={bottom} />
      </div>
      {messages.length > 0 && messages.length <= 3 && <div className="chat-quick-replies">{suggested.slice(0, 2).map((item) => <button key={item} type="button" disabled={busy} onClick={() => void send(item)}>{item}</button>)}</div>}
      <form className="chat-form" onSubmit={submit}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask me anything about your trip…" aria-label="Your message" disabled={busy} /><button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">{busy ? <LoaderCircle className="spin" size={19} /> : <ArrowUp size={19} />}</button></form>
      <div className="chat-footnote">Powered by your local travel team’s latest tour information</div>
    </section>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState("962790000000");
  useEffect(() => {
    fetch("/api/public/contact").then((response) => response.json()).then((contact) => {
      if (typeof contact.whatsapp === "string" && contact.whatsapp) setWhatsapp(contact.whatsapp.replace(/\D/g, ""));
    }).catch((reason: unknown) => console.error("Unable to load the company WhatsApp number.", reason));
  }, []);
  return <><a className="whatsapp-float" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="Contact our travel team on WhatsApp"><MessageCircle size={19} /></a><button type="button" className="chat-launcher" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close travel assistant" : "Ask our travel assistant"}>{open ? <X size={21} /> : <><MessageCircle size={20} /><span>Ask our travel assistant</span></>}</button>{open && <div className="chat-widget"><ChatPanel embedded onClose={() => setOpen(false)} /></div>}</>;
}
