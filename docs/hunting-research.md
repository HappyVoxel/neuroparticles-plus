# Hunting research

Headless runs from 2026-09-30. Question: which rule change makes dots hunt instead of standing still?

## Setup

- Harness: `.exp/hunt/` (a copy of `src/sim/`, git-ignored) with the rules below behind options.
  Run: `OPT='{"mode":"jump","byKills":true}' node .exp/hunt.ts <name> <steps> <window> 5 1 500`.
  Batches: `python3 .exp/runbatch.py <batch file> <steps> <window> <runs>`, then `python3 .exp/show2.py`.
- Defaults unless a row says otherwise: 121-cell view, mutation 5% × 1 gene, wall cost 500, decay 1,
  start HP 10,000.
- Rules tested:
  - **jump** — a prey sharing a cell with hunters dies; those hunters split its HP.
  - **lock** — jump, plus a prey with 3 or more hunters inside its view dies; they split its HP.
  - **killers first** — `breed` takes mature dots in order of kills per step lived, not at random.
  - **young safe** — prey younger than `matureAge` can't be caught.
  - **mate anywhere** — a mature dot with no free mate in view pairs with any free mature dot;
    the children land beside the first parent.

## Measures

- **Stay** — share of all moves that are "stay".
- **Chase** — of the dots that saw prey and moved, the share that ended closer to the nearest prey.
  Random genomes score 42–46%.
- **Flee** — the same for enemies, ended farther. Random genomes score 51–54%.
- **Toward** — each living dot is shown one lone prey on every cell of an empty view; share of those
  views where its move ends closer. Random genomes score 37%; a dot that never stays and ignores
  what it sees scores 42–45%.

## Results

### Capture rules alone, 10,000 steps, 3 runs each

| Variant                 | Stay at end | Kills per 1,000 dot-steps | Died out |
| ----------------------- | ----------- | ------------------------- | -------- |
| Today's rules           | 95–96%      | none                      | 0 of 3   |
| Today's rules, wall 0   | 71–77%      | none                      | 0 of 3   |
| jump                    | 96–97%      | below 0.5                 | 0 of 3   |
| lock                    | 96–98%      | below 0.5                 | 0 of 3   |
| lock, only movers catch | 96–98%      | below 0.5                 | 0 of 3   |
| lock, wall 0            | 93–97%      | below 0.5                 | 0 of 3   |
| lock + killers first    | 3–59%       | 2–6                       | 2 of 3   |

Wall 0 slows the rise of "stay" and doesn't stop it: it still climbs about 5 points per 1,000 steps
at step 10,000.

### With killers first, 30,000 steps

| Variant                               | Stay at end | Died out | Lowest species count |
| ------------------------------------- | ----------- | -------- | -------------------- |
| jump                                  | 6–10%       | 2 of 4   | 0                    |
| jump + young safe                     | 1–16%       | 1 of 4   | 0                    |
| jump + mate anywhere                  | 1–9%        | 0 of 4   | 112                  |
| jump + mate anywhere + HP cap         | 3–23%       | 0 of 4   | 111                  |
| jump + mate anywhere + young safe     | 9–24%       | 0 of 4   | 33                   |
| lock                                  | —           | 3 of 3   | 0 (by step 10,500)   |
| lock + mate anywhere                  | —           | 4 of 4   | 0 (by step 12,000)   |
| lock + young safe                     | —           | 3 of 3   | 0 (by step 28,800)   |
| lock + young safe + lock held 5 steps | 7–38%       | 0 of 3   | 29                   |
| lock + mate anywhere + young safe     | 0–26%       | 0 of 4   | 31                   |

Chase stays at 39–47% and Toward at 36–46% in every row: dots roam, they don't steer at prey.

Without a cap, average HP reaches 110,000–510,000 under jump + mate anywhere, so nobody dies of
decay. With hunter HP capped at the start HP it stays at 6,300–7,600; with young safe, at
6,000–11,000.

### Compact sensor, 20,000 steps, 3 runs each

Input is 14 numbers instead of 484: per species the direction to its nearest dot in view, how near
each wall is, and the disease cost under the dot.

| Variant              | Stay at end | Chase  | Flee   | Toward | Died out |
| -------------------- | ----------- | ------ | ------ | ------ | -------- |
| Today's rules        | 97–98%      | —      | —      | 11–15% | 0 of 3   |
| jump                 | 96–98%      | —      | —      | 11–15% | 0 of 3   |
| lock                 | 92–97%      | —      | —      | 13–18% | 0 of 3   |
| jump + killers first | 0–1%        | 47–48% | 82–83% | 40–56% | 1 of 3   |
| lock + killers first | —           | —      | —      | —      | 3 of 3   |

## What we built

jump + killers first + mate anywhere + HP cap: `src/sim/capture.ts`, and `ageAndCull` and `breed` in
`src/sim/evolution.ts`.

## Findings

1. The capture rule doesn't decide whether dots stand still. Jump and lock alone end at 96–98% stay,
   the same as today's rules. A kill gives the hunter HP, and HP doesn't buy children: `breed` fills
   a gap from any mature pair in view, so a still family keeps breeding with itself.
2. Killers first ends standing still under every capture rule tested.
3. Kills make species die out. A hunted species gets thin, fewer mature dots stand in each other's
   view, births drop, and it collapses. Mate anywhere stops that for jump. Lock also kills children
   before they mature, so it needs young safe as well.
4. No variant with the 121-cell view learned to steer toward prey in 30,000 steps. With the compact
   sensor, fleeing reached 82–83% and one of two surviving runs reached 56% Toward.
