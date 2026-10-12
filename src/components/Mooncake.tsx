import type { StockTier } from "../engine/rules";
import { TIER_INFO } from "../engine/rules";
import { tierColor } from "../lib/tiers";

export function Mooncake({ size = 22, tier }: { size?: number; tier?: string }) {
  const n = 12;
  const petals = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return <circle key={i} cx={20 + Math.cos(a) * 15.5} cy={20 + Math.sin(a) * 15.5} r={4.4} fill="#c98b3c" />;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      {petals}
      <circle cx="20" cy="20" r="16" fill="#d49a4c" />
      <circle cx="20" cy="20" r="12" fill="none" stroke="#a96d26" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="5" fill="none" stroke="#a96d26" strokeWidth="1.4" />
      {tier && <circle cx="20" cy="20" r="2.4" fill={tierColor(tier as StockTier)} />}
    </svg>
  );
}

/** Remaining prizes as a stack of mooncakes seen from the side. Large stocks cap the drawing. */
export function MooncakeStack({ count, initial, tier }: { count: number; initial: number; tier: string }) {
  const cap = 14;
  const slots = Math.min(initial, cap);
  const shown = initial <= cap ? count : Math.ceil((count / initial) * cap);
  const step = 5;
  return (
    <div className="relative mx-auto w-11" style={{ height: cap * step + 16 }} aria-hidden>
      {Array.from({ length: slots }, (_, i) => {
        const filled = i < shown;
        return (
          <span
            key={i}
            className={`absolute left-0 block h-4 w-11 rounded-[50%] ${filled ? "" : "border border-dashed border-line-strong"}`}
            style={{
              bottom: i * step,
              background: filled ? "radial-gradient(ellipse at 50% 30%, #e7b367 0 45%, #b97a32 46% 100%)" : undefined,
              boxShadow: filled ? "0 1px 0 #7e4d18" : undefined,
            }}
          />
        );
      })}
      {shown > 0 && (
        <span
          className="absolute left-1/2 block size-1.5 -translate-x-1/2 rounded-full"
          style={{ bottom: (shown - 1) * step + 7, background: tierColor(tier as StockTier) }}
        />
      )}
    </div>
  );
}

export function tierLabel(t: string) {
  const info = TIER_INFO[t as StockTier];
  return `${info.zh} ${info.en}`;
}
