import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Die } from "./Die";
import { playClatter } from "../lib/sound";

const BLUE = "#1f4f9e";

function BowlArt() {
  const motifs = Array.from({ length: 20 }, (_, i) => (i / 20) * 360);
  const petals = Array.from({ length: 8 }, (_, i) => (i / 8) * 360);
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="bowl-in" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.75" stopColor="#f1f4f7" />
          <stop offset="1" stopColor="#cfd8e3" />
        </radialGradient>
        <radialGradient id="bowl-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="102" cy="106" rx="100" ry="98" fill="url(#bowl-shadow)" />
      <circle cx="100" cy="100" r="97" fill="#fbfcfd" stroke="#c9d3df" strokeWidth="1" />
      <circle cx="100" cy="100" r="90.5" fill="none" stroke={BLUE} strokeWidth="10" />
      {motifs.map((a) => (
        <g key={a} transform={`rotate(${a} 100 100)`}>
          <path d="M100 6 c-4 0 -5 4.5 -2 5.5 c3 1 4 -2 1.5 -2.5" fill="none" stroke="#fbfcfd" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="106" cy="10.5" r="1.1" fill="#fbfcfd" />
        </g>
      ))}
      <circle cx="100" cy="100" r="85" fill="url(#bowl-in)" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={BLUE} strokeWidth="1.2" />
      <circle cx="100" cy="100" r="80.5" fill="none" stroke={BLUE} strokeWidth="0.6" opacity="0.7" />
      <g opacity="0.55">
        <circle cx="100" cy="100" r="26" fill="none" stroke={BLUE} strokeWidth="1.2" />
        <circle cx="100" cy="100" r="23" fill="none" stroke={BLUE} strokeWidth="0.6" />
        {petals.map((a) => (
          <ellipse key={a} cx="100" cy="88" rx="4.2" ry="9" fill="none" stroke={BLUE} strokeWidth="1" transform={`rotate(${a} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="3.5" fill={BLUE} />
      </g>
    </svg>
  );
}

interface Spot {
  x: number;
  y: number;
  rot: number;
}

const DIE = 0.15;

/** Random non-overlapping resting spots inside the bowl, as fractions of the bowl size. */
function scatter(n: number): Spot[] {
  const r = 0.27;
  for (let attempt = 0; attempt < 300; attempt++) {
    const spots: Spot[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * r;
      spots.push({ x: 0.5 + Math.cos(a) * d, y: 0.5 + Math.sin(a) * d, rot: Math.random() * 70 - 35 });
    }
    let ok = true;
    for (let i = 0; i < n && ok; i++)
      for (let j = i + 1; j < n && ok; j++)
        if (Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y) < DIE * 1.2) ok = false;
    if (ok) return spots;
  }
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: 0.5 + Math.cos(a) * 0.2, y: 0.5 + Math.sin(a) * 0.2, rot: 0 };
  });
}

const randomFace = () => 1 + Math.floor(Math.random() * 6);

interface Props {
  dice: number[] | null;
  /** Changes on every throw. */
  throwId: number;
  animate: boolean;
  sound: boolean;
  onSettled?: () => void;
  /** Animation length scale; 1 is normal speed. */
  speed?: number;
}

export function Bowl({ dice, throwId, animate, sound, onSettled, speed = 1 }: Props) {
  const [spots, setSpots] = useState<Spot[]>(() => scatter(6));
  const [faces, setFaces] = useState<number[] | null>(dice);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const settledRef = useRef(onSettled);
  const running = useRef(false);
  useEffect(() => {
    settledRef.current = onSettled;
  });

  // Show dice changed outside a throw (undo, replay seek) without animating.
  useEffect(() => {
    if (!running.current) setFaces(dice);
  }, [dice]);

  useLayoutEffect(() => {
    if (!dice || throwId === 0) {
      setFaces(dice);
      return;
    }
    const next = scatter(dice.length);
    setSpots(next);
    if (!animate) {
      setFaces(dice);
      if (sound) playClatter(0.35);
      settledRef.current?.();
      return;
    }
    const total = 1000 / speed;
    running.current = true;
    setFaces(dice.map(randomFace));
    const shuffle = setInterval(() => setFaces(dice.map(randomFace)), 75);
    const anims: Animation[] = [];
    refs.current.forEach((el, i) => {
      if (!el) return;
      const delay = (Math.random() * 160) / speed;
      const from = Math.random() < 0.5 ? -1 : 1;
      const sx = from * (180 + Math.random() * 120);
      const sy = -260 - Math.random() * 120;
      const r0 = Math.random() * 720 - 360;
      const s = next[i];
      const kick = () => (Math.random() - 0.5) * 60;
      anims.push(
        el.animate(
          [
            { transform: `translate(${sx}%, ${sy}%) scale(1.9) rotate(${r0}deg)`, opacity: 0, easing: "cubic-bezier(.5,0,.9,.6)" },
            { opacity: 1, offset: 0.12 },
            { transform: `translate(${kick()}%, ${kick()}%) scale(1) rotate(${s.rot + r0 / 3}deg)`, offset: 0.45, easing: "cubic-bezier(.2,.6,.4,1)" },
            { transform: `translate(${kick() / 2}%, ${kick() / 2}%) scale(1.12) rotate(${s.rot + r0 / 8}deg)`, offset: 0.62, easing: "cubic-bezier(.6,0,.8,.6)" },
            { transform: `translate(0%, 0%) scale(1) rotate(${s.rot + 6}deg)`, offset: 0.8, easing: "ease-out" },
            { transform: `translate(0%, 0%) scale(1) rotate(${s.rot}deg)`, opacity: 1 },
          ],
          { duration: total - delay, delay, fill: "backwards" },
        ),
      );
    });
    const stopShuffle = setTimeout(() => {
      clearInterval(shuffle);
      setFaces(dice);
    }, total * 0.68);
    const clatter = sound ? setTimeout(() => playClatter(0.75 / speed), total * 0.36) : undefined;
    const done = setTimeout(() => {
      running.current = false;
      settledRef.current?.();
    }, total + 30);
    return () => {
      clearInterval(shuffle);
      clearTimeout(stopShuffle);
      clearTimeout(clatter);
      clearTimeout(done);
      anims.forEach((a) => a.cancel());
      running.current = false;
      setFaces(dice);
    };
    // dice is read only on a new throw.
  }, [throwId]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px] select-none">
      <BowlArt />
      {faces?.map((f, i) => {
        const s = spots[i] ?? { x: 0.5, y: 0.5, rot: 0 };
        return (
          <div
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="absolute"
            style={{
              width: `${DIE * 100}%`,
              height: `${DIE * 100}%`,
              left: `${(s.x - DIE / 2) * 100}%`,
              top: `${(s.y - DIE / 2) * 100}%`,
              transform: `rotate(${s.rot}deg)`,
            }}
          >
            <Die face={f} fluid className="block size-full" />
          </div>
        );
      })}
    </div>
  );
}
