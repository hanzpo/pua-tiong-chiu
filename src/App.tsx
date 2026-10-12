import { GearSix, Moon as MoonIcon, Sun, Desktop } from "@phosphor-icons/react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Xiangyun } from "./components/Decor";
import { SettingsDialog, type Prefs } from "./components/SettingsDialog";
import { IconButton } from "./components/ui";
import { DEFAULT_SETTINGS, PRIZE_TIERS, type Settings } from "./engine/rules";
import { Play } from "./modes/Play";
import { usePersistent } from "./lib/storage";

const Simulate = lazy(() => import("./modes/Simulate").then((m) => ({ default: m.Simulate })));
const Analyze = lazy(() => import("./modes/Analyze").then((m) => ({ default: m.Analyze })));

type Mode = "play" | "simulate" | "analyze";
type Theme = "system" | "light" | "dark";

const MODES: { id: Mode; zh: string; en: string }[] = [
  { id: "play", zh: "玩", en: "Play" },
  { id: "simulate", zh: "模拟", en: "Simulate" },
  { id: "analyze", zh: "分析", en: "Analyze" },
];

const validSettings = (v: unknown) => {
  const s = v as Settings;
  return !!s && typeof s.prizes === "object" && PRIZE_TIERS.every((t) => Number.isInteger(s.prizes[t]));
};

const modeFromHash = (): Mode => {
  const h = location.hash.slice(1);
  return h === "simulate" || h === "analyze" ? h : "play";
};

export function App() {
  const [mode, setMode] = useState<Mode>(modeFromHash);
  const [settings, setSettings] = usePersistent<Settings>("bobing.settings.v1", DEFAULT_SETTINGS, validSettings);
  const [prefs, setPrefs] = usePersistent<Prefs>("bobing.prefs.v1", { skipAnimation: false, muted: false });
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem("bobing.theme");
      return t === "light" || t === "dark" ? t : "system";
    } catch {
      return "system";
    }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setMode(modeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    // Stored raw, not JSON, so the boot script in index.html can read it before React loads.
    try {
      if (theme === "system") localStorage.removeItem("bobing.theme");
      else localStorage.setItem("bobing.theme", theme);
    } catch {
      // Storage blocked; the theme still applies for this visit.
    }
  }, [theme]);

  const nextTheme: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? MoonIcon : Desktop;

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)]">
      <header className="relative overflow-hidden bg-lacquer text-on-lacquer">
        <Xiangyun width={180} className="pointer-events-none absolute -bottom-6 right-24 text-gold-bright opacity-20 max-sm:hidden" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:py-3">
          <a href="#play" className="mr-auto flex items-baseline gap-2" onClick={() => setMode("play")}>
            <span className="font-display text-2xl font-bold text-gold-bright" lang="zh">
              跋中秋
            </span>
            <span className="text-[15px] font-medium">Pua Tiong Chiu</span>
          </a>
          <div className="order-last flex w-full gap-1 sm:order-none sm:w-auto" role="tablist" aria-label="Mode">
            {MODES.map((m) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-[15px] font-medium sm:flex-none sm:px-4 ${
                  mode === m.id ? "bg-black/25 text-white" : "text-on-lacquer/80 hover:bg-black/15 hover:text-white"
                }`}
              >
                <span className="font-display text-sm opacity-80 max-[420px]:hidden" lang="zh">
                  {m.zh}
                </span>
                {m.en}
              </a>
            ))}
          </div>
          <div className="flex">
            <IconButton label={`Theme: ${theme}`} onClick={() => setTheme(nextTheme[theme])}>
              <ThemeIcon size={20} />
            </IconButton>
            <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
              <GearSix size={20} />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 sm:py-6">
        <Suspense fallback={null}>
          {mode === "play" && <Play settings={settings} onSettings={setSettings} prefs={prefs} />}
          {mode === "simulate" && <Simulate settings={settings} onSettings={setSettings} prefs={prefs} />}
          {mode === "analyze" && <Analyze settings={settings} onSettings={setSettings} />}
        </Suspense>
      </main>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettings={setSettings}
        prefs={prefs}
        onPrefs={setPrefs}
      />
    </div>
  );
}
