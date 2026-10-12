import type React from "react";

/** 祥云: an auspicious-cloud scroll, drawn as gold line work. */
export function Xiangyun({ className = "", width = 160 }: { className?: string; width?: number }) {
  return (
    <svg className={className} width={width} viewBox="0 0 160 70" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 58 H132 C150 58 154 38 140 32 C142 18 124 12 116 22 C112 6 88 4 82 20 C74 10 56 14 58 30 C44 26 34 40 44 48 C30 46 22 54 8 58" />
        <path d="M58 30 C62 38 74 38 74 30 C74 24 66 24 66 30" />
        <path d="M116 22 C110 30 120 38 126 32 C130 28 124 24 121 28" />
        <path d="M44 48 C52 52 60 46 56 40" />
        <path d="M86 58 C92 50 104 52 104 44 C104 38 96 38 96 44" />
      </g>
    </svg>
  );
}

export function Moon({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id="moon-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor="#f6dfa4" stopOpacity="0.22" />
          <stop offset="1" stopColor="#f6dfa4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moon-face" cx="0.42" cy="0.38" r="0.65">
          <stop offset="0" stopColor="#fff8e3" />
          <stop offset="0.7" stopColor="#f5dc9f" />
          <stop offset="1" stopColor="#e6c27a" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="60" fill="url(#moon-halo)" />
      <circle cx="60" cy="60" r="34" fill="url(#moon-face)" />
      <g fill="#d9b56c" opacity="0.35">
        <circle cx="50" cy="52" r="6" />
        <circle cx="70" cy="66" r="4.5" />
        <circle cx="58" cy="76" r="3" />
      </g>
    </svg>
  );
}

/** The night scene behind the bowl. */
export function Stage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl text-[#f3e8d6] ${className}`}
      style={{ background: "linear-gradient(170deg, var(--night-2), var(--night) 70%)" }}
    >
      <Moon size={130} className="pointer-events-none absolute -right-8 -top-10 opacity-90" />
      <Xiangyun width={150} className="pointer-events-none absolute -left-6 top-6 text-[#d9ad4f] opacity-25" />
      <Xiangyun width={120} className="pointer-events-none absolute -right-4 bottom-4 text-[#d9ad4f] opacity-20" />
      <div className="relative">{children}</div>
    </div>
  );
}
