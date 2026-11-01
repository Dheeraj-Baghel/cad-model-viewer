# CADmium technical audit — 25 October 2026

## Verdict

The app has a credible local inspection foundation and a much stronger feature set than the original version. It is not ready to be called a polished release. Fix visual regressions, navigation, state preservation, and backup reliability before adding more formats or community features.

This audit covers the local project `/Users/dheerazzz/Designer Projects/starter/cad-model-viewer`, not the separately deployed reference app.

## Evidence and limits

- Inspected the live homepage, exploded overview, Explore, personal library, a real bundled STEP sample, and section controls.
- Observed layouts at 779 × 904 and 1280 × 720. The exploded overview clips at both sizes.
- A 21-component bevel gearbox imported, rendered, appeared in the personal library, and responded to sectioning. Opening that sample automatically created its library entry; it was retained rather than deleting user-visible data.
- Read application routing, rendering, import workers, presentation, persistence, previews, backup/restore, styles, and tests.
- Ran the current unit suite: **66 tests passed across 5 files**.
- Ran the production build: **TypeScript and Vite passed**, with a large-chunk warning.
- No application source was changed. Test caches and normal production build output were generated.
- Existing browser-test reports were not treated as fresh evidence. This audit did not rerun the entire browser suite, a physical phone/Safari matrix, screen-reader testing, large-library stress tests, or a controlled frame-rate/Core Web Vitals benchmark. Timing and memory risks below are source findings, not invented measurements.

Evidence labels: **Observed** = reproduced in the live interface; **Source-confirmed** = follows directly from the implementation; **Risk** = requires a targeted reproduction or profiling test.

## Priority findings

### 1. P1 — Library light theme is nearly unreadable

**Observed and source-confirmed.** With the existing light-theme preference, Explore and Your Library display dark heading text against a dark background. Computed heading color was `rgb(23, 36, 45)`; the library background was transparent and the body was `rgb(12, 14, 17)`.

`src/library/library.css:2` uses `background:var(--page)`, but that token is undefined. `src/cadmium.css:33` globally forces a dark HTML/body background, while `src/styles.css:7` supplies light-theme text tokens.

**Fix:** use a defined collection background token, scope story backgrounds to the story, and give the library an accessible theme switch or consistently inherit the app theme. Do not patch individual headings while leaving the token mismatch intact.

**Acceptance:** both themes must be readable on direct collection entry and after Story → Library → Viewer navigation; include automated contrast checks and screenshots.

![Library contrast failure](audit-library-contrast.png)

### 2. P1 — Exploded story composition clips the model

**Observed.** Chapter 05 places much of the right-hand motor stack outside the viewport. At 1280 × 720, the assembly also extends underneath the bottom controls. At 779 × 904 the clipping remains severe. The opening hero at the narrower width has the opposite problem: the model feels small compared with the unused space.

Relevant implementation: `src/Viewer.tsx:135–141` and `src/presentation/CameraController.ts:91–130`. The camera claims safe-rectangle fitting, but the final projected result does not meet that contract.

**Fix:** validate the final projection after view offsets, fit the current posed bounds, and reserve real rectangles for text, labels, header, and bottom controls. Check all eight projected bound corners rather than just testing finite camera values. Give intermediate widths their own composition or use continuously responsive bounds.

**Acceptance:** assembled, open, detail, and overview compositions remain inside their intended safe areas at 390, 768, 779, 1024, 1280, and 1440 widths. Detail shots may crop deliberately; the overview must not.

![Exploded overview clipping at 1280 × 720](audit-story-overview.png)

### 3. P1 — Unsaved work can disappear on internal navigation

**Source-confirmed.** `src/App.tsx:124` calls `replaceModel(createDemo())` when returning to the story from an imported model and clears measurements. The unsaved-work warning is only registered for `beforeunload`; an internal Back to story action does not trigger it. A temporary import has no library record for `flushState()` to save.

**Fix:** preserve the active inspection session while visiting the story, or provide Save / Discard / Cancel before replacing temporary work. Put Save to library beside the model identity and status instead of requiring discovery in Properties. The earlier automatic-save requirement is not implemented for imports: saving originals is currently manual.

**Acceptance:** importing a model, adding a measurement, visiting the story, and returning must preserve the session or require an explicit discard decision.

### 4. P1 — The app can create a backup that it refuses to restore

**Source-confirmed.** `src/library/repository.ts:88–96`: backup exports the entire collection without a size ceiling, while restore rejects archives above 160 MB. The library can contain multiple models up to 40 MB each. Backup also includes retained orphan blobs, making the mismatch worse.

**Fix:** support selected-model or split backups, or make export/restore limits compatible. Estimate size before export and never label an unrestorable archive a successful backup. Export only referenced assets unless explicitly producing a raw recovery archive.

**Acceptance:** every archive produced by the normal backup UI can be restored by that app version; test a collection exceeding 160 MB.

### 5. P2 — Viewer header breaks at intermediate widths

**Observed.** At 779 pixels wide, Back to story wraps into three lines and Upload model is clipped at the right edge. Important model identity is hidden while lower-priority controls occupy the row.

Relevant code: `src/workspace.css:267–273,371–391` and the viewer header in `src/App.tsx:303–305`.

**Fix:** use a compact header based on available space, an overflow menu for secondary actions, and a stable model-name area. Avoid relying on a 760-pixel breakpoint to fix a layout that already fails above it.

**Acceptance:** all actions remain reachable at 761–1024 pixels and with long filenames, increased text size, and browser zoom.

![Narrow viewer header](audit-viewer-narrow.png)

### 6. P2 — Story deep links open the wrong screen

**Observed and source-confirmed.** Loading `/#overview` directly opens the CAD workspace. `src/App.tsx:62` initializes workspace mode with `Boolean(location.hash)`, treating any fragment as a viewer route.

**Fix:** parse explicit route types: story chapter, Explore, Library, model, and viewer. Keep route parsing and transition behavior in one place. Opening a model should normally push a navigation entry rather than replace the collection entry; current `openRecord()` uses `replaceState`, so Back does not reliably return to the collection users came from.

**Acceptance:** direct entry, refresh, Back, and Forward work for every supported route, including unknown and malformed fragments. Collection skip links must target the visible collection heading, not the retained inert viewer heading (`src/App.tsx:282`).

### 7. P2 — Startup code is not meaningfully split by feature

**Measured build and source-confirmed.** Production output:

| Asset | Minified | Gzip |
|---|---:|---:|
| Main JavaScript | 1,034.89 kB | 377.69 kB |
| Three.js chunk | 530.82 kB | 136.42 kB |
| Main CSS | 111.32 kB | 19.94 kB |
| Mesh worker | 136.36 kB | Not reported |

The two initial JavaScript chunks total approximately **514 kB gzip**, excluding fonts, models, and worker assets. `App.tsx` statically imports Library, which imports PreviewController and the repository; the repository statically imports ZIP utilities. `useState(createDemo)` constructs the showcase even on direct Library entry, and Viewer remains mounted while browsing. The embedded gearbox data module alone is about 444 KB of source.

**Fix:** lazy-load collection UI, preview engine, ZIP backup/restore tools, and import-specific code. Construct the showcase only when needed. Direct Library entry should not initialize a hidden full viewer; retaining an existing viewer when temporarily browsing is a separate decision. Keep STEP WASM deferred—this is already a good implementation choice. Do not merely increase the build-warning threshold.

**Acceptance:** record a production cold-load waterfall for Story and Library separately; Library should fetch metadata/thumbnails, not build the showcase or load STEP conversion. Set budgets after measuring on a representative device.

### 8. P2 — Live previews redo expensive source import

**Source-confirmed performance risk.** `src/library/Library.tsx:24` activates a preview after 250 ms. `src/library/preview.ts:24–30` fetches/reads and re-imports the source, disposing it when leaving the card. A STEP preview therefore repeats tessellation when revisited. Sample fetches support AbortSignal but preview activation does not pass one. Visibility-change handling stops background-tab previews, but there is no offscreen intersection policy. Poster images lack lazy-loading hints.

**Fix:** keep the single preview renderer, but use a lightweight cached preview asset keyed by source hash and pipeline version. Abort superseded sample requests, stop offscreen previews, and lazy-load below-fold thumbnails. Provide an explicit loading state and avoid tessellating STEP merely because a pointer briefly rests on a card.

**Acceptance:** revisiting a card avoids repeated source conversion; only one preview runs; rapid hover, scrolling offscreen, and tab hiding release or pause work correctly.

### 9. P2 — Main-thread geometry and rendering work needs optimization

**Source-confirmed risks; not an FPS measurement.** `Viewer.tsx:102` builds EdgesGeometry for every component immediately, even in solid rendering. The renderer uses `preserveDrawingBuffer:true` (`:53`) although exports already render to a separate target. Pointer movement runs raycasting and material updates on every event (`:145`). The renderer requests a 24-frame tail (`:74`). Turntable rendering updates React camera state repeatedly; `PartRow` and `Node` are defined inside App (`App.tsx:197–213`), giving them new component identities on parent renders.

**Fix:** generate/cache edges only when required; evaluate removing preserveDrawingBuffer; throttle picking to animation frames and skip material changes when hover is unchanged. Stabilize/memoize tree components and keep camera animation away from broad UI rerenders. Add adaptive DPR/shadow quality based on measured frame time, with a stable full-quality mode.

**Acceptance:** profile 21-, 65-, and near-limit assemblies on native graphics, checking input latency, frame time, tree focus stability, and GPU memory after repeated model replacement.

### 10. P2 — Backup processing and validation need hardening

**Source-confirmed risks.** Repository backup/restore uses synchronous ZIP processing and constructs all archive buffers on the main thread (`repository.ts:88–106`). Restore scans arbitrary bytes for central-directory signatures rather than parsing a validated directory, while claiming stored ZIPs only without enforcing that restriction. `validateRecord()` checks only part of the record schema; `update()` validates the old record but not the merged result. Saved-state validation does not fully constrain every enum, numeric range, or nested saved view.

**Fix:** move archive work to a worker; validate archive structure, entry count, aggregate expanded bytes, supported compression, and hashes. Validate complete records and merged updates, including nested state and positive camera limits. Quarantine unreadable entries instead of making the entire healthy library inaccessible. Rehash shared blobs once per restore.

**Acceptance:** malformed manifests, unknown versions, invalid camera values, excessive archive entries, missing files, and quota failure must fail cleanly without freezing the interface or replacing good data. This review did not demonstrate a ZIP exploit.

### 11. P2 — Autosave needs an awaitable queue and conflict policy

**Source-confirmed race risk.** `App.tsx:133` returns from `flushState()` when a save is already running. Navigation awaits that function but does not necessarily await the outstanding save or newer edits. A slow save followed by another edit and immediate navigation can leave the latest state unflushed. Multiple tabs update complete inspection states without a revision/conflict policy; the change broadcast is emitted by library UI actions, not all repository updates.

**Fix:** serialize saves, coalesce pending state, and let navigation await the final relevant save. Add a per-record revision or last-writer conflict policy and broadcast repository changes consistently. Keep transient save status separate from persisted session identity.

**Acceptance:** artificially delay storage, edit again during save, navigate, and reopen; latest state must survive. Test two tabs editing the same model.

### 12. P2 — Accessibility semantics and focus need a dedicated pass

**Observed/source-confirmed gaps.** Generic IconButton always sets aria-pressed, so one-shot actions such as export/help/fullscreen are announced as toggle controls. Side panels use tab semantics without a complete keyboard/tab-panel pattern. Drawer opening does not establish a documented focus-management contract. The help control advertises '?' but the App keyboard handler does not implement that shortcut. Many auxiliary labels/buttons use 9–11 px type or small targets.

**Fix:** apply pressed state only to genuine toggles; implement tabs and drawers with explicit focus behavior; restore focus on close; make '?' work or remove the hint. Increase secondary-text readability and touch targets. Fix the collection skip-link destination.

**Acceptance:** keyboard-only navigation through library → model → tools → dialogs; correct announcements for actions versus toggles; both-theme accessibility checks. Do not equate an automated axe pass with complete accessibility.

## Product polish and missing capabilities

These are improvements, not all release-blocking defects:

- Make model identity, units, save state, and return-to-library consistently visible. Prefer Import over Upload for a local-only action.
- Reduce instructional/internal language in the library hero. Move long provenance and storage explanations to expandable details while keeping essential privacy/save status visible.
- Keep thumbnails and live previews visually consistent. Current preview lighting is a simpler setup than the main studio and does not reuse its environment.
- Use styled rename/remove dialogs and a clear undo lifecycle. Cleanup currently refuses to run while an undo record exists, but there is no explicit dismiss/finish-undo action.
- Separate originals size, thumbnails, retained undo assets, and total browser usage; current usage sums source blobs only.
- Use source-content identity for legacy saved-view compatibility. The existing fingerprint hashes names, rounded bounds, and triangle counts, which do not uniquely identify geometry (`workspace/modelUtils.ts:106–117`).
- Keep edge/face measurement, exact B-rep operations, and mechanical simulation explicitly out of claims until implemented and validated.
- GLB/glTF import, multi-model assembly preparation, recording, model comparison, revisions, annotations, and cloud sharing are still later work; do not present these roadmap items as completed because the reference app exposes them.
- Keep the user's existing STEP/STL/OBJ and local privacy features while adding GLB/glTF. Do not chase every format before the current workflow is reliable.

## Recommended implementation order

1. **Release correctness:** fix library theme, overview framing, responsive header, and deep-link routing. Add screenshots around breakpoint boundaries and both themes.
2. **Protect user work:** preserve unsaved sessions, make save behavior explicit, implement an awaitable save queue, and make backups reliably restorable.
3. **Loading/performance:** split features, avoid hidden showcase creation on Library entry, cache lightweight previews, defer edge generation, stabilize tree components, and workerize archives.
4. **Interaction/accessibility:** improve keyboard/focus behavior, readable controls, provenance disclosure, save status, and storage management.
5. **Feature expansion:** GLB/glTF, multi-file assembly, annotations, recording, and comparison, one verified increment at a time. Cloud/community last.

## What is already worth preserving

Local worker parsing; STEP WASM loaded on demand; source hash checking and atomic storage transactions; one shared card-preview renderer; a suspended retained viewer during library browsing; reversible appearance handling; unit-aware measurements; honest mesh-clipping labels; and the growing unit-test suite are all useful foundations.

The next milestone should be a reliable, readable, responsive core workflow—not another long feature list.
