import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { ChatExperience } from "@/components/ChatExperience";
import { PublicFooter, PublicHeader } from "@/components/PublicLayout";
import { T } from "@/components/LocaleProvider";

export default function ChatPage() {
  return <><PublicHeader /><main className="chat-page"><div className="chat-page-intro"><Link href="/" className="text-link"><ArrowLeft size={15} /> <T>Back to exploring</T></Link><span className="eyebrow"><T>YOUR LOCAL TRAVEL COMPANION</T></span><h1><T>Ahlan, let’s plan</T><br /><T>something</T> <em><T>remarkable.</T></em></h1><p><T>Real tour details from our team, and a little inspiration for what comes next.</T></p><div className="chat-proof"><Compass size={17} /> <T>Answers grounded in our latest travel information</T></div></div><ChatExperience /></main><PublicFooter /></>;
}
