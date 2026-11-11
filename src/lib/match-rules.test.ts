import { describe, expect, it } from "vitest";
import { bedsFit, budgetFits } from "./match-rules";

describe("matching rules", () => {
  it("allows 10% over the top of the budget, not more", () => {
    expect(budgetFits(2200, null, 2000)).toBe(true);
    expect(budgetFits(2201, null, 2000)).toBe(false);
    expect(budgetFits(1800, 2000, null)).toBe(true);
    expect(budgetFits(1799, 2000, null)).toBe(false);
    expect(budgetFits(null, 1000, 2000)).toBe(true);
  });
  it("takes bedrooms exact or one more", () => {
    expect(bedsFit(2, 2)).toBe(true);
    expect(bedsFit(2, 3)).toBe(true);
    expect(bedsFit(2, 4)).toBe(false);
    expect(bedsFit(2, 1)).toBe(false);
    expect(bedsFit(null, 5)).toBe(true);
  });
});
