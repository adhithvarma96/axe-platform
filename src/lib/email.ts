import "server-only";

/** Sends a plain-text email through Resend. Quietly does nothing until Resend is configured. */
export async function sendEmail(msg: { to: string[]; cc?: string[]; subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM;
  const to = [...new Set(msg.to.filter(Boolean))];
  if (!key || !from || !to.length) return false;
  const cc = [...new Set((msg.cc ?? []).filter((e) => e && !to.includes(e)))];
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, ...(cc.length ? { cc } : {}), subject: msg.subject, text: msg.text }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export const appUrl = () => process.env.APP_URL ?? "https://app.axerealty.lk";
