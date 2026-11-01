# Explore, appearance and library series — Checkpoint 1: audit and feature gaps

Status: **audit complete; stopped for review.**

**Subsequent decision record (24 October 2026):** independent source-equivalent clones approved; imports default Original under Studio lighting, curated showcase retains its palette; one shared live preview with a two-context ceiling/main-viewer pause; exact asset licensing/provenance and suitability checks required; g-clamp/phone stand excluded; fake-indexeddb approved as dev-only with real-browser storage tests; orientation Auto/Y-up/Z-up + Reset must use a reversible root transform and reliable metadata only. The questions in section 5 below are historical and answered. [Checkpoint 2 report](CHECKPOINT_2_REPORT.md) records implementation and the remaining CP3 constraints.

- No application source, style, test or configuration file was changed.
- The only new files are this document, read-only probe scripts and screenshots.
- No deployment, and no other workspace project was changed.

This series replaces the implementation sequence in the earlier [library + viewport plan](../library-viewport/CHECKPOINT_1_PLAN.md). That plan's storage design is reused below where it still fits.

Reference studied: [cadmium-exoticmushboom101.vercel.app/explore](https://cadmium-exoticmushboom101.vercel.app/explore).

- It was used only for interaction ideas.
- None of its assets, copy or code were copied into the app.
- Its screenshots are review evidence only, under `artifacts/screenshots/explore-checkpoint1/reference/`.

---

## 1. How the baseline was established

**Running app**

- The Vite dev server was already listening at `http://127.0.0.1:4326`, returning HTTP 200.
- It was used as is; nothing was restarted.

**Source read**

- [App.tsx](../../src/App.tsx): state, tools and sidebar.
- [Viewer.tsx](../../src/Viewer.tsx): the single renderer and its material layer.
- [importer.ts](../../src/loading/importer.ts), [mesh.worker.ts](../../src/loading/mesh.worker.ts) and [step.worker.js](../../public/occt/step.worker.js).
- [model.ts](../../src/model.ts), [savedViews.ts](../../src/workspace/savedViews.ts), [modelUtils.ts](../../src/workspace/modelUtils.ts) and [measure.ts](../../src/workspace/measure.ts).
- [assemblyAdapter.ts](../../src/presentation/assemblyAdapter.ts).
- The README, VERIFICATION, THIRD_PARTY and earlier checkpoint reports.

**Gates, re-run without changes**

| Gate | Result |
|---|---|
| `tsc -b` (strict) | pass |
| `vitest run src` | **22 / 22** |
| Playwright workflow groups | **9 / 9** passed (6.9 min), plus the story group run alone: **1 / 1** (1.7 min). Zero retries. The story group ran separately only because of the IDE's 10-minute command limit. Both runs used `--reporter=line`, which overrides the config's JSON reporter, so the pass counts come from console output. The per-surface axe JSON was saved and is linked in the next row. |
| axe (WCAG 2 A/AA, 2.1 AA) | **18 surfaces, 0 violations**: [15 surfaces](../../artifacts/testing/explore-checkpoint1/explore-cp1-baseline-accessibility.json) and [3 story surfaces](../../artifacts/testing/explore-checkpoint1/explore-cp1-baseline-story-accessibility.json) |
| [Baseline capture driver](../../artifacts/testing/explore-checkpoint1/capture-baseline.mjs) | **20 / 20 checks**, 0 console/page errors, **0 requests outside the app origin, blob: and data:**. See [report](../../artifacts/testing/explore-checkpoint1/baseline-report.json). |

**Targeted probes**

- [Translucent MTL](../../artifacts/testing/explore-checkpoint1/source-opacity-probe.mjs)
- [Shared source material](../../artifacts/testing/explore-checkpoint1/shared-material-probe.mjs)
- [Corrupt texture](../../artifacts/testing/explore-checkpoint1/corrupt-texture-probe.mjs)
- [Measurement / transparency recapture](../../artifacts/testing/explore-checkpoint1/recapture-measure.mjs)

**Reference probes (read-only)**

- [Pages and network](../../artifacts/testing/explore-checkpoint1/reference-probe.mjs)
- [Presets](../../artifacts/testing/explore-checkpoint1/reference-presets.mjs)
- [Appearance tab](../../artifacts/testing/explore-checkpoint1/reference-appearance.mjs)

**Fixtures**

- CAX-IF `as1-oc-214.stp`, from the occt-import-js package. Test-only; its redistribution terms are not established.
- CC0 Innerscene gearbox STEP (6.4 MB).
- CC0 Kenney Train Kit textured OBJ: one `colormap` material and a PNG. It was read from `metro-rush/…`, not copied.

> **Capture note.** Toggle buttons animate their highlight for 0.2 s. An early section screenshot showed the previous axis highlighted although state was X (`aria-pressed` was correct). All final screenshots were retaken after transitions settled. CP2 and CP3 capture scripts will wait for settled transitions.

### Measured baseline

Measured with Chrome headless and SwiftShader software GL against the dev server. Times include the upload dialog flow, so they are not production or GPU numbers.

| Measure | Value |
|---|---|
| Workspace ready (showcase, 65 parts / 127,778 tris) | 6.1 s |
| STEP import: as1 (442 KB, 18 parts) | 6.0 s |
| STEP import: CC0 gearbox (6.4 MB, 10 parts, 13,398 tris) | 6.3 s |
| 1440×900 canvas, default panels | 876 × 852 px (58 %) |
| 1280×800 canvas | 1280 × 712, with drawers (from the earlier checkpoint) |
| 390×844 canvas | 390 × 756, no horizontal overflow |
| WebGL canvases in DOM | **1**, on every surface |
| Persistence today | `localStorage`: `cadmium-theme`, `cadmium-saved-views-v1`. `sessionStorage`: panel widths. No IndexedDB database. |
| Storage | Quota ≈ 10 GB. `persisted: false` (best-effort storage). |

---

## 2. Feature checklist

### 2.1 Already implemented and verified (this run)

Evidence is either a passing gate group or an inspected screenshot.

| Area | Feature | Evidence |
|---|---|---|
| Story | Continuous scroll story; reversible transforms; manual pause/resume; same canvas into the viewer | Story group; [landing](../../artifacts/screenshots/explore-checkpoint1/01-story-landing-1440.png) |
| Rendering | **Studio / Inspect**. Camera, selection and section are preserved across the switch. Studio uses disposable per-part clones. | Baseline checks; [Studio](../../artifacts/screenshots/explore-checkpoint1/02-workspace-studio-1440.png), [Inspect](../../artifacts/screenshots/explore-checkpoint1/03-workspace-inspect-1440.png) |
| Rendering | Graphite / Light / Grid backgrounds, environment rotation, camera-only turntable; disabled under reduced motion | Earlier CP2 verifier; [Display sidebar](../../artifacts/screenshots/explore-checkpoint1/04-display-sidebar-1440.png) |
| Rendering | Solid / Wireframe / Edges shading | [Wireframe](../../artifacts/screenshots/explore-checkpoint1/05-shading-wireframe-1440.png), [Edges](../../artifacts/screenshots/explore-checkpoint1/06-shading-edges-1440.png) |
| Orientation | View cube, 7 presets with 1–7 shortcuts, perspective/orthographic, zoom, fit, focus selection, distraction-free, fullscreen | Viewer-tools group |
| Selection | Hover/click/tree selection, search, hide/isolate/show all, group isolate, repeated-name labels | Workspace and viewer-tools groups |
| Selection | Selected-component transparency in **Studio** mode | [Transparency](../../artifacts/screenshots/explore-checkpoint1/09-selected-transparency-1440.png) |
| Explosion | Authored showcase paths and automatic radial spread for imports; disabled for single meshes | [Exploded 65 %](../../artifacts/screenshots/explore-checkpoint1/07-exploded-65-1440.png); OBJ group |
| Section | Uncapped X/Y/Z clipping, position, reverse, reset; plane helper | [Section X](../../artifacts/screenshots/explore-checkpoint1/08-section-x-1440.png); measurement/section group |
| Measurement | Point-to-point distance with Δx/Δy/Δz, units, assembled-position invariant under explosion, delete/clear | [M1 = 89.02 mm](../../artifacts/screenshots/explore-checkpoint1/09b-measurement-1440.png); measurement group |
| Saved views | Camera, visibility, explosion, section and style in `localStorage`; restore, rename, overwrite, delete, dormant list; survive reload | [Saved views](../../artifacts/screenshots/explore-checkpoint1/10-saved-views-1440.png); saved-views group |
| Export | PNG at 1–4× with annotations/caption and optional transparency | Viewer-tools group |
| Import | Binary/ASCII STL | STL group |
| Import | OBJ + MTL + PNG/JPEG/WebP, including single-material OBJ | OBJ group; [Kenney Studio](../../artifacts/screenshots/explore-checkpoint1/15-obj-textured-studio-1440.png), [Kenney Inspect](../../artifacts/screenshots/explore-checkpoint1/16-obj-textured-inspect-1440.png) |
| Import | STEP/STP through the local OCCT worker, with hierarchy, names and colours retained | [as1 Studio](../../artifacts/screenshots/explore-checkpoint1/11-step-as1-studio-1440.png), [as1 source colours](../../artifacts/screenshots/explore-checkpoint1/12-step-as1-inspect-source-colours-1440.png), [CC0 gearbox](../../artifacts/screenshots/explore-checkpoint1/13-step-cc0-gearbox-inspect-1440.png) |
| Import | Limits, invalid-file error, cancel that preserves the current model, empty-state recovery | STL/cancel group |
| Import | Undecodable texture shows a visible model warning ("A local texture could not be decoded."). The earlier defect D2 is resolved. | [Probe](../../artifacts/screenshots/explore-checkpoint1/22-probe-corrupt-texture-1440.png) |
| Layout | Resizable/collapsible panels, drawers at ≤1320 px, phone drawers with no overflow | [1280](../../artifacts/screenshots/explore-checkpoint1/17-workspace-laptop-1280.png), [390](../../artifacts/screenshots/explore-checkpoint1/18-workspace-phone-390.png), [390 Display](../../artifacts/screenshots/explore-checkpoint1/19-phone-display-drawer-390.png) |
| Robustness | Reduced-motion path and WebGL-unavailable recovery | Reduced-motion group |
| Privacy | Files parsed in-tab; zero external requests | Baseline report |
| Accessibility | 18 axe surfaces with 0 violations | Accessibility JSON |

### 2.2 Implemented but incomplete

| # | Finding | Evidence | Why it matters |
|---|---|---|---|
| **G1** | **Inspect mode mutates source materials.** `styleParts()` writes `emissive`, `opacity`, `transparent`, `depthWrite`, `wireframe` and `clippingPlanes` directly onto the imported materials, which Inspect shows as-is. | [Viewer.tsx `styleParts`](../../src/Viewer.tsx) | CP2 requires "never mutate source materials". |
| G1a | Shared source materials make selection highlight and selected transparency **silently fail in Inspect**: the last part written wins. The Kenney train's 4 meshes share one material. Selecting `wheels-front` at 70 % transparency shows nothing in Inspect, but works in Studio, where each part has its own clone. | [Inspect](../../artifacts/screenshots/explore-checkpoint1/23-probe-inspect-selection-shared-material-1440.png) vs [Studio](../../artifacts/screenshots/explore-checkpoint1/24-probe-studio-selection-per-part-clone-1440.png) | Material scope and X-ray need correct per-part state. |
| G1b | Authored translucency is overwritten in **both** modes. An MTL `d 0.3` quad in front of a red quad renders opaque blue in Inspect (centre pixel `0,58,174`) and opaque grey in Studio. | [Inspect](../../artifacts/screenshots/explore-checkpoint1/21-probe-translucent-mtl-inspect.png), [Studio](../../artifacts/screenshots/explore-checkpoint1/20-probe-translucent-mtl-studio.png) | "Original" must truly mean the source appearance. |
| G2 | Studio finishes are assigned **by part index** from a 4-finish palette. Imported colours are discarded in Studio, and textured parts are forced to white albedo. There is no explicit material choice or scope. | `studioMaterial()` in Viewer.tsx | Needs an explicit Original choice and reversible overrides. |
| G3 | Saved views are bound to `modelFingerprint()`, which hashes **the display name**, part ids, triangle counts and size. Renaming or changing tessellation orphans the views; two identical-structure files can collide (earlier defect D4). | [modelUtils.ts](../../src/workspace/modelUtils.ts) | Library rename must not detach state (CP3). |
| G4 | Only the theme and saved views persist. **Imported models are lost on reload.** | [After reload](../../artifacts/screenshots/explore-checkpoint1/14-after-reload-import-lost-1440.png) | CP3 core. |
| G5 | `snapshot()` renders offscreen from the **current camera at viewport size**. There is no fixed-size, consistently framed thumbnail render. | Viewer.tsx `snapshot` | Consistent card thumbnails (CP3). |
| G6 | One built-in sample (Axis-1). The CC0 gearbox STEP exists only as an evaluation asset. There is no catalog, description or attribution UI. | THIRD_PARTY.md | Curated Explore (CP3). |
| G7 | STEP Z-up is not mapped (earlier defect D3): the gearbox stands on its rim and the as1 base plate is vertical. | [Gearbox](../../artifacts/screenshots/explore-checkpoint1/13-step-cc0-gearbox-inspect-1440.png), [as1](../../artifacts/screenshots/explore-checkpoint1/11-step-as1-studio-1440.png) | Consistent thumbnails and resumed views. |
| G8 | The importer does not report which companion files the MTL actually referenced, or the roles of extra files. | importer.ts | Accurate companion persistence (CP3). |
| G9 | README drift: it still says "8 unit tests" and "only the theme preference persists". The current reality is 22 tests and persistent saved views. | README | Documentation accuracy. |
| G10 | The production main chunk is about 968 KB raw / 354 KB gzip, mostly the 451 KB showcase geometry source. | Earlier CP2 report | Library first paint. Not blocking. |

### 2.3 Missing

| Checkpoint | Missing features |
|---|---|
| **CP2** | Matte/clay render mode; X-ray render mode; original/steel/aluminium/brass/plastic material choices; whole-model vs selected-component scope; Clean Studio / Exploded Technical / Muted X-ray / Section Inspection presets with documented effects; Restore original appearance; persisting appearance in saved views. |
| **CP3** | Explore and Your Library routes; curated, licensed sample catalog with descriptions and attribution; search, categories, favourites; sort by name / recently opened / component count; cards with consistent thumbnails; one live rotating preview on hover/focus; touch and reduced-motion alternatives; IndexedDB persistence of originals + companions + state; save-status indicator; reopening with compatible state; rename, remove, storage usage, backup, restore; storage-failure modes that keep temporary viewing. |

### 2.4 Dependent on cloud services or authentication (reference) — out of scope

Observed on the reference. On the reference, "Your workspace" (`/dashboard`) and upload both show "Sign in" walls. Its Explore page fetched community models from a hosted Supabase REST endpoint, and thumbnails came from signed storage URLs.

| Reference feature | Dependency | CADmium plan |
|---|---|---|
| Sign in / account, "Your workspace" dashboard | Auth | **Your Library is on-device, no account.** |
| Uploading models to the platform | Cloud storage | Local IndexedDB only, clearly labelled. |
| Public community models in Explore | Hosted database | Curated local samples only. |
| People, Follow, Following feed | Auth + database | Not planned. |
| "Share this view" links | Hosted state | Not planned. A local equivalent is the view state inside the backup file. |
| Model revisions | Server history | Not planned. |
| Server ZIP of originals | Cloud | Local backup ZIP (CP3). |
| Cross-device sync | Cloud | Not offered; manual backup/restore. |
| *Advertised, not verified:* IGES / BREP / PLY / 3MF / FBX / glTF upload | n/a | Not in scope; current formats unchanged. |

### 2.5 Interaction ideas observed on the reference (not evidence that they work)

- **Cards** show a category index ("01 / Assemblies"), format chip, part count, tag chips and an open affordance.
  - Hovering a card **created a live canvas: 0 → 1 canvas.** This is the "one active preview" pattern.
  - [Grid](../../artifacts/screenshots/explore-checkpoint1/reference/01-explore.png), [hover](../../artifacts/screenshots/explore-checkpoint1/reference/02-explore-card-hover.png).
- **Presets**, observed from control state:
  - *Clean studio* set explode 0 and the original material.
  - *Exploded technical* set explode 65 % and the grid.
  - *Muted X-ray* changed only the render mode.
  - *Section inspection* enabled the section.
  - The UI did not say which settings each preset changed. CADmium will.
  - [X-ray](../../artifacts/screenshots/explore-checkpoint1/reference/12-preset-muted-x-ray.png), [exploded technical](../../artifacts/screenshots/explore-checkpoint1/reference/11-preset-exploded-technical.png).
- **Appearance**
  - Render modes: Realistic / Matte-clay / Wireframe / X-ray / Edges overlay.
  - Material swatches: original / steel / aluminium / brass / plastic / carbon.
  - Brass applied to the **whole model only**; no per-component scope was found.
  - [Brass](../../artifacts/screenshots/explore-checkpoint1/reference/20-appearance-brass.png).
- **Model page:** structure tree with frame/isolate/hide per row, bottom tool bar, view cube, dimensions card.
  - CADmium already has the equivalents.
  - [Model page](../../artifacts/screenshots/explore-checkpoint1/reference/03b-model-page-settled.png).
- **Licensing:** reference samples are labelled "CADmium originals · CC0" and served as GLB. Not copied: CADmium samples come from sources whose licences are verified independently.

---

## 3. Reusable components

| Kind | Component | Reuse in CP2 / CP3 |
|---|---|---|
| State | `ViewOptions` (Viewer.tsx): the single presentation/inspection options object, set via `option()` and `setOptions` in App | Extend with `appearance`; presets become pure transforms of this object. |
| State | `SavedView` / `CameraState` / `SectionState` ([savedViews.ts](../../src/workspace/savedViews.ts)) | Additive optional `appearance` and `modelKey` fields; the version 1 validator still accepts old views. |
| State | `Measurement` with part-local points and assembled positions ([measure.ts](../../src/workspace/measure.ts)) | Already serialisable. Persist as-is with stable part keys. |
| State | `buildTree` / `componentLabels` / `searchComponents` ([modelUtils.ts](../../src/workspace/modelUtils.ts)) | Library search over part names; stable part keys from hierarchy path + source name + ordinal. |
| State | `normalizeAssembly` (deterministic occurrence ids, hierarchy paths) ([assemblyAdapter.ts](../../src/presentation/assemblyAdapter.ts)) | Source of persistent `PartKey`s. |
| Rendering | Single `WebGLRenderer`, render-on-demand loop, PMREM studio environment, fitted key/rim/fill and shadow ([Viewer.tsx](../../src/Viewer.tsx), [studio.ts](../../src/presentation/studio.ts)) | All new modes; thumbnail rendering. |
| Rendering | `sourceMaterials` / `studioMaterials` maps and per-part `EdgesGeometry` lines (29°) | Generalise into a display-material layer. Edges are reused for X-ray and clay. |
| Rendering | `styleParts()`: the single place display materials are assigned | The one integration point for the new layer. |
| Rendering | `snapshot()`: offscreen `WebGLRenderTarget`, MSAA, `readRenderTargetPixels` | Basis of a fixed-size `thumbnail()`. |
| Rendering | `ExplosionController`, `StoryCameraController`, `cameraState` / `restoreCamera` | Exploded Technical preset; resume camera. |
| Import | `startImport(files, units, quality, progress)` returning a cancelable `Model` | **Unchanged entry point for reopening**: rebuild `File` objects from stored blobs. |
| Import | STL/OBJ module worker; classic OCCT STEP worker | Unchanged. Optional geometry cache for fast previews. |
| Import | Local-only MTL texture resolution by basename; external URLs refused | Persist each texture's `referencedAs` so resolution is identical on reopen. |
| Storage | `loadViews` / `storeViews` / `viewsPersist` (localStorage with memory fallback) | Keep for views; same fallback pattern for the session-only library mode. |
| Storage | `three/examples/jsm/libs/fflate.module.js` (already installed with three 0.180) | Backup/restore ZIP with **no new runtime dependency**. |
| UI | `Dialog`, `IconButton`, `choice()` segmented groups, sidebar sections, toast region, drawers | Appearance controls, library dialogs, save status. |
| Test | `window.cadmiumInspect()` hook: materials (uuid/type/color/map), parts, camera, section | Extend with appearance state and a source-material snapshot for immutability checks. |

---

## 4. Proposed smallest coherent additions

### CP2 — Presentation presets and richer appearance (extends the renderer)

**New `src/presentation/appearance.ts`: the display-material layer**

- **Source handling.** The layer never assigns a source material for rendering. Every rendered material is a per-part display clone. This fixes G1, G1a and G1b.
  - *Original* = `source.clone()`, keeping colour, maps, vertex colours, opacity and transparency.
  - Textures are shared by reference and never disposed by the layer.
- **Render styles**
  - Existing: Solid, Wireframe, Edges.
  - Clay: neutral matte, no maps, edges at low opacity. Labelled "textures hidden".
  - X-ray: low-opacity, depth-write off, double-sided, with stronger edges. The selected part stays solid. Labelled "**see-through visualisation — geometry is not cut**".
  - Section keeps its own "**clipping plane — cuts the view**" label. The two can be combined.
- **Material choices:** *Mode default* (today's Studio palette or Inspect source) / *Original* / Steel / Aluminium / Brass / Plastic.
  - Scope is **Whole model** or **Selected component**: a model-level choice plus a `partId → choice` override map.
  - Tree rows and Properties show an override marker.
- **Selection, hover, transparency, wireframe and clipping** are applied only to clones.
- **Lifecycle.** Clones are cached lazily by `part|mode|style|material`. They are disposed on model replacement and unmount.

**New `src/presentation/presets.ts`**

- A pure function `applyPreset(options, id)` returns `{ next, changed[] }`.
- Each preset lists the settings it changes in its description and in its confirmation toast.
- **None change** camera, selection, hidden parts, measurements, saved views or units.

| Preset | Changes | Leaves untouched |
|---|---|---|
| Clean Studio | mode=Studio, style=Solid, material=Mode default (overrides kept), explode=0, section off, grid/axes off | Background, camera, selection, measurements, visibility |
| Exploded Technical | mode=Inspect, style=Edges, explode=65 % (authored paths for the showcase), grid on, section off | Camera (press F to fit), selection, measurements |
| Muted X-ray | style=X-ray, background=Graphite, explode=0 | Mode, section, camera, selection, measurements |
| Section Inspection | mode=Inspect, style=Solid, section on (keeps axis/position), explode=0 | Camera, selection, measurements |

**Restore original appearance**

- Clears model and part material overrides, and sets style=Solid and transparency=0.
- Does **not** change mode, camera, selection, section, explosion or measurements.

**UI and saved views**

- The Display sidebar gains, at the top: Presets, Render style (5), Material swatches + scope, and Restore.
- Saved views gain an optional `appearance` field.

**Verification**

- Unit tests:
  - preset changed/untouched keys;
  - source-material property snapshot identical after every mode × style × material × scope permutation;
  - shared-material selection isolation;
  - translucency preserved.
- Browser screenshots:
  - each style and material on the showcase, as1 STEP, CC0 gearbox and Kenney textured OBJ;
  - X-ray ordering on nested parts;
  - edge readability on Light and Graphite;
  - translucent MTL probe;
  - Restore returning source-equal material properties and pixels.

### CP3 — Explore and Your Library (reuses the viewer)

**Routes (hash)**

- `/` story (unchanged)
- `#/explore`
- `#/library`
- `#/s/<slug>` sample
- `#/m/<id>` saved model
- `#viewer`: kept, and opens the current model so existing links and tests still work

**Catalog:** `src/library/catalog.ts` plus `public/samples/<slug>/`

- Each entry has a manifest: title, description, category, format, component count, licence, attribution, source URL, download date, SHA-256 and bytes.
- Licence text goes in THIRD_PARTY.
- Candidates, each licence re-verified at download:

| Sample | Status |
|---|---|
| Axis-1 | Existing: CC0 core + project-authored parts |
| Innerscene three-planet 4:1 gearbox | CC0, already local |
| Innerscene bevel gearbox, worm reduction gearbox, inline helical gearbox, N20 gearbox, scissor lift table | CC0 per the library's stated terms; each page to be checked; must fit under the 40 MB limit |
| Kenney Train Kit OBJ + MTL + PNG | CC0; the textured-format example |
| CAX-IF fixtures | Stay test-only |
| Your g-clamp / phone stand projects | Only if you approve |

**Storage: `src/library/db.ts` (IndexedDB) and `repository.ts`**

- Stores: `models`, `blobs` (content-addressed by SHA-256), `states`, `thumbnails`.
- One atomic save transaction.
- Typed failures: `unavailable`, `quota`, `blocked`, `corrupt`. Every failure keeps the open model in the session with a clear message.
- Save status pill: Not saved / Saving… / Saved · time / Save failed — retry / On this device only (session).
- Storage meter combines `navigator.storage.estimate()` and library byte totals.
- Rename uses a separate display name, so state is unaffected (fixes G3 via a library `modelKey`).
- Remove has undo.
- Backup and restore use an fflate ZIP containing the manifest, original blobs and state. Restore validates and deduplicates by hash.

**Reopen**

- Stored blobs become `File` objects again and go through the existing `startImport`, so the identical pipeline and limits apply.
- Stored state is mapped by `PartKey`, with a compatibility report. Missing parts are flagged, never silently dropped.

**Cards**

- Consistent thumbnails come from a new fixed-size `thumbnail()` render on the existing renderer: iso view, Studio, graphite, 640×480 WebP/PNG.
- Live preview: a single `PreviewController` with **one** lazily created small renderer, moved into the hovered or focused card.
  - It loads a stored compact geometry cache, so there is no STEP re-tessellation on hover.
  - It disposes geometry, materials and textures on leave, which is verified with `renderer.info.memory`.
- Touch: tap shows a "Preview" control; no hover autoplay.
- Reduced motion: static poster with manual ←/→ stepping.

**Verification**

- Real STEP and textured Kenney OBJ: save → full reload → reopen, with part count, texture map and restored state checked.
- Preview cleanup after cycling through many cards.
- Injected failures — quota error, IndexedDB missing, corrupt record — each leaving temporary viewing intact.

---

## 5. Decisions needed at review

1. **Inspect materials.** Switching Inspect from source material *objects* to faithful *clones* is needed to meet "never mutate source materials" and to fix G1a/G1b. The earlier checkpoint's "same source UUID" assertion would be replaced by "source material properties unchanged". Approve?
2. **Meaning of Original in Studio.** Recommended: keep today's Studio palette as *Mode default*, and make *Original* show the file's own colours and textures under Studio lighting. Alternative: make Original the Studio default for imports.
3. **Live preview.** Recommended: one shared live preview renderer, so at most two WebGL contexts exist while browsing. Alternative: pre-rendered turntable frames with zero extra contexts, which rotate but are not live 3D.
4. **Samples.** Confirm the CC0 Innerscene set plus the Kenney textured OBJ. Should your own g-clamp and phone-stand projects be included?
5. **Tests.** Add `fake-indexeddb` as a dev-only dependency for repository unit tests, or keep storage tests in real Chrome only?
6. **STEP orientation (G7).** Add a per-model Y-up / Z-up setting in CP3 so thumbnails and resumed views are consistent? The default would stay as today unless you prefer Z-up for STEP.

## 6. Screenshot index

**Local baseline**

- [01 story](../../artifacts/screenshots/explore-checkpoint1/01-story-landing-1440.png)
- [02 Studio](../../artifacts/screenshots/explore-checkpoint1/02-workspace-studio-1440.png)
- [03 Inspect](../../artifacts/screenshots/explore-checkpoint1/03-workspace-inspect-1440.png)
- [04 Display](../../artifacts/screenshots/explore-checkpoint1/04-display-sidebar-1440.png)
- [05 wireframe](../../artifacts/screenshots/explore-checkpoint1/05-shading-wireframe-1440.png)
- [06 edges](../../artifacts/screenshots/explore-checkpoint1/06-shading-edges-1440.png)
- [07 exploded](../../artifacts/screenshots/explore-checkpoint1/07-exploded-65-1440.png)
- [08 section](../../artifacts/screenshots/explore-checkpoint1/08-section-x-1440.png)
- [09 transparency](../../artifacts/screenshots/explore-checkpoint1/09-selected-transparency-1440.png)
- [09b measurement](../../artifacts/screenshots/explore-checkpoint1/09b-measurement-1440.png)
- [10 saved views](../../artifacts/screenshots/explore-checkpoint1/10-saved-views-1440.png)
- [11 as1 Studio](../../artifacts/screenshots/explore-checkpoint1/11-step-as1-studio-1440.png)
- [12 as1 Inspect](../../artifacts/screenshots/explore-checkpoint1/12-step-as1-inspect-source-colours-1440.png)
- [13 CC0 gearbox](../../artifacts/screenshots/explore-checkpoint1/13-step-cc0-gearbox-inspect-1440.png)
- [14 after reload](../../artifacts/screenshots/explore-checkpoint1/14-after-reload-import-lost-1440.png)
- [15 OBJ Studio](../../artifacts/screenshots/explore-checkpoint1/15-obj-textured-studio-1440.png)
- [16 OBJ Inspect](../../artifacts/screenshots/explore-checkpoint1/16-obj-textured-inspect-1440.png)
- [17 laptop](../../artifacts/screenshots/explore-checkpoint1/17-workspace-laptop-1280.png)
- [18 phone](../../artifacts/screenshots/explore-checkpoint1/18-workspace-phone-390.png)
- [19 phone Display](../../artifacts/screenshots/explore-checkpoint1/19-phone-display-drawer-390.png)

**Defect probes**

- [20 translucent MTL, Studio](../../artifacts/screenshots/explore-checkpoint1/20-probe-translucent-mtl-studio.png)
- [21 translucent MTL, Inspect](../../artifacts/screenshots/explore-checkpoint1/21-probe-translucent-mtl-inspect.png)
- [22 corrupt texture](../../artifacts/screenshots/explore-checkpoint1/22-probe-corrupt-texture-1440.png)
- [23 shared material, Inspect](../../artifacts/screenshots/explore-checkpoint1/23-probe-inspect-selection-shared-material-1440.png)
- [24 per-part clone, Studio](../../artifacts/screenshots/explore-checkpoint1/24-probe-studio-selection-per-part-clone-1440.png)

**Reference (review evidence only):** [folder](../../artifacts/screenshots/explore-checkpoint1/reference/)
