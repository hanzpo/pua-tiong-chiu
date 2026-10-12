import { describe, expect, it } from "vitest";
import { histogramMean, histogramQuantile, replayGame, Simulator } from "./simulate";
import { DEFAULT_SETTINGS, PRIZE_TIERS } from "./rules";
import { totalPrizes } from "./game";

const cfg = { players: 6, games: 2000, settings: DEFAULT_SETTINGS, seed: 12345 };

function run() {
  const sim = new Simulator(cfg);
  while (!sim.done) sim.run(300);
  return sim.finish();
}

describe("Simulator", () => {
  it("is reproducible for a seed", () => {
    expect(run()).toEqual(run());
  });

  it("hands out every stock prize in every game", () => {
    const s = run();
    const stock = totalPrizes(DEFAULT_SETTINGS.prizes) - 1;
    let handed = 0;
    for (const w of s.byPlayer) for (const t of PRIZE_TIERS) if (t !== "zhuangyuan") handed += w[t];
    expect(handed).toBe(stock * cfg.games);
    let zy = 0;
    for (const w of s.bySeat) zy += w.zhuangyuan;
    expect(zy + s.zyUnclaimed).toBe(cfg.games);
  });

  it("keeps its counters consistent", () => {
    const s = run();
    const lengths = s.lengthCounts.reduce((a, c, i) => a + (c ?? 0) * i, 0);
    expect(lengths).toBe(s.rolls);
    expect(Object.values(s.tierCounts).reduce((a, b) => a + b)).toBe(s.rolls);
    expect(Object.values(s.lastOut).reduce((a, b) => a + b)).toBe(cfg.games);
    expect(s.convergence.at(-1)!.rolls).toBe(s.rolls);
  });

  it("converges to the exact yixiu frequency", () => {
    const s = run();
    expect(s.tierCounts.yixiu / s.rolls).toBeCloseTo(17400 / 46656, 2);
  });

  it("replays a game identically to the batch run", () => {
    const sim = new Simulator({ ...cfg, games: 5 });
    sim.run(5);
    const lengths: number[] = [];
    for (let g = 0; g < 5; g++) lengths.push(replayGame(cfg, g).state.rolls);
    expect(lengths.reduce((a, b) => a + b)).toBe(sim.stats.rolls);
    expect(replayGame(cfg, 3).records[0].player).toBe(3);
  });
});

describe("histogram helpers", () => {
  it("computes mean and quantiles", () => {
    const h = [0, 1, 1, 1, 1];
    expect(histogramMean(h)).toBe(2.5);
    expect(histogramQuantile(h, 0.5)).toBe(2);
    expect(histogramQuantile(h, 0.9)).toBe(4);
    expect(histogramQuantile(h, 0.1)).toBe(1);
  });
});
