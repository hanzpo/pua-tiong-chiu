import {
  classifyCounts,
  faceCounts,
  payingTiers,
  takesAll,
  zhuangyuanRank,
  ZY_SUBS,
  type Settings,
  type Tier,
  type ZySub,
} from "./rules";

export const TOTAL_OUTCOMES = 6 ** 6;

/** Calls fn for each of the 46,656 ordered rolls. The array is reused between calls. */
export function forEachRoll(fn: (dice: number[]) => void): void {
  const d = [1, 1, 1, 1, 1, 1];
  for (let i = 0; i < TOTAL_OUTCOMES; i++) {
    let x = i;
    for (let k = 5; k >= 0; k--) {
      d[k] = (x % 6) + 1;
      x = Math.floor(x / 6);
    }
    fn(d);
  }
}

export type TierCounts = Record<Tier, number>;

const emptyTierCounts = (): TierCounts => ({
  zhuangyuan: 0, duitang: 0, sanhong: 0, sijin: 0, erju: 0, yixiu: 0, none: 0,
});

export function tierCounts(): TierCounts {
  const out = emptyTierCounts();
  forEachRoll((d) => out[classifyCounts(faceCounts(d))]++);
  return out;
}

export function zySubCounts(): Record<ZySub, number> {
  const out = Object.fromEntries(ZY_SUBS.map((s) => [s, 0])) as Record<ZySub, number>;
  forEachRoll((d) => {
    const r = zhuangyuanRank(d);
    if (r) out[r.sub]++;
  });
  return out;
}

/** Counts of rolls that draw from each tier under the settings (a sijin bonus roll counts twice). */
export function payCounts(settings: Settings): TierCounts {
  const out = emptyTierCounts();
  forEachRoll((d) => {
    const tiers = payingTiers(d, settings);
    if (tiers.length === 0) out.none++;
    for (const t of tiers) out[t]++;
  });
  return out;
}

export function takeAllCount(settings: Settings): number {
  let n = 0;
  forEachRoll((d) => {
    if (takesAll(d, settings)) n++;
  });
  return n;
}

let cached: { tiers: TierCounts; subs: Record<ZySub, number> } | null = null;

/** Exact tier and zhuangyuan sub-tier counts, computed once. */
export function exactCounts() {
  cached ??= { tiers: tierCounts(), subs: zySubCounts() };
  return cached;
}

export function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

export interface ExplainStep {
  label: string;
  formula: string;
  value: number;
}

export interface Explanation {
  tier: Tier;
  steps: ExplainStep[];
  total: number;
}

/**
 * Closed-form counts for each tier, built from binomials so the panel can
 * show the arithmetic. The test suite checks every total against enumeration.
 */
export function explanations(): Explanation[] {
  const C = binom;
  const fourOfFours = C(6, 4) * 5 ** 2;
  const fiveFours = C(6, 5) * 5;
  const sixFours = 1;
  const fiveOther = 5 * C(6, 5) * 5;
  const sixOther = 5;
  const straights = 720;
  const threeFours = C(6, 3) * 5 ** 3;
  const sijin = 5 * C(6, 4) * 5 ** 2;
  const twoFours = C(6, 2) * 5 ** 4;
  const twoFoursQuad = C(6, 2) * 5;
  const oneFour = 6 * 5 ** 5;
  const oneFourQuad = 6 * (5 * C(5, 4) * 4);
  const oneFourFive = 6 * 5;
  const zy = fourOfFours + fiveFours + sixFours + fiveOther + sixOther;
  const erju = twoFours - twoFoursQuad;
  const yixiu = oneFour - straights - oneFourQuad - oneFourFive;
  return [
    {
      tier: "zhuangyuan",
      total: zy,
      steps: [
        { label: "Exactly four 4s", formula: "C(6,4) × 5²", value: fourOfFours },
        { label: "Exactly five 4s", formula: "C(6,5) × 5", value: fiveFours },
        { label: "Six 4s", formula: "1", value: sixFours },
        { label: "Five of another face", formula: "5 × C(6,5) × 5", value: fiveOther },
        { label: "Six of another face", formula: "5", value: sixOther },
      ],
    },
    {
      tier: "duitang",
      total: straights,
      steps: [{ label: "Each face once, any order", formula: "6!", value: straights }],
    },
    {
      tier: "sanhong",
      total: threeFours,
      steps: [{ label: "Pick three dice for the 4s, others not 4", formula: "C(6,3) × 5³", value: threeFours }],
    },
    {
      tier: "sijin",
      total: sijin,
      steps: [
        { label: "Pick the face (not 4), four dice for it, other two not that face", formula: "5 × C(6,4) × 5²", value: sijin },
      ],
    },
    {
      tier: "erju",
      total: erju,
      steps: [
        { label: "Pick two dice for the 4s, others not 4", formula: "C(6,2) × 5⁴", value: twoFours },
        { label: "Minus: the other four match (sijin)", formula: "− C(6,2) × 5", value: -twoFoursQuad },
      ],
    },
    {
      tier: "yixiu",
      total: yixiu,
      steps: [
        { label: "Pick one die for the 4, others not 4", formula: "6 × 5⁵", value: oneFour },
        { label: "Minus: straights (duitang)", formula: "− 6!", value: -straights },
        { label: "Minus: four of the other five match (sijin)", formula: "− 6 × 5 × C(5,4) × 4", value: -oneFourQuad },
        { label: "Minus: all five others match (zhuangyuan)", formula: "− 6 × 5", value: -oneFourFive },
      ],
    },
    {
      tier: "none",
      total: TOTAL_OUTCOMES - zy - straights - threeFours - sijin - erju - yixiu,
      steps: [
        { label: "No 4s at all", formula: "5⁶", value: 5 ** 6 },
        { label: "Minus: four of a kind with no 4s (sijin)", formula: "− 5 × C(6,4) × 4²", value: -5 * C(6, 4) * 16 },
        { label: "Minus: five of a kind with no 4s", formula: "− 5 × C(6,5) × 4", value: -5 * C(6, 5) * 4 },
        { label: "Minus: six of a kind with no 4s", formula: "− 5", value: -5 },
      ],
    },
  ];
}
