import { useId } from "react";

const L = 27;
const C = 50;
const R = 73;
const PIPS: Record<number, [number, number][]> = {
  1: [[C, C]],
  2: [[L, L], [R, R]],
  3: [[L, L], [C, C], [R, R]],
  4: [[L, L], [R, L], [L, R], [R, R]],
  5: [[L, L], [R, L], [C, C], [L, R], [R, R]],
  6: [[L, L], [R, L], [L, C], [R, C], [L, R], [R, R]],
};

interface Props {
  face: number;
  /** Pixel size; omit with fluid to fill the parent. */
  size?: number;
  fluid?: boolean;
  className?: string;
  title?: string;
}

/** A Chinese die: the 1 has one large red pip, the 4 has four red pips, the rest are black. */
export function Die({ face, size = 48, fluid, className, title }: Props) {
  const id = useId();
  const red = face === 1 || face === 4;
  const r = face === 1 ? 17 : face === 4 ? 10.5 : 9;
  return (
    <svg
      width={fluid ? undefined : size}
      height={fluid ? undefined : size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title ?? `Die showing ${face}`}
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffbf1" />
          <stop offset="1" stopColor="#ecdfc4" />
        </linearGradient>
        <radialGradient id={`${id}-red`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#e2483c" />
          <stop offset="1" stopColor="#a3160f" />
        </radialGradient>
        <radialGradient id={`${id}-black`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#3b3430" />
          <stop offset="1" stopColor="#0f0c0a" />
        </radialGradient>
      </defs>
      <rect x="5" y="8" width="90" height="90" rx="20" fill="rgba(40,20,10,0.28)" />
      <rect x="4" y="4" width="90" height="90" rx="20" fill={`url(#${id}-body)`} stroke="#cdbb98" strokeWidth="1.5" />
      <rect x="9" y="8" width="80" height="80" rx="16" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      {PIPS[face]?.map(([x, y], i) => (
        <circle key={i} cx={x - 1} cy={y - 1} r={r} fill={`url(#${id}-${red ? "red" : "black"})`} />
      ))}
    </svg>
  );
}

export function DiceRow({ dice, size = 28, className }: { dice: readonly number[]; size?: number; className?: string }) {
  const sorted = [...dice].sort((a, b) => (a === 4 ? -1 : b === 4 ? 1 : a - b));
  return (
    <span className={`inline-flex gap-0.5 ${className ?? ""}`} aria-label={`Dice ${dice.join(" ")}`} role="img">
      {sorted.map((d, i) => (
        <Die key={i} face={d} size={size} title="" />
      ))}
    </span>
  );
}
