import { ArrowCounterClockwise, Plus, Trash, DeviceMobile, DiceFive, ArrowsClockwise } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { Bowl } from "../components/Bowl";
import { HistoryLog, PrizeStacks, RollResult, WinningsTable, ZyHolderCard } from "../components/Board";
import { Stage } from "../components/Decor";
import { PrizeEditor } from "../components/PrizeEditor";
import { RuleSwitches, type Prefs } from "../components/SettingsDialog";
import { Button, Card, IconButton } from "../components/ui";
import { replay, totalPrizes } from "../engine/game";
import { CryptoRng, rollDice } from "../engine/rng";
import { PRIZE_TIERS, TIER_INFO, type Settings } from "../engine/rules";
import { usePersistent } from "../lib/storage";
import { motionSupported, requestMotion, useShake } from "../lib/shake";
import { primeAudio } from "../lib/sound";

interface SavedGame {
  names: string[];
  settings: Settings;
  firstPlayer: number;
  rolls: number[][];
}

const isSaved = (v: unknown): boolean => {
  const g = v as SavedGame | null;
  return g == null || (Array.isArray(g.names) && Array.isArray(g.rolls) && typeof g.settings === "object");
};

const rng = new CryptoRng();
const defaultNames = ["", "", "", ""];
const displayNames = (names: string[]) => names.map((n, i) => n.trim() || `Player ${i + 1}`);

interface Props {
  settings: Settings;
  onSettings: (s: Settings) => void;
  prefs: Prefs;
}

export function Play({ settings, onSettings, prefs }: Props) {
  const [game, setGame] = usePersistent<SavedGame | null>("bobing.game.v1", null, isSaved);
  const [draft, setDraft] = usePersistent<string[]>("bobing.players.v1", defaultNames, Array.isArray);

  if (!game) {
    return (
      <Setup
        names={draft}
        onNames={setDraft}
        settings={settings}
        onSettings={onSettings}
        onStart={() => setGame({ names: displayNames(draft), settings, firstPlayer: 0, rolls: [] })}
      />
    );
  }
  return <Game game={game} setGame={setGame} prefs={prefs} />;
}

function Setup({
  names,
  onNames,
  settings,
  onSettings,
  onStart,
}: {
  names: string[];
  onNames: (n: string[]) => void;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onStart: () => void;
}) {
  const canStart = names.length >= 2 && names.length <= 12 && totalPrizes(settings.prizes) - settings.prizes.zhuangyuan > 0;
  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      <Card title={`Players (${names.length})`}>
        <ol className="space-y-2">
          {names.map((n, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="tabular w-6 text-right text-sm text-ink-3">{i + 1}</span>
              <input
                className="min-h-11 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-[15px]"
                placeholder={`Player ${i + 1}`}
                aria-label={`Player ${i + 1} name`}
                value={n}
                maxLength={24}
                onChange={(e) => onNames(names.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <IconButton label={`Remove player ${i + 1}`} disabled={names.length <= 2} onClick={() => onNames(names.filter((_, j) => j !== i))} className="text-ink-3 disabled:opacity-30">
                <Trash size={18} />
              </IconButton>
            </li>
          ))}
        </ol>
        <Button className="mt-3" disabled={names.length >= 12} onClick={() => onNames([...names, ""])}>
          <Plus size={18} /> Add player
        </Button>
      </Card>
      <div className="space-y-4">
        <Card title="Prize set">
          <PrizeEditor prizes={settings.prizes} onChange={(prizes) => onSettings({ ...settings, prizes })} />
        </Card>
        <Card title="Regional rules">
          <RuleSwitches settings={settings} onSettings={onSettings} />
        </Card>
        <Button variant="primary" className="min-h-14 w-full text-lg" disabled={!canStart} onClick={onStart}>
          <DiceFive size={22} weight="fill" /> Start game
        </Button>
      </div>
    </div>
  );
}

function Game({ game, setGame, prefs }: { game: SavedGame; setGame: (g: SavedGame | null) => void; prefs: Prefs }) {
  const { state, records } = useMemo(() => replay(game.names.length, game.settings, game.firstPlayer, game.rolls), [game]);
  const names = game.names;
  const [pending, setPending] = useState<number[] | null>(null);
  const [throwId, setThrowId] = useState(0);
  const [shake, setShake] = useState(false);
  const pendingRef = useRef<number[] | null>(null);
  const reduceMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const animate = !prefs.skipAnimation && !reduceMotion;

  const lastRec = records.at(-1) ?? null;
  const shownDice = pending ?? lastRec?.dice ?? null;
  const over = state.ended != null;

  const roll = () => {
    if (over || pendingRef.current) return;
    primeAudio();
    const dice = rollDice(rng);
    pendingRef.current = dice;
    setPending(dice);
    setThrowId((n) => n + 1);
  };

  const settle = () => {
    const dice = pendingRef.current;
    if (!dice) return;
    pendingRef.current = null;
    setPending(null);
    setGame({ ...game, rolls: [...game.rolls, dice] });
  };

  const undo = () => {
    if (pendingRef.current || game.rolls.length === 0) return;
    setGame({ ...game, rolls: game.rolls.slice(0, -1) });
  };

  useShake(shake && !over, roll);

  const toggleShake = async () => {
    if (shake) return setShake(false);
    setShake(await requestMotion());
  };

  const rematch = () => setGame({ ...game, firstPlayer: (game.firstPlayer + 1) % names.length, rolls: [] });

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <Stage className="px-4 pb-5 pt-4 sm:px-6">
          <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
            <div className="min-w-0">
              {over ? (
                <div className="font-display text-xl font-semibold">Game over</div>
              ) : (
                <>
                  <div className="text-[13px] text-[#c8b8a2]">Roll {state.rolls + 1}</div>
                  <div className="truncate font-display text-xl font-semibold">{names[state.turn]} to roll</div>
                </>
              )}
            </div>
          </div>
          <Bowl dice={shownDice} throwId={throwId} animate={animate} sound={!prefs.muted} onSettled={settle} />
          <div className="mt-3 rounded-xl bg-surface/95 px-3 py-2 text-ink">
            {pending ? <div className="h-[76px]" /> : <RollResult rec={lastRec} names={names} />}
          </div>
          {!over && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                aria-label="Undo last roll"
                title="Undo last roll"
                onClick={undo}
                disabled={game.rolls.length === 0 || pending != null}
                className="flex min-h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/30 text-[#f3e8d6] disabled:opacity-30"
              >
                <ArrowCounterClockwise size={22} />
              </button>
              <button
                type="button"
                onClick={roll}
                disabled={pending != null}
                className="min-h-14 flex-1 rounded-xl bg-accent font-display text-xl font-bold text-accent-ink hover:brightness-110 active:brightness-95 disabled:opacity-70"
              >
                <span lang="zh">掷</span> Roll
              </button>
              {motionSupported() && (
                <button
                  type="button"
                  onClick={toggleShake}
                  aria-pressed={shake}
                  className={`flex min-h-14 items-center gap-2 rounded-xl border px-4 text-sm font-medium ${
                    shake ? "border-[#e6bf68] bg-[#e6bf68] text-[#241b16]" : "border-white/30 text-[#f3e8d6]"
                  }`}
                >
                  <DeviceMobile size={20} /> Shake
                </button>
              )}
            </div>
          )}
        </Stage>
        {over && (
          <Button onClick={undo} className="w-full">
            <ArrowCounterClockwise size={18} /> Undo last roll
          </Button>
        )}
        {over && <Summary state={state} names={names} onRematch={rematch} onNew={() => setGame(null)} />}
      </div>

      <div className="min-w-0 space-y-4">
        <Card title="Prizes left">
          <PrizeStacks state={state} />
          <div className="mt-4">
            <ZyHolderCard state={state} names={names} />
          </div>
        </Card>
        {!over && (
          <Card title="Standings">
            <WinningsTable state={state} names={names} highlight={state.turn} />
          </Card>
        )}
        <Card
          title={`History (${records.length})`}
          actions={
            !over && (
              <Button variant="ghost" className="min-h-9 text-sm" onClick={() => confirm("End this game and go back to setup?") && setGame(null)}>
                New game
              </Button>
            )
          }
        >
          {records.length ? <HistoryLog records={records} names={names} /> : <p className="text-sm text-ink-3">{names[game.firstPlayer]} rolls first.</p>}
        </Card>
      </div>
    </div>
  );
}

function Summary({
  state,
  names,
  onRematch,
  onNew,
}: {
  state: ReturnType<typeof replay>["state"];
  names: string[];
  onRematch: () => void;
  onNew: () => void;
}) {
  const order = names
    .map((_, p) => ({ p, total: PRIZE_TIERS.reduce((s, t) => s + state.winnings[p][t], 0) }))
    .sort((a, b) => (state.zy?.player === b.p ? 1 : 0) - (state.zy?.player === a.p ? 1 : 0) || b.total - a.total);
  const lastOut = state.depleted.at(-1);
  return (
    <Card title="Who won what">
      <p className="mb-3 text-sm text-ink-2">
        {state.ended === "takeAll" ? "A take-all roll ended the game" : `All prizes gone after ${state.rolls} rolls`}
        {lastOut && state.ended === "cleared" && ` · ${TIER_INFO[lastOut].zh} ran out last`}.
      </p>
      <WinningsTable state={state} names={names} order={order.map((o) => o.p)} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onRematch}>
          <ArrowsClockwise size={18} /> Play again
        </Button>
        <Button onClick={onNew}>New setup</Button>
      </div>
    </Card>
  );
}
