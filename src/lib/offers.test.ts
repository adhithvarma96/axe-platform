import { describe, expect, it } from "vitest";
import { offerText, RENTAL_DEFAULTS, threeWorkingDays } from "./offers";

describe("offer template", () => {
  it("states every term: blanks print as N/A, and it is subject to contract", () => {
    const text = offerText("rental", "ARLD260045", "2026-11-10", "2026-11-13", { ...RENTAL_DEFAULTS, monthly_rent: "USD 2,500", tenant: "Jane" });
    expect(text).toContain("Offer Ref: ARLD260045");
    expect(text).toContain("Monthly rent: USD 2,500, payable in N/A");
    expect(text).toContain("Balance (months 5 onwards): Monthly in advance");
    expect(text).toContain("Valid until: 13 November 2026");
    expect(text.trim().endsWith("Subject to contract.")).toBe(true);
  });
  it("adds the loan condition only for loan-funded purchases", () => {
    expect(offerText("sale", "R", "2026-11-10", "2026-11-13", { funding: "Bank loan within 30 days" })).toContain("Subject to loan approval.");
    expect(offerText("sale", "R", "2026-11-10", "2026-11-13", { funding: "Cash" })).not.toContain("Subject to loan approval.");
  });
  it("defaults validity to three working days", () => {
    expect(threeWorkingDays("2026-11-12")).toBe("2026-11-17"); // Thu -> Fri, Mon, Tue
  });
});
