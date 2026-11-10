import { describe, expect, it } from "vitest";
import { bedsKey, byMonth, groupStats, median, type ClosingPoint } from "./closing-stats";

const pt = (o: Partial<ClosingPoint>): ClosingPoint => ({ date: "2026-06-10", kind: "rental", amountUsd: 1000, sqft: 1000, location: "Colombo 03", development: "A", beds: 2, ...o });

describe("closing stats", () => {
  it("median handles odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("groups rentals by development with averages and per sq ft", () => {
    const s = groupStats([
      pt({ amountUsd: 1000, sqft: 1000 }), pt({ amountUsd: 2000, sqft: 1000 }),
      pt({ development: "B", amountUsd: 3000, sqft: null }),
      pt({ kind: "sale", amountUsd: 500000 }),
    ], "rental", "development");
    expect(s[0]).toMatchObject({ key: "A", deals: 2, avg: 1500, median: 1500, min: 1000, max: 2000, psfAvg: 1.5, psfDeals: 2 });
    expect(s[1]).toMatchObject({ key: "B", deals: 1, psfAvg: null, psfDeals: 0 });
  });

  it("buckets bedrooms and sorts them in order", () => {
    expect(bedsKey(0)).toBe("Studio");
    expect(bedsKey(6)).toBe("5+ bed");
    const s = groupStats([pt({ beds: 3 }), pt({ beds: 1 }), pt({ beds: null })], "rental", "beds");
    expect(s.map((x) => x.key)).toEqual(["1 bed", "3 bed", "Unknown"]);
  });

  it("fills empty months", () => {
    const m = byMonth([pt({ date: "2026-05-02" }), pt({ date: "2026-07-20", amountUsd: 3000 })]);
    expect(m.map((x) => [x.month, x.deals])).toEqual([["2026-05", 1], ["2026-06", 0], ["2026-07", 1]]);
    expect(m[1].avg).toBeNull();
  });
});
