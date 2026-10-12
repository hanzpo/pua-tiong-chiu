import type { Dice } from "./rng";
import {
  classifyCounts,
  compareZy,
  faceCounts,
  payingTiersCounts,
  PRIZE_TIERS,
  STOCK_TIERS,
  takesAllCounts,
  zhuangyuanRank,
  type PrizeTier,
  type Settings,
  type StockTier,
  type Tier,
  type ZyRank,
} from "./rules";

export type Winnings = Record<PrizeTier, number>;

export const emptyWinnings = (): Winnings => ({
  zhuangyuan: 0, duitang: 0, sanhong: 0, sijin: 0, erju: 0, yixiu: 0,
});

export interface ZyHolder {
  player: number;
  dice: number[];
  rank: ZyRank;
}

export interface RollRecord {
  player: number;
  dice: number[];
  tier: Tier;
  /** Prizes this roll took, by tier. */
  won: PrizeTier[];
  /** Scoring tiers that were already empty. */
  missed: PrizeTier[];
  /** Set when this roll became the new zhuangyuan holder. */
  zy?: { from: number | null };
  takeAll?: boolean;
}

export type EndReason = "cleared" | "takeAll";

export interface GameState {
  players: number;
  settings: Settings;
  /** Player who rolls first. */
  firstPlayer: number;
  turn: number;
  rolls: number;
  remaining: Record<StockTier, number>;
  /** Sum of remaining. */
  stockLeft: number;
  /** Zhuangyuan prizes not yet awarded (normally 1). */
  zyPool: number;
  zy: ZyHolder | null;
  /** Number of times the zhuangyuan passed to a different player. */
  zyChanges: number;
  winnings: Winnings[];
  ended: EndReason | null;
  /** Stock tiers in the order they ran out. */
  depleted: StockTier[];
  wasted: number;
}

export function stockTotal(remaining: Record<StockTier, number>): number {
  let n = 0;
  for (const t of STOCK_TIERS) n += remaining[t];
  return n;
}

export function newGame(players: number, settings: Settings, firstPlayer = 0): GameState {
  const remaining = {} as Record<StockTier, number>;
  for (const t of STOCK_TIERS) remaining[t] = settings.prizes[t];
  const state: GameState = {
    players,
    settings,
    firstPlayer,
    turn: firstPlayer,
    rolls: 0,
    remaining,
    stockLeft: stockTotal(remaining),
    zyPool: settings.prizes.zhuangyuan,
    zy: null,
    zyChanges: 0,
    winnings: Array.from({ length: players }, emptyWinnings),
    ended: null,
    depleted: [],
    wasted: 0,
  };
  for (const t of STOCK_TIERS) if (remaining[t] === 0) state.depleted.push(t);
  if (state.stockLeft === 0) finish(state, "cleared");
  return state;
}

function finish(state: GameState, reason: EndReason): void {
  state.ended = reason;
  if (state.zy && state.zyPool > 0) {
    state.winnings[state.zy.player].zhuangyuan += state.zyPool;
    state.zyPool = 0;
  }
}

/**
 * Applies one roll for the current player. Mutates state; callers that need
 * history should clone first. The record keeps a reference to dice.
 */
export function applyRoll(state: GameState, dice: Dice | number[]): RollRecord {
  if (state.ended) throw new Error("game is over");
  const player = state.turn;
  const counts = faceCounts(dice);
  const tier = classifyCounts(counts);
  const rec: RollRecord = { player, dice, tier, won: [], missed: [] };
  const mine = state.winnings[player];

  if (takesAllCounts(counts, state.settings)) {
    rec.takeAll = true;
    for (const t of STOCK_TIERS) {
      if (state.remaining[t] > 0) {
        mine[t] += state.remaining[t];
        rec.won.push(t);
        state.remaining[t] = 0;
        state.depleted.push(t);
      }
    }
    if (state.zyPool > 0) {
      const rank = zhuangyuanRank(dice)!;
      rec.zy = { from: state.zy?.player ?? null };
      if (state.zy && state.zy.player !== player) state.zyChanges++;
      state.zy = { player, dice: rec.dice, rank };
      rec.won.push("zhuangyuan");
    }
    state.stockLeft = 0;
    state.rolls++;
    finish(state, "takeAll");
    return rec;
  }

  for (const t of payingTiersCounts(counts, state.settings)) {
    if (t === "zhuangyuan") {
      if (state.zyPool === 0) continue;
      const rank = zhuangyuanRank(dice)!;
      if (!state.zy || compareZy(rank, state.zy.rank) > 0) {
        rec.zy = { from: state.zy?.player ?? null };
        if (state.zy && state.zy.player !== player) state.zyChanges++;
        state.zy = { player, dice: rec.dice, rank };
      }
      continue;
    }
    const st = t as StockTier;
    if (state.remaining[st] > 0) {
      state.remaining[st]--;
      state.stockLeft--;
      mine[st]++;
      rec.won.push(st);
      if (state.remaining[st] === 0) state.depleted.push(st);
    } else {
      rec.missed.push(st);
    }
  }
  if (rec.missed.length > 0 && rec.won.length === 0) state.wasted++;

  state.rolls++;
  state.turn = (state.turn + 1) % state.players;
  if (state.stockLeft === 0) finish(state, "cleared");
  return rec;
}

export function cloneGame(state: GameState): GameState {
  return {
    ...state,
    remaining: { ...state.remaining },
    zy: state.zy ? { ...state.zy } : null,
    winnings: state.winnings.map((w) => ({ ...w })),
    depleted: [...state.depleted],
  };
}

/** Rebuilds a game from its roll list (used for undo and saved games). */
export function replay(players: number, settings: Settings, firstPlayer: number, rolls: number[][]) {
  const state = newGame(players, settings, firstPlayer);
  const records: RollRecord[] = [];
  for (const d of rolls) records.push(applyRoll(state, d));
  return { state, records };
}

export function totalPrizes(prizes: Record<PrizeTier, number>): number {
  return PRIZE_TIERS.reduce((s, t) => s + prizes[t], 0);
}
