import { describe, expect, it } from "vitest";
import { inRange, rangeParams, resolveRange } from "./date-range";

const on = "2026-11-10"; // a Tuesday

describe("date ranges", () => {
  it("resolves the presets", () => {
    expect(resolveRange({}, on)).toMatchObject({ key: "this_month", from: "2026-11-01", to: on });
    expect(resolveRange({ range: "this_week" }, on)).toMatchObject({ from: "2026-11-09", to: on });
    expect(resolveRange({ range: "last_month" }, on)).toMatchObject({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolveRange({ range: "last_3_months" }, on)).toMatchObject({ from: "2026-09-01", to: on });
    expect(resolveRange({ range: "this_fy" }, on)).toMatchObject({ from: "2026-04-01", to: on, months: 8 });
    expect(resolveRange({ range: "last_fy" }, on)).toMatchObject({ from: "2025-04-01", to: "2026-03-31" });
    expect(resolveRange({ range: "last_12_months" }, on)).toMatchObject({ from: "2025-12-01", to: on });
    expect(resolveRange({ range: "all" }, on)).toMatchObject({ from: null, to: null });
  });

  it("handles January and the financial year boundary", () => {
    expect(resolveRange({ range: "last_month" }, "2027-01-15")).toMatchObject({ from: "2026-12-01", to: "2026-12-31" });
    expect(resolveRange({ range: "this_fy" }, "2027-02-01")).toMatchObject({ from: "2026-04-01", months: 11 });
  });

  it("custom ranges are checked and swapped if backwards", () => {
    expect(resolveRange({ range: "custom", from: "2026-10-20", to: "2026-10-05" }, on)).toMatchObject({ from: "2026-10-05", to: "2026-10-20" });
    expect(resolveRange({ range: "custom", from: "nonsense" }, on).key).toBe("this_month");
    expect(resolveRange({ range: "bogus" }, on, "all").key).toBe("all");
  });

  it("round-trips through the query string and tests membership", () => {
    const r = resolveRange({ range: "custom", from: "2026-10-01" }, on);
    expect(rangeParams(r)).toEqual({ range: "custom", from: "2026-10-01" });
    expect(rangeParams(resolveRange({}, on))).toEqual({});
    expect(inRange(r, "2026-11-30")).toBe(true);
    expect(inRange(r, "2026-09-30")).toBe(false);
  });
});
