import { X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import type { Settings } from "../engine/rules";
import { PrizeEditor } from "./PrizeEditor";
import { IconButton, Switch } from "./ui";

export interface Prefs {
  skipAnimation: boolean;
  muted: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSettings: (s: Settings) => void;
  prefs: Prefs;
  onPrefs: (p: Prefs) => void;
}

export function RuleSwitches({ settings, onSettings }: { settings: Settings; onSettings: (s: Settings) => void }) {
  return (
    <div className="divide-y divide-line">
      <Switch
        label="四进 with extra 4s also pays 二举 or 一秀"
        hint="2-2-2-2-4-4 takes a 四进 and an 二举 prize"
        checked={settings.sijinPaysFours}
        onChange={(v) => onSettings({ ...settings, sijinPaysFours: v })}
      />
      <Switch
        label="状元插金花 wins every prize left"
        hint="Four 4s and two 1s ends the game"
        checked={settings.chajinhuaTakesAll}
        onChange={(v) => onSettings({ ...settings, chajinhuaTakesAll: v })}
      />
      <Switch
        label="Six of a kind wins every prize left"
        hint="Any six matching dice ends the game"
        checked={settings.sixKindTakesAll}
        onChange={(v) => onSettings({ ...settings, sixKindTakesAll: v })}
      />
    </div>
  );
}

export function SettingsDialog({ open, onClose, settings, onSettings, prefs, onPrefs }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(560px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-display text-lg font-semibold">Settings</h2>
        <IconButton label="Close" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="space-y-6 px-5 py-4">
        <section>
          <h3 className="mb-1 text-sm font-semibold text-ink-2">Regional rules</h3>
          <RuleSwitches settings={settings} onSettings={onSettings} />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-2">Prize set</h3>
          <PrizeEditor prizes={settings.prizes} onChange={(prizes) => onSettings({ ...settings, prizes })} />
        </section>
        <section>
          <h3 className="mb-1 text-sm font-semibold text-ink-2">Dice</h3>
          <div className="divide-y divide-line">
            <Switch label="Skip animation" checked={prefs.skipAnimation} onChange={(v) => onPrefs({ ...prefs, skipAnimation: v })} />
            <Switch label="Mute sound" checked={prefs.muted} onChange={(v) => onPrefs({ ...prefs, muted: v })} />
          </div>
        </section>
        <p className="text-[13px] text-ink-3">A game in progress keeps the rules it started with.</p>
      </div>
    </dialog>
  );
}
