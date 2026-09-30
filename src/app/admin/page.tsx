import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Session, Note } from "@/lib/database.types";
import "./admin.css";

type SearchParams = Promise<{ key?: string }>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function supabaseServer(): any {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || key !== secret) {
    redirect("/");
  }

  const db = supabaseServer();

  const [
    { count: totalSessions },
    { count: totalNotes },
    { count: totalVotes },
    { data: recentSessions },
    { data: notesPerDay },
  ] = await Promise.all([
    db.from("sessions").select("*", { count: "exact", head: true }) as Promise<{ count: number }>,
    db.from("notes").select("*", { count: "exact", head: true }) as Promise<{ count: number }>,
    db.from("votes").select("*", { count: "exact", head: true }) as Promise<{ count: number }>,
    db
      .from("sessions")
      .select("id, code, name, created_at, closed")
      .order("created_at", { ascending: false })
      .limit(10) as Promise<{ data: Pick<Session, "id" | "code" | "name" | "created_at" | "closed">[] }>,
    db
      .from("notes")
      .select("created_at")
      // eslint-disable-next-line react-hooks/purity -- this Server Component builds a time-bounded report per request.
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as Promise<{ data: Pick<Note, "created_at">[] }>,
  ]);

  // Count notes per day for the last 7 days
  const dayCounts: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayCounts[d.toISOString().slice(0, 10)] = 0;
  }
  for (const note of notesPerDay ?? []) {
    const day = note.created_at.slice(0, 10);
    if (day in dayCounts) dayCounts[day]++;
  }

  // Top sessions by note count
  const { data: topSessionsRaw } = (await db
    .from("notes")
    .select("session_id, sessions(name, code)")) as {
    data: { session_id: string; sessions: Pick<Session, "name" | "code"> | null }[] | null;
  };

  const sessionNoteCounts: Record<string, { name: string; code: string; count: number }> = {};
  for (const row of topSessionsRaw ?? []) {
    const sid = row.session_id;
    if (!sessionNoteCounts[sid]) {
      sessionNoteCounts[sid] = { name: row.sessions?.name ?? "—", code: row.sessions?.code ?? "", count: 0 };
    }
    sessionNoteCounts[sid].count++;
  }
  const topSessions = Object.values(sessionNoteCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxDay = Math.max(...Object.values(dayCounts), 1);

  return (
    <main className="admin-page">
      <div className="admin-header">
        <span>VoteNotes <i>Admin</i></span>
        <span className="admin-badge">Read-only</span>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        {[
          { label: "Total sessions", value: totalSessions ?? 0 },
          { label: "Total notes", value: totalNotes ?? 0 },
          { label: "Total votes", value: totalVotes ?? 0 },
        ].map((s) => (
          <div key={s.label} className="admin-stat">
            <div>{s.value}</div><span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Notes per day bar chart */}
      <div className="admin-card admin-chart">
        <h2>Notes — last 7 days</h2><div className="admin-bars">
          {Object.entries(dayCounts).map(([day, count]) => (
            <div key={day}><span>{count}</span>
              <div
                className="admin-bar"
                style={{ height: `${Math.max((count / maxDay) * 80, count > 0 ? 4 : 2)}px` }}
              />
              <small>
                {new Date(day + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}
              </small>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-columns">
        {/* Top sessions by notes */}
        <div className="admin-card"><h2>Top sessions by notes</h2>
          {topSessions.length === 0 ? (
            <p className="admin-empty">No data yet.</p>
          ) : (
            <ul className="admin-list">
              {topSessions.map((s) => (
                <li key={s.code}><span>{s.name}</span><small>{s.count} notes</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent sessions */}
        <div className="admin-card"><h2>Recent sessions</h2>
          {!recentSessions?.length ? (
            <p className="admin-empty">No sessions yet.</p>
          ) : (
            <ul className="admin-list admin-recent">
              {recentSessions.map((s) => (
                <li key={s.id}><div><span>{s.name}</span><small>{s.code}</small>
                  </div>
                  <div><span className={`admin-status ${s.closed ? "is-closed" : ""}`}>
                      {s.closed ? "closed" : "open"}
                    </span>
                    <small>{new Date(s.created_at).toLocaleDateString()}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
