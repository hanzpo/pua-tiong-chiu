import { describe, expect, it } from "vitest";
import { applyRoll, newGame, replay } from "./game";
import { DEFAULT_SETTINGS, type Settings } from "./rules";

const d = (s: string) => s.split("").map(Number);
const small: Settings = {
  ...DEFAULT_SETTINGS,
  prizes: { zhuangyuan: 1, duitang: 1, sanhong: 1, sijin: 1, erju: 1, yixiu: 1 },
};

describe("game flow", () => {
  it("takes one prize per roll and rotates turns", () => {
    const g = newGame(3, small);
    const r = applyRoll(g, d("412366"));
    expect(r.won).toEqual(["yixiu"]);
    expect(g.winnings[0].yixiu).toBe(1);
    expect(g.turn).toBe(1);
    expect(g.remaining.yixiu).toBe(0);
  });

  it("gives nothing when the tier is empty and counts the waste", () => {
    const g = newGame(2, small);
    applyRoll(g, d("412366"));
    const r = applyRoll(g, d("412366"));
    expect(r.won).toEqual([]);
    expect(r.missed).toEqual(["yixiu"]);
    expect(g.wasted).toBe(1);
  });

  it("holds the zhuangyuan with the best roll and awards it at the end", () => {
    const { state, records } = replay(2, small, 0, [
      d("444456"), // p0 holds
      d("444455"), // p1 does not beat 13 with 10
      d("444466"), // p0 improves own hold
      d("444411"), // p1 takes over with chajinhua
      d("123456"),
      d("444123"),
      d("222213"),
      d("441235"),
      d("412366"),
    ]);
    expect(records[0].zy).toEqual({ from: null });
    expect(records[1].zy).toBeUndefined();
    expect(records[3].zy).toEqual({ from: 0 });
    expect(state.zyChanges).toBe(1);
    expect(state.ended).toBe("cleared");
    expect(state.winnings[1].zhuangyuan).toBe(1);
    expect(state.winnings[0].zhuangyuan).toBe(0);
    expect(state.depleted).toEqual(["duitang", "sanhong", "sijin", "erju", "yixiu"]);
  });

  it("leaves the zhuangyuan unclaimed when nobody rolls one", () => {
    const { state } = replay(2, small, 0, ["123456", "444123", "222213", "441235", "412366"].map(d));
    expect(state.ended).toBe("cleared");
    expect(state.zy).toBeNull();
    expect(state.zyPool).toBe(1);
  });

  it("applies the sijin bonus only when enabled", () => {
    const g1 = newGame(2, small);
    expect(applyRoll(g1, d("222244")).won).toEqual(["sijin"]);
    const g2 = newGame(2, { ...small, sijinPaysFours: true });
    expect(applyRoll(g2, d("222244")).won).toEqual(["sijin", "erju"]);
  });

  it("ends on chajinhua when the take-all rule is on", () => {
    const g = newGame(2, { ...DEFAULT_SETTINGS, chajinhuaTakesAll: true });
    applyRoll(g, d("412366"));
    const r = applyRoll(g, d("414144"));
    expect(r.takeAll).toBe(true);
    expect(g.ended).toBe("takeAll");
    expect(g.winnings[1].yixiu).toBe(31);
    expect(g.winnings[1].duitang).toBe(2);
    expect(g.winnings[1].zhuangyuan).toBe(1);
  });

  it("ends on six of a kind only when that rule is on", () => {
    const off = newGame(2, DEFAULT_SETTINGS);
    applyRoll(off, d("333333"));
    expect(off.ended).toBeNull();
    const on = newGame(2, { ...DEFAULT_SETTINGS, sixKindTakesAll: true });
    applyRoll(on, d("333333"));
    expect(on.ended).toBe("takeAll");
    expect(on.winnings[0].zhuangyuan).toBe(1);
  });

  it("starts with the chosen first player", () => {
    const g = newGame(4, small, 2);
    expect(applyRoll(g, d("412366")).player).toBe(2);
    expect(g.turn).toBe(3);
  });
});
