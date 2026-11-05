// Uptime check target. Returns 200 without touching the database.
export function GET() {
  return Response.json({ ok: true, service: "axe-platform", at: new Date().toISOString() });
}
