import { describe, expect, it } from "vitest";
import { Mt19937, rollDie, type Rng } from "./rng";

describe("Mt19937", () => {
  it("matches the reference output for the default seed 5489", () => {
    const mt = new Mt19937(5489);
    const first = Array.from({ length: 5 }, () => mt.nextUint32());
    expect(first).toEqual([3499211612, 581869302, 3890346734, 3586334585, 545404204]);
  });

  it("matches the C++ std::mt19937 10000th output", () => {
    // The C++ standard requires this value ([rand.predef]).
    const mt = new Mt19937(5489);
    let v = 0;
    for (let i = 0; i < 10000; i++) v = mt.nextUint32();
    expect(v).toBe(4123659995);
  });

  it("is reproducible for a given seed", () => {
    const a = new Mt19937(42);
    const b = new Mt19937(42);
    for (let i = 0; i < 2000; i++) expect(a.nextUint32()).toBe(b.nextUint32());
  });
});

describe("rollDie", () => {
  it("rejects values at or above the largest multiple of 6", () => {
    const values = [0xffffffff, 0xfffffffc, 0xfffffffb];
    const rng: Rng = { nextUint32: () => values.shift()! };
    // 0xfffffffb = 4294967291 is the largest accepted value; 4294967291 % 6 = 5.
    expect(rollDie(rng)).toBe(6);
    expect(values).toHaveLength(0);
  });

  it("produces roughly uniform faces", () => {
    const mt = new Mt19937(1);
    const counts = [0, 0, 0, 0, 0, 0];
    const n = 60000;
    for (let i = 0; i < n; i++) counts[rollDie(mt) - 1]++;
    for (const c of counts) expect(Math.abs(c - n / 6)).toBeLessThan(400);
  });
});
