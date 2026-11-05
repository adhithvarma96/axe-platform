// Daily USD/LKR rate from a free public source (ExchangeRate-API open access,
// no key, updated once a day). A Super Admin can override it in the database.
export const FX_PROVIDER = "open.er-api.com";
export const FX_URL = "https://open.er-api.com/v6/latest/USD";

// Anything outside this band is treated as a bad feed, not stored.
const SANE_MIN = 150;
const SANE_MAX = 1000;

export interface ParsedRate {
  usdLkr: number;
  rateDate: string; // YYYY-MM-DD, Asia/Colombo
}

/** Validates the provider's JSON and returns the USD→LKR rate. Throws on anything odd. */
export function parseRate(body: unknown, now: Date = new Date()): ParsedRate {
  const b = body as { result?: string; rates?: Record<string, unknown> };
  if (b?.result !== "success") throw new Error("FX provider did not report success");
  const rate = Number(b.rates?.LKR);
  if (!Number.isFinite(rate) || rate < SANE_MIN || rate > SANE_MAX) {
    throw new Error(`FX provider returned an implausible USD/LKR rate: ${String(b.rates?.LKR)}`);
  }
  const rateDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(now);
  return { usdLkr: Math.round(rate * 10000) / 10000, rateDate };
}
