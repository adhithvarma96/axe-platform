import * as Sentry from "@sentry/nextjs";
import { FX_PROVIDER, FX_URL, parseRate } from "@/lib/fx";
import { createAdminClient } from "@/lib/supabase/admin";

// Runs daily (vercel.json): stores today's USD/LKR rate as the 'auto' rate.
// A Super Admin's manual override in fx_rates still wins while it is active.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const res = await fetch(FX_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`FX provider HTTP ${res.status}`);
    const { usdLkr, rateDate } = parseRate(await res.json());

    const supabase = createAdminClient();
    const { data: existing, error: readError } = await supabase
      .from("fx_rates")
      .select("id")
      .eq("source", "auto")
      .eq("rate_date", rateDate)
      .is("deleted_at", null)
      .maybeSingle();
    if (readError) throw readError;

    const { error } = existing
      ? await supabase.from("fx_rates").update({ usd_lkr: usdLkr, provider: FX_PROVIDER }).eq("id", existing.id)
      : await supabase.from("fx_rates").insert({ rate_date: rateDate, usd_lkr: usdLkr, source: "auto", provider: FX_PROVIDER });
    if (error) throw error;

    return Response.json({ ok: true, rateDate, usdLkr });
  } catch (e) {
    // Yesterday's rate stays in use; Sentry alerts so someone can check or set it manually.
    Sentry.captureException(e);
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
