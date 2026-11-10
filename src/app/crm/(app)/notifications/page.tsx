import { Suspense } from "react";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MarkAllRead, OpenNote } from "./read-buttons";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <Inbox />
    </Suspense>
  );
}

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });

async function Inbox() {
  await connection();
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select("id, kind, title, body, link, read_at, created_at, email_status")
    .eq("recipient_agent_id", user.agentId ?? "00000000-0000-0000-0000-000000000000").is("deleted_at", null)
    .order("created_at", { ascending: false }).limit(100);
  if (error) return <p className="error">Could not load notifications: {error.message}</p>;
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <div className="page-head">
        <div><h1>Notifications</h1><p className="muted">{unread ? `${unread} unread` : "All read"} · follow-up digests arrive here every morning at 8:00, as well as by email.</p></div>
        {unread > 0 && <MarkAllRead />}
      </div>
      <ul className="notes">
        {(data ?? []).map((n) => (
          <li key={n.id} className={n.read_at ? "" : "note-unread"}>
            <OpenNote id={n.id} href={n.link} unread={!n.read_at}>
              <span className="note-title">{n.title}</span>
              {n.body && <span className="note-body">{n.body}</span>}
              <span className="muted" style={{ fontSize: 12 }}>{when(n.created_at)}{n.email_status === "sent" ? " · emailed" : ""}</span>
            </OpenNote>
          </li>
        ))}
        {!data?.length && <li className="muted panel">Nothing yet.</li>}
      </ul>
    </>
  );
}
