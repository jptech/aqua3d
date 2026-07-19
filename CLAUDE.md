# Aqua 3D Layout Planner

Interactive Three.js recreation of a 2BD/2BA (~1,080 ft²) unit in the Aqua tower, Chicago.
Used to plan furniture layouts at true scale. Source of truth for the architecture:
`floorplan.png`, `refined_floorplan.png`, the tour screenshots (`kitchen_side.png`,
`master_bed.png`, `master_walkin_closet.png`) — **and the owner's corrections from
walking the unit, which override anything read from the images** (the drawings are
approximate, especially the refined one's lower third).

## Run / verify

- No build step, no node needed: `python -m http.server 8123 --directory Z:/aqua3d/app`,
  then open http://localhost:8123. `.claude/launch.json` defines this as `aqua3d` for
  `preview_start`.
- Three.js v0.170 is vendored in `app/vendor/` (import map in `index.html` maps `three`).
- Verify changes visually: reload the page, use the Top view button for plan-accuracy
  checks and the room view buttons for finish/fixture checks, then check the browser
  console for errors. Geometry changes need no cache busting; a reload picks them up.
- Environment quirks: `node`/`npm` need `fnm` first; Python is uv-managed, so use
  `uv run --with <pkg> python ...` instead of pip. The browser pane can load pages at
  0×0 — `fitViewport()` in main.js re-checks size every frame; don't remove it.

## Layout (all under `app/`)

| File | Role |
|---|---|
| `src/plan.js` | **The floorplan model.** All coordinates in feet (1 unit = 1 ft), origin at the exterior NW corner, +x east, +z south. Wall lines (`X`, `Z`, `SUITE`), room/floor rects (`ROOMS`, incl. `th-*` door thresholds), balcony curve, `WALL_RECTS` obstacle registry (filled at build time). |
| `src/apartment.js` | Builds walls/glazing/doors/fixtures from plan.js. `wall()` and `glazing()` auto-register obstacle rects; fixtures call `reg()` manually. |
| `src/furniture.js` | Procedural catalog. Real-world footprints (`w`×`d` ft); flags: `flat` (rugs), `tuck`/`surface` (chairs may overlap tables). |
| `src/interact.js` | Selection, floor dragging, rotation, 2D SAT collision (red pad), dimension rays to nearest obstacles. Has an `enabled` flag other tools toggle. |
| `src/measure.js` | Two-click measuring tape. |
| `src/main.js` | Scene/lights/skyline, camera view presets, wall auto-fade, walk mode (WASD + pointer lock), UI wiring, sample layout, localStorage persistence. |
| `src/textures.js` | Canvas textures: gray-blue carpet, beige tile, speckled granite, maple, tower facades. |

## Invariants — keep these when editing geometry

- **Everything routes through `WALL_RECTS`**: furniture collision tinting, dimension
  rays, and walk-mode collision all read the same registry. New solid geometry must be
  registered (walls do it automatically); never register door openings.
- **Walk mode needs floor continuity**: every door/opening in a registered wall needs a
  matching `th-*` threshold rect in `ROOMS`, or you can't walk through it.
- **Floor rects must not overlap** (z-fighting) and walls sit on y=0 over them.
- Saved layouts live in localStorage `aqua3d.layout.v5` (see `STORAGE` in main.js).
  Bump the version only if saved furniture would now sit inside new walls.
- Cabinet-door "seams" are hairline boxes (~0.05 ft wide). A fat seam renders as a big
  black panel — size them thin.

## Established floorplan facts (owner-verified; don't regress)

- Master suite: fully **open** passage (no door/frame) at the master's SW leads past the
  walk-in (door on its west wall) to the bath. Bath reachable only via the master.
- One straight wall plane (x 11.88–12.28) runs from the north divider column to the hall
  closet's south end: master entry door, walk-in back wall, and hall-closet bifold are
  all in it.
- Kitchen: sliding glass door is on the **north** wall; peninsula counter is contiguous,
  narrowing in front of the countertop column (which extends to the east wall); then
  **full window gap**, then the chase column against the kitchen/bath wall.
- Laundry closet spans the foyer's full west side, no gaps — and it is deep: the
  bifold plane sits at x≈5.7–6.05 with the W/D stack at its east face, so the foyer's
  usable width starts there.
- Bedroom 2: door beside the apartment entry (west wall, hinged south), corner column at
  the NE by the windows, **no windows on the south side** (wall + closet bump only).
- Master bath: tub alcove has a wall stub at the tub's north edge; toilet faces west.
- Bath 2: the east face is a **solid wall** (no glazing) — the tub sits against it.
- Balcony: the plan's 17'11" × 23'2" are the curved slab's **overall bounding box** —
  it starts at the sliding door (x≈15.5), bulges ~4 ft past the north face and ~5 ft
  past the east face, and rejoins the facade at the chase column (z≈19). It does
  **not** front the master bedroom windows or run south past the kitchen window gap.
