import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import { TIER_INFO, type Tier } from "../engine/rules";
import { tierColor } from "../lib/tiers";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "secondary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const styles: Record<Variant, string> = {
    primary: "bg-accent text-accent-ink hover:brightness-110 active:brightness-95",
    secondary: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
    ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  };
  return <button type="button" className={`${base} ${styles[variant]} ${className}`} {...rest} />;
}

export function IconButton({ label, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-11 items-center justify-center rounded-lg text-current hover:bg-black/10 dark:hover:bg-white/10 ${className}`}
      {...rest}
    />
  );
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line-strong bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 rounded-md px-3 text-sm font-medium ${
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start justify-between gap-4 py-1.5">
      <span>
        <span className="block text-[15px] text-ink">{label}</span>
        {hint && <span className="block text-[13px] text-ink-3">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-10 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  className = "",
  inputClassName = "",
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: ReactNode;
  className?: string;
  inputClassName?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={`tabular min-h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[15px] text-ink ${inputClassName}`}
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = e.target.valueAsNumber;
            if (Number.isNaN(v)) return;
            let x = v;
            if (min != null) x = Math.max(min, x);
            if (max != null) x = Math.min(max, x);
            onChange(x);
          }}
        />
        {suffix && <span className="text-sm text-ink-3">{suffix}</span>}
      </div>
    </div>
  );
}

/** A small mark that carries tier identity by shape as well as colour. */
export function TierMark({ tier, size = 10 }: { tier: Tier; size?: number }) {
  const shapes: Record<Tier, ReactNode> = {
    zhuangyuan: <path d="M5 0 L10 5 L5 10 L0 5 Z" />,
    duitang: <rect x="0.5" y="0.5" width="9" height="9" rx="1.5" />,
    sanhong: <path d="M5 0.5 L9.5 9.5 L0.5 9.5 Z" />,
    sijin: <rect x="0.5" y="2" width="9" height="6" rx="1" />,
    erju: <circle cx="5" cy="5" r="4.5" />,
    yixiu: <circle cx="5" cy="5" r="3" />,
    none: <rect x="1" y="4" width="8" height="2" rx="1" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden className="shrink-0" fill={tierColor(tier)}>
      {shapes[tier]}
    </svg>
  );
}

export function TierName({ tier, showEn = true, className = "" }: { tier: Tier; showEn?: boolean; className?: string }) {
  const info = TIER_INFO[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TierMark tier={tier} />
      <span className="font-display font-semibold" lang="zh">
        {info.zh}
      </span>
      {showEn && <span className="text-ink-2">{info.en}</span>}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-ink-3">{label}</div>
      <div className="tabular text-xl font-semibold text-ink">{value}</div>
      {sub && <div className="text-[13px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
      <div className="h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${value * 100}%` }} />
    </div>
  );
}
