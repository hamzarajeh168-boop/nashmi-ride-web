"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, X } from "lucide-react";

type Message = { role: string; content: string };
type Lead = { name?: string; email?: string; whatsapp?: string; dates?: string; travellers?: string; budget?: string; hotelClass?: string };
type Conversation = { id: string; language: string; firstMessage: string; messages: Message[]; lead: Lead; createdAt: string; updatedAt: string };

export function ChatLogs() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/content?section=conversations").then(async (response) => {
      if (!response.ok) throw new Error("Could not load conversation logs.");
      return response.json();
    }).then((data) => setConversations(data.conversations || []))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load conversations."));
  }, []);
  return <><div className="admin-page-heading"><div><span className="admin-eyebrow">LISTEN, LEARN, FOLLOW UP</span><h1>Chat logs</h1><p>Read what travellers asked and see the details they shared with your assistant.</p></div></div>{error && <div className="admin-notice error" role="alert">{error}</div>}<section className="admin-card tour-list-card"><div className="admin-card-heading"><div><h2>Traveller conversations</h2><p>{conversations.length} recent conversations</p></div></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>FIRST MESSAGE</th><th>LANGUAGE</th><th>DATE</th><th>TRAVELLER DETAILS</th><th></th></tr></thead><tbody>{conversations.map((item) => <tr key={item.id}><td><b className="chat-log-first-message">{item.firstMessage || "New conversation"}</b></td><td><span className="language-badge">{item.language || "Not detected"}</span></td><td>{new Date(item.updatedAt).toLocaleString()}</td><td>{item.lead && Object.keys(item.lead).length ? Object.entries(item.lead).map(([key, value]) => <span className="lead-chip" key={key}>{key}: {value}</span>) : <span className="muted">No lead shared yet</span>}</td><td><button className="admin-button-secondary" onClick={() => setSelected(item)}>Read chat</button></td></tr>)}</tbody></table></div>{!conversations.length && !error && <div className="admin-empty"><MessageSquareText size={25} /><b>No chats yet</b><p>New conversations will appear here when guests use the assistant.</p></div>}</section>{selected && <div className="confirm-backdrop" onClick={() => setSelected(null)} role="presentation"><section className="chat-log-modal" role="dialog" aria-modal="true" aria-labelledby="log-title" onClick={(event) => event.stopPropagation()}><div className="chat-log-modal-heading"><div><span className="admin-eyebrow">{selected.language || "LANGUAGE NOT DETECTED"}</span><h2 id="log-title">{selected.firstMessage}</h2><small>{new Date(selected.createdAt).toLocaleString()}</small></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Close conversation"><X size={19} /></button></div>{selected.lead && Object.keys(selected.lead).length > 0 && <div className="lead-summary"><b>Captured lead</b>{Object.entries(selected.lead).map(([key, value]) => <span key={key}><strong>{key}:</strong> {value}</span>)}</div>}<div className="log-messages">{(Array.isArray(selected.messages) ? selected.messages : []).map((message, index) => <div className={`log-message ${message.role}`} key={`${index}-${message.role}`}><small>{message.role === "user" ? "TRAVELLER" : "JORDAN INSPIRATION TOURS"}</small><p dir="auto">{message.content}</p></div>)}</div></section></div>}</>;
}
