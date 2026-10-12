import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, axisProps, cursorFill } from "../../components/charts";
import { Card, Stat, TierMark, TierName } from "../../components/ui";
import { forecast } from "../../engine/analysis";
import { exactCounts, TOTAL_OUTCOMES } from "../../engine/enumerate";
import { histogramMean, histogramQuantile } from "../../engine/simulate";
import { PRIZE_TIERS, STOCK_TIERS, TIER_INFO, type PrizeTier, type Tier } from "../../engine/rules";
import { fmtInt, fmtNum, fmtPct, tierColor } from "../../lib/tiers";
import type { RunResult } from "../Simulate";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const ALL_TIERS: Tier[] = [...PRIZE_TIERS, "none"];

const logTicks = (max: number) => {
  const out: number[] = [];
  for (let t = 10; t <= max; t *= 10) out.push(t);
  return out;
};

export function Results({ result }: { result: RunResult }) {
  const { stats, cfg, cancelled, ms } = result;
  const n = stats.games;
  const exact = exactCounts().tiers;
  const fc = useMemo(() => forecast(cfg.settings), [cfg.settings]);

  const lengths = useMemo(() => {
    const first = stats.lengthCounts.findIndex((c) => c > 0);
    const last = stats.lengthCounts.length - 1;
    const width = Math.max(1, Math.ceil((last - first + 1) / 45));
    const start = Math.floor(first / width) * width;
    const bins: { from: number; to: number; games: number }[] = [];
    for (let b = start; b <= last; b += width) {
      let g = 0;
      for (let i = b; i < b + width; i++) g += stats.lengthCounts[i] ?? 0;
      bins.push({ from: b, to: b + width - 1, games: g });
    }
    return { bins, width };
  }, [stats]);

  const seats = stats.bySeat.map((w, i) => {
    const row: Record<string, number | string> = { seat: ordinal(i + 1) };
    for (const t of PRIZE_TIERS) row[t] = w[t] / n;
    return row;
  });

  const zyChanges = stats.zyChangeCounts.map((c, k) => ({ k, share: (c ?? 0) / n }));
  const zyMean = histogramMean(stats.zyChangeCounts);

  const lastOut = [...STOCK_TIERS, "takeAll" as const]
    .filter((t) => t !== "takeAll" || cfg.settings.chajinhuaTakesAll || cfg.settings.sixKindTakesAll)
    .map((t) => ({
      tier: t,
      label: t === "takeAll" ? "Take-all" : TIER_INFO[t].zh,
      simulated: stats.lastOut[t] / n,
      exact: fc.lastOut[t],
    }));

  const convergence = stats.convergence.map((c) => {
    let total = 0;
    for (const t of ALL_TIERS) total += c.counts[t];
    const row: Record<string, number> = { rolls: c.rolls };
    for (const t of PRIZE_TIERS) row[t] = c.counts[t] / total / (exact[t] / TOTAL_OUTCOMES);
    return row;
  });

  const perPlayerTotal = (w: Record<PrizeTier, number>) => PRIZE_TIERS.reduce((s, t) => s + w[t], 0) / n;

  return (
    <div className="space-y-4">
      <Card title={cancelled ? `Results (cancelled after ${fmtInt(n)} games)` : "Results"}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Games" value={fmtInt(n)} sub={`${fmtNum(ms / 1000, 1)} s`} />
          <Stat label="Mean rolls" value={fmtNum(histogramMean(stats.lengthCounts))} sub={`exact ${fmtNum(fc.expectedRolls)}${fc.exact ? "" : " (approx.)"}`} />
          <Stat label="Median" value={histogramQuantile(stats.lengthCounts, 0.5)} />
          <Stat label="p10 – p90" value={`${histogramQuantile(stats.lengthCounts, 0.1)} – ${histogramQuantile(stats.lengthCounts, 0.9)}`} />
          <Stat label="Rolls per player" value={fmtNum(histogramMean(stats.lengthCounts) / cfg.players)} />
          <Stat label="Wasted rolls" value={fmtNum(stats.wastedRolls / n)} sub="per game" />
        </div>
        <p className="mt-3 text-[13px] text-ink-3">
          Seed {cfg.seed} · {cfg.players} players · {fmtInt(stats.rolls)} rolls
        </p>
      </Card>

      <Card title="Game length">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={lengths.bins} barCategoryGap={1}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="from" {...axisProps} />
              <YAxis {...axisProps} width={48} tickFormatter={(v) => fmtInt(v)} />
              <Tooltip
                cursor={cursorFill}
                content={
                  <ChartTooltip
                    labelFormat={(l) => (lengths.width === 1 ? `${l} rolls` : `${l}–${Number(l) + lengths.width - 1} rolls`)}
                    format={(v) => `${fmtInt(v)} games (${fmtPct(v / n, 1)})`}
                  />
                }
              />
              <Bar dataKey="games" name="Games" fill="var(--t-duitang)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[13px] text-ink-3">Total rolls per game.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="Prizes per game by seat">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={seats} barCategoryGap="20%">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="seat" {...axisProps} />
                <YAxis {...axisProps} width={36} />
                <Tooltip cursor={cursorFill} content={<ChartTooltip labelFormat={(l) => `${l} to roll`} format={(v) => fmtNum(v, 2)} />} />
                <Legend iconType="square" iconSize={10} />
                {PRIZE_TIERS.map((t, i) => (
                  <Bar
                    key={t}
                    dataKey={t}
                    name={TIER_INFO[t].zh}
                    stackId="s"
                    fill={tierColor(t)}
                    stroke="var(--surface)"
                    strokeWidth={1}
                    radius={i === PRIZE_TIERS.length - 1 ? [3, 3, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <SeatTable stats={stats} n={n} players={cfg.players} total={perPlayerTotal} />
        </Card>

        <Card title="状元 changes hands">
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={zyChanges}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="k" {...axisProps} />
                <YAxis {...axisProps} width={44} tickFormatter={(v) => fmtPct(v, 0)} />
                <Tooltip cursor={cursorFill} content={<ChartTooltip labelFormat={(l) => `${l} takeover${l === 1 ? "" : "s"}`} format={(v) => fmtPct(v, 1)} />} />
                <Bar dataKey="share" name="Games" fill="var(--t-zhuangyuan)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Stat label="Mean takeovers per game" value={fmtNum(zyMean, 2)} />
            <Stat label="Nobody rolls 状元" value={fmtPct(stats.zyUnclaimed / n, 1)} sub={`exact ${fmtPct(fc.zyUnclaimedP, 1)}`} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="Which tier runs out last">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={lastOut}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={44} tickFormatter={(v) => fmtPct(v, 0)} />
                <Tooltip cursor={cursorFill} content={<ChartTooltip format={(v) => fmtPct(v, 1)} />} />
                <Legend iconType="square" iconSize={10} />
                <Bar dataKey="simulated" name="Simulated" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="exact" name="Exact" fill="var(--ink-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-ink-2">
                <th className="py-1.5 text-left font-medium">Tier</th>
                <th className="py-1.5 text-right font-medium">Last out</th>
                <th className="py-1.5 text-right font-medium">Wasted rolls / game</th>
              </tr>
            </thead>
            <tbody>
              {STOCK_TIERS.map((t) => (
                <tr key={t} className="border-b border-line last:border-0">
                  <td className="py-1.5">
                    <TierName tier={t} />
                  </td>
                  <td className="tabular py-1.5 text-right">{fmtPct(stats.lastOut[t] / n, 1)}</td>
                  <td className="tabular py-1.5 text-right">{fmtNum(stats.wastedByTier[t] / n, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[13px] text-ink-3">A wasted roll scores a tier that is already empty.</p>
        </Card>

        <Card title="Tier frequency">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-ink-2">
                  <th className="py-1.5 text-left font-medium">Tier</th>
                  <th className="py-1.5 text-right font-medium">Rolls</th>
                  <th className="py-1.5 text-right font-medium">Simulated</th>
                  <th className="py-1.5 text-right font-medium">Exact</th>
                  <th className="py-1.5 text-right font-medium" title="Difference in standard errors">z</th>
                </tr>
              </thead>
              <tbody>
                {ALL_TIERS.map((t) => {
                  const p = exact[t] / TOTAL_OUTCOMES;
                  const ph = stats.tierCounts[t] / stats.rolls;
                  const z = (ph - p) / Math.sqrt((p * (1 - p)) / stats.rolls);
                  return (
                    <tr key={t} className="border-b border-line last:border-0">
                      <td className="py-1.5">
                        <TierName tier={t} showEn={false} />
                      </td>
                      <td className="tabular py-1.5 text-right">{fmtInt(stats.tierCounts[t])}</td>
                      <td className="tabular py-1.5 text-right">{fmtPct(ph, 3)}</td>
                      <td className="tabular py-1.5 text-right text-ink-2">{fmtPct(p, 3)}</td>
                      <td className="tabular py-1.5 text-right text-ink-2">{z >= 0 ? "+" : "−"}{fmtNum(Math.abs(z), 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Convergence to the exact odds">
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={convergence} margin={{ right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="rolls"
                scale="log"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={logTicks(stats.rolls)}
                {...axisProps}
                tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}k` : String(v))}
              />
              <YAxis {...axisProps} width={44} domain={[0, 2]} allowDataOverflow tickFormatter={(v) => `${v}×`} />
              <ReferenceLine y={1} stroke="var(--ink-3)" strokeDasharray="4 4" />
              <Tooltip content={<ChartTooltip labelFormat={(l) => `${fmtInt(Number(l))} rolls`} format={(v) => `${fmtNum(v, 3)}×`} />} />
              <Legend iconType="plainline" />
              {PRIZE_TIERS.map((t) => (
                <Line key={t} dataKey={t} name={TIER_INFO[t].zh} stroke={tierColor(t)} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[13px] text-ink-3">Simulated frequency divided by exact probability, after each number of rolls. Rare tiers settle slowest.</p>
      </Card>
    </div>
  );
}

function SeatTable({
  stats,
  n,
  players,
  total,
}: {
  stats: RunResult["stats"];
  n: number;
  players: number;
  total: (w: Record<PrizeTier, number>) => number;
}) {
  return (
    <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b border-line text-ink-2">
            <th className="py-1.5 text-left font-medium">Position</th>
            <th className="py-1.5 text-right font-medium">Prizes / game</th>
            <th className="py-1.5 text-right font-medium">
              <span className="inline-flex items-center gap-1">
                <TierMark tier="zhuangyuan" /> 状元 win
              </span>
            </th>
            <th className="py-1.5 text-right font-medium">By player</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: players }, (_, i) => (
            <tr key={i} className="border-b border-line last:border-0">
              <td className="py-1.5">{ordinal(i + 1)} to roll</td>
              <td className="tabular py-1.5 text-right">{fmtNum(total(stats.bySeat[i]), 2)}</td>
              <td className="tabular py-1.5 text-right">{fmtPct(stats.zyBySeat[i] / n, 1)}</td>
              <td className="tabular py-1.5 text-right text-ink-2">
                P{i + 1}: {fmtNum(total(stats.byPlayer[i]), 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[13px] text-ink-3">The first roll rotates each game, so each player sits in every position equally often.</p>
    </div>
  );
}
