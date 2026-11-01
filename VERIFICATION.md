# CADmium verification — 21 October 2026

## Latest — right-hand homepage motor restored; exploded labels retained

Per corrected user direction, the existing Axis-1 motor is back on the right, not centred or replaced. Six desktop/two phone overview callouts persist through the final chapter and avoid the active copy. Strict build, **66 unit tests and 26/26 browser workflows pass without retries**. Returning the reduced-motion slider to zero also restores assembled transforms. [Results](artifacts/testing/homepage-motor-restored-final-results.json), [record and screenshots](docs/HOMEPAGE_MOTOR_RESTORE.md). Viewer/library/Explore preservation gates pass; no data reset/deployment.

## Earlier — user-reported Explore scrolling/click regression corrected

The earlier CP3 gate missed native scrolling: automated locator actions could scroll an overflow-hidden viewer ancestor that real wheel input could not. Explore/Library now use normal document flow; images and titles open models; the retained workspace is inert while browsing. **66 unit tests and 24/24 actual-browser workflows pass without retries**, including new native wheel/coordinate-click/touch-swipe checks. See the [fix record](docs/explore-library/EXPLORE_INTERACTION_FIX.md) and [complete release results](artifacts/testing/explore-interaction-fix-release-results.json). No data reset or deployment. Physical-device touch remains unverified.

## Historical — Explore / library series CP3

Strict TypeScript/build, **66/66 unit tests** and **21/21 browser workflows in one final production Chrome ANGLE/Metal run without retries** pass. **25 unique axe surfaces have zero detected violations.** The final run avoids redundant page screenshot recapture only; all storage/export/pixel/equivalence/axe assertions stay enabled. Real STEP and textured OBJ persist after reload, fresh-profile backup restores original companions, root orientation/measurement state resumes, and failed saves keep temporary inspection intact. Shared preview cleanup leaves zero inactive geometries/textures and does not resize its buffer during animation. See the [release results](artifacts/testing/library-checkpoint3-release-results.json), [CP3 report](docs/explore-library/CHECKPOINT_3_REPORT.md) and [evidence summary](artifacts/testing/library-checkpoint3/summary.json).

Earlier interrupted/time-budget runs are disclosed, not counted as passes; a real per-frame preview buffer-allocation defect was corrected and retested on native graphics. fake-indexeddb is dev-only; native browser Blob/reload/storage-error tests are separate. Source-equivalent clones, imported Original defaults, the existing story/viewer/import behaviors and legacy views remain. No deployment. The CP2 and 21 October sections below are historical.

## Historical — appearance series CP2, 24 October 2026

Strict TypeScript/build and **42 unit tests pass**. **4 new appearance and 10 existing browser workflows individually pass across split production-Chrome runs**; **22 unique axe surfaces have zero violations**. The latest final appearance runs retain all behavioral/equivalence/pixel/persistence assertions and avoid only repeated screenshot captures. Initial driver errors and subsequent screenshot/time-budget failures are disclosed, not counted as passing runs. See the [CP2 report](docs/explore-library/CHECKPOINT_2_REPORT.md) and [evidence summary](artifacts/testing/explore-checkpoint2/summary.json).

Source object identity is superseded by source-property equivalence and immutability: Inspect now uses independent clones. Original retains maps, alpha/sidedness and native material properties. The real shared-MTL selected-transparency and authored-translucency defects are fixed. Imported materials default Original under Studio lighting. Library/model-byte persistence, preview cleanup and per-model orientation are CP3; no deployment was performed. The 21 October results below remain historical.

## Final automated result

- Strict TypeScript and Vite production build passed.
- **12 / 12 unit tests** passed, including deterministic explosion, reverse/reset, adapter identity, automatic fallback and camera interpolation.
- **7 / 7 real Chrome / Playwright workflow groups** passed with **zero retries / flaky results**.
- **13 saved axe WCAG 2 A/AA + 2.1 AA surfaces**, zero detected violations.
- Full npm audit: zero reported vulnerabilities.
- Production preview: HTTP 200 at [http://127.0.0.1:4326](http://127.0.0.1:4326).

The original two redesign rounds below are retained as history. The production scrollytelling architecture was reverified on 21 October after the typed adapter/controller integration.

## Production scrollytelling integration

- Added a read-only STEP/mesh assembly adapter with deterministic occurrence IDs, hierarchy paths, immutable transform snapshots, bounds, materials and units.
- Added a deterministic authored/automatic explosion controller. Unit coverage proves repeated intermediate updates do not drift and progress `1 → 0` restores exact assembled transforms.
- Added a bounds/aspect-aware quaternion camera path, one normalized ScrollTrigger progress source, projected leader-label annotations, a normal footer and a development-only diagnostics panel.
- Kept the existing single renderer, canvas, import workers, selection, measurement, visibility, clipping, export and workspace controls.
- Final strict build and **12 unit tests passed**.
- Final Playwright release gate passed **7 / 7 workflow groups** in one run with no retries. The saved **13 axe surfaces have zero detected violations**.

Current evidence:

- [Final accessibility aggregation](artifacts/testing/cadmium-production-final-accessibility.json)
- [Desktop assembled hero](artifacts/screenshots/cadmium-production-final/landing-1440.png)
- [Desktop exploded inspection](artifacts/screenshots/cadmium-production-final/story-95.png)
- [Mobile assembled hero](artifacts/screenshots/cadmium-production-final/landing-390.png)
- [Mobile exploded inspection](artifacts/screenshots/cadmium-production-final/mobile-exploded.png)
- [Real imported STEP assembly](artifacts/screenshots/cadmium-production-final/step-assembly.png)

## Round one: discoveries

Four groups passed. The scroll story group exhausted its initial 60-second test budget while software rendering, screenshots and scans ran; the phone reverse check sampled the scrubbed animation before it settled. Inspection of saved trace snapshots showed the same model subsequently reassembled. A test assumed the inch-unit cube was 25.4 mm wide, but the actual fixture is approximately 39.37 inches / 1000 mm; the independent Open Cascade reading confirmed **1000 mm**, so no geometry/unit implementation was changed to fit the incorrect expectation.

Axe found the mobile Back to story icon-only button lacked an accessible name. Visual inspection found final mobile editorial content crossing the central exploded model. The phone hero itself showed the complete assembly prominently.

One fix batch added the mobile accessible button label, reserved a fixed top content band on phones, reduced later-chapter mobile heading size, prevented duplicate RAF scheduling during OrbitControls updates, avoided recompiling materials on every scroll update, reset subtle pointer tilt on guide/resume, and changed reversal tests to await settled scroll progress. Browser timeout increased to cover the full workflow; retries remained disabled.

- [First-round workflow evidence](artifacts/testing/cadmium-round-1-results.json)
- [First-round phone overlap](artifacts/screenshots/cadmium-round-1/mobile-exploded.png)
- [First-round assembled desktop](artifacts/screenshots/cadmium-round-1/landing-1440.png)

First-round axe aggregation across failed worker restarts was incomplete; the detailed accessibility failure is preserved in the workflow result. Confirming-round scans are saved individually before aggregation, avoiding that evidence issue.

## Round two: confirming workflows

1. **Continuous desktop story:** complete first-screen pose; sampled 30/50/70/95% story positions; exact original part positions restored at settled reverse scroll; manual camera guidance pause; resume; keyboard-accessible part annotation; real hover tooltip; same canvas UUID and same part count entering the viewer.
2. **Viewer tools:** search and selection, selected transparency, hide/isolate/show all, all seven camera presets, perspective/orthographic, solid/wireframe/edges, exploded slider, section axis/position/reset, camera/assembly reset, panel collapse/reopen, dark/light, PNG download and visible keyboard focus.
3. **Real OBJ / MTL / PNG:** actual worker parsing, 20 mm cube bounds, one-mesh explosion disabled, two real viewport surface picks with visible line/endpoints, clear points, multi-file textured OBJ, no external requests and renderer sleeping while idle.
4. **Real STEP / STP:** local WASM worker import of inch-unit STEP cube, 1000 mm bounds; CAX-IF STP assembly with **18 actual mesh components**, retained hierarchy/names/colors and conversion metadata. No mesh-loader STEP shortcut was used.
5. **Files and recovery:** real ASCII STL and binary STL, invalid STEP error, cancellation during WASM loading preserving current model, empty state/sample recovery, oversized STL refusal.
6. **Phone 390 × 844:** forward/reverse part positions, component picker/annotation, viewer entry, mobile model drawer search/selection, properties drawer and upload dialog; no horizontal overflow.
7. **Reduced motion / WebGL failure:** stable parts while scrolling, explicit explosion slider, WebGL-unavailable error and operable viewer/import controls.

Successful normal desktop/mobile/import groups monitored error-level console and page errors and asserted none. The deliberately forced WebGL failure is an expected test path. No real-phone hardware or physical-touch performance claim follows from software-capable Chrome WebGL.

- [Final browser results](artifacts/testing/cadmium-round-2-results.json)
- [Final aggregated axe scans](artifacts/testing/cadmium-round-2-accessibility.json)
- [Desktop assembled hero](artifacts/screenshots/cadmium-round-2/landing-1440.png)
- [Phone assembled hero](artifacts/screenshots/cadmium-round-2/landing-390.png)
- [Desktop final exploded composition](artifacts/screenshots/cadmium-round-2/story-95.png)
- [Phone final exploded composition](artifacts/screenshots/cadmium-round-2/mobile-exploded.png)
- [Desktop viewer](artifacts/screenshots/cadmium-round-2/viewer-1440.png)
- [STEP assembly](artifacts/screenshots/cadmium-round-2/step-assembly.png)
- [Mesh measurement](artifacts/screenshots/cadmium-round-2/obj-measurement.png)

The saved desktop hero, exploded hold, phone hero/exploded hold, desktop viewer, imported STEP assembly and mobile properties screenshots were visually inspected in the IDE. Final phone editorial no longer crosses the exploded assembly.

## Important remaining visual check

[Immediate phone viewer entry screenshot](artifacts/screenshots/cadmium-round-2/viewer-390.png) shows an early blank frame and partially transitioning toolbar. It was taken immediately after activation, unlike the later properties screenshot. The automated group does not require settled visible model pixels in that entry frame. Same-canvas reuse is proven on desktop, but **a completely uninterrupted mobile entry is not visually verified**. Review/fix that transition before calling it a seamless production release. No third round or post-round geometry/UI polish was performed, respecting the user's explicit maximum.

## Remaining manual / capability boundaries

- Physical tap/orbit/pinch and normal phone page-scroll behavior require a real-touch check. Desktop raycast and picker selection were exercised; the phone workflow is viewport emulation, not physical touch.
- Safari, Firefox, screen readers, native 200% browser zoom and low-power GPU stability are not verified.
- Axe passing is not full WCAG certification. Label occlusion uses mesh raycasts and screen spacing heuristics, not a general collision-layout solver.
- Representative format fixtures are not a universal exporter/security guarantee. Texture decode and GPU upload can still pause; native STEP tessellation can consume memory before result limits are checked.
- Model measurements are tessellated mesh distances/bounds, not exact B-rep metrology. No CAD editing, PMI, joints, mass/inertia, manufacturing fit, motion interference or load rating was verified.
- Imported generic explosion is a display spread; the procedural assembly's gear tooth forms and hardware are illustrative.
- No deployment, publication, external conversion server, paid API or credential configuration was performed.
