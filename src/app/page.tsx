"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateCode, setHostKey } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"home" | "create">("home");
  const [error, setError] = useState("");

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

    const { data } = await supabase
      .from("sessions")
      .select("code")
      .eq("code", code)
      .single();

    if (!data) {
      setError("Session not found. Check your code and try again.");
      return;
    }
    router.push(`/v/${code}`);
  }

  const stickyNotes = [
    { title: "Movie night", emoji: "🎬", bg: "#FBE2CF", rot: "-5deg" },
    { title: "Board games", emoji: "🎲", bg: "#E6DCF8", rot: "4deg" },
    { title: "Beach day", emoji: "🌴", bg: "#DCE8F1", rot: "-2deg" },
    { title: "Pizza night", emoji: "🍕", bg: "#FBE2CF", rot: "6deg" },
    { title: "Hiking trip", emoji: "⛰️", bg: "#E6DCF8", rot: "-4deg" },
  ];

  return (
    <main className="landing flex-1 flex flex-col bg-[#F4F2ED] text-[#1B1A16]">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <span className="font-news text-2xl text-[#1B1A16]">VoteNotes</span>
        <button
          onClick={() => { setView("create"); setError(""); }}
          className="text-sm font-medium border border-[#1B1A16] px-4 py-1.5 rounded-full hover:bg-[#1B1A16] hover:text-[#F4F2ED] transition-colors cursor-pointer"
        >
          Create session
        </button>
      </nav>

      {view === "home" ? (
        <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-20">
          {/* Hero */}
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-8 mb-24">
            {/* Copy */}
            <div className="flex-1 text-center md:text-left">
              <span className="inline-block text-xs font-semibold tracking-wide text-[#5A564F] bg-white border border-[#EAE6DD] rounded-full px-3 py-1 mb-6">
                For small group leaders
              </span>
              <h1 className="font-news text-5xl md:text-6xl leading-[1.05] text-[#1B1A16] mb-5">
                Let your quiet members actually be{" "}
                <span className="border-b-[3px] border-[#ED7A2E] pb-0.5">heard.</span>
              </h1>
              <p className="text-[#5E5A52] text-lg max-w-xl mx-auto md:mx-0 mb-8 leading-relaxed">
                Built for small group leaders. Suggest ideas anonymously, vote
                anonymously, and see what your group actually thinks — no signup, no
                awkward silence in the room.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <button
                  onClick={() => { setView("create"); setError(""); }}
                  className="bg-[#1B1A16] text-[#F4F2ED] px-8 py-3 rounded-full text-sm font-semibold hover:bg-black transition-colors cursor-pointer"
                >
                  Start a session
                </button>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    maxLength={8}
                    className="border border-[#E8E4DB] bg-white px-4 py-3 rounded-full text-sm w-40 outline-none focus:border-[#1B1A16] transition-colors uppercase tracking-widest"
                  />
                  <button
                    type="submit"
                    className="border border-[#1B1A16] text-[#1B1A16] px-5 py-3 rounded-full text-sm font-semibold hover:bg-[#1B1A16] hover:text-[#F4F2ED] transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              </div>
              <p className="text-xs text-[#857F75] mt-3">No account needed</p>
              {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            </div>

            {/* Pinboard */}
            <div className="flex-1 w-full flex justify-center">
              <div className="relative bg-white border border-[#EAE6DD] rounded-3xl p-8 w-full max-w-md shadow-[0_18px_40px_-16px_rgba(60,45,30,0.25)]">
                <div className="flex flex-wrap justify-center gap-4">
                  {stickyNotes.map((n) => (
                    <div
                      key={n.title}
                      style={{ backgroundColor: n.bg, transform: `rotate(${n.rot})` }}
                      className="rounded-2xl px-5 py-4 shadow-sm w-[140px]"
                    >
                      <div className="text-2xl mb-1">{n.emoji}</div>
                      <div className="text-sm font-semibold text-[#1B1A16]">{n.title}</div>
                    </div>
                  ))}
                </div>
                <p className="font-hand text-2xl text-[#5B3FBF] text-center mt-6 -rotate-2">
                  The group picks the winner ✦
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mb-24">
            <h2 className="font-news text-3xl md:text-4xl text-center text-[#1B1A16] mb-12">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                { step: "1", title: "Start a session", sub: "No account needed" },
                { step: "2", title: "Everyone suggests", sub: "Anonymously, from any device" },
                { step: "3", title: "Everyone votes", sub: "The group picks the winner" },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center gap-3">
                  <div className="font-news text-2xl text-[#1B1A16] w-12 h-12 flex items-center justify-center rounded-full bg-[#FBE2CF] border border-[#F1C9A8]">
                    {item.step}
                  </div>
                  <div className="font-semibold text-[#1B1A16]">{item.title}</div>
                  <div className="text-sm text-[#6E6960] max-w-[180px]">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Use cases */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: "🎬", label: "Movie night" },
              { icon: "📚", label: "Study groups" },
              { icon: "⛪", label: "Church planning" },
              { icon: "🔄", label: "Sprint retros" },
            ].map((item) => (
              <div key={item.label} className="border border-[#EAE6DD] bg-white rounded-2xl p-4 text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs text-[#6E6960]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="bg-white border border-[#EAE6DD] rounded-2xl p-8 w-full max-w-md shadow-[0_18px_40px_-16px_rgba(60,45,30,0.2)]">
            <button
              onClick={() => setView("home")}
              className="text-sm text-[#857F75] hover:text-[#1B1A16] mb-6 flex items-center gap-1 transition-colors cursor-pointer"
            >
              ← Back
            </button>
            <h2 className="font-news text-3xl mb-6 text-[#1B1A16]">New session</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#857F75] uppercase tracking-wide mb-1 block">Session name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Friday Movie Night"
                  required
                  className="w-full border border-[#E8E4DB] bg-[#F4F2ED] px-4 py-3 rounded-lg text-sm outline-none focus:border-[#1B1A16] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#857F75] uppercase tracking-wide mb-1 block">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you deciding?"
                  rows={2}
                  className="w-full border border-[#E8E4DB] bg-[#F4F2ED] px-4 py-3 rounded-lg text-sm outline-none focus:border-[#1B1A16] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#857F75] uppercase tracking-wide mb-1 block">End time (optional)</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-[#E8E4DB] bg-[#F4F2ED] px-4 py-3 rounded-lg text-sm outline-none focus:border-[#1B1A16] transition-colors"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-[#1B1A16] text-[#F4F2ED] px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-40 hover:bg-black transition-colors mt-2 cursor-pointer"
              >
                {loading ? "Creating…" : "Create session"}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="px-6 py-6 text-center text-xs text-[#857F75]">
        VoteNotes · No accounts · No ads · Fully anonymous
      </footer>
    </main>
  );
}
