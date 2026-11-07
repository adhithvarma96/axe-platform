import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Where emailed links land (password reset). Accepts both link styles Supabase can send:
// ?code=… (the default, same browser) and ?token_hash=…&type=recovery (works in any browser).
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const raw = q.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"; // only our own pages
  const supabase = await createClient();

  let ok = false;
  const code = q.get("code");
  const tokenHash = q.get("token_hash");
  const type = q.get("type") as EmailOtpType | null;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;

  // Build the address from the browser's host: this handler runs behind the /crm rewrite.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const to = new URL(ok ? next : "/login/forgot/?expired=1", `${proto}://${host}`);
  return NextResponse.redirect(to);
}
