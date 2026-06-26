import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Session, Note } from "@/lib/database.types";

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
    <main className="min-h-screen bg-[#FAFAF7] px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <span className="font-serif text-2xl text-[#111111]">VoteNotes · Admin</span>
        <span className="text-xs text-[#888] border border-[#D9D9D9] rounded-full px-3 py-1">Read-only</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: "Total sessions", value: totalSessions ?? 0 },
          { label: "Total notes", value: totalNotes ?? 0 },
          { label: "Total votes", value: totalVotes ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#D9D9D9] rounded-xl p-6 text-center">
            <div className="font-serif text-4xl text-[#111111] mb-1">{s.value}</div>
            <div className="text-xs text-[#888] uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Notes per day bar chart */}
      <div className="bg-white border border-[#D9D9D9] rounded-xl p-6 mb-6">
        <h2 className="text-sm font-medium text-[#111111] mb-4 uppercase tracking-wide">Notes — last 7 days</h2>
        <div className="flex items-end gap-2 h-24">
          {Object.entries(dayCounts).map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#888]">{count}</span>
              <div
                className="w-full bg-[#111111] rounded-sm"
                style={{ height: `${Math.max((count / maxDay) * 80, count > 0 ? 4 : 2)}px` }}
              />
              <span className="text-[9px] text-[#888]">
                {new Date(day + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top sessions by notes */}
        <div className="bg-white border border-[#D9D9D9] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[#111111] mb-4 uppercase tracking-wide">Top sessions by notes</h2>
          {topSessions.length === 0 ? (
            <p className="text-sm text-[#888]">No data yet.</p>
          ) : (
            <ul className="space-y-2">
              {topSessions.map((s) => (
                <li key={s.code} className="flex items-center justify-between text-sm">
                  <span className="truncate text-[#333] max-w-[180px]">{s.name}</span>
                  <span className="text-[#888] text-xs ml-2">{s.count} notes</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent sessions */}
        <div className="bg-white border border-[#D9D9D9] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[#111111] mb-4 uppercase tracking-wide">Recent sessions</h2>
          {!recentSessions?.length ? (
            <p className="text-sm text-[#888]">No sessions yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-[#333] truncate max-w-[160px]">{s.name}</span>
                    <span className="text-[10px] text-[#888] font-mono">{s.code}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.closed ? "bg-[#F0F0F0] text-[#888]" : "bg-[#111] text-white"}`}>
                      {s.closed ? "closed" : "open"}
                    </span>
                    <span className="text-[10px] text-[#aaa] mt-0.5">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
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
