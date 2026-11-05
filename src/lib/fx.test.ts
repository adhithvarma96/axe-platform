import { describe, expect, it } from "vitest";
import { parseRate } from "./fx";

describe("parseRate", () => {
  it("reads the LKR rate and dates it in Colombo time", () => {
    const r = parseRate({ result: "success", rates: { LKR: 332.16056 } }, new Date("2026-11-04T20:00:00Z"));
    expect(r).toEqual({ usdLkr: 332.1606, rateDate: "2026-11-05" });
  });

  it("rejects a failed response or an implausible rate", () => {
    expect(() => parseRate({ result: "error" })).toThrow(/success/);
    expect(() => parseRate({ result: "success", rates: { LKR: 3.3 } })).toThrow(/implausible/);
    expect(() => parseRate({ result: "success", rates: {} })).toThrow(/implausible/);
  });
});
