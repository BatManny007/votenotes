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
  const [isHost] = useState(() => !!getHostKey(code));
  const [voterId] = useState(() => getVoterId());
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
    const vid = voterId;

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
  }, [code, fetchNotes, voterId]);

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
      <main className="vote-app vote-empty-state">
        <div className="vote-empty-card">
          <span className="vote-brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 12 2 2 4-4" />
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
            </svg>
          </span>
          <h1>Room not found</h1>
          <p>We could not find this session. Please check the code or ask your host for the invite link.</p>
          <button onClick={() => router.push("/")} className="vote-button vote-button-primary">
            Go home
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="vote-app vote-empty-state">
        <div className="vote-loading">Loading room...</div>
      </main>
    );
  }

  return (
    <main className="vote-app">
      <header className="vote-session-header">
        <div className="vote-page-width">
          <div className="vote-topline">
            <button onClick={() => router.push("/")} className="vote-back-link">
              <span className="vote-brand-mark-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 12 2 2 4-4" />
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                </svg>
              </span>
              VoteNotes
            </button>
            <div className="vote-session-code">
              <span>Room code</span>
              <strong>{code}</strong>
            </div>
          </div>
          <div className="vote-title-row">
            <div className="vote-title-block">
              <div className={`vote-status ${session.closed ? "is-closed" : ""}`}>
                <span />
                {session.closed ? "Voting closed" : "Voting is open"}
              </div>
              <h1>{session.name}</h1>
              {session.description && <p>{session.description}</p>}
            </div>
            <div className="vote-header-actions">
              <button onClick={copyLink} className="vote-button vote-button-secondary">
                {copied ? "Link copied" : "Copy invite link"}
              </button>
              {isHost && !session.closed && (
                <button onClick={handleClose} className="vote-button vote-button-danger">
                  Close voting
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="vote-page-width vote-content">
        {!session.closed && (
          <form onSubmit={handleSubmit} className="vote-compose">
            <div className="vote-compose-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div className="vote-compose-main">
              <label htmlFor="suggestion">Add your suggestion</label>
              <div className="vote-compose-input-row">
                <input
                  id="suggestion"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What idea should the group consider?"
                />
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="vote-button vote-button-primary"
                >
                  {submitting ? "Adding…" : "Add idea"}
                </button>
              </div>
            </div>
          </form>
        )}

        <section className="vote-ideas-section">
          <div className="vote-ideas-heading">
            <div>
              <p className="vote-eyebrow">Group ideas</p>
              <h2>
                {notes.length === 0
                  ? "Waiting for ideas"
                  : `${notes.length} idea${notes.length === 1 ? "" : "s"} submitted`}
              </h2>
            </div>
            {notes.length > 1 && (
              <div className="vote-sort" aria-label="Sort ideas">
                {(["votes", "newest", "oldest"] as SortOrder[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={sort === s ? "is-active" : ""}
                  >
                    {s === "votes" ? "Most votes" : s === "newest" ? "Newest" : "Oldest"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {notes.length === 0 ? (
            <div className="vote-blank-board">
              <div className="vote-blank-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 12h6" />
                  <path d="M12 9v6" />
                </svg>
              </div>
              <h3>No ideas yet</h3>
              <p>Be the first to share a suggestion. Type an idea above to get things started.</p>
            </div>
          ) : (
            <div className="vote-notes-grid">
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
        </section>

        {session.closed && notes.length > 0 && (
          <div className="vote-results-note">
            Voting is closed. The group top choice is pinned at the top.
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
    <article className={`vote-note-card ${note.user_voted ? "is-voted" : ""} ${rank === 1 ? "is-leading" : ""}`}>
      <div className="vote-note-meta">
        {rank
          ? <span className={rank === 1 ? "vote-rank vote-rank-leading" : "vote-rank"}>#{rank} {rank === 1 ? "Top choice" : ""}</span>
          : <span>Private idea</span>
        }
        <time>{new Date(note.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </div>
      <p>{note.content}</p>
      <div className="vote-note-footer">
        <button
          onClick={onVote}
          disabled={note.user_voted || closed}
          className="vote-vote-button"
        >
          {note.user_voted ? "Voted" : "Vote"} <strong>{note.vote_count}</strong>
        </button>
        <span className="vote-anonymous">Anonymous</span>
      </div>
    </article>
  );
}
