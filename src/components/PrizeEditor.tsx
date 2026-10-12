import { proportionalPrizes } from "../engine/analysis";
import { totalPrizes } from "../engine/game";
import { PRIZE_TIERS, TRADITIONAL_PRIZES, type PrizeTier } from "../engine/rules";
import { NumberField, TierName } from "./ui";

interface Props {
  prizes: Record<PrizeTier, number>;
  onChange: (p: Record<PrizeTier, number>) => void;
  disabled?: boolean;
}

const same = (a: Record<PrizeTier, number>, b: Record<PrizeTier, number>) => PRIZE_TIERS.every((t) => a[t] === b[t]);

export function PrizeEditor({ prizes, onChange, disabled }: Props) {
  const total = totalPrizes(prizes);
  const stock = total - prizes.zhuangyuan;
  const proportional = proportionalPrizes(total);
  return (
    <fieldset disabled={disabled} className="disabled:opacity-60">
      <legend className="sr-only">Prize counts per tier</legend>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
        {PRIZE_TIERS.map((t) => (
          <NumberField
            key={t}
            label={<TierName tier={t} />}
            value={prizes[t]}
            min={0}
            max={t === "zhuangyuan" ? 5 : 999}
            onChange={(v) => onChange({ ...prizes, [t]: Math.round(v) })}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="tabular mr-auto text-ink-2">{total} prizes</span>
        <button
          type="button"
          className={`min-h-9 rounded-md border px-3 ${same(prizes, TRADITIONAL_PRIZES) ? "border-accent text-ink" : "border-line-strong text-ink-2 hover:text-ink"}`}
          onClick={() => onChange({ ...TRADITIONAL_PRIZES })}
        >
          Traditional 63
        </button>
        <button
          type="button"
          className={`min-h-9 rounded-md border px-3 ${same(prizes, proportional) ? "border-accent text-ink" : "border-line-strong text-ink-2 hover:text-ink"}`}
          onClick={() => onChange(proportional)}
        >
          Proportional {total}
        </button>
      </div>
      {stock === 0 && <p className="mt-2 text-sm text-accent">Add at least one prize outside 状元 so the game can end.</p>}
    </fieldset>
  );
}
