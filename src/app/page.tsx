"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateCode, setHostKey } from "@/lib/utils";

type Tone = "peach" | "lav" | "blue";

const CARD_BG: Record<Tone, string> = {
  peach: "linear-gradient(158deg,#FDEFE3,#FBE2CF)",
  lav: "linear-gradient(158deg,#F0EAFB,#E6DCF8)",
  blue: "linear-gradient(158deg,#EAF1F7,#DCE8F1)",
};
const PIN_IMG = { orange: "/pins/orange.svg", purple: "/pins/purple.svg", blue: "/pins/blue.svg" } as const;
const PIN_POS: Record<keyof typeof PIN_IMG, { width: string; top: string }> = {
  orange: { width: "9cqw", top: "-5cqw" },
  purple: { width: "9cqw", top: "-5cqw" },
  blue: { width: "7cqw", top: "-3cqw" },
};
const NUM_COL = { orange: "#E5722A", purple: "#7A5AE0", blue: "#3F63DE" } as const;

type Note = {
  num: string; title: string; emoji: string; tone: Tone;
  pin: keyof typeof PIN_IMG; top: string; left: string; w: string;
  rot: string; z: number; badge?: boolean;
};

const NOTES: Note[] = [
  { num: "01", title: "Movie night", emoji: "🎬", tone: "peach", pin: "orange", top: "0%", left: "3%", w: "45%", rot: "-3deg", z: 5 },
  { num: "02", title: "Board games", emoji: "🎲", tone: "lav", pin: "purple", top: "12%", left: "54%", w: "44%", rot: "3deg", z: 4 },
  { num: "03", title: "Beach day", emoji: "🌴", tone: "blue", pin: "purple", top: "32%", left: "0%", w: "44%", rot: "-2deg", z: 6 },
  { num: "04", title: "Pizza night", emoji: "🍕", tone: "peach", pin: "orange", top: "48%", left: "53%", w: "45%", rot: "2deg", z: 5 },
  { num: "05", title: "Hiking trip", emoji: "⛰️", tone: "lav", pin: "purple", top: "68%", left: "13%", w: "47%", rot: "-4deg", z: 7, badge: true },
];

const STEPS = [
  { n: "1", title: "Start a session", sub: "No account needed", arrow: true },
  { n: "2", title: "Everyone suggests", sub: "anonymously", arrow: true },
  { n: "3", title: "Everyone votes", sub: "anonymously", arrow: false },
];

const HOW = [
  { n: "1", icon: "✍️", title: "Create a session", desc: "Start a session in one click. No account required.", bg: "rgb(251, 234, 220)" },
  { n: "2", icon: "💡", title: "Everyone suggests", desc: "Share ideas anonymously. Everyone gets in.", bg: "rgb(236, 231, 248)" },
  { n: "3", icon: "🗳️", title: "Everyone votes", desc: "Vote anonymously for your favorites.", bg: "rgb(231, 239, 245)" },
  { n: "4", icon: "📊", title: "See the results", desc: "Instant results. The group picks the winner.", bg: "rgb(234, 241, 234)" },
  { n: "5", icon: "🏆", title: "Make decisions", desc: "Move forward together with confidence.", bg: "rgb(251, 234, 220)" },
];

const FAQ = [
  { q: "Do members need to create an account?", a: "No. Anyone joins a session with a short 4-character code — no signup, no email, no app to install. Leaders create a session in one click." },
  { q: "Is it really anonymous?", a: "Yes. Suggestions and votes are anonymous by default, so quieter members can share honestly without pressure. The group only sees the ideas and the totals." },
  { q: "How many people can join a session?", a: "As many as you need for a small group — from a handful of people to a full room. Everyone votes from their own device at the same time." },
  { q: "Is VoteNotes free?", a: "Yes. There are no accounts and no ads. Start a session and share the code — that is the whole flow." },
  { q: "What can I use it for?", a: "Anything a group decides together: events, study topics, hangouts, names, meeting times. If it needs a fair vote, it fits." },
  { q: "Does it work on phones?", a: "Yes — any device, any browser. Nothing to download, and the experience is built to work just as well on a phone as on a laptop." },
];

const FEATURES = [
  { title: "Follower-led", desc: "Not another leadership tool. Built for real groups.", icon: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /><path d="M3.5 19c.4-3 2.6-4.6 5.5-4.6s5.1 1.6 5.5 4.6" /><path d="M15.5 14.6c2.3.2 3.8 1.6 4.2 4.4" /></> },
  { title: "Safe & private", desc: "Anonymous by default. No pressure, no judgment.", icon: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none" /></> },
  { title: "Quick & effortless", desc: "Create a session in seconds. Decisions in minutes.", icon: <polygon points="13 2 5 13 11 13 10 22 19 10 13 10 13 2" /> },
  { title: "Works anywhere", desc: "Any device, any browser. No downloads.", icon: <><rect x="2.5" y="5" width="13" height="9" rx="1.6" /><rect x="17" y="8" width="5" height="11" rx="1.4" /><line x1="6" y1="17.5" x2="11" y2="17.5" /></> },
];

const muted = "rgb(139, 134, 124)";

function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return { ref, visible } as const;
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"home" | "create">("home");
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const stepsReveal = useScrollReveal<HTMLElement>();
  const featuresReveal = useScrollReveal<HTMLElement>();
  const howReveal = useScrollReveal<HTMLElement>();
  const faqReveal = useScrollReveal<HTMLElement>();
  const footerReveal = useScrollReveal<HTMLElement>();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const code = generateCode();
    const hostKey = crypto.randomUUID();

    const { error: err } = await supabase.from("sessions").insert({
      code,
      name: name.trim(),
      description: description.trim() || null,
      end_time: endTime || null,
    });

    if (err) {
      setError("Failed to create session. Please try again.");
      setLoading(false);
      return;
    }

    setHostKey(code, hostKey);
    router.push(`/v/${code}`);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setError("");

    const { data } = await supabase.from("sessions").select("code").eq("code", code).single();

    if (!data) {
      setError("Session not found. Check your code and try again.");
      return;
    }
    router.push(`/v/${code}`);
  }

  function startSession() {
    setView("create");
    setError("");
  }

  if (view === "create") {
    return (
      <main className="landing flex-1 flex items-center justify-center px-6 py-20" style={{ background: "#F4F2ED", color: "#1B1A16" }}>
        <div className="w-full max-w-md rounded-2xl p-8" style={{ background: "#fff", border: "1px solid #EAE6DD", boxShadow: "rgba(40,30,20,0.2) 0px 18px 40px -16px" }}>
          <button onClick={() => setView("home")} className="text-sm mb-6 flex items-center gap-1 cursor-pointer" style={{ color: "#857F75" }}>
            ← Back
          </button>
          <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 30, marginBottom: 22 }}>New session</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="Session name *">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Friday Movie Night" required style={inputStyle} />
            </Field>
            <Field label="Description (optional)">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you deciding?" rows={2} style={{ ...inputStyle, resize: "none" }} />
            </Field>
            <Field label="End time (optional)">
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
            </Field>
            {error && <p className="text-sm" style={{ color: "#b00020" }}>{error}</p>}
            <button type="submit" disabled={loading || !name.trim()} className="cursor-pointer disabled:opacity-40" style={{ background: "#1B1A16", color: "#F4F2ED", padding: "13px 24px", borderRadius: 10, fontWeight: 600, fontSize: 15, marginTop: 6 }}>
              {loading ? "Creating…" : "Create session"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main
      className="landing flex-1"
      style={{ background: "rgb(244, 242, 237)", color: "rgb(27, 26, 22)", fontSize: 16, lineHeight: 1.5, overflowX: "hidden" }}
    >
      {/* Nav */}
      <header className="reveal-down" style={{ ["--delay" as string]: "40ms", position: "sticky", top: 0, zIndex: 60, backdropFilter: "blur(12px)", background: "rgba(244, 242, 237, 0.8)", borderBottom: "1px solid rgb(232, 228, 219)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "15px clamp(18px, 4vw, 40px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <a href="#top" className="reveal-up" style={{ ["--delay" as string]: "100ms", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", width: 30, height: 30, border: "2px solid", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12.5 10 18 20 5.5" /></svg>
            </span>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>VoteNotes</span>
          </a>
          <nav className="hidden min-[880px]:flex reveal-up" style={{ ["--delay" as string]: "160ms", alignItems: "center", gap: 28 }}>
            {[["How it works", "#how"], ["Features", "#features"], ["FAQ", "#faq"]].map(([l, h]) => (
              <a key={l} href={h} style={{ color: "rgb(94, 90, 82)", fontSize: 14, fontWeight: 600 }}>{l}</a>
            ))}
          </nav>
          <button onClick={startSession} className="cursor-pointer reveal-up shine" style={{ ["--delay" as string]: "220ms", background: "rgb(27, 26, 22)", color: "rgb(244, 242, 237)", fontWeight: 600, fontSize: 15, padding: "11px 20px", borderRadius: 999 }}>
            Create session
          </button>
        </div>
      </header>

      <a id="top" />

      {/* Hero */}
      <section className="section-rise" style={{ ["--delay" as string]: "120ms", maxWidth: 1200, margin: "0 auto", padding: "clamp(36px, 6vw, 76px) clamp(18px, 4vw, 40px) clamp(40px, 5vw, 64px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(28px, 4vw, 56px)" }}>
        <div className="section-rise" style={{ ["--delay" as string]: "240ms", flex: "1 1 420px", minWidth: 300 }}>
          <div className="reveal-up" style={{ ["--delay" as string]: "220ms", display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid rgb(233, 229, 220)", borderRadius: 999, padding: "5px 14px 5px 6px", boxShadow: "rgba(0,0,0,0.03) 0px 1px 2px" }}>
            <span style={{ display: "inline-flex" }}>
              {[["AK", "rgb(241,201,168)", "rgb(122,74,34)", 0], ["M", "rgb(199,190,234)", "rgb(75,58,134)", -9], ["J", "rgb(169,203,230)", "rgb(40,75,107)", -9]].map(([t, bg, col, ml]) => (
                <span key={t as string} style={{ width: 26, height: 26, borderRadius: "50%", background: bg as string, border: "2px solid rgb(244,242,237)", marginLeft: ml as number, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: col as string }}>{t}</span>
              ))}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgb(90, 86, 79)" }}>Loved by small group leaders</span>
          </div>

          <h1 className="reveal-up" style={{ ["--delay" as string]: "320ms", fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: "clamp(42px, 7vw, 82px)", lineHeight: 1.02, letterSpacing: "-0.02em", margin: "22px 0 0" }}>
            Let your quiet members actually be{" "}
            <span style={{ fontStyle: "italic", borderBottom: "3px solid", paddingBottom: 2 }}>heard.</span>
          </h1>

          <p className="reveal-up" style={{ ["--delay" as string]: "410ms", color: "rgb(94, 90, 82)", fontSize: "clamp(16px, 1.5vw, 18px)", lineHeight: 1.6, maxWidth: 480, margin: "24px 0 0" }}>
            Built for small group leaders. Suggest ideas anonymously, vote anonymously, and see what your group actually thinks — no signup, no awkward silence in the room.
          </p>

          <div className="reveal-up" style={{ ["--delay" as string]: "500ms", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, margin: "32px 0 0" }}>
            <button onClick={startSession} className="cursor-pointer shine" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgb(27, 26, 22)", color: "rgb(244, 242, 237)", fontWeight: 600, fontSize: 16, padding: "15px 24px", borderRadius: 999 }}>
              Start a session
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" /></svg>
            </button>
            <form onSubmit={handleJoin} style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid rgb(228, 223, 213)", borderRadius: 999, padding: "5px 5px 5px 18px" }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g. AB12)"
                maxLength={8}
                style={{ border: 0, outline: 0, background: "transparent", fontSize: 15, fontFamily: "inherit", color: "inherit", width: 150, letterSpacing: "0.04em" }}
              />
              <button type="submit" className="cursor-pointer" style={{ background: "rgb(241, 238, 231)", border: "1px solid rgb(228, 223, 213)", color: "inherit", fontWeight: 600, fontSize: 15, padding: "10px 18px", borderRadius: 999 }}>Join</button>
            </form>
          </div>
          {error && <p className="text-sm reveal-up" style={{ ["--delay" as string]: "600ms", color: "#b00020", marginTop: 14 }}>{error}</p>}

          <div className="reveal-up" style={{ ["--delay" as string]: "610ms", display: "flex", alignItems: "center", gap: 9, margin: "22px 0 0", color: "rgb(107, 103, 95)", fontSize: 14, fontWeight: 500 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /></svg>
            <span>No account.&nbsp;&nbsp;No ads.&nbsp;&nbsp;Fully anonymous.</span>
          </div>
        </div>

        {/* Pinboard */}
        <div className="section-rise" style={{ ["--delay" as string]: "280ms", flex: "1 1 420px", minWidth: 300, display: "flex", justifyContent: "center" }}>
          <div className="board-assemble" style={{ ["--delay" as string]: "340ms", position: "relative", width: "100%", maxWidth: 560, aspectRatio: "1 / 1.04", containerType: "size" }}>
            <svg viewBox="0 0 100 104" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
              <path d="M52 22 C66 24 70 28 74 32" fill="none" stroke="#C8C2B6" strokeWidth=".4" strokeDasharray="2 2" />
              <path d="M40 40 C30 44 30 52 38 58" fill="none" stroke="#C8C2B6" strokeWidth=".4" strokeDasharray="2 2" />
              <path d="M70 60 C58 66 48 66 40 66" fill="none" stroke="#C8C2B6" strokeWidth=".4" strokeDasharray="2 2" />
            </svg>

            {NOTES.map((n) => (
              <div
                key={n.num}
                className="note-place"
                style={{
                  ["--delay" as string]: `${500 + Number(n.num) * 105}ms`,
                  ["--note-rot" as string]: n.rot,
                  ["--from-x" as string]: Number(n.num) % 2 === 1 ? "-26px" : "22px",
                  ["--from-y" as string]: Number(n.num) <= 2 ? "-26px" : "26px",
                  ["--from-rot" as string]: Number(n.num) % 2 === 1 ? "-10deg" : "12deg",
                  position: "absolute",
                  top: n.top,
                  left: n.left,
                  width: n.w,
                  zIndex: n.z,
                }}
              >
                <div style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={PIN_IMG[n.pin]}
                    alt=""
                    aria-hidden="true"
                    className="pin-drop"
                    style={{
                      ["--delay" as string]: `${700 + Number(n.num) * 105}ms`,
                      position: "absolute",
                      left: "50%",
                      top: PIN_POS[n.pin].top,
                      transform: "translateX(-50%)",
                      width: PIN_POS[n.pin].width,
                      height: "auto",
                      zIndex: 9,
                      pointerEvents: "none",
                      filter: "drop-shadow(0 1.6cqw 1.4cqw rgba(40,30,20,0.22))",
                    }}
                  />
                  <div className="pin-shadow" style={{ ["--delay" as string]: `${540 + Number(n.num) * 105}ms`, position: "relative", background: CARD_BG[n.tone], borderRadius: "4.5cqw", padding: "5.4cqw 5cqw 4.8cqw", boxShadow: "0 9cqw 20cqw -8cqw rgba(60,45,30,.32)" }}>
                    <div style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "8cqw", lineHeight: 1, color: NUM_COL[n.pin] }}>{n.num}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2cqw", marginTop: "0.6cqw" }}>
                      <span style={{ fontWeight: 700, fontSize: "4.5cqw", letterSpacing: "-0.02em", color: "rgb(33, 31, 26)", whiteSpace: "nowrap" }}>{n.title}</span>
                      <span style={{ fontSize: "5.6cqw", lineHeight: 1 }}>{n.emoji}</span>
                    </div>
                    {n.badge ? (
                      <div className="note-label-rise" style={{ ["--delay" as string]: `${880 + Number(n.num) * 105}ms`, display: "inline-flex", alignItems: "center", gap: "1.4cqw", marginTop: "3cqw", background: "rgba(123, 90, 224, 0.16)", color: "rgb(91, 63, 191)", fontWeight: 700, fontSize: "3.1cqw", padding: "1.4cqw 2.6cqw", borderRadius: 999 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 12 10 18 20 6" /></svg>
                        Most voted
                      </div>
                    ) : (
                      <div className="note-label-rise" style={{ ["--delay" as string]: `${880 + Number(n.num) * 105}ms`, marginTop: "3.4cqw", fontSize: "3.1cqw", color: "rgb(154, 147, 135)", fontWeight: 500 }}>Suggested by someone</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ position: "absolute", right: "-1%", top: "90%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
              <svg width="40" height="30" viewBox="0 0 40 30" fill="none" stroke="#9A9387" strokeWidth="1.4" strokeLinecap="round"><path d="M2 4 C14 2 26 8 30 22" /><polyline points="24 20 31 24 33 16" /></svg>
              <span style={{ fontFamily: "Caveat, cursive", fontSize: "clamp(18px, 3.4cqw, 24px)", color: "rgb(74, 70, 63)", lineHeight: 1.05, fontWeight: 600 }}>The group<br />picks the winner ✦</span>
            </div>
          </div>
        </div>
      </section>

      <div style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.027) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.027) 1px, transparent 1px)", backgroundSize: "42px 42px" }}>
        {/* Steps */}
        <section ref={stepsReveal.ref} className={`scroll-reveal lift ${stepsReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "60ms", maxWidth: 1200, margin: "0 auto", padding: "clamp(34px, 4vw, 52px) clamp(18px, 4vw, 40px)", borderTop: "1px solid rgb(232, 228, 219)" }}>
          <div className={`scroll-reveal pop ${stepsReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "130ms", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "clamp(14px, 2vw, 26px)" }}>
            {STEPS.map((s) => (
              <div key={s.n} className={`scroll-reveal lift ${stepsReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: `${220 + Number(s.n) * 120}ms`, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ flex: "0 0 auto", width: 42, height: 42, borderRadius: "50%", border: "1px solid rgb(225, 220, 210)", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17 }}>{s.n}</span>
                <span>
                  <span style={{ display: "block", fontWeight: 700, fontSize: 15.5, letterSpacing: "-0.01em" }}>{s.title}</span>
                  <span style={{ display: "block", color: muted, fontSize: 13.5, fontWeight: 500 }}>{s.sub}</span>
                </span>
                {s.arrow && (
                  <svg width="42" height="14" viewBox="0 0 42 14" fill="none" stroke="#B8B2A6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 4px" }}><line x1="2" y1="7" x2="36" y2="7" /><polyline points="31 2 38 7 31 12" /></svg>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section ref={featuresReveal.ref} id="features" className={`scroll-reveal lift ${featuresReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "80ms", maxWidth: 1140, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(30px, 4vw, 48px)" }}>
          <div className={`scroll-reveal board ${featuresReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "170ms", background: "#fff", border: "1px solid rgb(234, 230, 221)", borderRadius: 26, boxShadow: "rgba(40,30,20,0.25) 0px 24px 50px -34px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", overflow: "hidden" }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`scroll-reveal lift ${featuresReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: `${260 + i * 120}ms`, padding: "34px 26px", textAlign: "center", borderRight: i < FEATURES.length - 1 ? "1px solid rgb(239, 235, 227)" : undefined }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16.5, letterSpacing: "-0.01em" }}>{f.title}</div>
                <div style={{ color: "rgb(136, 131, 122)", fontSize: 13.5, marginTop: 7, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section ref={howReveal.ref} id="how" className={`scroll-reveal lift ${howReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "80ms", maxWidth: 1140, margin: "0 auto", padding: "clamp(14px, 2vw, 28px) clamp(18px, 4vw, 40px) clamp(40px, 5vw, 64px)" }}>
          <div className={`scroll-reveal pop ${howReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "170ms", display: "flex", justifyContent: "center", marginBottom: 30 }}>
            <span style={{ background: "#fff", border: "1px solid rgb(233, 229, 220)", borderRadius: 999, padding: "7px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", color: "rgb(122, 117, 107)" }}>HOW IT WORKS</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "clamp(10px, 1.4vw, 16px)" }}>
            {HOW.map((h) => (
              <div key={h.n} className={`scroll-reveal lift ${howReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: `${250 + Number(h.n) * 120}ms`, background: h.bg, border: "1px solid rgba(0,0,0,0.04)", borderRadius: 16, padding: "20px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,0.7)", fontSize: 17 }}>{h.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "rgb(163, 156, 142)" }}>{h.n}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: "-0.01em", marginTop: 18 }}>{h.title}</div>
                <div style={{ color: "rgb(133, 127, 117)", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>{h.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section ref={faqReveal.ref} id="faq" className={`scroll-reveal lift ${faqReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "80ms", maxWidth: 760, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(48px, 6vw, 72px)" }}>
          <h2 className={`scroll-reveal pop ${faqReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "160ms", fontFamily: "Newsreader, serif", fontWeight: 500, fontSize: "clamp(30px, 4vw, 44px)", letterSpacing: "-0.02em", textAlign: "center", margin: "0 0 28px" }}>Questions, answered.</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className={`scroll-reveal lift ${faqReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: `${250 + i * 110}ms`, background: "#fff", border: "1px solid rgb(234, 230, 221)", borderRadius: 16, overflow: "hidden" }}>
                  <button onClick={() => setOpenFaq(open ? -1 : i)} className="cursor-pointer" style={{ width: "100%", background: "transparent", border: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 20px", textAlign: "left", color: "inherit" }}>
                    <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>{f.q}</span>
                    <span style={{ display: "inline-flex", flex: "0 0 auto", color: open ? "rgb(27, 26, 22)" : "rgb(154, 149, 139)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s ease" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                  </button>
                  {open && (
                    <div style={{ padding: "0 20px 18px", color: "rgb(110, 105, 96)", fontSize: 14.5, lineHeight: 1.6 }}>{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer ref={footerReveal.ref} className={`scroll-reveal fade-down ${footerReveal.visible ? "is-visible" : ""}`} style={{ ["--delay" as string]: "80ms", borderTop: "1px solid rgb(232, 228, 219)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "26px clamp(18px, 4vw, 40px)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>VoteNotes</span>
            <span style={{ color: muted, fontSize: 13.5, fontWeight: 500 }}>No accounts. No ads. Fully anonymous.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#top" style={{ color: "rgb(94, 90, 82)", fontSize: 14, fontWeight: 600 }}>About</a>
            <a href="#faq" style={{ color: "rgb(94, 90, 82)", fontSize: 14, fontWeight: 600 }}>FAQ</a>
            <a href="#top" style={{ color: "rgb(94, 90, 82)", fontSize: 14, fontWeight: 600 }}>Privacy</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E8E4DB",
  background: "#F4F2ED",
  padding: "12px 16px",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  color: "inherit",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "#857F75", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4, display: "block" }}>{label}</label>
      {children}
    </div>
  );
}
