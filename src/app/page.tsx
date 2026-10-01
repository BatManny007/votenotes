"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateCode, setHostKey } from "@/lib/utils";

const FEATURES = [
  {
    number: "01",
    title: "Share with anyone",
    text: "Send a quick code or link so your friends, family, or teammates can join in seconds.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Collect honest ideas",
    text: "Everyone submits suggestions privately without worrying about who suggested what.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 12h6" />
        <path d="M12 9v6" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Vote and pick a winner",
    text: "Everyone votes on their favorites in real time so the top choice is obvious right away.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v-6" />
        <path d="M6 20V10" />
        <path d="M18 20V4" />
      </svg>
    ),
  },
];

const FAQ = [
  ["Do people need to create an account?", "No. Anyone can join instantly using your session code or invite link. No signup, email, or passwords needed."],
  ["Are suggestions and votes really anonymous?", "Yes. Names are never attached to suggestions or votes. The whole group focuses purely on the ideas."],
  ["Can the host end voting when ready?", "Yes. The person who created the session can close voting at any time to lock in the final result."],
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

  function openCreate() {
    setError("");
    setView("create");
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const code = generateCode();
    const { error: createError } = await supabase
      .from("sessions")
      .insert({ code, name: name.trim(), description: description.trim() || null, end_time: endTime || null });
    if (createError) {
      setError("We could not create this session. Please check your connection and try again.");
      setLoading(false);
      return;
    }
    setHostKey(code, crypto.randomUUID());
    router.push(`/v/${code}`);
  }

  async function handleJoin(event: React.FormEvent) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setError("");
    const { data } = await supabase.from("sessions").select("code").eq("code", code).single();
    if (!data) {
      setError("We could not find that session. Please check the code and try again.");
      return;
    }
    router.push(`/v/${code}`);
  }

  if (view === "create") {
    return (
      <main className="site-shell create-view">
        <SiteHeader onCreate={openCreate} />
        <section className="create-layout">
          <button className="back-control" onClick={() => { setError(""); setView("home"); }}>
            Back to home
          </button>
          <div className="create-intro">
            <span className="eyebrow">Start a session</span>
            <h1>What is your group deciding?</h1>
            <p>Set up a private room in seconds. Share the link, collect suggestions, and vote together.</p>
            <div className="create-note">
              <b>What happens next</b>
              <span>Share your code, collect private suggestions from the group, then vote together.</span>
            </div>
          </div>
          <form onSubmit={handleCreate} className="create-form-card">
            <div>
              <span className="field-label">Session topic <em>Required</em></span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Where should we go for dinner?"
                required
              />
            </div>
            <div>
              <span className="field-label">Extra details <em>Optional</em></span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any helpful details or rules for the group..."
                rows={4}
              />
            </div>
            <div>
              <span className="field-label">End voting automatically <em>Optional</em></span>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="button button-dark button-wide" type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating session…" : "Create session"}
            </button>
            <p className="form-footnote">No accounts needed. Anyone with your link can join right away.</p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="site-shell" id="top">
      <SiteHeader onCreate={openCreate} />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i />Anonymous group decisions</span>
          <h1>Make decisions together without the <em>stress.</em></h1>
          <p>Got a group that cannot agree? Share ideas privately, vote on your favorites, and pick the best option in minutes.</p>
          <div className="hero-actions">
            <button className="button button-dark" onClick={openCreate}>
              Create a session
            </button>
            <a href="#how">How it works</a>
          </div>
          <div className="hero-meta">
            <span>No signup needed</span>
            <span>Private and simple</span>
          </div>
        </div>

        <div className="hero-product" aria-label="Example session preview">
          <div className="product-bar">
            <span><Logo /> VoteNotes</span>
            <b>ROOM C8J4</b>
          </div>
          <div className="product-title">
            <div>
              <span className="status-dot">Voting open</span>
              <h2>Where should we go for our team lunch?</h2>
              <p>12 people voting</p>
            </div>
            <div className="product-pill-tag">Live</div>
          </div>
          <div className="product-composer">
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <p>Add a suggestion anonymously</p>
          </div>
          <div className="product-ideas">
            <PreviewIdea rank="01" text="Wood fired pizza downtown" votes="8" leading />
            <PreviewIdea rank="02" text="Tacos on the patio" votes="6" />
            <PreviewIdea rank="03" text="Burger bar down the street" votes="4" />
          </div>
          <div className="product-footer">
            <span>Suggestions stay private</span>
            <strong>Live results</strong>
          </div>
        </div>
      </section>

      {/* ── Join section ── */}
      <section className="home-join">
        <div>
          <span className="eyebrow">Have a session code?</span>
          <h2>Join the conversation.</h2>
        </div>
        <form onSubmit={handleJoin}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            maxLength={8}
          />
          <button type="submit">Join session</button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>

      {/* ── Confidence bar ── */}
      <section className="confidence">
        <p>Built for friends, families, and teams who want <b>fast and fair decisions.</b></p>
        <div>
          <span>No signup needed</span>
          <span>Live voting</span>
          <span>Works on any device</span>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="how" className="feature-section">
        <div className="section-heading">
          <span className="eyebrow">How it works</span>
          <h2>From what does everyone think to a clear final choice.</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feat) => (
            <article key={feat.number}>
              <div>
                <span>{feat.number}</span>
                <b>{feat.icon}</b>
              </div>
              <h3>{feat.title}</h3>
              <p>{feat.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Statement ── */}
      <section className="statement">
        <div>
          <span className="eyebrow">Fair and simple</span>
          <h2>The best idea should win, not the loudest person in the room.</h2>
        </div>
        <p>When people share suggestions without their names attached, everyone speaks honestly. Group voting quickly shows what people truly prefer without any awkwardness.</p>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="faq-section">
        <div>
          <span className="eyebrow">Common questions</span>
          <h2>Everything you need to know to get started.</h2>
        </div>
        <div className="faq-list">
          {FAQ.map(([question, answer], index) => (
            <article className={openFaq === index ? "open" : ""} key={question}>
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                <span>{question}</span>
                <b>{openFaq === index ? "−" : "+"}</b>
              </button>
              {openFaq === index && <p>{answer}</p>}
            </article>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <a className="site-brand" href="#top"><Logo /> VoteNotes</a>
        <p>Simple group decisions made together.</p>
        <button onClick={openCreate}>Start a session</button>
      </footer>
    </main>
  );
}

function SiteHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="site-header">
      <a className="site-brand" href="#top"><Logo /> VoteNotes</a>
      <nav>
        <a href="#how">How it works</a>
        <a href="#faq">FAQ</a>
      </nav>
      <button className="header-cta" onClick={onCreate}>Create a session</button>
    </header>
  );
}

export function Logo() {
  return (
    <span className="brand-symbol" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 12 2 2 4-4" />
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
      </svg>
    </span>
  );
}

function PreviewIdea({ rank, text, votes, leading = false }: { rank: string; text: string; votes: string; leading?: boolean }) {
  return (
    <article className={leading ? "leading" : ""}>
      <div>
        <span>{rank}</span>
        {leading && <b>Leading</b>}
      </div>
      <p>{text}</p>
      <button>
        <span className="vote-badge-count">{votes}</span> votes
      </button>
    </article>
  );
}
