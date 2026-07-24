# Aqua 3D Layout Planner

Interactive Three.js recreation of a 2BD/2BA (~1,080 ft²) unit in the Aqua tower, Chicago.
Used to plan furniture layouts at true scale. Source of truth for the architecture:
`floorplan.png`, `refined_floorplan.png`, the tour screenshots (`kitchen_side.png`,
`master_bed.png`, `master_walkin_closet.png`) — **and the owner's corrections from
walking the unit, which override anything read from the images** (the drawings are
approximate, especially the refined one's lower third).

A Matterport scan of the **two-bedroom model unit** is at
<https://my.matterport.com/show/?m=Z3EsnDJkQsd>. It is the same floorplan and the
same building shell, so it is good evidence for **layout and architectural detail**
— but it has been restaged and repainted, so it is *not* evidence for this unit's
finishes. Where they disagree, the owner's photos win: this unit has warm beige
walls, not the model unit's gray-blue.

## Run / verify

- No build step, no node needed: `python -m http.server 8123 --directory Z:/aqua3d/app`,
  then open http://localhost:8123. `.claude/launch.json` defines this as `aqua3d` for
  `preview_start` (plus `aqua3d-alt` on 8124 for when another session holds 8123).
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
| `src/main.js` | Scene/lights/skyline, PMREM environment map, camera view presets, wall auto-fade, walk mode (WASD + pointer lock), UI wiring, sample layout, localStorage persistence, adaptive resolution. |
| `src/textures.js` | Canvas surfaces (carpet, tile, granite, maple/walnut, plaster, concrete, glass tile, linen) each with a real-world tile size + Sobel-derived normal map; equirect sky; contact-shadow blob. |
| `src/geo.js` | Cached chamfered box geometry, feet-based UV scaling, and `mergeStatic()` (collapses a group to one mesh per material + shadow-flag bucket). |
| `src/quality.js` | Device-tier detection (low/med/high) and the render-cost knobs every other module reads: pixel ratio, shadow size, normal maps, bevel radius, lamp count, texture size. |

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
- **The shell and every furniture piece are merged after they're built** (`mergeStatic`),
  so anything that must stay individually movable, toggleable or animated has to be
  added *after* the merge, or flagged `userData.noMerge`. Materials are the merge key:
  give two things the same material and they end up in the same mesh.
- Textured materials carry `userData.uvFt` (feet per texture tile) and `box()` / `B()`
  emit UVs in feet to match. A new textured material needs a surface registered in
  `textures.js`; a plain colour material can skip it.
- Nothing expensive should be hardcoded — read it from `Q` in `quality.js` so the low
  tier stays cheap. Test with `?q=low` and `?q=high`; the ◐ button pins a tier and
  reloads (tiers change how geometry/textures are built, so a live switch isn't possible).
- `window.AQUA` exposes the renderer, scene, camera and merge stats for console poking
  (`AQUA.renderer.info.render.calls`).

## Established floorplan facts (owner-verified; don't regress)

- Master suite: fully **open** passage (no door/frame) at the master's SW leads past the
  walk-in (door on its west wall) to the bath. Bath reachable only via the master.
- One straight wall plane (x 11.88–12.28) runs from the north divider column to the hall
  closet's south end: master entry door, walk-in back wall, and hall-closet bifold are
  all in it. The master entry door and the walk-in door both hinge on their **south**
  jambs (master swings west into the bedroom, walk-in opens inward into the closet).
- Kitchen: sliding glass door is on the **north** wall — the sliding assembly spans the
  full bay between the divider column and the NE corner mass (x 13.7–24.6), with the
  walkable opening at its east end (x 21.6–24.6); peninsula counter is contiguous,
  narrowing in front of the countertop column (which extends to the east wall); the
  narrow run stops just short of the east windows (small gap, counter ends ≈x 27.2); then
  **full window gap**, then the chase column against the kitchen/bath wall.
- Laundry closet spans the foyer's full west side, no gaps. The bifold plane sits at
  x≈5.7–6.05, so the foyer's usable width starts there; the closet itself is only as
  deep as the W/D stack — everything west of the units' backs (x≲3.3) is solid
  dead space / column / wall mass, not closet interior.
- Bedroom 2: door beside the apartment entry (west wall, hinged south), corner column at
  the NE by the windows, **no windows on the south side** (wall + closet bump only).
- Master bath: tub alcove has a wall stub at the tub's north edge; toilet faces west.
- Bath 2: the east face is a **solid wall** (no glazing) — the tub sits against it.
- Finishes, cross-checked against the Matterport walkthrough and the owner's photos:
  ceilings are the **exposed slab soffit with a sprayed aggregate finish** (cream,
  heavily stippled — not smooth drywall); casework hardware is **small round satin
  knobs**, never bar pulls; both tubs are alcove tubs with **tile surrounds** up ~5 ft
  and painted wall above; the master vanity is a **one-piece cultured-marble top with
  integral bowls** under a full-width frameless mirror and a multi-globe bar light;
  every window has a **roller shade in a dark head pocket**; living and kitchen both
  have **surface-mounted track lighting**; louvered **supply grilles** sit high on the
  walls in every room.
- Floors: **dark espresso plank** in living/dining and the hall spine, **carpet** in
  both bedrooms and the walk-in, **porcelain tile** in kitchen, both baths and foyer.
- Balcony railing is **dark metal pickets at ~4" centres with a flat top rail** — not
  glass. Both the tour photos and the Matterport scan show this.
- Balcony: the plan's 17'11" × 23'2" are the curved slab's **overall bounding box** —
  it starts at the sliding door (x≈15.5), bulges ~4 ft past the north face and ~5 ft
  past the east face, and rejoins the facade at the chase column (z≈19). It does
  **not** front the master bedroom windows or run south past the kitchen window gap.

## Owned furniture

The "My Furniture" catalog category (`my-*` ids in furniture.js) holds pieces the owner
actually owns, at real measured dimensions — don't resize them, and prefer them over
generic equivalents when arranging this unit: 64"×16" TV console with 65" TV, 47"×28"
wooden dining table, 60"×29" and 48"×23" sit-stand desks, 23"×12" five-shelf bookcase
(62" tall), Full XL bed, Queen bed.

## Layout presets

Two arrays in main.js, both reachable from the sidebar and both kept collision-free:

- `MODEL_UNIT` — **the default**, restored by the "Model unit" button and loaded on a
  first visit. Traced from the Matterport scan of the building's model unit, so it uses
  generic catalog pieces, not the `my-*` ones. Its balcony is empty because the real
  model unit's is. The east-wall seating group is tight: there are only ~9 ft clear
  between the NE column (ends z 4.8) and the countertop column (starts z 13.85), and
  the sofa plus side table use ~8.7 of it — nudging them apart trips the collision pad.
- `MY_FURNITURE` — the owner's real pieces, restored by the "My furniture" button.

After editing either, reload with `localStorage.removeItem('aqua3d.layout.v5')` (a saved
layout wins over the default) and check that no red collision pads appear.
