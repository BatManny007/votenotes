"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getVoterId, getHostKey } from "@/lib/utils";
import type { Session, NoteWithVotes } from "@/lib/database.types";

type SortOrder = "votes" | "newest" | "oldest";

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<NoteWithVotes[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sort, setSort] = useState<SortOrder>("votes");
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [voterId, setVoterId] = useState("");
  const [notFound, setNotFound] = useState(false);

  const fetchNotes = useCallback(async (sessionId: string, vid: string) => {
    const { data: notesData } = await supabase
      .from("notes")
      .select("*, votes(voter_id)")
      .eq("session_id", sessionId);

    if (!notesData) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enriched: NoteWithVotes[] = notesData.map((n: any) => {
      const voteList = (n.votes as { voter_id: string }[]) || [];
      return {
        id: n.id,
        session_id: n.session_id,
        content: n.content,
        created_at: n.created_at,
        vote_count: voteList.length,
        user_voted: voteList.some((v) => v.voter_id === vid),
      };
    });

    setNotes(enriched);
  }, []);

  useEffect(() => {
    const vid = getVoterId();
    setVoterId(vid);
    setIsHost(!!getHostKey(code));

    supabase
      .from("sessions")
      .select("*")
      .eq("code", code)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        if (!data) { setNotFound(true); return; }
        setSession(data);
        fetchNotes(data.id, vid);

        // Realtime
        const channel = supabase
          .channel(`session-${data.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `session_id=eq.${data.id}` },
            () => fetchNotes(data.id, vid))
          .on("postgres_changes", { event: "*", schema: "public", table: "votes" },
            () => fetchNotes(data.id, vid))
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${data.id}` },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ({ new: updated }: { new: any }) => setSession(updated as Session))
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      });
  }, [code, fetchNotes]);

  const sorted = [...notes].sort((a, b) => {
    if (sort === "votes") return b.vote_count - a.vote_count;
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !session) return;
    setSubmitting(true);
    await supabase.from("notes").insert({ session_id: session.id, content: content.trim() });
    setContent("");
    setSubmitting(false);
  }

  async function handleVote(note: NoteWithVotes) {
    if (!session || session.closed) return;
    if (note.user_voted) return;
    await supabase.from("votes").insert({ note_id: note.id, voter_id: voterId });
  }

  async function handleClose() {
    if (!session) return;
    await supabase.from("sessions").update({ closed: true }).eq("id", session.id);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (notFound) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl mb-4">Session not found</h1>
        <p className="text-[#888] mb-8">This session may have expired or the code is incorrect.</p>
        <button onClick={() => router.push("/")} className="bg-[#111111] text-white px-6 py-3 rounded-full text-sm cursor-pointer">
          Go home
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-[#888] text-sm animate-pulse">Loading session…</div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-[#D9D9D9] px-6 py-5">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <button onClick={() => router.push("/")} className="text-xs text-[#888] hover:text-[#111] transition-colors mb-1 cursor-pointer">
                ← VoteNotes
              </button>
              <h1 className="font-serif text-4xl sm:text-5xl text-[#111111] break-words leading-tight">{session.name}</h1>
              {session.description && (
                <p className="text-sm text-[#666] mt-0.5 break-words">{session.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={copyLink}
                className="border border-[#D9D9D9] text-[#111111] px-4 py-2 rounded-full text-xs hover:border-[#111] transition-colors cursor-pointer"
              >
                {copied ? "Copied!" : `Share · ${code}`}
              </button>
              {isHost && !session.closed && (
                <button
                  onClick={handleClose}
                  className="border border-red-300 text-red-600 px-4 py-2 rounded-full text-xs hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Close voting
                </button>
              )}
            </div>
          </div>
          {session.closed && (
            <div className="inline-flex items-center gap-1.5 text-xs bg-[#111] text-white px-3 py-1 rounded-full w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70 inline-block" />
              Voting closed · Results final
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        {/* Submit note */}
        {!session.closed && (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add an anonymous suggestion…"
              className="flex-1 border border-[#D9D9D9] bg-white px-4 py-3 rounded-xl text-sm outline-none focus:border-[#111111] transition-colors shadow-sm"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="bg-[#111111] text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-black transition-colors cursor-pointer shrink-0"
            >
              {submitting ? "…" : "Submit"}
            </button>
          </form>
        )}

        {/* Sort controls */}
        {notes.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#888]">Sort:</span>
            {(["votes", "newest", "oldest"] as SortOrder[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                  sort === s
                    ? "bg-[#111111] text-white border-[#111111]"
                    : "border-[#D9D9D9] text-[#666] hover:border-[#111]"
                }`}
              >
                {s === "votes" ? "Most votes" : s === "newest" ? "Newest" : "Oldest"}
              </button>
            ))}
            <span className="ml-auto text-xs text-[#888]">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Notes grid */}
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-4 opacity-40">
              <rect x="10" y="15" width="60" height="50" rx="2" stroke="#111111" strokeWidth="1.5" fill="white"/>
              <line x1="20" y1="30" x2="60" y2="30" stroke="#D9D9D9" strokeWidth="1.5"/>
              <line x1="20" y1="40" x2="50" y2="40" stroke="#D9D9D9" strokeWidth="1.5"/>
              <line x1="20" y1="50" x2="55" y2="50" stroke="#D9D9D9" strokeWidth="1.5"/>
            </svg>
            <p className="text-[#888] text-sm">No suggestions yet. Be the first to add one!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sorted.map((note, i) => (
              <NoteCard
                key={note.id}
                note={note}
                rank={sort === "votes" ? i + 1 : undefined}
                closed={session.closed}
                onVote={() => handleVote(note)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function NoteCard({
  note,
  rank,
  closed,
  onVote,
}: {
  note: NoteWithVotes;
  rank?: number;
  closed: boolean;
  onVote: () => void;
}) {
  return (
    <div className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col gap-3 transition-all ${
      note.user_voted ? "border-[#111111]" : "border-[#D9D9D9] hover:border-[#aaa]"
    }`}>
      {rank === 1 && (
        <div className="text-[10px] uppercase tracking-widest text-[#888] font-medium"># Top pick</div>
      )}
      <p className="text-sm text-[#111111] leading-relaxed flex-1">{note.content}</p>
      <div className="flex items-center justify-between">
        <button
          onClick={onVote}
          disabled={note.user_voted || closed}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors rounded-full px-3 py-1.5 border ${
            note.user_voted
              ? "bg-[#111111] text-white border-[#111111] cursor-default"
              : closed
              ? "border-[#D9D9D9] text-[#999] cursor-default"
              : "border-[#D9D9D9] text-[#555] hover:border-[#111] hover:text-[#111] cursor-pointer"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2L7 10M7 2L4 5M7 2L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {note.vote_count}
        </button>
        <span className="text-[10px] text-[#bbb]">
          {new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
