# Explore hover previews and simplified cards - 26 October 2026

## User requirements

- Rotation should start on hovering the model, without a long loading delay.
- Make rotating surfaces cleaner and smoothly animated, not cramped/shimmery.
- Remove card arrows and all card copy except the product name.
- Axis-1 must preview the actuator, not its open planetary gearbox core.

## Corrections

The old preview key was based on the source hash. Axis-1 and the planetary sample
share a gearbox-core STEP hash, but represent different whole products. Keys now
include the **sample/product identity**. Regression checks hover the gearbox,
then verify all 65 Axis-1 parts, including the motor, stator and encoder.

Removed the 450 ms hover timer. Nearby catalogue models are prepared as the page
loads; a single renderer precompiles/uploads their surfaces off-screen. A bounded
four-model/24 MiB geometry-and-decoded-texture cache replaces per-hover JSON
serialization/reconstruction and GPU teardown. Leaving a model stops its animation
and removes the live canvas; eviction and collection unmount free cached resources.
Only one live preview and one preview WebGL context exist.

The two STEP samples have new [prepared assets](../../public/samples/planetary/preview.json),
created by [the offline converter](../../scripts/build-preview-assets.cjs):

- Planetary: 10 components, 13,398 triangles, 514,536 bytes of binary geometry.
- Bevel: 21 components, 9,318 triangles, 344,808 bytes of binary geometry.

These use the exact same balanced Open Cascade settings as full inspection.
Float32 positions/normals and Uint32 indices are retained without simplification
or quantization. Runtime checks the original identity and binary digest. Unit
checks verify source/binary hashes, counts, coordinates, indices, normals and
millimetre bounds. Full inspection still opens the **unchanged original STEP**;
hovering no longer downloads that STEP or initializes its WASM converter.

Rotation follows every requestAnimationFrame instead of a 33 ms gate, with a
bounded delta and reused frame vectors. Added the established studio's soft
image-based lighting and model-scale clipping planes. The previous fixed tiny
near plane / distant far plane wasted depth precision. A sphere-based fit keeps
all rotations inside the card, with breathing room. Axis-1 uses the same curated
bronze/graphite finish as the homepage; other samples retain Original materials.

Explore cards now contain just the model, name and favorite icon. Image/name
clicks still open inspection. Descriptions, category/index badges, component
counts, arrows and per-card action/provenance rows are removed from Explore.
Sources/licenses remain in one disclosure beneath the grid. Touch/reduced-motion
users retain static preview selection and manual rotation **outside** the cards.
Your Library's rename/remove/backup workflows are not removed.

## Verification

- Strict TypeScript/production build pass; **80 unit tests pass**.
- **14/14 focused production Chrome workflows pass**, no retries: [results](../../artifacts/testing/explore-preview-focused-final-results.json).
  Covers product identity, card content/clicks/favorites, rapid switching,
  filtering/route cleanup, native wheel/touch collection interactions, mobile
  accessibility, and all prior startup/homepage/callout regressions.
- **2/2 updated legacy collection-preview workflows pass**, no retries:
  [results](../../artifacts/testing/explore-preview-legacy-final-results.json).
  Warm-cache bounds replace the old zero-allocation-on-leave expectation;
  animation stops on leave and cache teardown remains a route-exit requirement.
- The three focused Explore accessibility scans report zero detected A/AA issues.
- Final warm-geometry/compiled-shader sample: **7.5 ms renderer activation**;
  pointer-to-observed-ready test wall time **219 ms** (includes Playwright input
  and polling). Ninety sampled frame intervals: median **16.7 ms**, p95 **18.5 ms**,
  approximately 60 fps on this local native Chrome/ANGLE Metal run. No STEP/WASM
  requests occurred during the preview workflow. [Metrics](../../artifacts/testing/explore-preview/hover-metrics.json).
- [Desktop live Axis-1](../../artifacts/testing/explore-preview/axis-1-hover.png)
  and [phone cards](../../artifacts/testing/explore-preview/phone-cards.png)
  visually inspected; the correct product and clean name-only layout are present.

These are **warm-hover laboratory measurements**, not guaranteed cold-network
latency or performance on every device. First entry still fetches/prepares nearby
assets and shaders; posters remain until a live preview is ready. Full-app import,
save/restore and appearance suites were not rerun as one complete release gate.
Physical phones, Safari/Firefox and human smoothness review remain manual. No
public deployment, storage reset, original-model changes or unrelated app edits.
