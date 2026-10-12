import { describe, expect, it } from "vitest";
import { expectedValue, forecast, largestRemainder, poissonAtLeast, proportionalPrizes, tierOdds } from "./analysis";
import { DEFAULT_SETTINGS, STOCK_TIERS } from "./rules";
import { histogramMean, Simulator } from "./simulate";

describe("tierOdds", () => {
  it("gives probabilities that sum to 1", () => {
    const odds = tierOdds();
    expect(odds.reduce((s, o) => s + o.p, 0)).toBeCloseTo(1, 12);
    expect(odds.find((o) => o.tier === "zhuangyuan")!.oneIn).toBeCloseTo(46656 / 561, 9);
  });
});

describe("poissonAtLeast", () => {
  it("handles edge cases and known values", () => {
    expect(poissonAtLeast(3, 0)).toBe(1);
    expect(poissonAtLeast(0, 2)).toBe(0);
    expect(poissonAtLeast(1, 1)).toBeCloseTo(1 - Math.exp(-1), 12);
    expect(poissonAtLeast(2, 2)).toBeCloseTo(1 - 3 * Math.exp(-2), 12);
    expect(poissonAtLeast(900, 800)).toBeGreaterThan(0.99);
  });
});

describe("forecast", () => {
  const f = forecast(DEFAULT_SETTINGS);

  it("gives last-out probabilities that sum to 1", () => {
    const total = Object.values(f.lastOut).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("matches simulation within sampling error", () => {
    const sim = new Simulator({ players: 6, games: 4000, settings: DEFAULT_SETTINGS, seed: 7 });
    sim.run(4000);
    const s = sim.finish();
    expect(Math.abs(histogramMean(s.lengthCounts) - f.expectedRolls)).toBeLessThan(5);
    for (const t of STOCK_TIERS) expect(Math.abs(s.lastOut[t] / 4000 - f.lastOut[t])).toBeLessThan(0.03);
    expect(Math.abs(s.zyUnclaimed / 4000 - f.zyUnclaimedP)).toBeLessThan(0.02);
  }, 30000);

  it("accounts for take-all endings", () => {
    const g = forecast({ ...DEFAULT_SETTINGS, chajinhuaTakesAll: true, sixKindTakesAll: true });
    expect(g.takeAllP).toBeCloseTo(21 / 46656, 12);
    expect(g.expectedRolls).toBeLessThan(f.expectedRolls);
    expect(Object.values(g.lastOut).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe("expectedValue", () => {
  it("splits the pool across players", () => {
    const values = { zhuangyuan: 0, duitang: 0, sanhong: 0, sijin: 0, erju: 0, yixiu: 1 };
    const ev = expectedValue(DEFAULT_SETTINGS, values, 4);
    expect(ev.perGame).toBe(32);
    expect(ev.perPlayerPerGame).toBe(8);
    expect(ev.perRollFresh).toBeCloseTo(17400 / 46656, 12);
  });
});

describe("optimizer", () => {
  it("uses largest remainders", () => {
    expect(largestRemainder(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(largestRemainder(7, [5, 3, 2])).toEqual([4, 2, 1]);
  });

  it("keeps the total and fixes the zhuangyuan at 1", () => {
    const p = proportionalPrizes(63);
    expect(p.zhuangyuan).toBe(1);
    expect(Object.values(p).reduce((a, b) => a + b)).toBe(63);
    expect(p).toEqual({ zhuangyuan: 1, duitang: 1, sanhong: 5, sijin: 4, erju: 18, yixiu: 34 });
  });
});
