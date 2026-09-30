# Backlog

Findings we looked at and chose to skip for now. Each says what's wrong, what we'd do, why it waits
and what would make it worth doing.

## Disease: loop over occupied cells, not the whole grid

- **What's wrong:** `spreadDisease` (`src/sim/disease.ts`) walks all 40,000 cells about 7 times a
  step. `circleCounts` scans the grid once per species to find the ~600 cells that hold a dot, then
  two more full-grid passes merge the species (`most`, `mostSpecies`) and find due cells. It also
  allocates about 360 KB of typed arrays per step. Together that is about 20% of a step; the network
  pass is about 50% and sensing about 18%.
- **Proposal:** start from each species' agent list instead of scanning the field, keep a list of
  touched cells and run the merge and due passes over that list only, and reuse the arrays that
  never leave the function (`counts`, `most`, `mostSpecies`).
- **Why it waits:** the gain is at most ~20%, and only matters when the machine can't keep up at top
  speed. The crowd rules are the sim's most delicate code.
- **Revisit when:** the sim can't hold its speed at the top of the Speed slider. Check the rewrite
  with a seeded run (seed `Math.random`, run a few hundred steps, hash every agent, the dead and the
  disease areas): it must match byte for byte.

## Shared test helper for "a dot at (x, y)"

- **What's wrong:** 7 test files in `src/sim/` each define a one-line builder on top of `spawn`
  (`area`, `capture`, `disease`, `evolution`, `field`, `records`, `simulation`).
- **Proposal:** one `src/sim/test-helpers.ts`.
- **Why it waits:** the copies differ on purpose (HP 1 vs 1000, a fixed id vs a counter, extra
  `lifetime` or `Partial<Agent>` arguments), so a shared helper needs options for all of them to save
  about 15 lines, and ties 7 test files to one. `spawn` already holds what a new dot looks like.
- **Revisit when:** a builder needs the same change in several test files at once.

## Menu-open sound through `use-sound`

- **What's wrong:** each dropdown needs three pieces of wiring for its sound: `data-sound="none"` on
  its trigger, an `onOpen` prop fed into `onOpenChange`, and `playClick` passed down from `App.tsx`
  (`sound-menu.tsx`, `top-dots-filter.tsx`). A menu that misses one is silent or clicks twice.
- **Proposal:** `use-sound` plays the click itself when any `[aria-haspopup="menu"]` trigger opens,
  and the three pieces go away.
- **Why it waits:** Radix opens a dropdown on `pointerdown`, and on keydown for Enter, Space and the
  arrow keys, not on `click` (inferred from Radix's behavior, not verified here). Catching every
  open needs a `MutationObserver` on `aria-expanded`. That is more fragile than the wiring it
  replaces for two menus, and a break only shows up as a missing sound.
- **Revisit when:** a third dropdown menu is added.

## Genes input accepts values the saved settings reject

- **What's wrong:** the Genes input (`mutation-controls.tsx`) takes any whole number from 1 up, but
  `loadSimSettings` (`src/hooks/sim-settings.ts`) rejects a saved value above `genomeSize` (12,550),
  so after a refresh it quietly falls back to the default.
- **Proposal:** cap the input at `genomeSize` (`src/sim/network.ts`), the same bound
  `loadSimSettings` uses.
- **Why it waits:** found during a cleanup pass, outside its scope.
