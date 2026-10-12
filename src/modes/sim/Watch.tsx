import { ArrowCounterClockwise, Pause, Play as PlayIcon, SkipForward } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Bowl } from "../../components/Bowl";
import { HistoryLog, PrizeStacks, RollResult, ZyHolderCard } from "../../components/Board";
import { Stage } from "../../components/Decor";
import type { Prefs } from "../../components/SettingsDialog";
import { Button, Card, NumberField, Segmented } from "../../components/ui";
import { replay, type RollRecord } from "../../engine/game";
import type { SimConfig } from "../../engine/simulate";
import type { FromWorker } from "../../workers/protocol";

const SPEEDS = ["0.5", "1", "2", "4"] as const;
type Speed = (typeof SPEEDS)[number];

let nextId = 1_000_000;

export function Watch({ cfg, maxGame, worker, prefs }: { cfg: SimConfig; maxGame: number; worker: RefObject<Worker | null>; prefs: Prefs }) {
  const [gameNo, setGameNo] = useState(1);
  const [records, setRecords] = useState<RollRecord[] | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1");
  const [throwId, setThrowId] = useState(0);
  const reqId = useRef(0);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const animate = !prefs.skipAnimation && !reduceMotion;
  const sp = Number(speed);

  useEffect(() => {
    const w = worker.current;
    if (!w) return;
    const onMsg = (e: MessageEvent<FromWorker>) => {
      if (e.data.type === "replay" && e.data.id === reqId.current) {
        setRecords(e.data.records);
        stepRef.current = 0;
        setStep(0);
        setPlaying(true);
      }
    };
    w.addEventListener("message", onMsg);
    return () => w.removeEventListener("message", onMsg);
  }, [worker]);

  // A new run invalidates the loaded game.
  useEffect(() => {
    setRecords(null);
    setPlaying(false);
  }, [cfg]);

  const load = () => {
    const id = nextId++;
    reqId.current = id;
    worker.current?.postMessage({ type: "replay", id, cfg, gameIndex: gameNo - 1 });
  };

  const players = cfg.players;
  const names = useMemo(() => Array.from({ length: players }, (_, i) => `P${i + 1}`), [players]);
  const firstPlayer = (gameNo - 1) % players;
  const view = useMemo(() => {
    if (!records) return null;
    return replay(players, cfg.settings, firstPlayer, records.slice(0, step).map((r) => r.dice));
  }, [records, step, players, cfg.settings, firstPlayer]);

  const done = !!records && step >= records.length;
  const stepRef = useRef(0);
  const playingRef = useRef(false);
  useEffect(() => {
    stepRef.current = step;
    playingRef.current = playing;
  });

  const advance = () => {
    if (!records || stepRef.current >= records.length) return;
    stepRef.current++;
    setStep(stepRef.current);
    setThrowId((t) => t + 1);
  };

  // The first throw starts from a timer; each later one starts when the bowl settles.
  useEffect(() => {
    if (!playing || !records || step !== 0) return;
    const t = setTimeout(advance, 300 / sp);
    return () => clearTimeout(t);
  });

  const onSettled = () => {
    setTimeout(() => {
      if (playingRef.current) advance();
    }, (animate ? 450 : 650) / sp);
  };

  // Resuming after a pause needs a kick, since no throw is in flight.
  const togglePlay = () => {
    const next = !playing;
    setPlaying(next);
    playingRef.current = next;
    if (next && step > 0) advance();
  };

  useEffect(() => {
    if (done) setPlaying(false);
  }, [done]);

  const lastRec = view?.records.at(-1) ?? null;

  return (
    <Card title="Watch one game">
      <div className="flex flex-wrap items-end gap-3">
        <NumberField label={`Game (1 – ${maxGame})`} value={gameNo} min={1} max={maxGame} onChange={(v) => setGameNo(Math.round(v))} className="w-36" />
        <div>
          <div className="mb-1 text-[13px] font-medium text-ink-2">Speed</div>
          <Segmented label="Speed" value={speed} onChange={setSpeed} options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} />
        </div>
        <Button variant="primary" onClick={load}>
          <PlayIcon size={18} weight="fill" /> Watch game {gameNo}
        </Button>
      </div>

      {records && view && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
          <Stage className="px-4 pb-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="tabular text-sm text-[#c8b8a2]">
                Roll {step} of {records.length}
              </div>
            </div>
            <Bowl dice={lastRec?.dice ?? null} throwId={throwId} animate={animate} sound={!prefs.muted} onSettled={onSettled} speed={sp} />
            <div className="mt-3 rounded-xl bg-surface/95 px-3 py-2 text-ink">
              <RollResult rec={lastRec} names={names} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={togglePlay} disabled={done} className="flex-1">
                {playing ? <Pause size={18} weight="fill" /> : <PlayIcon size={18} weight="fill" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button onClick={advance} disabled={done || playing} aria-label="Next roll" title="Next roll">
                <SkipForward size={18} weight="fill" />
              </Button>
              <Button
                aria-label="Restart"
                title="Restart"
                onClick={() => {
                  stepRef.current = 0;
                  setStep(0);
                  setPlaying(false);
                }}
              >
                <ArrowCounterClockwise size={18} />
              </Button>
            </div>
          </Stage>
          <div className="space-y-4">
            <PrizeStacks state={view.state} />
            <ZyHolderCard state={view.state} names={names} />
            <div className="max-h-80 overflow-y-auto">
              <HistoryLog records={view.records} names={names} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
