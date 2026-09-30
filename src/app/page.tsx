"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateCode, setHostKey } from "@/lib/utils";

const FEATURES = [
  ["01", "Invite anyone", "A short session code and one link are all your group needs."],
  ["02", "Collect honest ideas", "Suggestions arrive without names, status, or second guessing."],
  ["03", "Find the signal", "Live voting makes the next step obvious when you are ready."],
];
const FAQ = [
  ["Do people need an account?", "No. Anyone can join with the session code or invite link."],
  ["Are ideas and votes anonymous?", "Yes. VoteNotes keeps the focus on the idea, not who shared it."],
  ["Can I close a session?", "Session hosts can close voting whenever the group is ready to decide."],
];

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<"home" | "create">("home");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endTime, setEndTime] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  function openCreate() { setError(""); setView("create"); }
  async function handleCreate(event: React.FormEvent) {
    event.preventDefault(); if (!name.trim()) return;
    setLoading(true); setError("");
    const code = generateCode();
    const { error: createError } = await supabase.from("sessions").insert({ code, name: name.trim(), description: description.trim() || null, end_time: endTime || null });
    if (createError) { setError("We couldn't create this session. Check your connection and try again."); setLoading(false); return; }
    setHostKey(code, crypto.randomUUID()); router.push(`/v/${code}`);
  }
  async function handleJoin(event: React.FormEvent) {
    event.preventDefault(); const code = joinCode.trim().toUpperCase(); if (!code) return; setError("");
    const { data } = await supabase.from("sessions").select("code").eq("code", code).single();
    if (!data) { setError("We couldn't find that session. Check the code and try again."); return; }
    router.push(`/v/${code}`);
  }
  if (view === "create") return (
    <main className="site-shell create-view"><SiteHeader onCreate={openCreate} />
      <section className="create-layout"><button className="back-control" onClick={() => { setError(""); setView("home"); }}>← Back to home</button>
        <div className="create-intro"><span className="eyebrow">New session</span><h1>A decision starts with a clear question.</h1><p>Set up a private session for your group in less than a minute.</p><div className="create-note"><b>What happens next</b><span>Share your code, gather anonymous ideas, then vote together.</span></div></div>
        <form onSubmit={handleCreate} className="create-form-card">
          <div><span className="field-label">Session name <em>Required</em></span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Friday movie night" required /></div>
          <div><span className="field-label">A little context <em>Optional</em></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you deciding?" rows={4} /></div>
          <div><span className="field-label">Close voting at <em>Optional</em></span><input type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></div>
          {error && <p className="form-error">{error}</p>}<button className="button button-dark button-wide" type="submit" disabled={loading || !name.trim()}>{loading ? "Creating session…" : "Create session →"}</button><p className="form-footnote">No accounts. Everyone can join instantly.</p>
        </form>
      </section>
    </main>
  );
  return (
    <main className="site-shell" id="top"><SiteHeader onCreate={openCreate} />
      <section className="hero"><div className="hero-copy"><span className="eyebrow"><i />Anonymous group decisions</span><h1>Make the next<br /><em>good call.</em></h1><p>Give every person in the group a voice. VoteNotes turns scattered opinions into a confident decision.</p><div className="hero-actions"><button className="button button-dark" onClick={openCreate}>Create a session <span>→</span></button><a href="#how">How it works <span>↓</span></a></div><div className="hero-meta"><span>✦ No sign-up needed</span><span>◌ Private by default</span></div></div>
        <div className="hero-product" aria-label="Example session preview"><div className="product-bar"><span><Logo /> VoteNotes</span><b>SESSION · C8J4</b></div><div className="product-title"><div><span className="status-dot">Voting open</span><h2>Where should we go for our team day?</h2><p>12 people deciding</p></div><button>↗</button></div><div className="product-composer"><span>✦</span><p>Add an anonymous idea</p><b>+</b></div><div className="product-ideas"><PreviewIdea rank="01" text="A day by the sea" votes="8" leading /><PreviewIdea rank="02" text="A hands-on workshop" votes="6" /><PreviewIdea rank="03" text="A long lunch in town" votes="4" /></div><div className="product-footer"><span>Ideas stay anonymous</span><strong>Live results</strong></div></div>
      </section>
      <section className="home-join"><div><span className="eyebrow">Already have a session?</span><h2>Join the conversation.</h2></div><form onSubmit={handleJoin}><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ENTER CODE" maxLength={8} /><button type="submit">Join session →</button></form>{error && <p className="form-error">{error}</p>}</section>
      <section className="confidence"><p>Made for teams, communities, and groups that want decisions to feel <b>fairer and faster.</b></p><div><span>No accounts</span><span>Real-time voting</span><span>One simple link</span></div></section>
      <section id="how" className="feature-section"><div className="section-heading"><span className="eyebrow">A simple, thoughtful flow</span><h2>From “what does everyone think?” to a clear next step.</h2></div><div className="feature-grid">{FEATURES.map(([number, title, text]) => <article key={number}><div><span>{number}</span><b>↗</b></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className="statement"><div><span className="eyebrow">Built for honest input</span><h2>The best idea should win—not the loudest voice.</h2></div><p>Anonymous suggestions help the whole group contribute openly. Then voting brings the collective signal into focus, without the awkwardness.</p></section>
      <section id="faq" className="faq-section"><div><span className="eyebrow">Questions, answered</span><h2>Everything you need to get started.</h2></div><div className="faq-list">{FAQ.map(([question, answer], index) => <article className={openFaq === index ? "open" : ""} key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><b>{openFaq === index ? "−" : "+"}</b></button>{openFaq === index && <p>{answer}</p>}</article>)}</div></section>
      <footer className="site-footer"><a className="site-brand" href="#top"><Logo /> VoteNotes</a><p>Better decisions, together.</p><button onClick={openCreate}>Start a session →</button></footer>
    </main>
  );
}
function SiteHeader({ onCreate }: { onCreate: () => void }) { return <header className="site-header"><a className="site-brand" href="#top"><Logo /> VoteNotes</a><nav><a href="#how">How it works</a><a href="#faq">FAQ</a></nav><button className="header-cta" onClick={onCreate}>Create a session <span>↗</span></button></header>; }
function Logo() { return <i className="brand-symbol" aria-hidden="true">✓</i>; }
function PreviewIdea({ rank, text, votes, leading = false }: { rank: string; text: string; votes: string; leading?: boolean }) { return <article className={leading ? "leading" : ""}><div><span>{rank}</span>{leading && <b>Leading</b>}</div><p>{text}</p><button>↑ {votes}</button></article>; }
