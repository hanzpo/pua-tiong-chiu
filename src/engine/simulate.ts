import { applyRoll, emptyWinnings, newGame, type RollRecord, type Winnings } from "./game";
import { Mt19937, rollDice, type Rng } from "./rng";
import { PRIZE_TIERS, type Settings, type StockTier, type Tier } from "./rules";
import type { TierCounts } from "./enumerate";

export interface SimConfig {
  players: number;
  games: number;
  settings: Settings;
  seed: number;
}

export type LastOut = StockTier | "takeAll";

export interface SimStats {
  players: number;
  games: number;
  rolls: number;
  /** lengthCounts[n] = games that took n rolls. */
  lengthCounts: number[];
  byPlayer: Winnings[];
  /** Seat 0 rolls first. Players rotate seats from game to game. */
  bySeat: Winnings[];
  zyBySeat: number[];
  /** zyChangeCounts[k] = games where the zhuangyuan changed hands k times. */
  zyChangeCounts: number[];
  zyUnclaimed: number;
  lastOut: Record<LastOut, number>;
  wastedRolls: number;
  wastedByTier: Record<StockTier, number>;
  tierCounts: TierCounts;
  convergence: { rolls: number; counts: TierCounts }[];
}

const zeroTiers = (): TierCounts => ({
  zhuangyuan: 0, duitang: 0, sanhong: 0, sijin: 0, erju: 0, yixiu: 0, none: 0,
});

export function emptyStats(players: number): SimStats {
  return {
    players,
    games: 0,
    rolls: 0,
    lengthCounts: [],
    byPlayer: Array.from({ length: players }, emptyWinnings),
    bySeat: Array.from({ length: players }, emptyWinnings),
    zyBySeat: Array(players).fill(0),
    zyChangeCounts: [],
    zyUnclaimed: 0,
    lastOut: { duitang: 0, sanhong: 0, sijin: 0, erju: 0, yixiu: 0, takeAll: 0 },
    wastedRolls: 0,
    wastedByTier: { duitang: 0, sanhong: 0, sijin: 0, erju: 0, yixiu: 0 },
    tierCounts: zeroTiers(),
    convergence: [],
  };
}

/** Roll counts at which tier frequencies are snapshotted: 1, 2, 5 × 10^k. */
function nextCheckpoint(n: number): number {
  let base = 10;
  for (;;) {
    for (const m of [1, 2, 5]) if (m * base > n) return m * base;
    base *= 10;
  }
}

/** Plays one game to the end. The first player rotates with the game index. */
export function playGame(
  rng: Rng,
  players: number,
  settings: Settings,
  gameIndex: number,
  onRoll?: (rec: RollRecord) => void,
) {
  const state = newGame(players, settings, gameIndex % players);
  // A prize set with only a zhuangyuan never clears; cap it so the loop ends.
  const cap = 100_000;
  while (!state.ended && state.rolls < cap) {
    const rec = applyRoll(state, rollDice(rng));
    onRoll?.(rec);
  }
  return state;
}

export class Simulator {
  readonly stats: SimStats;
  private rng: Mt19937;
  private next = 10;
  private cfg: SimConfig;

  constructor(cfg: SimConfig) {
    this.cfg = cfg;
    this.stats = emptyStats(cfg.players);
    this.rng = new Mt19937(cfg.seed);
  }

  get done(): boolean {
    return this.stats.games >= this.cfg.games;
  }

  /** Runs up to n more games. */
  run(n: number): void {
    const { players, settings } = this.cfg;
    const s = this.stats;
    const end = Math.min(this.cfg.games, s.games + n);
    for (let g = s.games; g < end; g++) {
      const first = g % players;
      const state = playGame(this.rng, players, settings, g, (rec) => {
        s.tierCounts[rec.tier]++;
        s.rolls++;
        for (const t of rec.missed) s.wastedByTier[t as StockTier]++;
        if (s.rolls === this.next) {
          s.convergence.push({ rolls: s.rolls, counts: { ...s.tierCounts } });
          this.next = nextCheckpoint(s.rolls);
        }
      });
      s.games++;
      s.lengthCounts[state.rolls] = (s.lengthCounts[state.rolls] ?? 0) + 1;
      s.zyChangeCounts[state.zyChanges] = (s.zyChangeCounts[state.zyChanges] ?? 0) + 1;
      s.wastedRolls += state.wasted;
      if (!state.zy && settings.prizes.zhuangyuan > 0) s.zyUnclaimed++;
      if (state.ended === "takeAll") s.lastOut.takeAll++;
      else if (state.depleted.length > 0) s.lastOut[state.depleted[state.depleted.length - 1]]++;
      for (let p = 0; p < players; p++) {
        const seat = (p - first + players) % players;
        for (const t of PRIZE_TIERS) {
          s.byPlayer[p][t] += state.winnings[p][t];
          s.bySeat[seat][t] += state.winnings[p][t];
        }
        if (state.winnings[p].zhuangyuan > 0) s.zyBySeat[seat]++;
      }
    }
  }

  /** Adds a final convergence point so the chart reaches the total. */
  finish(): SimStats {
    const s = this.stats;
    const last = s.convergence[s.convergence.length - 1];
    if (s.rolls > 0 && (!last || last.rolls !== s.rolls)) {
      s.convergence.push({ rolls: s.rolls, counts: { ...s.tierCounts } });
    }
    return s;
  }
}

/** Replays game number gameIndex (0-based) of a run with the given seed, roll by roll. */
export function replayGame(cfg: Omit<SimConfig, "games">, gameIndex: number) {
  const rng = new Mt19937(cfg.seed);
  for (let g = 0; g < gameIndex; g++) playGame(rng, cfg.players, cfg.settings, g);
  const records: RollRecord[] = [];
  const state = playGame(rng, cfg.players, cfg.settings, gameIndex, (r) => records.push(r));
  return { state, records };
}

export function histogramQuantile(counts: number[], q: number): number {
  let total = 0;
  for (const c of counts) total += c ?? 0;
  const target = q * total;
  let acc = 0;
  for (let i = 0; i < counts.length; i++) {
    acc += counts[i] ?? 0;
    if (acc >= target && acc > 0) return i;
  }
  return counts.length - 1;
}

export function histogramMean(counts: number[]): number {
  let total = 0;
  let sum = 0;
  for (let i = 0; i < counts.length; i++) {
    total += counts[i] ?? 0;
    sum += i * (counts[i] ?? 0);
  }
  return total ? sum / total : 0;
}

export function tierShare(counts: TierCounts, t: Tier): number {
  let total = 0;
  for (const v of Object.values(counts)) total += v;
  return total ? counts[t] / total : 0;
}
