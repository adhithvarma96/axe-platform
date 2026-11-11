"use client";
import { useActionState } from "react";
import { saveCompanyTarget, type TeamState } from "./actions";

export function CompanyTargetForm({ value }: { value: number }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(saveCompanyTarget, {});
  return (
    <form action={action} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="field" style={{ flex: "0 1 260px" }}>
        <label htmlFor="company_revenue">Monthly revenue target (LKR)</label>
        <input id="company_revenue" name="company_revenue" inputMode="numeric" defaultValue={value} />
      </div>
      <button className="btn btn-sm" type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      {state.ok && <span className="muted" role="status">Saved. Past months keep the target they had.</span>}
      {state.error && <span className="error" role="alert">{state.error}</span>}
    </form>
  );
}
