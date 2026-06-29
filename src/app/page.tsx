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

  return (
    <main className="flex-1 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#D9D9D9] px-6 py-4 flex items-center justify-between">
        <span className="font-serif text-xl text-[#111111]">VoteNotes</span>
        <button
          onClick={() => { setView("create"); setError(""); }}
          className="text-sm border border-[#111111] px-4 py-1.5 rounded-full hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
        >
          Create session
        </button>
      </nav>

      {view === "home" ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
          {/* Illustration */}
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="mb-8 opacity-80">
            <rect x="20" y="30" width="80" height="60" rx="2" stroke="#111111" strokeWidth="1.5" fill="white"/>
            <rect x="28" y="22" width="80" height="60" rx="2" stroke="#111111" strokeWidth="1.5" fill="#FAFAF7"/>
            <line x1="38" y1="42" x2="82" y2="42" stroke="#D9D9D9" strokeWidth="1.5"/>
            <line x1="38" y1="52" x2="70" y2="52" stroke="#D9D9D9" strokeWidth="1.5"/>
            <line x1="38" y1="62" x2="76" y2="62" stroke="#D9D9D9" strokeWidth="1.5"/>
            <circle cx="95" cy="85" r="14" fill="#111111"/>
            <path d="M89 85l4 4 8-8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          <h1 className="font-serif text-5xl md:text-6xl text-[#111111] mb-4 leading-tight max-w-3xl">
            Let your quiet members actually be heard.
          </h1>
          <p className="text-[#555] text-lg max-w-xl mb-10">
            Built for small group and ministry leaders. Suggest ideas anonymously, vote
            anonymously, and see what your group actually thinks — no signup, no awkward
            silence in the room.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-16">
            <button
              onClick={() => { setView("create"); setError(""); }}
              className="bg-[#111111] text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-black transition-colors cursor-pointer"
            >
              Start a session
            </button>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g. ABCD1234)"
                maxLength={8}
                className="border border-[#D9D9D9] bg-white px-4 py-3 rounded-full text-sm w-52 outline-none focus:border-[#111111] transition-colors uppercase tracking-widest"
              />
              <button
                type="submit"
                className="border border-[#111111] text-[#111111] px-5 py-3 rounded-full text-sm font-medium hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
              >
                Join
              </button>
            </form>
          </div>

          {error && <p className="text-red-600 text-sm mb-6">{error}</p>}

          {/* Problem line */}
          <p className="text-[#777] text-base max-w-lg mb-16 italic">
            Group decisions shouldn&apos;t happen over a 40-message text thread or get
            steamrolled by whoever talks first.
          </p>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full mb-16">
            {[
              { step: "1", text: "Start a session — no account needed" },
              { step: "2", text: "Everyone suggests anonymously" },
              { step: "3", text: "Everyone votes anonymously" },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-2">
                <div className="font-serif text-3xl text-[#111111] w-12 h-12 flex items-center justify-center rounded-full border border-[#D9D9D9]">
                  {item.step}
                </div>
                <div className="text-sm text-[#555]">{item.text}</div>
              </div>
            ))}
          </div>

          {/* Use cases */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full">
            {[
              { icon: "🎬", label: "Movie night" },
              { icon: "📚", label: "Study groups" },
              { icon: "⛪", label: "Church planning" },
              { icon: "🔄", label: "Sprint retros" },
            ].map((item) => (
              <div key={item.label} className="border border-[#D9D9D9] bg-white rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs text-[#555]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="bg-white border border-[#D9D9D9] rounded-2xl p-8 w-full max-w-md shadow-sm">
            <button
              onClick={() => setView("home")}
              className="text-sm text-[#888] hover:text-[#111] mb-6 flex items-center gap-1 transition-colors cursor-pointer"
            >
              ← Back
            </button>
            <h2 className="font-serif text-3xl mb-6 text-[#111111]">New session</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wide mb-1 block">Session name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Friday Movie Night"
                  required
                  className="w-full border border-[#D9D9D9] bg-[#FAFAF7] px-4 py-3 rounded-lg text-sm outline-none focus:border-[#111111] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wide mb-1 block">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you deciding?"
                  rows={2}
                  className="w-full border border-[#D9D9D9] bg-[#FAFAF7] px-4 py-3 rounded-lg text-sm outline-none focus:border-[#111111] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#888] uppercase tracking-wide mb-1 block">End time (optional)</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-[#D9D9D9] bg-[#FAFAF7] px-4 py-3 rounded-lg text-sm outline-none focus:border-[#111111] transition-colors"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-[#111111] text-white px-6 py-3 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-black transition-colors mt-2 cursor-pointer"
              >
                {loading ? "Creating…" : "Create session"}
              </button>
            </form>
          </div>
        </div>
      )}

      <footer className="border-t border-[#D9D9D9] px-6 py-4 text-center text-xs text-[#888]">
        VoteNotes · No account required · Fully anonymous
      </footer>
    </main>
  );
}
