import { exactCounts, payCounts, takeAllCount, TOTAL_OUTCOMES } from "./enumerate";
import { PRIZE_TIERS, STOCK_TIERS, type PrizeTier, type Settings, type StockTier } from "./rules";

export interface TierOdds {
  tier: PrizeTier | "none";
  count: number;
  p: number;
  /** "1 in N". */
  oneIn: number;
  /** Mean rolls until the first roll of this tier (geometric). */
  rollsToFirst: number;
}

export function tierOdds(): TierOdds[] {
  const { tiers } = exactCounts();
  return [...PRIZE_TIERS, "none" as const].map((tier) => {
    const count = tiers[tier];
    const p = count / TOTAL_OUTCOMES;
    return { tier, count, p, oneIn: 1 / p, rollsToFirst: 1 / p };
  });
}

function lgamma(n: number): number {
  // n is a non-negative integer here; sum of logs is exact enough and cheap after caching.
  while (lnFact.length <= n) lnFact.push(lnFact[lnFact.length - 1] + Math.log(lnFact.length));
  return lnFact[n];
}
const lnFact = [0];

/** P(Poisson(lambda) >= k). */
export function poissonAtLeast(lambda: number, k: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return 0;
  const ll = Math.log(lambda);
  let below = 0;
  for (let j = 0; j < k; j++) below += Math.exp(-lambda + j * ll - lgamma(j));
  return Math.max(0, Math.min(1, 1 - below));
}

/** Density of the time of the k-th event of a rate-p Poisson process (Erlang). */
function erlangDensity(p: number, k: number, s: number): number {
  if (k <= 0 || s <= 0) return 0;
  const l = p * s;
  return p * Math.exp(-l + (k - 1) * Math.log(l) - lgamma(k - 1));
}

export interface GameForecast {
  /** Per-roll probability that a roll draws from each stock tier. */
  payP: Record<StockTier, number>;
  zyP: number;
  takeAllP: number;
  /** k / p: mean rolls until each tier would run out on its own. */
  rollsToClear: Record<StockTier, number>;
  expectedRolls: number;
  /** Probability that each tier is the last to run out, or that a take-all roll ends the game. */
  lastOut: Record<StockTier | "takeAll", number>;
  zyUnclaimedP: number;
  /** False when the sijin bonus makes tiers overlap, so the figures are approximate. */
  exact: boolean;
}

/**
 * Exact game-level figures by Poissonization: treat rolls as arrivals of a
 * rate-1 Poisson process. Disjoint roll categories then become independent
 * Poisson processes, and E[rolls] equals E[end time] by Wald's identity, so
 * one-dimensional integrals give exact answers.
 */
export function forecast(settings: Settings): GameForecast {
  const pays = payCounts(settings);
  const payP = {} as Record<StockTier, number>;
  const rollsToClear = {} as Record<StockTier, number>;
  for (const t of STOCK_TIERS) {
    payP[t] = pays[t] / TOTAL_OUTCOMES;
    rollsToClear[t] = settings.prizes[t] > 0 ? settings.prizes[t] / payP[t] : 0;
  }
  const zyP = exactCounts().tiers.zhuangyuan / TOTAL_OUTCOMES;
  const takeAllP = takeAllCount(settings) / TOTAL_OUTCOMES;
  const active = STOCK_TIERS.filter((t) => settings.prizes[t] > 0);

  const cleared = (s: number) => {
    let prod = 1;
    for (const t of active) prod *= poissonAtLeast(payP[t] * s, settings.prizes[t]);
    return prod;
  };

  const h = 0.5;
  const zyLive = settings.prizes.zhuangyuan > 0;
  let expected = 0;
  let zyIntegral = 0;
  const last = { duitang: 0, sanhong: 0, sijin: 0, erju: 0, yixiu: 0, takeAll: 0 };
  const maxClear = Math.max(1, ...active.map((t) => rollsToClear[t]));
  // Simpson's rule on [0, S] with S well past where every tier has cleared.
  let prev: number[] | null = null;
  for (let s = 0; ; s += h) {
    const survive = Math.exp(-takeAllP * s);
    const notDone = 1 - cleared(s);
    const values = [notDone * survive, notDone * Math.exp(-zyP * s), takeAllP * survive * notDone];
    const lastVals = active.map((t) => {
      let others = 1;
      for (const u of active) if (u !== t) others *= poissonAtLeast(payP[u] * s, settings.prizes[u]);
      return erlangDensity(payP[t], settings.prizes[t], s) * others * survive;
    });
    const row = [...values, ...lastVals];
    if (prev) {
      const mid = s - h / 2;
      const sm = Math.exp(-takeAllP * mid);
      const nd = 1 - cleared(mid);
      const midRow = [
        nd * sm,
        nd * Math.exp(-zyP * mid),
        takeAllP * sm * nd,
        ...active.map((t) => {
          let others = 1;
          for (const u of active) if (u !== t) others *= poissonAtLeast(payP[u] * mid, settings.prizes[u]);
          return erlangDensity(payP[t], settings.prizes[t], mid) * others * sm;
        }),
      ];
      const area = row.map((v, i) => (h / 6) * (prev![i] + 4 * midRow[i] + v));
      expected += area[0];
      zyIntegral += area[1];
      last.takeAll += area[2];
      active.forEach((t, i) => (last[t] += area[3 + i]));
    }
    prev = row;
    if ((s > 4 * maxClear && values[0] < 1e-12) || s > 1e6) break;
  }

  return {
    payP,
    zyP,
    takeAllP,
    rollsToClear,
    expectedRolls: active.length ? expected : 0,
    lastOut: last,
    zyUnclaimedP: zyLive ? 1 - zyP * zyIntegral : 0,
    exact: !settings.sijinPaysFours,
  };
}

export interface EvResult {
  /** Expected value of the first roll of a fresh game (stock tiers only). */
  perRollFresh: number;
  /** Expected value handed out per game divided by expected rolls. */
  perRollAverage: number;
  perGame: number;
  perPlayerPerGame: number;
}

export function expectedValue(settings: Settings, values: Record<PrizeTier, number>, players: number): EvResult {
  const f = forecast(settings);
  let perRollFresh = 0;
  let stock = 0;
  for (const t of STOCK_TIERS) {
    if (settings.prizes[t] > 0) perRollFresh += f.payP[t] * values[t];
    stock += settings.prizes[t] * values[t];
  }
  const perGame = stock + settings.prizes.zhuangyuan * values.zhuangyuan * (1 - f.zyUnclaimedP);
  return {
    perRollFresh,
    perRollAverage: f.expectedRolls ? perGame / f.expectedRolls : 0,
    perGame,
    perPlayerPerGame: perGame / players,
  };
}

/** Hamilton's method: floor each quota, then hand leftovers to the largest remainders. */
export function largestRemainder(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const quotas = weights.map((w) => (w / sum) * total);
  const out = quotas.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = quotas.map((q, i) => ({ i, r: q - Math.floor(q) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let j = 0; left > 0; j = (j + 1) % order.length, left--) out[order[j].i]++;
  return out;
}

/** Prize counts in proportion to tier probability, zhuangyuan fixed at 1. */
export function proportionalPrizes(total: number): Record<PrizeTier, number> {
  const { tiers } = exactCounts();
  const counts = largestRemainder(Math.max(0, total - 1), STOCK_TIERS.map((t) => tiers[t]));
  const out = { zhuangyuan: 1 } as Record<PrizeTier, number>;
  STOCK_TIERS.forEach((t, i) => (out[t] = counts[i]));
  return out;
}
