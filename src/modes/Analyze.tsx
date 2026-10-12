import { useDeferredValue, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, axisProps, cursorFill } from "../components/charts";
import { DiceRow } from "../components/Die";
import { Button, Card, NumberField, Stat, TierMark, TierName } from "../components/ui";
import { expectedValue, forecast, proportionalPrizes, tierOdds, type GameForecast } from "../engine/analysis";
import { exactCounts, explanations, TOTAL_OUTCOMES } from "../engine/enumerate";
import { totalPrizes } from "../engine/game";
import { PRIZE_TIERS, STOCK_TIERS, TIER_INFO, TRADITIONAL_PRIZES, ZY_SUB_INFO, ZY_SUBS, type PrizeTier, type Settings, type ZySub } from "../engine/rules";
import { usePersistent } from "../lib/storage";
import { fmtInt, fmtNum, fmtPct, tierColor } from "../lib/tiers";

interface Props {
  settings: Settings;
  onSettings: (s: Settings) => void;
}

const ZY_EXAMPLE: Record<ZySub, number[]> = {
  chajinhua: [4, 4, 4, 4, 1, 1],
  liubeihong: [4, 4, 4, 4, 4, 4],
  biandijin: [1, 1, 1, 1, 1, 1],
  liubeihei: [6, 6, 6, 6, 6, 6],
  wuhong: [4, 4, 4, 4, 4, 2],
  wuzidengke: [3, 3, 3, 3, 3, 5],
  sidianhong: [4, 4, 4, 4, 5, 6],
};

export function Analyze({ settings, onSettings }: Props) {
  const deferred = useDeferredValue(settings);
  const fc = useMemo(() => forecast(deferred), [deferred]);
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <OddsCard />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <ZySubCard />
        <ExplainCard />
      </div>
      <ForecastCard settings={deferred} fc={fc} />
      <EvCard settings={deferred} />
      <OptimizerCard settings={settings} onSettings={onSettings} />
    </div>
  );
}

function OddsCard() {
  const odds = useMemo(tierOdds, []);
  return (
    <Card title="Odds per roll">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-line text-ink-2">
                <th className="py-2 text-left font-medium">Tier</th>
                <th className="py-2 text-right font-medium">Outcomes</th>
                <th className="py-2 text-right font-medium">Probability</th>
                <th className="py-2 text-right font-medium">Odds</th>
                <th className="py-2 text-right font-medium">Rolls to first</th>
              </tr>
            </thead>
            <tbody>
              {odds.map((o) => (
                <tr key={o.tier} className="border-b border-line last:border-0">
                  <td className="py-2">
                    <TierName tier={o.tier} />
                  </td>
                  <td className="tabular py-2 text-right">{fmtInt(o.count)}</td>
                  <td className="tabular py-2 text-right">{fmtPct(o.p, 3)}</td>
                  <td className="tabular py-2 text-right">1 in {fmtNum(o.oneIn, o.oneIn < 10 ? 2 : 1)}</td>
                  <td className="tabular py-2 text-right">{fmtNum(o.rollsToFirst, 1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-ink-2">
                <td className="pt-2">All rolls</td>
                <td className="tabular pt-2 text-right">{fmtInt(TOTAL_OUTCOMES)}</td>
                <td className="pt-2 text-right">6⁶</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={odds.map((o) => ({ ...o, label: TIER_INFO[o.tier].zh }))} layout="vertical" margin={{ left: 0, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" {...axisProps} domain={[0, 0.4]} ticks={[0, 0.1, 0.2, 0.3, 0.4]} tickFormatter={(v) => fmtPct(v, 0)} />
              <YAxis type="category" dataKey="label" {...axisProps} width={40} />
              <Tooltip cursor={cursorFill} content={<ChartTooltip format={(v) => fmtPct(v, 3)} />} />
              <Bar dataKey="p" name="Probability" radius={[0, 3, 3, 0]}>
                {odds.map((o) => (
                  <Cell key={o.tier} fill={tierColor(o.tier)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

function ZySubCard() {
  const subs = exactCounts().subs;
  return (
    <Card title={<>状元 ranks</>}>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th className="py-2 text-left font-medium">Rank</th>
              <th className="py-2 text-left font-medium">Example</th>
              <th className="py-2 text-right font-medium">Outcomes</th>
              <th className="py-2 text-right font-medium">Odds</th>
            </tr>
          </thead>
          <tbody>
            {ZY_SUBS.map((s) => (
              <tr key={s} className="border-b border-line last:border-0">
                <td className="py-2">
                  <div className="font-display font-semibold" lang="zh">
                    {ZY_SUB_INFO[s].zh}
                  </div>
                  <div className="text-[13px] text-ink-3">{ZY_SUB_INFO[s].rule}</div>
                </td>
                <td className="py-2">
                  <DiceRow dice={ZY_EXAMPLE[s]} size={18} />
                </td>
                <td className="tabular py-2 text-right">{fmtInt(subs[s])}</td>
                <td className="tabular whitespace-nowrap py-2 text-right">1 in {fmtInt(Math.round(TOTAL_OUTCOMES / subs[s]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[13px] text-ink-3">
        Highest first. Ties break on the sixth die (五红), face then sixth die (五子登科), or the sum of the other two dice (四点红).
      </p>
    </Card>
  );
}

function ExplainCard() {
  const items = useMemo(explanations, []);
  return (
    <Card title="Explain the counts">
      <div className="space-y-1">
        {items.map((e) => (
          <details key={e.tier} className="group rounded-lg border border-line open:bg-surface-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3">
              <TierName tier={e.tier} />
              <span className="tabular ml-auto font-semibold">{fmtInt(e.total)}</span>
            </summary>
            <div className="px-3 pb-3">
              <p className="mb-2 text-[13px] text-ink-3">{TIER_INFO[e.tier].rule}.</p>
              <table className="w-full text-sm">
                <tbody>
                  {e.steps.map((s, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-1 pr-2 text-ink-2">{s.label}</td>
                      <td className="whitespace-nowrap py-1 pr-2 font-mono text-[13px]">{s.formula}</td>
                      <td className="tabular py-1 text-right">{s.value < 0 ? `−${fmtInt(-s.value)}` : fmtInt(s.value)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-line font-semibold">
                    <td className="pt-1" colSpan={2}>
                      Total
                    </td>
                    <td className="tabular pt-1 text-right">{fmtInt(e.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-ink-3">C(n,k) counts which dice show a face; the powers count the free choices for the rest. Each total is checked against all 46,656 rolls.</p>
    </Card>
  );
}

function ForecastCard({ settings, fc }: { settings: Settings; fc: GameForecast }) {
  const active = STOCK_TIERS.filter((t) => settings.prizes[t] > 0);
  const data = active.map((t) => ({ tier: t, label: TIER_INFO[t].zh, rolls: fc.rollsToClear[t] }));
  const order = [...active].sort((a, b) => fc.rollsToClear[a] - fc.rollsToClear[b]);
  return (
    <Card title="Your prize set">
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Expected rolls per game" value={fmtNum(fc.expectedRolls)} sub={fc.exact ? "exact" : "approx. with the 四进 bonus"} />
        <Stat label="Clears first" value={order[0] ? TIER_INFO[order[0]].zh : "—"} sub={order[0] && `${fmtNum(fc.rollsToClear[order[0]])} rolls on its own`} />
        <Stat label="Clears last" value={order.at(-1) ? TIER_INFO[order.at(-1)!].zh : "—"} sub={order.at(-1) && `${fmtNum(fc.rollsToClear[order.at(-1)!])} rolls on its own`} />
        <Stat label="Nobody rolls 状元" value={fmtPct(fc.zyUnclaimedP, 1)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[440px] text-sm">
            <thead>
              <tr className="border-b border-line text-ink-2">
                <th className="py-2 text-left font-medium">Tier</th>
                <th className="py-2 text-right font-medium">Prizes</th>
                <th className="py-2 text-right font-medium">Pays per roll</th>
                <th className="py-2 text-right font-medium">Rolls to clear</th>
                <th className="py-2 text-right font-medium">Last out</th>
              </tr>
            </thead>
            <tbody>
              {STOCK_TIERS.map((t) => (
                <tr key={t} className="border-b border-line last:border-0">
                  <td className="py-2">
                    <TierName tier={t} showEn={false} />
                  </td>
                  <td className="tabular py-2 text-right">{settings.prizes[t]}</td>
                  <td className="tabular py-2 text-right">{fmtPct(fc.payP[t], 2)}</td>
                  <td className="tabular py-2 text-right">{settings.prizes[t] ? fmtNum(fc.rollsToClear[t]) : "—"}</td>
                  <td className="tabular py-2 text-right">{fmtPct(fc.lastOut[t], 1)}</td>
                </tr>
              ))}
              {fc.takeAllP > 0 && (
                <tr>
                  <td className="py-2 text-ink-2" colSpan={4}>
                    Ended by a take-all roll
                  </td>
                  <td className="tabular py-2 text-right">{fmtPct(fc.lastOut.takeAll, 1)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-2 text-[13px] text-ink-3">
            Rolls to clear is prizes ÷ chance per roll: how long the tier lasts if nothing else ends the game. Last out is the exact chance that the tier is the one that ends it.
          </p>
        </div>
        <div className="h-60">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <Tooltip cursor={cursorFill} content={<ChartTooltip format={(v) => `${fmtNum(v)} rolls`} />} />
              <Bar dataKey="rolls" name="Rolls to clear" radius={[3, 3, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.tier} fill={tierColor(d.tier)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

const DEFAULT_VALUES: Record<PrizeTier, number> = { zhuangyuan: 60, duitang: 25, sanhong: 12, sijin: 8, erju: 4, yixiu: 2 };

function EvCard({ settings }: { settings: Settings }) {
  const [values, setValues] = usePersistent<Record<PrizeTier, number>>("bobing.ev.v1", DEFAULT_VALUES);
  const [players, setPlayers] = usePersistent<number>("bobing.ev.players.v1", 6);
  const ev = useMemo(() => expectedValue(settings, values, players), [settings, values, players]);
  const money = (v: number) => `$${fmtNum(v, 2)}`;
  return (
    <Card title="Expected value">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] [&>*]:min-w-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PRIZE_TIERS.map((t) => (
            <NumberField key={t} label={<><TierName tier={t} showEn={false} /> ($)</>} value={values[t]} min={0} step={0.5} onChange={(v) => setValues({ ...values, [t]: v })} />
          ))}
          <NumberField label="Players" value={players} min={2} max={12} onChange={(v) => setPlayers(Math.round(v))} />
        </div>
        <div className="grid grid-cols-2 content-start gap-4">
          <Stat label="Per player per game" value={money(ev.perPlayerPerGame)} />
          <Stat label="Pool handed out per game" value={money(ev.perGame)} sub={`of ${money(PRIZE_TIERS.reduce((s, t) => s + settings.prizes[t] * values[t], 0))}`} />
          <Stat label="Per roll, first roll" value={money(ev.perRollFresh)} sub="all tiers stocked" />
          <Stat label="Per roll, whole game" value={money(ev.perRollAverage)} sub="pool ÷ expected rolls" />
        </div>
      </div>
      <p className="mt-3 text-[13px] text-ink-3">
        Every player has the same expected share because turn order rotates. The pool falls short of its full value only when nobody rolls 状元.
      </p>
    </Card>
  );
}

function OptimizerCard({ settings, onSettings }: Props) {
  const [total, setTotal] = usePersistent<number>("bobing.opt.total.v1", 63);
  const deferredTotal = useDeferredValue(total);
  const proposal = useMemo(() => proportionalPrizes(deferredTotal), [deferredTotal]);
  const { sijinPaysFours, chajinhuaTakesAll, sixKindTakesAll } = settings;
  const rules = useMemo(() => ({ sijinPaysFours, chajinhuaTakesAll, sixKindTakesAll }), [sijinPaysFours, chajinhuaTakesAll, sixKindTakesAll]);
  const a = useMemo(() => forecast({ ...rules, prizes: TRADITIONAL_PRIZES }), [rules]);
  const b = useMemo(() => forecast({ ...rules, prizes: proposal }), [rules, proposal]);
  const spread = (f: GameForecast, prizes: Record<PrizeTier, number>) => {
    const xs = STOCK_TIERS.filter((t) => prizes[t] > 0).map((t) => f.rollsToClear[t]);
    return Math.max(...xs) - Math.min(...xs);
  };
  const cols = [
    { name: "Traditional", prizes: TRADITIONAL_PRIZES, f: a },
    { name: "Proportional", prizes: proposal, f: b },
  ];
  return (
    <Card
      title="Prize-set optimizer"
      actions={
        <Button className="min-h-9 text-sm" onClick={() => onSettings({ ...settings, prizes: proposal })} disabled={totalPrizes(proposal) < 2}>
          Use proportional set
        </Button>
      }
    >
      <div className="flex flex-wrap items-end gap-4">
        <NumberField label="Total prizes" value={total} min={2} max={999} onChange={(v) => setTotal(Math.round(v))} className="w-36" />
        <p className="max-w-xl flex-1 text-[13px] text-ink-3">
          状元 stays at 1. The rest split in proportion to each tier’s chance per roll, rounded by largest remainder, so every tier lasts about as long.
        </p>
      </div>
      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-ink-2">
              <th className="py-2 text-left font-medium">Tier</th>
              {cols.map((c) => (
                <th key={c.name} colSpan={3} className="py-2 text-center font-medium">
                  {c.name} ({totalPrizes(c.prizes)})
                </th>
              ))}
            </tr>
            <tr className="border-b border-line text-[12px] text-ink-3">
              <th />
              {cols.map((c) => (
                <ColumnHeads key={c.name} />
              ))}
            </tr>
          </thead>
          <tbody>
            {PRIZE_TIERS.map((t) => (
              <tr key={t} className="border-b border-line last:border-0">
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <TierMark tier={t} />
                    <span className="font-display font-semibold" lang="zh">
                      {TIER_INFO[t].zh}
                    </span>
                  </span>
                </td>
                {cols.map((c) => (
                  <Cells key={c.name} t={t} prizes={c.prizes} f={c.f} />
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong">
              <td className="py-2 text-ink-2">Expected rolls</td>
              {cols.map((c) => (
                <td key={c.name} colSpan={3} className="tabular py-2 text-center font-semibold">
                  {fmtNum(c.f.expectedRolls)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-ink-2">Clear-time spread</td>
              {cols.map((c) => (
                <td key={c.name} colSpan={3} className="tabular py-2 text-center">
                  {fmtNum(spread(c.f, c.prizes))} rolls
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-2 text-ink-2">Nobody rolls 状元</td>
              {cols.map((c) => (
                <td key={c.name} colSpan={3} className="tabular py-2 text-center">
                  {fmtPct(c.f.zyUnclaimedP, 1)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function ColumnHeads() {
  return (
    <>
      <th className="py-1 text-right font-normal">Prizes</th>
      <th className="py-1 text-right font-normal">To clear</th>
      <th className="py-1 pr-2 text-right font-normal">Last out</th>
    </>
  );
}

function Cells({ t, prizes, f }: { t: PrizeTier; prizes: Record<PrizeTier, number>; f: GameForecast }) {
  if (t === "zhuangyuan")
    return (
      <>
        <td className="tabular py-2 text-right">{prizes[t]}</td>
        <td className="py-2 text-right text-ink-3">held</td>
        <td className="py-2 pr-2" />
      </>
    );
  return (
    <>
      <td className="tabular py-2 text-right">{prizes[t]}</td>
      <td className="tabular py-2 text-right">{prizes[t] ? fmtNum(f.rollsToClear[t]) : "—"}</td>
      <td className="tabular py-2 pr-2 text-right">{fmtPct(f.lastOut[t], 1)}</td>
    </>
  );
}
