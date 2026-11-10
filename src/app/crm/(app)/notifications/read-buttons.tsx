"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markRead } from "./actions";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={() => start(() => markRead())}>{pending ? "…" : "Mark all read"}</button>;
}

/** Opens the linked record and marks the notification read on the way. */
export function OpenNote({ id, href, unread, children }: { id: string; href: string | null; unread: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <button type="button" className="note-open" onClick={() => start(async () => { if (unread) await markRead(id); if (href) router.push(href); })}>
      {children}
    </button>
  );
}
