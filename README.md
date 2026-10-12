# Pua Tiong Chiu 跋中秋

A browser app for the Mid-Autumn mooncake dice game from Xiamen. Chinese Filipinos call it Pua Tiong Chiu (Hokkien 跋中秋, Poa̍h-tiong-chhiu). In Mandarin it is Bo Bing (博饼). Play it at [bobing.hanzpo.com](https://bobing.hanzpo.com).

It has three modes:

- **Play**: a shared-screen game for 2 to 12 players, with animated dice, shake-to-roll, undo, and saved state.
- **Simulate**: up to 100,000 seeded games in a Web Worker, with charts for game length, seat advantage, 状元 takeovers, last-out tiers, wasted rolls, and convergence.
- **Analyze**: exact odds over all 6⁶ = 46,656 rolls, a forecast for your prize set, an EV calculator, and a prize-set optimizer.

Everything runs in the browser. There is no backend.

## Scripts

```sh
npm install
npm run dev        # Vite dev server
npm test           # Vitest engine tests
npm run typecheck
npm run build
```

## Layout

| Path | Contents |
|---|---|
| `src/engine/rules.ts` | Tier classifier, 状元 sub-ranking, regional rule settings |
| `src/engine/rng.ts` | `Rng` interface, MT19937, CSPRNG wrapper, rejection-sampled die rolls |
| `src/engine/game.ts` | Game state machine: prize stock, 状元 holding, take-all rules |
| `src/engine/enumerate.ts` | Exhaustive enumeration and the closed-form counts behind the Explain panel |
| `src/engine/simulate.ts` | Batch simulator and single-game replay |
| `src/engine/analysis.ts` | Odds, game forecast, EV, largest-remainder optimizer |
| `src/workers/` | Simulation worker and its message types |
| `src/components/`, `src/modes/` | UI |

The engine has no React imports and is covered by tests. The classifier test enumerates every roll and checks the oracle counts (状元 561, 对堂 720, 三红 2500, 四进 1875, 二举 9300, 一秀 17400, none 14300). The MT19937 test checks the reference outputs for seed 5489.

## How the exact game forecast works

Per-roll odds come straight from enumeration. Game-level numbers (expected rolls, which tier runs out last, the chance nobody rolls 状元) depend on the prize stock, so they need more than per-roll odds. The app gets them exactly by Poissonization. Treat rolls as arrivals of a rate-1 Poisson process. Each tier's hits then form an independent Poisson process, and expected rolls equal the expected end time (Wald's identity). Each quantity becomes a one-dimensional integral, which the app evaluates with Simpson's rule. The tests check the results against simulation.

With the 四进 bonus rule on, one roll can pay two tiers, so the tiers are no longer independent. The app labels those figures as approximate.
