"use client";
import { useState, useTransition } from "react";
import { setPublished } from "../actions";

export function PublishSwitch({ propertyId, published }: { propertyId: string; published: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button
        type="button"
        role="switch"
        aria-checked={published}
        disabled={pending}
        className={`switch ${published ? "switch-on" : ""}`}
        onClick={() => start(async () => { setError(null); const r = await setPublished(propertyId, !published); if (r.error) setError(r.error); })}
      >
        <span className="switch-knob" aria-hidden="true" />
        {pending ? "Saving…" : published ? "On website" : "Publish to website"}
      </button>
      {error && <p className="error" role="alert" style={{ fontSize: 13, maxWidth: 360, textAlign: "right" }}>{error}</p>}
    </div>
  );
}
