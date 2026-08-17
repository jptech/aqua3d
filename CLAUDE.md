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
| `src/interact.js` | Selection, floor dragging, rotation, 2D SAT collision (red pad), dimension rays to nearest obstacles, snap-to-wall on drag. Has an `enabled` flag other tools toggle and a `snapWalls` flag the 🧲 button owns. |
| `src/measure.js` | Two-click measuring tape. |
| `src/main.js` | Scene/lights/skyline, PMREM environment map, camera view presets, wall auto-fade, walk mode (WASD + pointer lock), UI wiring, sample layout, localStorage persistence, adaptive resolution. |
| `src/textures.js` | Canvas surfaces (carpet, tile, granite, maple/walnut, plaster, concrete, glass tile, linen) each with a real-world tile size + Sobel-derived normal map; equirect sky; contact-shadow blob. |
| `src/geo.js` | Cached chamfered box geometry, feet-based UV scaling, and `mergeStatic()` (collapses a group to one mesh per material + shadow-flag bucket). |
| `src/quality.js` | Device-tier detection (low/med/high) and the render-cost knobs every other module reads: pixel ratio, shadow size, normal maps, bevel radius, lamp count, texture size. |

## Invariants — keep these when editing geometry

- **Everything routes through `WALL_RECTS`**: furniture collision tinting, dimension
  rays, walk-mode collision and snap-to-wall all read the same registry. New solid
  geometry must be registered (walls do it automatically); never register door openings.
- Snap-to-wall pulls a dragged piece's nearest face to within `SNAP_GAP` (0.05 ft) of a
  wall rect, not flush to it — baseboards project 0.045 ft past the wall face and are
  *not* registered separately, so a truly flush piece clips the trim. Hold Shift to get
  the ½ ft grid instead; the two snaps are deliberately exclusive.
- Undo (main.js) snapshots via `serialize()` on `onChange`, which fires *after* a
  mutation, so the stack holds pre-change states. One user action can fire `onChange`
  several times in a tick (`load()` clears then refills), so entries are coalesced in a
  microtask — anything new that mutates the layout gets undo for free, but only if it
  routes through `onChange`.
- **Walk mode needs floor continuity**: every door/opening in a registered wall needs a
  matching `th-*` threshold rect in `ROOMS`, or you can't walk through it.
- **Floor rects must not overlap** (z-fighting) and walls sit on y=0 over them.
- Saved layouts live in localStorage `aqua3d.layout.v6` (see `STORAGE` in main.js).
  Bump the version only if saved furniture would now sit inside new walls, or if a new
  default has to get past an old save (a save always wins over the default). v6 was the
  latter: the first-visit default moved from `MODEL_UNIT` to `MY_FURNITURE`.
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
- `window.AQUA` exposes the renderer, scene, camera, merge stats, the `Interactions`
  instance and both layout presets for console poking
  (`AQUA.renderer.info.render.calls`, `AQUA.interactions.items`).

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
  knobs**, never bar pulls; doors have **satin levers on round roses**, not knobs;
  both tubs are alcove tubs with **tile surrounds** up ~5 ft and painted wall above;
  every window has a **roller shade in a dark head pocket**; living and kitchen both
  have **surface-mounted track lighting**; louvered **supply grilles** sit high on the
  walls in every room.
- Both vanities are the same builder-standard unit: maple doors under a **one-piece
  cultured-marble top with recessed oval bowls** and an integral splash lip, a
  full-width frameless mirror, and a multi-globe chrome bar light above it. There is no
  boolean here, so `deckStrips()` assembles each slab from pieces around the bowl
  openings and a flat ring closes the rectangular corners — the cabinet body stops at
  y 2.4 so the bowls have somewhere to hang.
- Kitchen appliances (model unit): freestanding **gas range** with a stainless
  backguard carrying the controls and clock, black glass cooktop, cast-iron grates and
  front knobs; **over-the-range microwave**, stainless with a black glass door and a
  right-hand keypad; stainless **top-freezer refrigerator** with bar handles on the
  east stile; dishwasher with a black top control strip. The cabinet run and counter
  **break either side of the range slot (x 21.4–23.9)** — a continuous slab caps the
  cooktop.
- Backsplash differs between units: the owner's is a **band of ~1.5" glass mosaic**
  above a granite curb (what's modelled); the model unit was re-tiled in full-height
  gray glass subway. Same for lighting — the owner has one amber pendant plus track,
  the model unit has two white pendants and a dome.
- Mirrors are deliberately **dulled** (roughness 0.38, envMapIntensity 0.18). A real
  mirror needs a second render pass; at metalness 1 / roughness 0 it just samples the
  sky, so the bathroom mirrors ended up showing the sun.
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
(62" tall), Full XL bed, Queen bed, a 15"×10"×25" rectangular kitchen bin (`my-trash`,
modelled as a stainless slim step can — the finish is an assumption, the footprint is
not), and the sofa below.

`my-sofa` is the owner's own sofa, measured: **94" wide × 42" deep, two large seat
cushions, two wide arms at ~14" each** — so the cushions come out ~33" apart. It is
built by the shared `seat()` builder, which now takes `armW` / `armTop` / `cushions`;
pin all three rather than letting the width-derived default make it a three-seater.
Don't reach for the generic 84" `sofa` when arranging this unit.

Storage pieces, sized from the manufacturers' listed dimensions rather than measured
in the unit — if one reads wrong on site, the listing spec is what to re-check:

| id | Product | W × D × H (in) |
|---|---|---|
| `my-bakers` | VASAGLE hutch bakers rack, UKKS025B01 (ASIN B0B6385687) | 31.5 × 15.7 × 66.9 |
| `my-pantry` | VASAGLE pantry cabinet, UBBC561B12 (B0CLXZG9V2), ink black | 30 × 15.7 × 71.7 |
| `my-fold5` | 4NM no-assembly folding bookshelf, 5-tier (B0CQCB1MTT) | 23 × 11.6 × 65.7 |
| `my-fold4` | BHG folding bookshelf, "Fire" 4-tier (B0D86LMRBH) | 23.6 × 11.6 × 49.8 |
| `my-cart` | SimpleHouseware 3-tier rolling utility cart (B07V49ZP66) | 17 × 12.5 × 31.5 |
| `my-shoebench` | SONGMICS shoe bench w/ cushion, ULBS576B33, dark gray on ink black | 23.6 × 11.8 × 19.7 |
| `my-hamper` | AINUOQUI tall rope laundry hamper, rice brown & white | 17 × 13.8 × 22 |
| `my-purifier` | Blueair Blue Pure 311i+ Max air purifier | 10.6 × 10.6 × 20.5 |

Only the 23.6" width is stated in the SONGMICS listing title; its depth and height,
and all three of the hamper's and the purifier's, come from the listing spec blocks.
The purifier's fabric sleeve is the intake, so it runs nearly the full height and the
white cap is only the top ~2" — don't turn it into a two-tone box.

Owner-verified on the bakers rack (`my-bakers`), against listing photos: the **top two
shelves are the shallow hutch shelves**, set back against the wire panel at roughly half
the base depth, so the frame steps back above the tabletop — the front posts stop at the
tabletop and the hutch runs on its own set-back uprights. The **middle shelf (the
tabletop) has the most vertical clearance** of the three upper bays; it's the appliance
surface. Don't even out the shelf pitch.

The two folding bookcases share `foldShelf()` — same design, different tier count and
board colour. Their X-braced side panels are the folding linkage, so keep them: without
the braces the pieces just read as generic bookcases. `my-fold4`'s height is the one
figure taken from the identical clone listings (4NM / GHQME / Vogue Carpenter 4-tier)
rather than from BHG's own listing, which doesn't publish it.

## Layout presets

Two arrays in main.js, both reachable from the sidebar and both kept collision-free:

- `MY_FURNITURE` — **the default**, restored by the "My furniture" button and loaded on
  a first visit. The owner's real pieces at measured sizes, following the arrangement
  they exported from the app on 2026-08-17: queen + big sit-stand desk in the master,
  94" sofa on the east glass facing the TV console on the divider, owned dining table
  under the north windows, rolling cart in the kitchen, bakers rack (as the drop zone)
  and shoe bench in the foyer, hamper in the laundry closet south of the W/D stack,
  and queen + small desk + pantry + cart + folding shelf in bedroom 2. Balcony empty —
  nothing is out there yet. The **two carts and two queens are deliberate**; the owned
  Full XL is currently unplaced, and so is `my-shelf`.
- `MODEL_UNIT` — the building's model unit, restored by the "Model unit" button. Traced
  from the Matterport scan, so it uses generic catalog pieces, not the `my-*` ones. Its
  balcony is empty because the real model unit's is.

The east glazing bay is the tight spot in **both** presets: only ~9 ft clear between
the NE column (ends z 4.8) and the countertop column (starts z 13.85). The model unit's
sofa plus side table use ~8.7 ft of it and the owner's 94" sofa uses 7.83 — either way,
nudging along z trips the collision pad. The owner's sofa is also 3.5 ft deep against
glazing at x 27.86, which leaves 0.11 ft behind it.

Bedroom 2 is the other tight spot now that it carries a queen plus desk, chair, pantry,
cart and folding shelf: several of those clear each other and the east/south walls by
0.1–0.5 ft, so treat any position there as load-bearing rather than approximate.

Circulation, measured as the widest free disc that can traverse the living → hall route
(so it accounts for corners, not just wall-to-wall spans):

- The route's narrowest point is **2'11" at z ≈ 13.5**, where the peninsula's NW corner,
  the TV console and the air purifier close in on each other. Everything downstream is
  wider, so that spot is the one to protect.
- The west walkway past the fridge (z 18–21.5) is the widest stretch at **4'1"–4'6"** —
  which is why the kitchen bin lives there and costs nothing.
- The kitchen→hall throat (z 22–22.75) is **3'11"**; the hall spine is 4'3"–4'7".
- The **galley aisle** (peninsula ↔ range wall) is a uniform **3'2"** for its whole
  length. It is *not* on the living→hall route — you can detour through the cross aisle —
  so route metrics won't flag anything parked in it, but it drops the working aisle to
  2'4". Check that separately.
- The bakers rack in its old kitchen spot cost 0.48 ft off the route pinch (2'11" → 2'5"),
  which is the most of anything tried there.

After editing either, reload with `localStorage.removeItem('aqua3d.layout.v6')` (a saved
layout wins over the default) and check that no red collision pads appear. There is a
headless check for this: `window.AQUA.interactions.items` exposes every placed piece and
`it.userData.pad.visible` is its collision flag.
