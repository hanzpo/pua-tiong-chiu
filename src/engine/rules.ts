import type { Dice } from "./rng";

export type Tier = "zhuangyuan" | "duitang" | "sanhong" | "sijin" | "erju" | "yixiu" | "none";
export type PrizeTier = Exclude<Tier, "none">;

export const PRIZE_TIERS: PrizeTier[] = ["zhuangyuan", "duitang", "sanhong", "sijin", "erju", "yixiu"];
/** Tiers with a fixed stock that rolls draw down. The zhuangyuan prize is held, not drawn. */
export const STOCK_TIERS = ["duitang", "sanhong", "sijin", "erju", "yixiu"] as const;
export type StockTier = (typeof STOCK_TIERS)[number];

export interface TierInfo {
  zh: string;
  pinyin: string;
  en: string;
  rule: string;
}

export const TIER_INFO: Record<Tier, TierInfo> = {
  zhuangyuan: { zh: "状元", pinyin: "zhuàngyuan", en: "Top scholar", rule: "Four or more 4s, or five or six of a kind" },
  duitang: { zh: "对堂", pinyin: "duìtáng", en: "Straight", rule: "1-2-3-4-5-6" },
  sanhong: { zh: "三红", pinyin: "sānhóng", en: "Three reds", rule: "Exactly three 4s" },
  sijin: { zh: "四进", pinyin: "sìjìn", en: "Four of a kind", rule: "Four of a kind, not 4s" },
  erju: { zh: "二举", pinyin: "èrjǔ", en: "Two reds", rule: "Exactly two 4s" },
  yixiu: { zh: "一秀", pinyin: "yīxiù", en: "One red", rule: "Exactly one 4" },
  none: { zh: "无", pinyin: "wú", en: "Nothing", rule: "Anything else" },
};

export type ZySub =
  | "chajinhua"
  | "liubeihong"
  | "biandijin"
  | "liubeihei"
  | "wuhong"
  | "wuzidengke"
  | "sidianhong";

/** Highest first. */
export const ZY_SUBS: ZySub[] = ["chajinhua", "liubeihong", "biandijin", "liubeihei", "wuhong", "wuzidengke", "sidianhong"];

export const ZY_SUB_INFO: Record<ZySub, { zh: string; en: string; rule: string }> = {
  chajinhua: { zh: "状元插金花", en: "Golden flowers", rule: "Four 4s and two 1s" },
  liubeihong: { zh: "六杯红", en: "Six reds", rule: "Six 4s" },
  biandijin: { zh: "遍地锦", en: "Brocade everywhere", rule: "Six 1s" },
  liubeihei: { zh: "六杯黑", en: "Six blacks", rule: "Six of a kind, not 4 or 1" },
  wuhong: { zh: "五红", en: "Five reds", rule: "Five 4s" },
  wuzidengke: { zh: "五子登科", en: "Five sons", rule: "Five of a kind, not 4" },
  sidianhong: { zh: "四点红", en: "Four reds", rule: "Four 4s" },
};

export interface Settings {
  /** A sijin roll with one or two 4s also takes a yixiu or erju prize. */
  sijinPaysFours: boolean;
  /** 状元插金花 takes every prize left, ending the game. */
  chajinhuaTakesAll: boolean;
  /** Any six of a kind takes every prize left, ending the game. */
  sixKindTakesAll: boolean;
  prizes: Record<PrizeTier, number>;
}

export const TRADITIONAL_PRIZES: Record<PrizeTier, number> = {
  zhuangyuan: 1,
  duitang: 2,
  sanhong: 4,
  sijin: 8,
  erju: 16,
  yixiu: 32,
};

export const DEFAULT_SETTINGS: Settings = {
  sijinPaysFours: false,
  chajinhuaTakesAll: false,
  sixKindTakesAll: false,
  prizes: { ...TRADITIONAL_PRIZES },
};

/** counts[f] = number of dice showing face f (index 0 unused). */
export function faceCounts(dice: readonly number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) c[d]++;
  return c;
}

export function classifyCounts(c: readonly number[]): Tier {
  const fours = c[4];
  let maxOther = 0;
  for (let f = 1; f <= 6; f++) if (f !== 4 && c[f] > maxOther) maxOther = c[f];
  if (fours >= 4 || maxOther >= 5) return "zhuangyuan";
  if (c[1] === 1 && c[2] === 1 && c[3] === 1 && fours === 1 && c[5] === 1 && c[6] === 1) return "duitang";
  if (fours === 3) return "sanhong";
  if (maxOther === 4) return "sijin";
  if (fours === 2) return "erju";
  if (fours === 1) return "yixiu";
  return "none";
}

export function classify(dice: readonly number[]): Tier {
  return classifyCounts(faceCounts(dice));
}

/** The prize tiers a roll draws from, best first. Usually one, two with the sijin bonus. */
export function payingTiers(dice: readonly number[], settings: Settings): Tier[] {
  const c = faceCounts(dice);
  const tier = classifyCounts(c);
  if (tier === "none") return [];
  if (tier === "sijin" && settings.sijinPaysFours) {
    if (c[4] === 2) return ["sijin", "erju"];
    if (c[4] === 1) return ["sijin", "yixiu"];
  }
  return [tier];
}

export interface ZyRank {
  sub: ZySub;
  /** Lexicographic key; larger wins. First element is the sub-tier rank. */
  key: number[];
}

export function zhuangyuanRank(dice: readonly number[]): ZyRank | null {
  const c = faceCounts(dice);
  if (classifyCounts(c) !== "zhuangyuan") return null;
  const rank = (sub: ZySub) => ZY_SUBS.length - ZY_SUBS.indexOf(sub);
  const other = (n: number) => {
    for (let f = 1; f <= 6; f++) if (c[f] === n) return f;
    return 0;
  };
  if (c[4] === 4 && c[1] === 2) return { sub: "chajinhua", key: [rank("chajinhua")] };
  if (c[4] === 6) return { sub: "liubeihong", key: [rank("liubeihong")] };
  if (c[1] === 6) return { sub: "biandijin", key: [rank("biandijin")] };
  const six = other(6);
  if (six) return { sub: "liubeihei", key: [rank("liubeihei"), six] };
  if (c[4] === 5) return { sub: "wuhong", key: [rank("wuhong"), other(1)] };
  const five = other(5);
  if (five) return { sub: "wuzidengke", key: [rank("wuzidengke"), five, other(1)] };
  let rest = 0;
  for (const d of dice) if (d !== 4) rest += d;
  return { sub: "sidianhong", key: [rank("sidianhong"), rest] };
}

/** Positive when a beats b. */
export function compareZy(a: ZyRank, b: ZyRank): number {
  const n = Math.max(a.key.length, b.key.length);
  for (let i = 0; i < n; i++) {
    const d = (a.key[i] ?? 0) - (b.key[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function isSixOfAKind(dice: readonly number[]): boolean {
  return dice.every((d) => d === dice[0]);
}

/** Whether a roll triggers a take-all rule under these settings. */
export function takesAll(dice: Dice | readonly number[], settings: Settings): boolean {
  if (settings.sixKindTakesAll && isSixOfAKind(dice)) return true;
  if (settings.chajinhuaTakesAll) {
    const c = faceCounts(dice);
    if (c[4] === 4 && c[1] === 2) return true;
  }
  return false;
}
