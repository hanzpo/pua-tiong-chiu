import type { Tier } from "../engine/rules";

export const tierColor = (t: Tier) => `var(--t-${t})`;

export const fmtInt = (n: number) => n.toLocaleString("en-US");
export const fmtPct = (p: number, digits = 2) => `${(p * 100).toFixed(digits)}%`;
export const fmtNum = (n: number, digits = 1) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
