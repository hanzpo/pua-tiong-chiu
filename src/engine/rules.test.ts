import { describe, expect, it } from "vitest";
import { explanations, payCounts, tierCounts, TOTAL_OUTCOMES, zySubCounts } from "./enumerate";
import { classify, compareZy, DEFAULT_SETTINGS, payingTiers, zhuangyuanRank, type ZyRank } from "./rules";

const rank = (s: string): ZyRank => zhuangyuanRank(s.split("").map(Number))!;
const beats = (a: string, b: string) => compareZy(rank(a), rank(b)) > 0;

describe("classify, exhaustive", () => {
  it("matches the oracle counts over all 6^6 rolls", () => {
    expect(tierCounts()).toEqual({
      zhuangyuan: 561,
      duitang: 720,
      sanhong: 2500,
      sijin: 1875,
      erju: 9300,
      yixiu: 17400,
      none: 14300,
    });
  });

  it("closed-form explanations agree with enumeration", () => {
    const counts = tierCounts();
    for (const e of explanations()) {
      expect(e.steps.reduce((s, x) => s + x.value, 0)).toBe(e.total);
      expect(e.total).toBe(counts[e.tier]);
    }
  });

  it("splits zhuangyuan into sub-tiers that sum to 561", () => {
    const subs = zySubCounts();
    expect(subs).toEqual({
      chajinhua: 15,
      liubeihong: 1,
      biandijin: 1,
      liubeihei: 4,
      wuhong: 30,
      wuzidengke: 150,
      sidianhong: 360,
    });
    expect(Object.values(subs).reduce((a, b) => a + b)).toBe(561);
  });
});

describe("classify, precedence", () => {
  it.each([
    ["222244", "sijin"],
    ["123456", "duitang"],
    ["654321", "duitang"],
    ["444123", "sanhong"],
    ["441235", "erju"],
    ["412366", "yixiu"],
    ["111114", "zhuangyuan"],
    ["444411", "zhuangyuan"],
    ["666666", "zhuangyuan"],
    ["222241", "sijin"],
    ["112233", "none"],
    ["111123", "sijin"],
  ])("%s is %s", (dice, tier) => {
    expect(classify(dice.split("").map(Number))).toBe(tier);
  });
});

describe("zhuangyuan sub-ranking", () => {
  it("orders the sub-tiers", () => {
    const order = ["444411", "444444", "111111", "666666", "444442", "555551", "444456"];
    for (let i = 0; i + 1 < order.length; i++) expect(beats(order[i], order[i + 1])).toBe(true);
  });

  it("4-4-4-4-1-1 beats 4-4-4-4-4-4", () => expect(beats("444411", "444444")).toBe(true));
  it("4-4-4-4-6-6 beats 4-4-4-4-5-6", () => expect(beats("444466", "444456")).toBe(true));
  it("five 4s break ties on the sixth die", () => expect(beats("444446", "444445")).toBe(true));
  it("five of a kind breaks ties on face, then sixth die", () => {
    expect(beats("666661", "555556")).toBe(true);
    expect(beats("222226", "222225")).toBe(true);
  });
  it("five 4s beats five of another face", () => expect(beats("444441", "666665")).toBe(true));
  it("dice order does not matter", () => expect(compareZy(rank("144441"), rank("444411"))).toBe(0));
  it("equal sums tie", () => expect(compareZy(rank("444426"), rank("444435"))).toBe(0));
});

describe("payingTiers", () => {
  it("pays sijin only by default", () => {
    expect(payingTiers([2, 2, 2, 2, 4, 4], DEFAULT_SETTINGS)).toEqual(["sijin"]);
  });
  it("adds erju or yixiu with the regional sijin rule", () => {
    const s = { ...DEFAULT_SETTINGS, sijinPaysFours: true };
    expect(payingTiers([2, 2, 2, 2, 4, 4], s)).toEqual(["sijin", "erju"]);
    expect(payingTiers([2, 2, 2, 2, 4, 1], s)).toEqual(["sijin", "yixiu"]);
    expect(payingTiers([2, 2, 2, 2, 1, 1], s)).toEqual(["sijin"]);
    const pays = payCounts(s);
    expect(pays.erju).toBe(9300 + 75);
    expect(pays.yixiu).toBe(17400 + 600);
  });
  it("covers every outcome exactly once by default", () => {
    const pays = payCounts(DEFAULT_SETTINGS);
    expect(Object.values(pays).reduce((a, b) => a + b)).toBe(TOTAL_OUTCOMES);
  });
});
