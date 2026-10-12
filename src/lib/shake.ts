import { useEffect, useRef } from "react";

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

export const motionSupported = () => typeof window !== "undefined" && "DeviceMotionEvent" in window && "ontouchstart" in window;

/** iOS 13+ needs an explicit permission prompt, which must come from a tap. */
export async function requestMotion(): Promise<boolean> {
  const req = (DeviceMotionEvent as unknown as MotionPermission).requestPermission;
  if (typeof req !== "function") return true;
  try {
    return (await req()) === "granted";
  } catch {
    return false;
  }
}

/** Calls onShake when the phone is shaken hard, at most once per cooldown. */
export function useShake(enabled: boolean, onShake: () => void, threshold = 22, cooldownMs = 1500) {
  const cb = useRef(onShake);
  useEffect(() => {
    cb.current = onShake;
  });
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    let lastMag = 0;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.hypot(a.x, a.y, a.z);
      // A jerk between samples catches shakes regardless of how the phone is held.
      const jerk = Math.abs(mag - lastMag);
      lastMag = mag;
      const now = performance.now();
      if (jerk > threshold && now - last > cooldownMs) {
        last = now;
        cb.current();
      }
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [enabled, threshold, cooldownMs]);
}
