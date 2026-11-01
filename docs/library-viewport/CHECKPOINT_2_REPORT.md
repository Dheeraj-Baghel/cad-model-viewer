# Library + viewport upgrade — Checkpoint 2 report

Status: **implemented and verified; stopped for review.** The development server remains at `http://127.0.0.1:4326/#viewer`. No deployment or unrelated-project changes.

## Delivered

### Studio / Inspect

- Top-level **Studio** and **Inspect** controls share the existing renderer, camera, model and selection.
- Mode switching changes only presentation policy. It preserves camera, selection, visibility, explosion, clipping, measurements, saved views, projection, background choice and turntable preference.
- **Studio** uses display-only `MeshPhysicalMaterial` clones with a restrained graphite / machined aluminium / blackened steel / bronze palette. Textures are retained. Model-fitted key/rim/fill lighting and shadows scale from small meshes to large STEP assemblies.
- **Inspect** restores the exact source material object references, forces feature edges, grid and axes, and keeps all engineering tools available.
- Studio clones are disposed on model replacement/unmount. Source materials and geometry are never edited or disposed by the presentation layer.

### Background and motion controls

- Graphite Studio, Light Studio and Technical Grid backgrounds.
- Environment rotation: −180° to +180°.
- Turntable: play/pause, 0.5× / 1× / 2× speed and direction.
- Turntable rotates the camera through OrbitControls; it does not transform model geometry.
- Inspect pauses the turntable without deleting its Studio preference.
- Under reduced motion, automatic turntable controls are disabled and hidden.

### Layout

- 48 px top bar: model name, Studio/Inspect, Saved views, distraction-free, browser fullscreen, theme, help and import.
- Tree left, model and annotations centre, orientation cube + zoom/fit upper-right, compact tool groups at bottom, contextual properties right.
- Side panels remain resizable/collapsible on wide screens.
- At ≤1320 px, panels become drawers before squeezing the model. The 1280×800 viewport gets the full 1280×712 model area.
- Distraction-free mode hides all panels/tool chrome while retaining a visible Exit control and upper-right orientation/navigation.
- Phone keeps one-row tools and drawer panels with no horizontal overflow.
- No cursor-following glow or decorative parallax was added to the inspection workspace.

### Import correction included

- Fixed the existing single-material OBJ/MTL defect: one-material files now receive a scalar material, not a material array with no geometry groups. The real one-material textured OBJ is visible.

### Revision: tool options in the right sidebar (user review, 2026-10-23)

The floating horizontal options bar above the bottom toolbar was removed after review: it ran across the model and read poorly.

- **Toolbar buttons.** Inspect, Measure, Section and Display now open their options as vertical, sectioned panels in the right sidebar. A new first tab sits beside Properties and Views.
- **Closing.** Clicking the active tool again, pressing Esc or using the panel's close button returns to Properties.
- **Selecting parts.** Selecting a part keeps the open tool sidebar in place.
- **Laptop and phone.** At ≤1320 px the same panel opens as the right drawer ("Tools & properties"). The drawer has a single close control.
- **What stays.** The bottom toolbar is now only a compact launcher. Every option, keyboard shortcut and accessible name is unchanged.

Revision evidence:

- [Sidebar verifier](../../artifacts/testing/library-checkpoint2/sidebar-tools.mjs): **21/21 checks**, zero console/page errors, **zero axe findings** on six sidebar surfaces.
- Existing browser workflows rerun against the sidebar UI: **9/9 pass**.
  - viewer tools/export;
  - OBJ;
  - STEP;
  - STL/cancel/recovery;
  - mobile;
  - reduced-motion/WebGL failure;
  - tree/drawers;
  - saved views;
  - measurements/section.
- Axe scans now wait for CSS transitions to settle, so they no longer sample half-switched theme colours.
- The story test was again checked with the standalone preservation probe rather than inside the monolithic suite.
- Screenshots:
  - [Inspect](../../artifacts/screenshots/library-checkpoint2-sidebar/01-inspect-sidebar-1440.png)
  - [Measure](../../artifacts/screenshots/library-checkpoint2-sidebar/02-measure-sidebar-1440.png)
  - [Section](../../artifacts/screenshots/library-checkpoint2-sidebar/03-section-sidebar-1440.png)
  - [Display](../../artifacts/screenshots/library-checkpoint2-sidebar/04-display-sidebar-1440.png)
  - [Display, light](../../artifacts/screenshots/library-checkpoint2-sidebar/05-display-sidebar-light-1440.png)
  - [Phone drawer](../../artifacts/screenshots/library-checkpoint2-sidebar/06-display-sidebar-phone-390.png)

## Verification

- Strict TypeScript + Vite production build: **pass**.
- Unit tests: **22/22 pass**.
- Focused Checkpoint 2 browser verifier: **15/15 checks pass**, zero console/page errors:
  - default Studio;
  - turntable changes camera only;
  - pause stability;
  - exact camera/selection/section preservation across modes;
  - Studio round-trip;
  - distraction-free 1440×900 canvas;
  - one renderer retained;
  - imported geometry unchanged;
  - source material → Studio clone → same Studio clone round-trip by UUID;
  - 18-part STEP hierarchy retained;
  - single-material OBJ visible;
  - phone overflow;
  - reduced-motion turntable disabled.
- Axe: zero detected WCAG 2.1 AA findings on Studio dark, Studio dark with hidden parts, Studio light + Display controls, Inspect light and Inspect phone.
- Story preservation probe: cover reaches Y=190.5 mm, exact assembled transforms restore, same canvas and same 65 parts enter the viewer, zero errors.
- Existing real-import tests: OBJ and STEP pass. Existing mobile workflow passes after adding explicit accessible names.
- Existing regression subset: STL/cancel/recovery, reduced-motion/WebGL failure, tree/search/drawers and saved views all passed. The measurement workflow completed but that batch failed only in its final cross-test accessibility aggregation; the reported contrast issue was fixed and the five-surface axe gate above is now clean. A single monolithic 10-test rerun was attempted but exceeded this IDE command's 10-minute execution window during its screenshot-heavy story test, so it is not claimed as a passing gate.
- Production build retains the pre-existing main-chunk warning (967.65 KB raw / 353.72 KB gzip). Bundle splitting is planned for the hardening checkpoint.

Evidence:

- [Focused report](../../artifacts/testing/library-checkpoint2/report.json)
- [Axe report](../../artifacts/testing/library-checkpoint2/axe.json)
- [Verifier](../../artifacts/testing/library-checkpoint2/verify-and-capture.mjs)
- [Story preservation probe](../../artifacts/testing/library-checkpoint2/story-preservation.mjs)
- [Screenshots](../../artifacts/screenshots/library-checkpoint2/)

## Screenshots

- [Graphite Studio — showcase](../../artifacts/screenshots/library-checkpoint2/01-showcase-graphite-studio-1440.png)
- [Light Studio](../../artifacts/screenshots/library-checkpoint2/02-showcase-light-studio-1440.png)
- [Technical Grid](../../artifacts/screenshots/library-checkpoint2/03-showcase-technical-background-1440.png)
- [Inspect mode + section + selected component](../../artifacts/screenshots/library-checkpoint2/04-showcase-inspect-mode-1440.png)
- [Distraction-free](../../artifacts/screenshots/library-checkpoint2/05-showcase-distraction-free-1440.png)
- [Real STEP — Studio](../../artifacts/screenshots/library-checkpoint2/06-real-step-studio-1440.png)
- [Real STEP — Inspect/source colours](../../artifacts/screenshots/library-checkpoint2/07-real-step-inspect-1440.png)
- [Real STL — Studio](../../artifacts/screenshots/library-checkpoint2/08-real-stl-studio-1440.png)
- [Real STL — Inspect](../../artifacts/screenshots/library-checkpoint2/09-real-stl-inspect-1440.png)
- [Real one-material OBJ/MTL/texture](../../artifacts/screenshots/library-checkpoint2/10-real-obj-inspect-1440.png)
- [Phone Studio](../../artifacts/screenshots/library-checkpoint2/11-phone-studio-390.png)
- [Phone Inspect + Display](../../artifacts/screenshots/library-checkpoint2/12-phone-inspect-tools-390.png)
- [Phone tree drawer](../../artifacts/screenshots/library-checkpoint2/13-phone-tree-drawer-390.png)
- [1280×800 drawer-first laptop layout](../../artifacts/screenshots/library-checkpoint2/14-laptop-drawer-layout-1280.png)

## Source touched

- `src/App.tsx` — mode/background/turntable/fullscreen controls and premium layout state.
- `src/Viewer.tsx` — reversible material layer, fitted lighting/shadows, mode rendering, environment rotation and turntable.
- `src/workspace.css` — premium workspace, backgrounds, drawer breakpoint, distraction-free and contrast.
- `src/loading/importer.ts` — single-material OBJ correction.
- `tests/viewer.spec.ts` — current UI/a11y selectors and transition settling.

## Review focus

1. Whether Studio's neutral material palette is restrained enough on the imported STEP.
2. Whether the Inspect edge strength is right or should be slightly lighter.
3. Whether 1320 px is the correct point for switching to drawers.
4. Whether the phone Display sheet is compact enough.
