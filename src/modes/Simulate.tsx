import { ArrowsClockwise, Play as PlayIcon, Stop } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { PrizeEditor } from "../components/PrizeEditor";
import { RuleSwitches, type Prefs } from "../components/SettingsDialog";
import { Button, Card, NumberField, Progress } from "../components/ui";
import { totalPrizes } from "../engine/game";
import { randomSeed } from "../engine/rng";
import type { Settings } from "../engine/rules";
import type { SimConfig, SimStats } from "../engine/simulate";
import { fmtInt } from "../lib/tiers";
import { usePersistent } from "../lib/storage";
import type { FromWorker, ToWorker } from "../workers/protocol";
import { Results } from "./sim/Results";
import { Watch } from "./sim/Watch";

interface Props {
  settings: Settings;
  onSettings: (s: Settings) => void;
  prefs: Prefs;
}

interface Form {
  players: number;
  games: number;
  seed: number;
}

export interface RunResult {
  cfg: SimConfig;
  stats: SimStats;
  cancelled: boolean;
  ms: number;
}

let nextId = 1;

export function Simulate({ settings, onSettings, prefs }: Props) {
  const [form, setForm] = usePersistent<Form>("bobing.sim.v1", { players: 6, games: 10000, seed: 5489 });
  const [running, setRunning] = useState<{ id: number; games: number; total: number } | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const worker = useRef<Worker | null>(null);
  const pendingCfg = useRef<SimConfig | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../workers/sim.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    w.addEventListener("message", (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.type === "progress") setRunning((r) => (r && r.id === m.id ? { ...r, games: m.games } : r));
      if (m.type === "done") {
        setRunning((r) => (r && r.id === m.id ? null : r));
        if (pendingCfg.current) setResult({ cfg: pendingCfg.current, stats: m.stats, cancelled: m.cancelled, ms: m.ms });
      }
    });
    return () => w.terminate();
  }, []);

  const send = (m: ToWorker) => worker.current?.postMessage(m);
  const stock = totalPrizes(settings.prizes) - settings.prizes.zhuangyuan;

  const run = () => {
    const cfg: SimConfig = { players: form.players, games: form.games, seed: form.seed >>> 0, settings };
    const id = nextId++;
    pendingCfg.current = cfg;
    setRunning({ id, games: 0, total: cfg.games });
    send({ type: "run", id, cfg });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] [&>*]:min-w-0">
        <Card title="Run">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Players" value={form.players} min={2} max={12} onChange={(v) => setForm({ ...form, players: Math.round(v) })} />
            <NumberField label="Games" value={form.games} min={1} max={100000} step={1000} onChange={(v) => setForm({ ...form, games: Math.round(v) })} />
            <div className="col-span-2 flex items-end gap-2">
              <NumberField
                className="flex-1"
                label="Seed (MT19937)"
                value={form.seed}
                min={0}
                max={4294967295}
                onChange={(v) => setForm({ ...form, seed: Math.floor(v) })}
              />
              <Button onClick={() => setForm({ ...form, seed: randomSeed() })} aria-label="New random seed" title="New random seed">
                <ArrowsClockwise size={18} />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            {running ? (
              <div className="space-y-2">
                <Progress value={running.games / running.total} label="Simulation progress" />
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular text-sm text-ink-2">
                    {fmtInt(running.games)} of {fmtInt(running.total)} games
                  </span>
                  <Button onClick={() => send({ type: "cancel", id: running.id })}>
                    <Stop size={18} weight="fill" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" className="w-full" onClick={run} disabled={stock === 0}>
                <PlayIcon size={18} weight="fill" /> Run {fmtInt(form.games)} games
              </Button>
            )}
          </div>
        </Card>
        <Card title="Prizes and rules">
          <PrizeEditor prizes={settings.prizes} onChange={(prizes) => onSettings({ ...settings, prizes })} disabled={!!running} />
          <div className="mt-3 border-t border-line pt-2">
            <RuleSwitches settings={settings} onSettings={onSettings} />
          </div>
        </Card>
      </div>

      {result && (
        <>
          <Results result={result} />
          <Watch cfg={result.cfg} maxGame={result.stats.games} worker={worker} prefs={prefs} />
        </>
      )}
    </div>
  );
}
