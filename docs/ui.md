# UI behavior

How the canvas and sidebar tools behave. `AGENTS.md` links here.

## Following a dot (`dot-record.tsx`, `top-dots.tsx`, `canvas-loupe.tsx`)

- A click on the canvas without a drag follows the nearest living dot within `pickCells` (3); with the
  loupe on (Z, a `loupeZoom`× circle at the pointer) within `loupePickCells` (1). A click on empty
  ground stops following. The top-dots list in the sidebar follows a dot by id, dead ones included.
- The board has one column per ranking (`rankings`: kills, steps lived, peak HP), each in short
  numbers (`formatCompact`: 12, 4.5K, 7.3M) with the full number on hover, so three fit in the
  320px sidebar. Rows show the id without "#"; an id too long for its column (6 digits, or 5 on a
  dead dot) ends in "…", with the full id on hover. Kills get the narrowest column.
- The top-dots filter (`top-dots-filter.tsx`) hides the dead or a species inside `topDots`, before
  the top `topDotsShown` are cut, so hidden dots never leave a slot empty. The hook keeps it in
  `topFilterRef`, like the area, and `sim-settings.ts` saves it (`top-dots-dead`, `top-dots-species`).
- The hook keeps the followed record after every step (`findDot`), so its popover shows the death
  and stays until closed. Snapshots carry records without genomes; "Copy genome" reads it from the
  hook. Randomize and Reset stop following.

## Oldest-dot glow and top-hunter swords (`render.ts`)

- Each species' oldest living dot (ties to more kills, `leaderIds(sim, "lifetime")`) gets an
  eight-ray star in its species' 300 shade whose rays grow and brighten once every `glowPeriodMs`.
  `paint` passes `performance.now()`, so the pulse runs with the frame loop and holds still while
  paused.
- Each species' living dot with the most kills (ties to the longer life, `leaderIds(sim, "kills")`)
  wears Lucide's Swords icon above it, in its species' 500 shade with a white outline, drawn on the
  canvas so it slides with the dot. No swords while a species has no kills. The dot record's title
  shows the same icon after the id while the followed dot holds the lead (`snap.topHunterIds`).

## Disease labels (`disease-labels.tsx`)

- A "Disease!" label shows above an area from its `bornStep`, a "Pandemic!" one from its
  `pandemicStep`, in the species' 500 shade with a white outline, in Offside. HTML over the canvas,
  not canvas text, so it stays sharp; the loupe doesn't magnify it.
- A label lives `diseaseLabelMs` at the current speed, counted in steps, so it holds still while
  paused and moves on one step per S. It fades over its last `diseaseLabelFade`.
- Its font is `diseaseLabelSizeRatio` cells per cell of radius (at least `diseaseLabelMinCells`), in
  `cqw`, so it scales with the area and the canvas. It stays inside the grid near walls.
- Areas of nearby crowds, of any species, would stack their labels, so `diseaseLabels` places
  pandemics first, then older labels, and leaves out any label within `diseaseLabelGap` of one
  already placed.

## Area inspector (`area-inspector.tsx`)

- A layer over the canvas turns a drag into an `Area` and passes it to `inspect` in the hook. Every
  snapshot then carries `areaSpecies`: the same `SpeciesStats` as the sidebar, for the dots inside it,
  so the popover beside the frame updates live.
- Only a click on the canvas, the X button or Esc closes it; clicks in the sidebar keep it open so
  Run and Step work while it's up. A confirmed Reset clears it.
