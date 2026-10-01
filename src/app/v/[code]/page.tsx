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
          <span className="vote-brand-mark">✓</span>
          <h1>Session not found</h1>
          <p>This session may have expired, or the code is incorrect.</p>
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
        <div className="vote-loading">Loading your session…</div>
      </main>
    );
  }

  return (
    <main className="vote-app">
      <header className="vote-session-header">
        <div className="vote-page-width">
          <div className="vote-topline">
            <button onClick={() => router.push("/")} className="vote-back-link">
              ← VoteNotes
            </button>
            <div className="vote-session-code">
              <span>Session code</span>
              <strong>{code}</strong>
            </div>
          </div>
          <div className="vote-title-row">
            <div className="vote-title-block">
              <div className={`vote-status ${session.closed ? "is-closed" : ""}`}>
                <span />
                {session.closed ? "Results are final" : "Voting is open"}
              </div>
              <h1>{session.name}</h1>
              {session.description && <p>{session.description}</p>}
            </div>
            <div className="vote-header-actions">
              <button onClick={copyLink} className="vote-button vote-button-secondary">
                {copied ? "✓ Link copied" : "Copy invite link"}
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
            <div className="vote-compose-icon">✦</div>
            <div className="vote-compose-main">
              <label htmlFor="suggestion">Add a suggestion</label>
              <div className="vote-compose-input-row">
                <input
                  id="suggestion"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What should the group consider?"
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
                  ? "Waiting for the first idea"
                  : `${notes.length} idea${notes.length === 1 ? "" : "s"} on the board`}
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
              <div className="vote-blank-icon">◎</div>
              <h3>The board is ready.</h3>
              <p>Share the first anonymous idea to get the conversation started.</p>
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
            The highest-ranked idea is at the top. Thanks for making a decision together.
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
          ? <span className={rank === 1 ? "vote-rank vote-rank-leading" : "vote-rank"}>#{rank}{rank === 1 ? " · leading" : ""}</span>
          : <span>Anonymous idea</span>
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
          <span aria-hidden="true">{note.user_voted ? "✓" : "↑"}</span>
          {note.user_voted ? "Voted" : "Vote"} <strong>{note.vote_count}</strong>
        </button>
        <span className="vote-anonymous">Anonymous</span>
      </div>
    </article>
  );
}
