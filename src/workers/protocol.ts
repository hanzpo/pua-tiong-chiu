import type { RollRecord } from "../engine/game";
import type { SimConfig, SimStats } from "../engine/simulate";

export type ToWorker =
  | { type: "run"; id: number; cfg: SimConfig }
  | { type: "cancel"; id: number }
  | { type: "replay"; id: number; cfg: SimConfig; gameIndex: number };

export type FromWorker =
  | { type: "progress"; id: number; games: number }
  | { type: "done"; id: number; stats: SimStats; cancelled: boolean; ms: number }
  | { type: "replay"; id: number; records: RollRecord[] };
