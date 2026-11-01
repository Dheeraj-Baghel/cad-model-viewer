# Checkpoint 2 — appearance, source safeguards and presentation presets

**Status: completed; stopped for review.** This is Checkpoint 2 of the Explore / appearance / personal-library series, not the earlier viewport series.

The normal dev app remains at [localhost:4326](http://127.0.0.1:4326/#viewer). Verification used an additional production preview at [localhost:4340](http://127.0.0.1:4340/#viewer), without stopping the existing server. No deployment, cloud services or unrelated application changes.

## Delivered

### Source-safe Original appearance

- Every rendered component now has independent display materials, including in **Inspect**. The source material objects are never used as writable display state.
- **Original** clones the native source material type and preserves colors, color/normal/alpha maps, vertex colors, opacity, transparency, sidedness, physical/Phong properties, blending/depth/stencil properties and shader hooks.
- Studio and Inspect have **separate material policies**. A Studio Brass override cannot leak into Inspect. Explicit overrides chosen while in Inspect remain that mode's deliberate choice until Restore.
- Shared textures remain shared by reference. The appearance layer never changes texture sampling, pixel data or texture ownership, and never disposes textures. Material clones and their baseline snapshots are disposed on model replacement/unmount; original references are restored before the existing model disposer releases source assets.
- Selection, hover, wireframe, display transparency and clipping affect clones only. Source alpha is multiplied by the display transparency factor rather than overwritten.
- Fixes both audited defects: shared-MTL selection/transparency now works on just the selected component; an MTL `d 0.3` front surface remains translucent in both lighting modes.
- Rendering-property equivalence and source immutability replace the previous source-object-UUID requirement. Identity is no longer the acceptance criterion.

### Defaults, controls and scope

- **Imported models:** Original materials under Studio lighting immediately after import, regardless of the previous model's finish/style.
- **Curated Axis-1 showcase:** retains the existing authored Studio palette; Inspect initially uses Original.
- Materials: **Original, Steel, Aluminum, Brass, Plastic**. The showcase additionally offers **Curated palette**.
- Scope: **Whole model** or **Selected component**. Whole-model actions clear component overrides only in the current lighting mode. Selection scope is disabled when no component is selected.
- Lighting and materials are labelled separately in the existing Display sidebar. No floating options bar or second renderer was introduced.
- Explicit finish overrides hide albedo textures/vertex colors; Original restores them. Shape-detail/alpha maps are retained where appropriate. Material options remain remembered while switching to clay/X-ray and back.

### Render styles

Existing **Solid / Wireframe / Edges** remain. Added:

- **Matte / clay:** neutral rough non-metallic shape reading, without albedo textures.
- **X-ray:** low-opacity, double-sided see-through bodies, depth-write off and readable feature edges. Selected components use solid/source-or-finish shading. Floor/contact shadows are hidden in this visualization.
- X-ray is explicitly labelled **visualization, not sectioning**. It does not remove geometry. Existing uncapped X/Y/Z mesh clipping remains a separate control and can be combined with X-ray.

### Four documented presets

Each button has its exact change description, the visible **What presets change** disclosure explains all four, and a toast explains an applied preset. Presets are pure option patches, never camera commands.

| Preset | Explicit changes |
|---|---|
| **Clean Studio** | Studio lighting, Solid, explode 0, section/grid/axes off. Keeps materials and background. |
| **Exploded Technical** | Inspect lighting, Edges, explode 65%, grid/axes on, section off. Single meshes stay at explode 0. |
| **Muted X-ray** | X-ray style, Graphite background, explode 0. Keeps lighting and the current clipping plane. UI theme is independent of canvas background. |
| **Section Inspection** | Inspect lighting, Solid, section on, explode 0. Keeps plane axis, position and direction. |

All keep camera/projection, selection, visibility, units, existing measurements, named views, environment rotation and material policies. Existing Inspect's engineering grid/axes policy still applies when that lighting mode is chosen. **Fit (F) is an explicit, separate action**, so the Exploded Technical preset does not silently zoom the camera.

**Restore original appearance** clears both lighting modes' material overrides, sets Solid and resets selected display transparency to 0%. It preserves source translucency and keeps camera, selection, visibility, lighting, clipping, explosion and measurements.

### Saved views

- Optional appearance, lighting and selected-transparency fields were added to the existing v1 view format.
- Existing v1 views and the existing storage key remain readable and intact. Their absent appearance fields do not change the current material choice.
- New named views persist both modes' material policies, including per-component overrides. A real STEP view was saved, the page reloaded, the STEP re-imported, and the Brass policy restored successfully.
- **This is not model-file persistence yet.** Imported bytes still disappear on reload; saved views remain fingerprint-bound. Persistent files, stable model identity and automatic per-model resume are Checkpoint 3.

## Browser evidence

Actual production Chrome, real OCCT STEP tessellation and real OBJ/MTL/PNG parsing; no mocked renderer or parser.

- [Clay](../../artifacts/screenshots/explore-checkpoint2/03-clay.png)
- [X-ray, showcase](../../artifacts/screenshots/explore-checkpoint2/04-xray.png)
- [STEP Brass](../../artifacts/screenshots/explore-checkpoint2/08-step-brass.png)
- [STEP source edges on Light](../../artifacts/screenshots/explore-checkpoint2/09-step-original-edges-light.png)
- [Gearbox X-ray, isometric](../../artifacts/screenshots/explore-checkpoint2/10-gearbox-xray.png)
- [Gearbox X-ray, side](../../artifacts/screenshots/explore-checkpoint2/11-gearbox-xray-right.png)
- [Imported OBJ: Original immediately](../../artifacts/screenshots/explore-checkpoint2/12-obj-original-immediate.png)
- [Fixed Inspect selected transparency](../../artifacts/screenshots/explore-checkpoint2/13-obj-inspect-selected-alpha.png)
- [Selected-component Brass override](../../artifacts/screenshots/explore-checkpoint2/14-obj-selected-brass.png)
- [Original OBJ restored](../../artifacts/screenshots/explore-checkpoint2/15-obj-original-restored.png)
- [Authored MTL translucency, Studio](../../artifacts/screenshots/explore-checkpoint2/18-translucent-original-studio.png)
- [Authored MTL translucency, Inspect](../../artifacts/screenshots/explore-checkpoint2/19-translucent-original-inspect.png)
- [Phone Display drawer](../../artifacts/screenshots/explore-checkpoint2/20-phone-appearance.png)
- [Clean Studio](../../artifacts/screenshots/explore-checkpoint2/22-preset-clean-studio.png)
- [Exploded Technical](../../artifacts/screenshots/explore-checkpoint2/23-preset-exploded-technical.png)
- [Muted X-ray](../../artifacts/screenshots/explore-checkpoint2/24-preset-muted-xray.png)
- [Section Inspection](../../artifacts/screenshots/explore-checkpoint2/25-preset-section-inspection.png)

29 images were captured. Key final images were inspected in the IDE. Dense overlapping bodies in X-ray accumulate opacity, while the two-view gearbox inspection confirms visible interior geometry and non-writing translucent layers.

## Verification

| Gate | Result |
|---|---|
| Strict TypeScript and Vite production build | pass |
| Unit tests | **42/42**: 19 appearance/preset, 10 workspace/persistence, 13 existing geometry/story |
| New actual-browser workflows | **4/4**, final split runs [A](../../artifacts/testing/explore-checkpoint2-final-a-results.json) and [B](../../artifacts/testing/explore-checkpoint2-final-b-results.json) |
| Existing browser regressions | **10/10 individual workflows passed across split runs**: [8 passing in the initial regression run](../../artifacts/testing/explore-checkpoint2-regression-results.json) and [story + full tools/export confirming run](../../artifacts/testing/explore-checkpoint2-story-tools-results.json) |
| Accessibility | **22 unique axe WCAG A/AA surfaces, 0 violations**, aggregated in [summary](../../artifacts/testing/explore-checkpoint2/summary.json) |
| Source safety | Repeated source-property equivalence in-browser; 5-round style × finish permutations in units; original geometry unchanged; no source-material or shared-texture disposal by the display layer |
| Textured OBJ round-trip | **1,024 sampled canvas pixels / 4,096 RGBA bytes restored exactly** after overrides and mode switches. [Record](../../artifacts/testing/explore-checkpoint2/textured-obj-roundtrip.json) |
| MTL translucency | Red behind the 30%-opaque blue front really shows through; Inspect pixel `[120,47,74,255]` returns exactly after an override/Restore. [Record](../../artifacts/testing/explore-checkpoint2/translucency-pixels.json) |
| Privacy | OBJ test asserts no requests outside the app origin/blob/data; normal-path console/page-error assertions pass |

### Test-run limitations, disclosed

These are **successful split workflow runs**, not a single clean monolithic run.

- Initial new tests exposed two driver mistakes: toggling an already-open Display sidebar closed, and expecting the readiness label in a closed phone drawer to be visible. Drivers were corrected, not app behavior.
- Expanded screenshot recaptures exceeded per-test/time budgets on subsequent runs. The earlier [first](../../artifacts/testing/explore-checkpoint2/first-run-results.json) and [second](../../artifacts/testing/explore-checkpoint2/second-run-results.json) reports are retained. A later combined capture rerun hit the IDE's 10-minute shell limit before producing its final JSON report; it is **not** claimed as passing.
- The final A/B runs used `QA_CAPTURE=0` to avoid repeatedly rendering the already-captured screenshots. **All behavior, source-equivalence, pixel comparison, persistence and axe assertions remained enabled.** The earlier successful A/B capture runs supply the reviewed images.
- The existing tools/export regression finished beyond its original 120-second limit. Its complete confirming run passed with a 240-second capture budget; no checks were removed.
- Automatic Playwright retries remained **0** throughout. No sustained performance or physical-device claim follows from these timings.

The final two appearance runs verify the latest production build. The existing regressions verify the same rendering/interaction behavior before the last diagnostic-only UV-sampling snapshot improvement. That improvement is independently unit-tested and does not alter rendering.

## Source changes

- [appearance.ts](../../src/presentation/appearance.ts): immutable sources, display material lifecycle, independent mode policies, equivalence evidence.
- [presets.ts](../../src/presentation/presets.ts): documented pure patches and Restore.
- [Viewer.tsx](../../src/Viewer.tsx): existing renderer integration, edges/X-ray, source safety diagnostics.
- [App.tsx](../../src/App.tsx): defaults, scoped choices, sidebar controls, saved view fields.
- [savedViews.ts](../../src/workspace/savedViews.ts): additive appearance types.
- [workspace.css](../../src/workspace.css): sidebar preset/material controls.
- [appearance.test.ts](../../src/presentation/appearance.test.ts), [workspace.test.ts](../../src/workspace.test.ts), [appearance.spec.ts](../../tests/appearance.spec.ts): safeguards and actual-browser coverage.
- [playwright.config.ts](../../playwright.config.ts), [viewer.spec.ts](../../tests/viewer.spec.ts): optional production base URL and screenshot/export time budget.

No import worker, importer, source geometry, vendored asset or dependency was changed.

## Remaining work / accepted Checkpoint 3 constraints

No functional CP2 blocker was found. Remaining capability boundaries:

- X-ray uses Three.js object-depth-sorted alpha plus an edge overlay, **not order-independent per-triangle transparency**. Complex intersecting meshes may show blending ambiguity/dense edges; this is not exact radiographic visualization.
- Sections remain uncapped tessellated mesh clipping; no exact B-rep metrology was added.
- Safari/Firefox, physical touch, screen readers and sustained low-power GPU performance are unverified.
- Existing large main bundle remains approximately **978 KB raw / 357 KB gzip**; it emits a chunk-size warning.

Approved next-checkpoint requirements, preserved without prematurely implementing CP3:

1. **One shared live card preview**, static thumbnails elsewhere. Hover/focus and explicit touch action; reduced-motion alternative. Pause the main viewer when browsing. Two graphics contexts is a ceiling, not a minimum. Verify rapid switching/cancellation/resource release.
2. **Exact asset licensing/provenance** before inclusion: verify asset URLs, redistribution rights, attribution, hashes, component separation, textures, scale and loading performance. No reference assets were copied. The Kenney/STEP files in CP2 are test inputs only, not new bundled samples.
3. **Exclude the user's g-clamp and phone stand** from the public/bundled collection. They can be privately imported later.
4. **fake-indexeddb dev dependency** is approved for CP3 storage logic/migration/duplicate-filename/error tests; it is not installed by this appearance-only checkpoint. Keep real-browser reload/binary/texture persistence tests as well.
5. **Orientation Auto / Y-up / Z-up + Reset** in CP3. Auto trusts reliable format/importer metadata only; otherwise preserves the original orientation. One reversible assembly-root transform, no geometry rewriting or independent component rotations. Preserve relative placements and consistent bounds, measurements, sectioning, camera presets and exports; persist the orientation with the library record.
6. IndexedDB originals/companions, accurate save status, local-only labeling, temporary viewing on save failure, compatible state resume, search/category/favorite/sort, rename/remove/storage/backup/restore remain CP3. No authentication is required for local inspection.

Stopped here for Checkpoint 2 review; Explore/library and orientation were not silently bundled into this change.
