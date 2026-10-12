/// <reference lib="webworker" />
import { replayGame, Simulator } from "../engine/simulate";
import type { FromWorker, ToWorker } from "./protocol";

declare const self: DedicatedWorkerGlobalScope;

const cancelled = new Set<number>();
const post = (m: FromWorker) => self.postMessage(m);
// Yields to the event loop so a cancel message can arrive between chunks.
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

async function run(id: number, cfg: Extract<ToWorker, { type: "run" }>["cfg"]) {
  const start = performance.now();
  const sim = new Simulator(cfg);
  let lastPost = 0;
  while (!sim.done) {
    sim.run(200);
    const now = performance.now();
    if (now - lastPost > 50) {
      post({ type: "progress", id, games: sim.stats.games });
      lastPost = now;
      await tick();
    }
    if (cancelled.has(id)) break;
  }
  const wasCancelled = cancelled.delete(id);
  post({ type: "done", id, stats: sim.finish(), cancelled: wasCancelled, ms: performance.now() - start });
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if (m.type === "run") void run(m.id, m.cfg);
  else if (m.type === "cancel") cancelled.add(m.id);
  else post({ type: "replay", id: m.id, records: replayGame(m.cfg, m.gameIndex).records });
};
