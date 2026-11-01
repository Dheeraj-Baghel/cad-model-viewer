# Library + viewport upgrade — Checkpoint 1: inspection and plan

Status: **inspection complete, plan proposed, nothing implemented.** No application source, test or style file was changed. This is a separate series from the earlier story checkpoints in [../CHECKPOINT_1_PLAN.md](../CHECKPOINT_1_PLAN.md).

Target experience: **Library → choose a sample or import → inspect → save → resume later.**

Priorities (from the brief, in order): premium model rendering · curated samples + persistent personal library · model cards with interactive rotating previews · a spacious, intuitive viewport · saved inspection state and useful engineering tools.

---

## 1. How the baseline was established

- Read [README](../../README.md), [BRAND](../../BRAND.md), [VERIFICATION](../../VERIFICATION.md), [THIRD_PARTY](../../THIRD_PARTY.md), [presentation architecture](../PRESENTATION_ARCHITECTURE.md), [package.json](../../package.json), and the workspace `PROJECT_CONTEXT.md` section for this app.
- Read the owners: [App.tsx](../../src/App.tsx), [Viewer.tsx](../../src/Viewer.tsx), [model.ts](../../src/model.ts), [importer.ts](../../src/loading/importer.ts), [mesh.worker.ts](../../src/loading/mesh.worker.ts), [step.worker.js](../../public/occt/step.worker.js), [savedViews.ts](../../src/workspace/savedViews.ts), [modelUtils.ts](../../src/workspace/modelUtils.ts), [measure.ts](../../src/workspace/measure.ts), [assemblyAdapter.ts](../../src/presentation/assemblyAdapter.ts).
- Nothing was listening on :4326, so I started `npm run dev` (Vite 6.4.4, `127.0.0.1:4326`, strict port). HTML 200 with the CADmium title; `/occt/occt-import-js.wasm` 200 (7,604,031 bytes).
- Strict `tsc -b`: **pass.** `vitest run src`: **22/22 pass** (13 model + 9 workspace).
- Existing browser gate, re-run unchanged (`QA_ROUND=library-cp1-baseline`): **5/10 pass, 5 fail.** Details in §3.
- Baseline capture scripts are in [artifacts/testing/library-checkpoint1](../../artifacts/testing/library-checkpoint1/). They are read-only drivers of the running app: 21 surfaces, **zero console or page errors**, plus a measured layout and storage report in [baseline-report.json](../../artifacts/testing/library-checkpoint1/baseline-report.json).

### Baseline screenshots ([folder](../../artifacts/screenshots/library-checkpoint1/))

| # | Surface | What it shows |
|---|---|---|
| 01 | [Home hero 1440](../../artifacts/screenshots/library-checkpoint1/01-home-hero-1440.png) | Story landing, Axis-1 assembled |
| 02 | [35%](../../artifacts/screenshots/library-checkpoint1/02-home-scroll-35-1440.png) · [70%](../../artifacts/screenshots/library-checkpoint1/02-home-scroll-70-1440.png) · [100%](../../artifacts/screenshots/library-checkpoint1/02-home-scroll-100-1440.png) | Story progression |
| 03 | [Workspace 1440](../../artifacts/screenshots/library-checkpoint1/03-viewer-showcase-1440.png) | Tree, properties, toolbar, tool dock, view cube |
| 04 | [Panels collapsed](../../artifacts/screenshots/library-checkpoint1/04-viewer-panels-collapsed-1440.png) | Largest viewport available today |
| 05 | [Display + explode](../../artifacts/screenshots/library-checkpoint1/05-viewer-display-exploded-1440.png) | Authored disassembly at 70% |
| 06 | [Section](../../artifacts/screenshots/library-checkpoint1/06-viewer-section-1440.png) | Uncapped Y clip |
| 07 | [Saved views](../../artifacts/screenshots/library-checkpoint1/07-viewer-saved-views-1440.png) | Fingerprint-bound named views |
| 08 | [Empty state](../../artifacts/screenshots/library-checkpoint1/08-viewer-empty-state-1440.png) | Upload or one sample, no library |
| 09 | [Import dialog](../../artifacts/screenshots/library-checkpoint1/09-import-dialog-1440.png) | Units, tessellation, local notice |
| 10 | [STEP as1-oc-214](../../artifacts/screenshots/library-checkpoint1/10-step-import-as1-1440.png) | Real OCCT tessellation, 18 parts |
| 12 | [After reload](../../artifacts/screenshots/library-checkpoint1/12-after-reload-model-lost-1440.png) | Imported model is gone |
| 13a/b | [OBJ single material, valid PNG](../../artifacts/screenshots/library-checkpoint1/13a-obj-mtl-valid-texture-1440.png) · [corrupt PNG](../../artifacts/screenshots/library-checkpoint1/13b-obj-mtl-corrupt-texture-1440.png) | **Mesh invisible** (defect D1) |
| 13c/d | [OBJ two materials, valid](../../artifacts/screenshots/library-checkpoint1/13c-obj-two-material-valid-texture-1440.png) · [corrupt](../../artifacts/screenshots/library-checkpoint1/13d-obj-two-material-corrupt-texture-1440.png) | Texture works; corrupt texture renders black, no warning |
| 14 | [ASCII STL](../../artifacts/screenshots/library-checkpoint1/14-stl-ascii-1440.png) | One mesh, user-supplied units |
| 15 | [1280×720](../../artifacts/screenshots/library-checkpoint1/15-viewer-laptop-1280.png) · [1024×768](../../artifacts/screenshots/library-checkpoint1/15-viewer-tablet-1024.png) | Laptop panels / tablet drawers |
| 16–18 | [Phone home](../../artifacts/screenshots/library-checkpoint1/16-home-hero-390.png) · [phone workspace](../../artifacts/screenshots/library-checkpoint1/17-viewer-390.png) · [tree drawer](../../artifacts/screenshots/library-checkpoint1/18-viewer-tree-drawer-390.png) | 390×844 |
| 19 | [CC0 gearbox STEP, Balanced](../../artifacts/screenshots/library-checkpoint1/19-real-step-gearbox-balanced-1440.png) · [Fine](../../artifacts/screenshots/library-checkpoint1/19-real-step-gearbox-fine-1440.png) | Same source as the showcase core, through the user import path |

### Measured numbers

| Measure | Value |
|---|---|
| Workspace ready (showcase, dev server) | 1.9 s |
| STEP import as1-oc-214 (442 KB, 18 parts) | 0.8 s |
| STEP import CC0 gearbox (6.4 MB, 10 parts) | 5.0 s Balanced (13,398 tris) / 4.4 s Fine (14,690 tris) |
| Unobstructed viewport, 1440×900, default | 876×814 px = **55 %** of window |
| Unobstructed viewport, 1280×720, default | 716×634 px = **49 %** |
| 1440×900 with both panels collapsed | 90 %, but the tool dock + toolbar (560×157 px) still sit over the lower centre |
| Phone 390×844 | Canvas 390×748; dock + toolbar cover the bottom 193 px (~26 % of canvas) |
| Browser storage (Chrome, this origin) | IndexedDB Blob writes OK, OPFS OK, Web Locks, BroadcastChannel, `crypto.subtle`; quota ≈10 GB; **not persisted** by default |
| Existing persistence | `localStorage`: `cadmium-theme`, `cadmium-saved-views-v1` (475 B for 1 view). `sessionStorage`: panel widths |
| Production bundle (last build) | main 961 KB / **347 KB gzip** (includes the 451 KB showcase geometry source), three 531 KB / 135 KB gzip, mesh worker 136 KB |

---

## 2. Current architecture (what must be preserved)

- **One renderer.** `Viewer.tsx` owns the only `WebGLRenderer`, scene, camera pair, `OrbitControls`, render-on-demand loop, raycaster, clipping, measurements, PNG snapshot and disposal. The landing and the workspace share one canvas. This invariant stays; library previews must not create a WebGL context per card.
- **Import.** `startImport(files, units, quality)` reads the bytes, then runs the mesh worker (STL/OBJ via three loaders) or the classic STEP worker (occt-import-js 0.0.23, mm output, bbox-ratio 0.002/0.0005, angular 0.35). Terminating the worker is how cancel works. Limits: 40 MB combined, 800k tris, 200 meshes, 2 min. MTL textures resolve only to local blob URLs, never fetched. It builds a `Model` with `Part.id = import-<meshIndex>`, `origin` (centered), `hierarchy` (OCCT `root` / OBJ groups), metadata and warnings.
- **Engineering vs presentation state.** Measurements store points in part-local frames and use assembled transforms, so explosion never changes a number. `ExplosionController` reconstructs poses from progress with no drift.
- **Saved views.** Each view stores camera, hidden ids, explode, section and style, bound to `modelFingerprint()`. That is an FNV hash of name, part names, triangle counts and rounded size. It is a **structural, not content, identity**.
- **Session lifetime.** Imported files exist only in memory. Reload or "Back to story" discards them (`closeViewer()` swaps the showcase back in).

## 3. Findings that shape the plan

### Gate and correctness defects found during baseline (fix before new features)

- **D1 — OBJ with exactly one material is invisible.** `OBJLoader` returns a single material and zero geometry groups. The importer always builds a material *array* and adds no groups, so three.js draws nothing. Reproduced in 13a/13b. The two-material control (13c) renders correctly. The saved round-2 `obj-mtl-texture.png` evidence also shows an empty viewport, so this predates current work. Single-material OBJs are common: every Kenney CC0 OBJ uses one `colormap` material.
- **D2 — corrupt textures fail silently.** They render black with only a WebGL console error (`texSubImage2D: bad image data`). No model warning is shown.
- **D3 — STEP Z-up is not handled.** The gearbox stands on its rim (bounds 108 × 108 × 31.5, with Y used as up), while the showcase maps STEP (x,y,z)→(x,z,−y).
- **D4 — fingerprint identity is fragile.** Renaming the file, or switching Balanced↔Fine, changes the fingerprint (gearbox `file-1adlg0w` vs `file-14huqmb`), so saved views orphan. Two different files with the same structure could collide.
- **D5 — browser gate is no longer green (current source):**
  - 3 tests are stale against today's UI: `'Front'` is now named "Front 2" because of the shortcut `kbd`; the explode slider only mounts inside the Display tool; `.hierarchy-name` no longer exists.
  - The mobile header **Upload button has no accessible name**. Its label span is hidden; this is a real a11y defect, and it fails the phone test.
  - axe now reports `aria-required-children` on the `role="tree"`, plus `color-contrast` on several labels (light theme active tool/primary button, tree counts, some tree rows). This is a real regression versus the README's "zero violations" claim.
  - Passing: story, STL/cancel/recovery, reduced-motion/WebGL failure, workspace tree/search, saved views, and measurement logic (that last test then fails only on the axe aggregation). Evidence: [log](../../artifacts/testing/library-checkpoint1/browser-baseline.log), [axe](../../artifacts/testing/library-checkpoint1/browser-baseline-axe/).
- **Docs drift.** The README says 8 unit tests / "only the theme persists"; the code has 22 tests and persistent saved views.

### Gaps against the brief

- **Rendering.** The showcase looks premium because its materials are authored. User imports get one generic PBR material per source colour (metalness .58 / roughness .35). The result is saturated, plastic-looking colour with no feature edges by default (see 10 and 19). The shadow frustum is fixed at ±320 mm, which is wasted on a 20 mm cube and clips anything larger than ~600 mm. Selection is an emissive tint, not an outline.
- **Library.** There is none. There is one built-in sample and no persistence of model files.
- **Viewport.** It is cramped at laptop sizes (49–55 %). Two stacked bottom bars sit over the model, and the status bar plus 56 px header use about 10 % of the height.
- **Workspace scratch files** `ba/dbg/v5/ws.tmp.mjs` sit in the app root from earlier sessions. Left untouched; candidates for cleanup only with your OK.

---

## 4. Proposed navigation

Hash routes keep static hosting and existing deep links working:

| Route | Surface | Notes |
|---|---|---|
| `/` | Story landing (unchanged) | Nav gains **Library**. "Open CAD workspace" goes to the Library. |
| `#/library` | Library home | Samples + your models, search/sort/filter, import, storage meter |
| `#/m/<modelId>` | Workspace for a saved model | Resumes the last inspection state |
| `#/s/<sampleSlug>` | Workspace for a curated sample | Read-only source; your state for it is still saved |
| `#/session` | Workspace for an unsaved import | Persistent "Save to library" affordance |
| `#viewer` (legacy) | Redirects to `#/s/axis-1` | Keeps README links and tests valid |

Optional `?view=<id>` deep-links a named view. Back/forward follow routes. The same persistent `Viewer` canvas serves every workspace route, so the single-renderer invariant is kept.

**Flow.**

1. Library → click a card → workspace opens at the saved state (or the default iso view).
2. Inspect. State autosaves (debounced) for saved models and samples.
3. Back to Library shows the updated "Continue" hero.
4. Import (Library or workspace) → the existing dialog, with all current options plus **"Save to my library"** (default ON, with a clear local-only statement). If unchecked, the model opens as a session model with a visible Save action and an unsaved-state guard.
5. Import cancellation keeps today's behaviour: the current model is unchanged and **no library record is written**.

### Library (desktop)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ CADmium.   Story   Library                    ⌕ Search models & parts   [Import]│
├───────────────────────────────────────────────────────────────────────────────┤
│ CONTINUE                                                                        │
│ ┌──────────────────────────────┐  Planetary gearbox · STEP · 10 parts          │
│ │ frame rendered from your     │  Opened 2 h ago · 3 measurements · Y section  │
│ │ last saved camera/state      │                     [Resume inspection →]      │
│ └──────────────────────────────┘                                                │
│ YOUR MODELS 4        Format ▾  Sort: Recent ▾  ▦ ☰           Storage 18 MB ▕██▏ │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                                     │
│ │ 360°   │ │ 360°   │ │ 360°   │ │   ＋    │  ← drop files anywhere on the page  │
│ └────────┘ └────────┘ └────────┘ └────────┘                                     │
│ SAMPLES 6                                                                       │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
└───────────────────────────────────────────────────────────────────────────────┘
```

On phones the hero becomes one card, the grid is 1 column (2 at ≥ 600 px), and filters move to a sheet. An empty personal library shows a large drop zone plus "Start with a sample".

### Model card

```
┌──────────────────────────────┐
│ STEP                  ☆  ⋯   │  ⋯ = Open · Rename · Re-import settings ·
│                              │      Download originals · Delete (undo)
│    turntable preview         │  hover/focus: plays · drag: scrubs angle
│                              │  ←/→ when focused · Enter opens
│ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ angle     │
├──────────────────────────────┤
│ Planetary gearbox            │
│ 10 parts · 13.4k tris        │
│ 107.9 × 108.0 × 31.5 mm      │
│ ● Saved state · 2 views · 3 M│
│ Opened 2 h ago · 6.1 MB      │
└──────────────────────────────┘
```

**Preview technique (decision for review).** Each card is a **pre-rendered turntable sprite**: 36 frames at 10° steps, ~320×240 WebP, ≤ 250 KB, plus a ≤ 30 KB poster. A frame index driven by hover, drag or keys gives smooth, truly interactive rotation, with no WebGL context per card and no tessellation when the library opens.

- **User models.** Frames are rendered by the **existing Viewer renderer** into an offscreen render target, reusing the snapshot path, at idle time after save. They are re-rendered automatically when `renderVersion` changes.
- **Samples.** Sprites are generated at build time by a script that drives the app's own renderer.
- **Why not live per-card WebGL.** Live 3D per card would need either one context per card (Chrome caps about 16) or every model resident on the GPU at once, plus STEP tessellation for each card on page open.
- **Optional extra.** A "Quick look" could open the real model in the persistent canvas without leaving the Library.
- **Reduced motion.** No autoplay; manual scrub only. Touch uses `touch-action: pan-y`, so a horizontal drag scrubs and a vertical swipe still scrolls.

### Workspace (spacious layout)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Library / Planetary gearbox  STEP   ● Saved 10:42      ⓘ  ?  ⎙  ⋯      │ 48 px
├──┬───────────────────────────────────────────────────────────────┬──────┤
│▤ │                                                    ┌─────┐    │
│⌕ │                                                    │cube │ +− │
│🔖│                                                    └─────┘ ⤢  │
│📏│              viewport  (≥ 80 % of window by default)          │
│ⓘ │                                       ┌ selection card ┐       │
│  │                                       │ Sun gear  focus │       │
│  │                                       └─────────────────┘       │
│  │      ╭ tool options: one row, opens above its tool ╮            │
│  │      │ Inspect │ Measure │ Section │ Display ║ ⌖ ⟲ 🔖 │          │
└──┴──────┴────────────────────────────────────────────────┴──────────┘
```

- **Icon rail (48 px).** Tree · Search · Views · Measurements · Info. One 320 px sheet opens at a time. It pushes the viewport at ≥ 1440 px and overlays below that. It is resizable 260–440 px.
- **Properties.** A compact selection card appears top-right only when something is selected; the full detail lives in the Info sheet.
- **Tool options.** These become **one row (≤ 64 px)** attached to the toolbar, replacing today's 107 px dock above a 50 px bar.
- **Status bar removed.** Counts move to Info; shortcuts stay in Help.
- **Header and cube.** The header is 48 px and shows a save-status pill. The view cube shrinks to ~96 px, with zoom/fit stacked under it.
- **Focus mode** (`\`) hides all chrome; Esc restores it.
- **Phones.** Same rail items as a bottom sheet switcher. The toolbar stays one row, and tool options become a half-sheet.

---

## 5. Premium rendering

1. **Material presets per model, stored in state.**
   - *Studio*: the default for STEP/STL. Physically plausible machined metals and polymers, with source colours mapped by hue to a restrained palette and chroma clamped.
   - *Source appearance*: exact file colours/MTL. The default for textured OBJ.
   - *Neutral clay*: for shape reading.
   - *Colour by component*: for assemblies.
2. **Feature edges.** Crease-angle (~30°) edges are drawn by default in inspection as thin, constant-pixel-width lines (`LineSegments2`/`LineMaterial` from three/addons, already a dependency). They are computed lazily per part and depth-offset so they don't z-fight.
3. **Up-axis.** STEP defaults to Z-up mapped for display (fixes D3), with a toggle per model. Coordinates and measurements are reported in source axes.
4. **Bounds-fitted lighting.** Shadow camera, contact shadow, grid and axes are scaled to the model, so a 20 mm cube and a 1 m assembly both get crisp shadows. The studio environment is reused.
5. **Normals.** Crease-aware normals for STL/OBJ (`toCreasedNormals`), removing the lumpy shading on tessellated curves while keeping sharp edges. OCCT normals are kept for STEP.
6. **Selection and hover.** These use an outline pass instead of an emissive tint.
7. **Quality tiers.**
   - *Performance*: DPR 1, no AO.
   - *Balanced* (default): fitted shadows, MSAA, edges.
   - *High*: adds GTAO ambient occlusion and the outline pass.
   - While orbiting the viewer drops to DPR 1 and skips AO, then refines on idle using the existing render-on-demand loop.
   - Uses `three/addons` only, so **no new runtime dependency**.
8. **Model fixes.** Fix D1/D2: single-material OBJ, and a visible warning plus neutral fallback for undecodable textures.
9. **Stretch (only if budget allows, in the tools checkpoint).** Stencil section caps.

## 6. Library and storage architecture

### Storage engine

**IndexedDB** database `cadmium-library`. Blobs are stored natively, so no base64 inflation; Chrome writes were verified. The library is a single repository module, and UI code never touches IDB directly.

| Store | Key | Contents |
|---|---|---|
| `meta` | `key` | `schemaVersion`, migration log, last legacy-import marker |
| `models` | `id` | `LibraryModel` record (below) |
| `blobs` | `sha256` | Original file bytes, **content-addressed** (shared textures stored once) |
| `states` | `modelId` | Inspection state + named views + measurements + notes |
| `previews` | `modelId` | Poster, sprite, resume frame, `renderVersion` |
| `geometry` | `geometryKey` | Optional evictable tessellation cache (typed arrays) for fast STEP resume |

```ts
type LibraryModel = {
  schema: 1;
  id: string;                         // crypto.randomUUID(); samples use 'sample:<slug>'
  kind: 'import' | 'sample';
  name: string; createdAt: number; updatedAt: number; lastOpenedAt: number; favorite: boolean;
  source: {
    format: 'stl' | 'obj' | 'step';
    files: FileRef[];                 // primary + MTL + textures, exactly as selected
    sourceHash: string;               // sha256 over sorted (role, referencedName, fileHash)
    primaryHash: string; totalBytes: number;
  };
  settings: { units: 'mm' | 'cm' | 'in'; unitsBasis: 'user-assumed' | 'occt-converted';
              quality: 'balanced' | 'fine'; upAxis: 'y' | 'z'; material: MaterialPreset };
  derivation: { geometryKey: string;  // sourceHash|units|quality|upAxis|pipeline
                pipeline: string;      // e.g. 'occt-import-js@0.0.23;bbox=0.002;ang=0.35'
                derivedAt: number };
  structure: { parts: { key: PartKey; name: string; path: string[]; triangles: number }[];
               triangles: number; boundsMm: [number, number, number]; warnings: string[] };
  legacyFingerprint?: string;         // binds pre-upgrade localStorage views
  status: 'ok' | 'source-missing' | 'unreadable' | 'needs-review';
};
type FileRef = { hash: string; name: string; referencedAs?: string; size: number; mime: string;
                 lastModified: number; role: 'model' | 'material' | 'texture' | 'other'; referenced: boolean };
```

### Model identity (three layers)

1. **Source identity** = SHA-256 of the exact bytes (`crypto.subtle`, available on 127.0.0.1). It drives dedupe ("already in your library — open it / keep another copy") and verifies "Download originals".
2. **Library identity** = a random UUID. The same file can deliberately be saved twice (e.g. inch vs mm), and renaming never changes identity.
3. **Part identity** = stable `PartKey` = normalised hierarchy path + source name + occurrence ordinal (e.g. `as1/l-bracket-assembly(2)/bolt#1`), matching the adapter's occurrence logic. Runtime `import-<i>` ids remain, so existing code is untouched. Saved state stores `PartKey`s and maps them at load.
   - State therefore survives a rename, Balanced↔Fine, and an importer upgrade that keeps the structure.
   - If keys disappear, state is marked *needs review* rather than dropped. This fixes D4.

### Preserving source, textures, hierarchy, units and state

- **Source files.** Stored byte-for-byte as Blobs with the original name, MIME and `lastModified`. They are never re-encoded. On open, geometry is **re-derived from the stored bytes through the same workers**, so STL/OBJ/STEP import, conversion, limits and cancellation are exercised exactly as today.
- **OBJ companions.** The MTL and every selected texture are stored. The MTL's reference string (`referencedAs`) is kept so the identical local blob-URL mapping is rebuilt. Unreferenced extras are listed. External URLs are still never fetched.
- **Hierarchy.** Re-derived from source on each open; the parser is the authority. A structure snapshot is also saved, so cards and library search show component names without parsing, and an importer change that alters structure is detected and reported.
- **Units.**
  - STL/OBJ units are a recorded user assumption, labelled as such.
  - STEP is recorded as OCCT-converted to mm.
  - Changing units later re-derives geometry. Because scaling is uniform, saved camera and measurement points are scaled exactly by the ratio.
  - Changing tessellation keeps the saved points and shows "measured on Balanced tessellation".
- **Inspection state** (autosaved ~800 ms after the last change; camera on orbit end):
  - camera and projection;
  - hidden/selected `PartKey`s;
  - explode, section (axis/position/flip), style, transparency;
  - material preset, quality tier, units;
  - measurements (part-local points + `PartKey`);
  - named views;
  - tree collapse state.
- **Samples.** Shipped read-only under `public/samples/<slug>/`, with a `manifest.json` per sample (license, source URL, download date, sha256, bytes, recommended view, description). The source is never copied into IDB; only your state for the sample is.

### Versioning and migration

- `schema` on every record, plus the IDB version. Migrations are pure `vN→vN+1` functions with unit tests, applied inside an upgrade transaction.
- A record or DB **newer than the app** opens read-only, with a "this library was saved by a newer CADmium" notice and no writes.
- `pipeline` and `renderVersion` are tracked independently. An importer change invalidates only the `geometry` cache; a renderer change only regenerates previews.
- **Legacy views.** On first boot, `cadmium-saved-views-v1` is copied, not moved:
  - showcase (`demo-*`) views go into the Axis-1 sample's state;
  - `file-*` views wait in a legacy holding area and attach automatically when an imported model's computed legacy fingerprint matches.
  - The old key is left intact for one release. Theme and panel-width keys are unchanged.

### Storage-failure handling

| Failure | Behaviour |
|---|---|
| IndexedDB unavailable or blocked | **Session-only mode** with a persistent banner. Import and inspection work exactly as today; samples still load; Save is disabled with the reason given. |
| Quota exceeded or low space | Pre-check with `storage.estimate()`. The write happens in **one atomic transaction** (blobs + record + state), so a failure leaves nothing partial. The model stays open in the session. The message states the bytes needed and offers deletion/cleanup. |
| Best-effort storage | After the first save, ask once via `navigator.storage.persist()`. The storage meter shows "may be cleared by the browser" when not persisted. |
| Unreadable or corrupt record | Quarantined: shown as *Unreadable*, **never silently overwritten**. Raw export and delete are offered. |
| Missing blob (evicted or partially cleared) | The card shows *Source missing — relink file*. The re-selected file must match `primaryHash`. |
| Preview generation failure | Non-blocking. The card shows a neutral poster and retries on the next idle. |
| Another tab changed the library | `BroadcastChannel` refresh. On `versionchange` the DB is closed and a "reload to continue" notice is shown. Writes for one model are serialised with Web Locks. |
| Autosave failure | The save pill turns to *Not saved — retry*. In-memory state is kept, with an unload guard while unsaved. |
| Deleting | Soft-delete with a 10 s undo toast. The purge removes the record, state, previews and any blobs no other record references, in one transaction. |

Privacy copy stays explicit: stored only in this browser profile on this device, never uploaded, and removed by clearing site data. No accounts, sync or analytics.

## 7. Saved inspection state and engineering tools

**Kept as-is:**

- point-to-point distance with Δx/Δy/Δz, measured on assembled positions;
- uncapped X/Y/Z clipping with reverse/reset;
- bounds;
- explode (authored for the showcase, radial for imports);
- hide/isolate/show all, search, view cube, seven presets, perspective/ortho;
- named views;
- PNG export with annotations.

**Proposed core additions.** All are mesh-derived and labelled honestly:

1. **Snapping** to tessellation vertices, feature-edge midpoints and face centroids, with the snap type shown.
2. **Angle between two picked faces** (normal-to-normal).
3. **3-point circle fit** for an approximate diameter/radius on holes and bosses, labelled "estimate from tessellation".
4. **Mesh analysis (Info sheet):**
   - surface area;
   - volume, only when the mesh is closed;
   - watertight / open-boundary / non-manifold / degenerate-triangle report (useful for STL print checks).
5. **Section from a picked face**, plus drag-to-move on the section plane.
6. **Pinned notes** on surface points, saved with state.

**Deferred unless budget allows:** stencil section caps, per-group explode, a full-library backup file.

---

## 8. Implementation sequence

This is a proposal; I'll align to your checkpoint list if it differs. Each checkpoint ends with a build, unit tests, the browser gate, axe and inspected screenshots before review.

| CP | Scope | Exit evidence |
|---|---|---|
| **2 — Green baseline** | Fix the stale tests, D1 (single-material OBJ), D2 (texture warning), the mobile Upload accessible name, tree ARIA and colour contrast. No new features. | 10/10 browser groups, 0 axe findings, OBJ single-material screenshot |
| **3 — Rendering** | Material presets, feature edges, up-axis, fitted shadows/contact, crease normals, outline selection, quality tiers + adaptive refinement | Before/after pairs for showcase, gearbox STEP, as1 STEP, STL, textured OBJ at 1440/390; fps notes |
| **4 — Storage + library core** | Routes, repository, schema v1, identity/PartKeys, save/open/rename/delete-undo, autosave/resume, legacy-view migration, every failure mode in §6, session-only mode | Repository + migration unit tests; reload-resume, quota-failure, blocked-IDB, multi-tab and corrupt-record browser tests |
| **5 — Samples + cards** | Curated samples with manifests/licences, sprite generation (build script + runtime), cards with interactive turntables, Continue hero, search across model and part names, storage meter | Library screenshots (desktop/tablet/phone, empty/full); card keyboard/touch/reduced-motion tests |
| **6 — Spacious workspace** | Rail + sheets, merged tool row, selection card, 48 px header with save pill, focus mode, phone sheets | Measured viewport-share targets, all existing tool tests passing |
| **7 — Engineering tools** | Snapping, face angle, circle fit, mesh analysis, face-based section, notes (all saved with state) | Unit tests on known geometry (cube, cylinder) and browser workflows |
| **8 — Hardening and docs** | Performance pass, bundle split (showcase geometry → lazy chunk), README/VERIFICATION/THIRD_PARTY updates, full regression | Release gate run, documented manual checks |

## 9. Acceptance criteria

### Preservation (every checkpoint)

- STL binary/ASCII, OBJ (+ MTL + PNG/JPEG/WebP, including single-material OBJ), and STEP/STP via the local OCCT worker all import with today's limits, stages, cancel (current model unchanged, nothing written) and error recovery. No network requests beyond the app origin and `blob:`.
- Selection, hover, tree visibility, hide/isolate/show all, search, camera presets, perspective/ortho, view cube, zoom/fit, explosion, measurement (assembled-position invariant), clipping, PNG export, theme, help and keyboard shortcuts all behave as today.
- Story landing: same canvas UUID into the workspace, reversible transforms, and the reduced-motion and WebGL-failure paths still work.
- Unrelated apps and files untouched.

### Library and persistence

- After a save and a **full browser restart**, the model is listed and opens with camera, visibility, explosion, section, style, measurements and named views exactly as left. Camera position is within 1e-6, and measurement values are identical.
- "Download originals" returns files whose SHA-256 equals the imported files, including the MTL and textures.
- Renaming a model, or switching Balanced↔Fine, keeps its state. Importing the identical file again offers "Open existing / keep a copy".
- With IDB blocked, quota exceeded, a corrupt record or a missing blob, the app shows the specified state from §6. It never loses the open model, writes partial records or overwrites unreadable data.
- Existing `cadmium-saved-views-v1` views appear on their models after the upgrade.

### Cards and previews

- Hover plays, drag scrubs, ←/→ rotates when focused and Enter opens. With reduced motion there is no autoplay.
- Library first paint with 6 samples + 12 models is ≤ 1 s after the app shell, with no tessellation and no extra WebGL contexts (exactly one canvas in the DOM).
- Each sprite is ≤ 250 KB and each poster ≤ 30 KB. Previews regenerate after a `renderVersion` bump.

### Viewport

- At 1440×900 and 1280×800 the default unobstructed viewport is **≥ 80 %** of the window (today 55 % / 49 %), and ≥ 65 % with one sheet open.
- Tool options are ≤ 64 px tall. No chrome overlaps the fitted model's bounding rectangle in the default view.
- Phone: one-row toolbar, sheets for tree/properties, no horizontal overflow.

### Rendering

- An imported STEP lies on its base by default (Z-up handled). Feature edges are visible.
- The Studio preset has no fully saturated source colours; Source appearance reproduces them exactly.
- Shadows are fitted from 20 mm to 1 m models.
- Orbiting stays ≥ 50 fps for the gearbox on this Mac at Balanced, and High refines on idle.
- Before/after screenshots are visually reviewed for every format.

### Quality gates

- Strict build, all unit tests and all browser groups pass with zero retries.
- **Zero axe WCAG 2.1 AA findings** on library, card, dialogs and workspace (dark + light).
- No console errors on normal paths.

## 10. Decisions needed at review

1. **Previews:** the turntable sprites (recommended), or do you require live 3D in each card?
2. **Save default:** "Save to my library" checked by default on import (recommended), or opt-in?
3. **Samples.** Licences must be confirmed before shipping:
   - Axis-1 (existing).
   - CC0 Innerscene gearbox STEP (6.4 MB, already local).
   - Your projects 07 g-clamp STEP (2.8 MB) and 06 phone stand (283 KB).
   - 03 presence-sensor puck STL (386 KB; Designer starter content, licence to confirm).
   - One CC0 Kenney textured OBJ, or a mechanical CC0 OBJ if I can find one.
   - Possibly a public-domain NIST MBE test model.
   - CAX-IF files stay test-only, since their redistribution terms aren't established.
4. **Dev dependency for IndexedDB unit tests (`fake-indexeddb`)**, or keep storage tests in real Chrome only (no new dependency, slower)?
5. **Scratch files** `ba/dbg/v5/ws.tmp.mjs` in the app root: leave them, or remove them in CP2?
