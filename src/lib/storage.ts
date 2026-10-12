import { useEffect, useState } from "react";

export function load<T>(key: string, fallback: T, valid: (v: unknown) => boolean = () => true): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return valid(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the app still works without it.
  }
}

export function usePersistent<T>(key: string, fallback: T, valid?: (v: unknown) => boolean) {
  const [value, setValue] = useState<T>(() => load(key, fallback, valid));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}
