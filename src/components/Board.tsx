import { Crown, Trophy } from "@phosphor-icons/react";
import type { GameState, RollRecord, Winnings } from "../engine/game";
import { PRIZE_TIERS, STOCK_TIERS, TIER_INFO, zhuangyuanRank, ZY_SUB_INFO, type PrizeTier } from "../engine/rules";
import { DiceRow } from "./Die";
import { MooncakeStack } from "./Mooncake";
import { TierMark, TierName } from "./ui";

export function PrizeStacks({ state }: { state: GameState }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {STOCK_TIERS.map((t) => (
        <div key={t} className="flex flex-col items-center gap-1 text-center">
          <MooncakeStack count={state.remaining[t]} initial={state.settings.prizes[t]} tier={t} />
          <div className="tabular text-sm font-semibold text-ink">
            {state.remaining[t]}
            <span className="font-normal text-ink-3">/{state.settings.prizes[t]}</span>
          </div>
          <div className="font-display text-sm leading-tight" lang="zh">
            {TIER_INFO[t].zh}
          </div>
          <div className="text-[12px] leading-tight text-ink-3">{TIER_INFO[t].en}</div>
        </div>
      ))}
    </div>
  );
}

export function ZyHolderCard({ state, names }: { state: GameState; names: string[] }) {
  const zy = state.zy;
  const pool = state.settings.prizes.zhuangyuan;
  if (pool === 0) return null;
  const awarded = state.ended != null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lacquer text-gold-bright">
        <Crown size={22} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] text-ink-3">
          <span lang="zh" className="font-display">状元</span> {awarded ? "winner" : "held by"}
        </div>
        {zy ? (
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-semibold">{names[zy.player]}</span>
            <span className="font-display text-sm text-ink-2" lang="zh">
              {ZY_SUB_INFO[zy.rank.sub].zh}
            </span>
          </div>
        ) : (
          <div className="text-ink-2">{awarded ? "Unclaimed" : "Nobody yet"}</div>
        )}
      </div>
      {zy && <DiceRow dice={zy.dice} size={20} className="hidden sm:inline-flex" />}
    </div>
  );
}

/** compact drops the win of the roll's own tier, for lists that already show the tier. */
export function recordText(rec: RollRecord, names: string[], compact = false): string {
  const parts: string[] = [];
  if (rec.takeAll) return "Takes every prize left";
  if (rec.zy) {
    const sub = ZY_SUB_INFO[zhuangyuanRank(rec.dice)!.sub].zh;
    if (rec.zy.from == null) parts.push(`Holds 状元 · ${sub}`);
    else if (rec.zy.from === rec.player) parts.push(`Improves 状元 · ${sub}`);
    else parts.push(`Takes 状元 from ${names[rec.zy.from]} · ${sub}`);
  } else if (rec.tier === "zhuangyuan") {
    parts.push("状元, not better than the holder");
  }
  for (const t of rec.won) if (t !== "zhuangyuan" && !(compact && t === rec.tier)) parts.push(`Wins ${TIER_INFO[t].zh}`);
  for (const t of rec.missed) parts.push(`${TIER_INFO[t].zh} is gone`);
  return parts.join(" · ");
}

export function RollResult({ rec, names }: { rec: RollRecord | null; names: string[] }) {
  if (!rec) return <div className="h-[76px]" />;
  const info = TIER_INFO[rec.tier];
  const zy = rec.tier === "zhuangyuan" ? zhuangyuanRank(rec.dice) : null;
  const detail = recordText(rec, names);
  return (
    <div className="min-h-[76px] text-center" aria-live="polite">
      <div className="text-[13px] text-ink-3">{names[rec.player]} rolled</div>
      <div className="flex items-baseline justify-center gap-2">
        <span className={`font-display text-3xl font-bold ${rec.tier === "none" ? "text-ink-3" : "text-ink"}`} lang="zh">
          {zy ? ZY_SUB_INFO[zy.sub].zh : info.zh}
        </span>
        <span className="text-ink-2">{zy ? ZY_SUB_INFO[zy.sub].en : info.en}</span>
      </div>
      {detail && <div className="text-sm text-ink-2">{detail}</div>}
    </div>
  );
}

export function HistoryLog({ records, names, max = 200 }: { records: RollRecord[]; names: string[]; max?: number }) {
  const start = Math.max(0, records.length - max);
  const shown = records.slice(start).map((r, i) => ({ r, n: start + i + 1 })).reverse();
  if (shown.length === 0) return null;
  return (
    <ol className="divide-y divide-line">
      {shown.map(({ r, n }) => {
        const text = recordText(r, names, true);
        return (
          <li key={n} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
            <span className="tabular w-8 shrink-0 text-right text-[13px] text-ink-3">{n}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium sm:w-28 sm:flex-none">{names[r.player]}</span>
            <DiceRow dice={r.dice} size={18} className="shrink-0" />
            <span className="min-w-0 basis-full pl-11 text-sm sm:flex-1 sm:basis-auto sm:pl-0">
              {r.tier !== "none" ? <TierName tier={r.tier} showEn={false} /> : <span className="text-ink-3">—</span>}
              {text && <span className="ml-2 text-ink-3">{text}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WinningsCells({ w }: { w: Winnings }) {
  return (
    <>
      {PRIZE_TIERS.map((t) => (
        <td key={t} className={`tabular px-2 py-2 text-center ${w[t] ? "text-ink" : "text-ink-3"}`}>
          {w[t] || "·"}
        </td>
      ))}
    </>
  );
}

export function WinningsTable({ state, names, highlight, order }: { state: GameState; names: string[]; highlight?: number; order?: number[] }) {
  const total = (w: Winnings) => PRIZE_TIERS.reduce((s, t) => s + w[t], 0);
  const rows = order ?? names.map((_, i) => i);
  return (
    <>
    <ul className="divide-y divide-line sm:hidden">
      {rows.map((p) => {
        const w = state.winnings[p];
        return (
          <li key={p} className={`flex items-center gap-3 py-2 ${p === highlight ? "-mx-2 rounded-md bg-surface-2 px-2" : ""}`}>
            <span className="w-24 shrink-0 truncate font-medium">
              {state.zy?.player === p && state.ended && <Trophy size={14} weight="fill" className="mr-1 inline text-gold" aria-label="状元 winner" />}
              {names[p]}
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap gap-x-2.5 gap-y-1 text-sm">
              {PRIZE_TIERS.filter((t) => w[t] > 0).map((t) => (
                <span key={t} className="inline-flex items-center gap-1">
                  <TierMark tier={t} />
                  <span className="font-display" lang="zh">{TIER_INFO[t].zh}</span>
                  {w[t] > 1 && <span className="tabular text-ink-2">×{w[t]}</span>}
                </span>
              ))}
            </span>
            <span className="tabular font-semibold">{total(w)}</span>
          </li>
        );
      })}
    </ul>
    <div className="hidden sm:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-ink-2">
            <th className="py-2 pr-2 text-left font-medium">Player</th>
            {PRIZE_TIERS.map((t: PrizeTier) => (
              <th key={t} className="px-2 py-2 font-medium">
                <span className="inline-flex items-center gap-1 whitespace-nowrap font-display" lang="zh">
                  <TierMark tier={t} />
                  {TIER_INFO[t].zh}
                </span>
              </th>
            ))}
            <th className="py-2 pl-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p} className={`border-b border-line last:border-0 ${p === highlight ? "bg-surface-2" : ""}`}>
              <td className="max-w-32 truncate py-2 pr-2 font-medium">
                {state.zy?.player === p && state.ended && <Trophy size={14} weight="fill" className="mr-1 inline text-gold" aria-label="状元 winner" />}
                {names[p]}
              </td>
              <WinningsCells w={state.winnings[p]} />
              <td className="tabular py-2 pl-2 text-right font-semibold">{total(state.winnings[p])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
