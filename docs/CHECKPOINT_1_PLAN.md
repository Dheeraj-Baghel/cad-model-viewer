# Checkpoint 1: baseline review and design direction

Status: **complete, with the visual direction approved: dark graphite studio.** The light theme stays as a viewer option only. No redesign code has changed.

## Asset verification (done)

- Downloaded `artifacts/asset-eval/planetary-open.step` (6,433,319 bytes) from Innerscene's `/api/library/three-planet-4-1-gearbox-open-assembly-2dfb48c4/download` on 2026-10-21.
- **License:** the page JSON-LD declares `creativecommons.org/publicdomain/zero/1.0/`, with the text "Original Innerscene model, released CC0". Listed as available until 2030-10-05, so we keep a local copy.
- **Header:** Open CASCADE 7.8 export, AP214.
- **Tessellation:** done with the project's own `occt-import-js` 0.0.23, which succeeded. 10 named solids, 13,458 triangles at a 0.001 ratio, all in mm. All solids are separate, with true involute-style teeth.

| Solid | Size (mm) |
|---|---|
| Lower_case | 108 x 108 x 12 |
| Stationary_ring_54_teeth | 108 x 108 x 12 |
| Carrier_and_three_pins | 80 x 80 x 31 |
| Sun_18_teeth | 30 x 30 x 16.5 |
| Planet_0 to Planet_2 | 29.7 x 30 x 16.5 |
| Planet_washer_0 to Planet_washer_2 | 10 x 10 x 1 |

- **Implications:**
  - The carrier and its pins are one solid, so the planets slide off fixed pins. That suits the staged disassembly.
  - There are no fasteners, bearings, cover or output parts. The source page says so too, which confirms the project-authored additions are needed.
  - The triangle budget is comfortable. Additions can spend about 150k triangles on fillets, threads and balls.

Baseline screenshots are in `artifacts/screenshots/checkpoint1/`. They show the desktop and phone at 0/20/40/60/80/95/100% scroll, plus the viewer.

## Main problems

1. **The assembly looks like a toy.** It is a flat blue puck with a plain cover. The hex heads are floating discs, and the gears have blocky schematic teeth. The bearing is just three rings. There are no chamfers, threads, counterbores, keyways or seals. There is no material hierarchy.
2. **The rendering looks plasticky.** Every part uses one material (metalness 0.84, roughness 0.28). The lighting is a flat RoomEnvironment on a pale grey-blue background. That background washes out the aluminium and has no contrast. Shadows are a soft, unattached smudge, and the camera is too close in the hero.
3. **Layout collisions**:
   - At 60%, the chapter headline runs under the bottom "Axis 001" label and the controls.
   - At 100%, the top shaft or bearing exits the viewport under the nav.
   - The footer covers the lower half of the scene while Explore and Select stay visible.
   - At 100%, the previous chapter's text bleeds under the nav.
   - On the phone, the cover's bolts touch the body copy.
4. **The disassembly is mostly vertical lifts.** Each stage moves as a block, so the planets "pop". There is no rotation-out motion (unthreading bolts, a sliding cover, planets withdrawn along their pins).
5. **The viewer works but feels generic.** The grid is barely visible, the RGB axes are oversized, and the empty viewport has a flat tone. The tree has no grouping (37 flat rows, with bolts and shanks as separate rows). There is no section-cap colour, measurement HUD or view cube.

## Can the current assembly be salvaged?

**No.** Its geometry would need rebuilding, not recolouring. It also tops out at about 37 shallow parts, and the internal relationships aren't readable.

## Recommended direction: compact planetary servo-actuator ("CADmium Axis-1")

This is a robot-joint style actuator, roughly 110 x 110 x 75 mm. It is built in two layers.

1. **Licensed core.** I'd use Innerscene's *Three-planet 4:1 gearbox open assembly*, which is **CC0 (public domain)**. I checked the page: a 6.1 MB STEP, 108 x 108 x 31.5 mm, module 1.5. The case, carrier, pins, washers, sun, planets and ring gear are separate solids with proper involute teeth.
   - I would convert it once offline to a per-part GLB. The project's own occt pipeline can do this, and the result stays a local asset.
   - The source URL, CC0 deed and download date would go in THIRD_PARTY.md.
   - CC0 needs no credit, but I'd give one anyway.
2. **Project-authored additions.** These cover what the source omits (bearings, seals, fasteners):
   - Deep-groove bearings with an individual ball set and a stamped cage.
   - ISO 4762 socket-head cap screws with a socket recess and a modelled thread band.
   - A machined top cover with counterbores.
   - An output flange with a bolt circle and dowel holes.
   - An O-ring.
   - A finned motor can (stator lamination stack and rotor magnets as distinct parts).
   - An encoder PCB with a connector.

This gives about **60 to 80 selectable components in about 10 logical groups**. The tree would group them, for example "Cover screws ×8" as one row containing the separate screws.

### How the parts support inspection and staged disassembly

| Stage | Components | Motion path |
|---|---|---|
| Housing reveal | 8 cover screws | Rotate (unthreading) while lifting, staggered around the bolt circle |
| | Top cover and O-ring | Lift, then tilt slightly back |
| Output stage | Output flange, bearing and seal | Rise along the shaft axis |
| Gear stage | Carrier | Lifts |
| | Planets | Withdraw along their own pin axes, then fan outward |
| | Sun | Rises on the shaft |
| Ring and housing | Ring gear | Stays as a datum |
| | Housing | Drops |
| Drive | Motor can | Slides down |
| | Rotor and magnets | Pull out axially |
| | Encoder PCB | Drops last |
| Detail inspection | One planet with bearing balls and cage | Isolated in a close-up |

Every part keeps its engineering transform. Presentation offsets live in the existing `ExplosionController` and featured metadata layer, extended with per-part paths and rotations.

## Visual direction: dark-graphite studio, warm key light

- **Background:** a deep graphite-to-ink gradient (#0d1116 → #1a2028), with a seamless studio floor, a contact shadow plus a soft area shadow, and a faint horizon glow.
- **Lighting:** a PMREM studio environment built from softboxes (procedural `RoomEnvironment`-style lightformers, no external HDRI license), a warm key light, a cool rim light, ACES/AgX tone mapping and correct sRGB output.
- **Materials:**

| Part | Finish |
|---|---|
| Housing | Bead-blasted anodised titanium-grey aluminium (roughness 0.45, slight anisotropy) |
| Edges | Bright machined chamfers in a separate material group |
| Gears | Ground steel (roughness 0.25) |
| Screws | Black-oxide steel |
| Bearing balls | Polished chrome |
| Accent | Bronze washers |
| Motor windings | Copper |
| Encoder PCB | Green solder mask |

- **Normals and edges:** I'd fix normals with `toCreasedNormals`, compute vertex normals with an angle threshold to remove the lumpy reflections, and add a subtle edge overlay in inspection modes only.
- **Typography:** keep Space Grotesk and Plex, adding a mono annotation style with leader lines. Chapters would sit in a safe text column, with the model framed in the opposite safe rectangle computed per breakpoint.
- **Workspace:** the same dark-graphite studio with a light theme option. It would add:
  - Grouped tree, view cube and isolate-by-group.
  - Section caps (solid-colour fill behind the clip plane).
  - Measurement HUD.
  - Explode slider per group.

## Implementation plan

1. **Checkpoint 2: assembly and visuals.**
   - Import and convert the CC0 STEP.
   - Author the additions, group metadata, materials and lighting.
   - Produce four compositions (hero, partially open, planet close-up, full exploded) and take desktop and phone screenshots.
2. **Checkpoint 3: story.**
   - Build per-component paths in the ExplosionController.
   - Add safe-area camera framing, chapter and annotation typography, and footer handoff (controls fade before the footer and the scene freezes behind it).
   - Add the guided/explore toggle, a reduced-motion storyboard, and forward and reverse Playwright checks.
3. **Keep:** importers (STL/OBJ/STEP), measurement, clipping, export, tests and the debug panel. Unrelated apps stay untouched.

## Risks and open questions

- The STEP's solid names may be generic. I would rename them in metadata, not in the geometry.
- The combined part count is about 200k triangles, which is still within budget. I'd measure it on a phone.
- The source does not claim load rating or gear class. The copy will still say "illustrative assembly".
- **Decided:** dark graphite studio.
