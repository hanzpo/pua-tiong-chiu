import type { ReactNode } from "react";

interface TooltipItem {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Themed tooltip for Recharts. Text stays in ink colours; a swatch carries series identity. */
export function ChartTooltip({
  active,
  payload,
  label,
  format = (v) => String(v),
  labelFormat = (l) => String(l),
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  format?: (v: number, item: TooltipItem) => ReactNode;
  labelFormat?: (l: string | number) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink shadow-md">
      {label != null && <div className="mb-1 font-medium">{labelFormat(label)}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-ink-2">{p.name}</span>
          <span className="tabular ml-auto pl-3 font-medium">{format(Number(p.value), p)}</span>
        </div>
      ))}
    </div>
  );
}

export const axisProps = { tickLine: false, axisLine: false, fontSize: 12 } as const;
export const cursorFill = { fill: "var(--surface-3)", opacity: 0.6 };
