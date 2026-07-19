# Aqua 3D Layout Planner

Interactive 3D recreation of a 2 bed / 2 bath (~1,080 ft²) unit in the Aqua building,
Chicago — built from [floorplan.png](floorplan.png) and the video-tour screenshots.
Lets you place, drag, and rotate furniture to test layouts at true scale (1 unit = 1 ft).

## Run

No build step. Serve the `app/` folder over HTTP and open it:

```
python -m http.server 8123 --directory app
# then open http://localhost:8123
```

(Three.js v0.170 is vendored in `app/vendor/`, so it works offline. In Claude Code the
`.claude/launch.json` config `aqua3d` starts this automatically.)

## Controls

- **Orbit** with the mouse, scroll to zoom. Perimeter walls auto-fade when they face the camera.
- **Click** furniture to select — shows dimensions and orange distance lines to the nearest walls.
- **Drag** to move (constrained to floors/balcony). **Shift** snaps to ½ ft.
- **Q / E** rotate 15° (Shift = 45°), **D** duplicate, **Del** remove.
- Red pad under an item = it overlaps furniture or a wall/fixture (chairs are allowed to tuck under tables).
- Top bar: camera presets (Overview / Top / rooms / Balcony) and toggles (X-ray walls, Ceiling, room Labels, 1-ft Grid).
- **📏 Measure**: click two points (floors, walls, furniture) to get the distance in ft-in; Shift snaps to ½ ft. Click again to start a new measurement.
- **🚶 Walk** (or press **V**): first-person walkthrough from the entry — WASD/arrows to move, mouse to look (click the canvas to capture the mouse), Shift to run. Walls collide; doorways walk through.
- Sidebar: furniture catalog with real-world dimensions; Sample layout / Clear.
- Layouts auto-save to `localStorage`.

## Structure

- `app/src/plan.js` — floorplan model in feet: wall lines, room rects, balcony curve, obstacle registry
- `app/src/apartment.js` — architecture builder: walls/openings, floor-to-ceiling glazing, curved balcony + glass rail, kitchen/bath fixtures, closets, doors
- `app/src/furniture.js` — procedural furniture catalog (sized in real feet)
- `app/src/interact.js` — picking, floor dragging, rotation, 2D SAT collision, dimension rays
- `app/src/textures.js` — canvas textures (carpet, tile, granite, maple, skyline)
- `app/src/main.js` — scene, lighting, environment, camera views, UI wiring, persistence
