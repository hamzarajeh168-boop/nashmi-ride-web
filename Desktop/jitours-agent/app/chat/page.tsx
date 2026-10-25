import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { ChatExperience } from "@/components/ChatExperience";
import { PublicFooter, PublicHeader } from "@/components/PublicLayout";

export default function ChatPage() {
  return <><PublicHeader /><main className="chat-page"><div className="chat-page-intro"><Link href="/" className="text-link"><ArrowLeft size={15} /> Back to exploring</Link><span className="eyebrow">YOUR LOCAL TRAVEL COMPANION</span><h1>Ahlan, let’s plan<br />something <em>remarkable.</em></h1><p>Real tour details from our team, and a little inspiration for what comes next.</p><div className="chat-proof"><Compass size={17} /> Answers grounded in our latest travel information</div></div><ChatExperience /></main><PublicFooter /></>;
}
