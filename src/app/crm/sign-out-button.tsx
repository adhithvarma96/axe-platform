"use client";
import { useTransition } from "react";
import { signOut } from "./login/actions";

export function SignOutButton({ className = "btn btn-ghost btn-sm" }: { className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={className} disabled={pending}
      onClick={() => start(async () => { const r = await signOut(); window.location.assign(r.next); })}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
