# Checkpoint 3 — Explore and persistent on-device library

**Status: completed; stopped for review.** No deployment, account requirement, hosted database or unrelated application change.

**Post-review correction:** the user identified a real native scroll/click usability failure. Explore inherited the viewer's overflow-hidden shell; only the small arrow, not the model image/title, opened a model. This was missed by the original element-targeting tests. Both are corrected, with **24/24 workflows passing including native wheel/touch/coordinate-click regressions**. See the [correction record](EXPLORE_INTERACTION_FIX.md); the 21-test results below are historical CP3 evidence, not proof of ordinary scrolling.

- [Explore](http://127.0.0.1:4326/#/explore)
- [Your Library](http://127.0.0.1:4326/#/library)
- Existing [viewer link](http://127.0.0.1:4326/#viewer) and story remain supported.
- Browser verification used a separate production preview on port 4340; the normal dev server on 4326 was not stopped.

## Delivered against the brief

| Requirement | Implemented behavior |
|---|---|
| Explore / Your Library | Hash navigation, story entry, resume viewer, no accounts. Both use the existing inspection workspace. |
| Licensed curated sources | Existing Axis-1 plus CC0 Innerscene planetary/bevel STEP assemblies and a Kenney textured train OBJ. Exact URLs, file hashes, rights and attribution are in per-sample manifests and [THIRD_PARTY](../../THIRD_PARTY.md). |
| Useful model cards | Consistent 640×480 source-safe thumbnails, descriptions, format/components, categories, source/license disclosure and open affordance. |
| Search/favorites/sort | Search names/descriptions/categories; category and favorite filters; name, recently opened and component-count sorts. Favorites persist per sample/import. |
| Single live preview | One lazily allocated shared renderer. Hover or keyboard focus activates one card; touch gets a Preview action. Static thumbnails elsewhere. Reduced motion uses a stationary preview plus manual left/right rotation. |
| Resource lifecycle | Main viewer RAF is suspended while browsing. Stale imports are cancelled/discarded; previous geometry, material clones and textures are released. Shared preview renderer is disposed/context-lost on leaving collection. At most two graphics contexts; no second allocation until a preview is requested. |
| Persistent imported files | Native IndexedDB Blobs, byte-exact originals and selected OBJ companions; SHA-256 addressing/checks; one atomic source+record transaction. Import limit remains 40 MB. |
| Accurate status / failures | Temporary view, Saving, Unsaved changes, Saved on this device, and Not saved—retry. Quota/unavailable/missing/corrupt-source errors leave the existing viewer and original in-memory model intact. |
| Compatible resume | Camera/projection, selection/visibility, appearance policies, explosion, clipping, units, measurements and named views. Stable source hierarchy/name/ordinal keys plus importer pipeline/version check; incompatible state is retained and not silently overwritten. |
| Rename/remove | Rename affects the library display name, never original filenames/hashes or identity. Remove offers undo; unused retained originals are released by explicit cleanup after undo is finished. |
| Storage usage | Actual stored-source byte total, browser quota estimate and best-effort/persistent-storage explanation. No claim that browser storage is permanent. |
| Backup/restore | Browser-local ZIP of records/state, original files/companions and thumbnails. Restore verifies supported schema and original hashes before one commit, deduplicates matching records and preserves conflicting different-source IDs as separate models. Verified in a fresh browser profile. |
| Reversible orientation | Auto / Y-up / Z-up and Reset in Display. One assembly-root transform, not vertex rewriting/component rotation. Saved per library record and named view. Bounds, section planes, measurement axes/distances, camera presets, thumbnails and PNG exports follow that root. |

### Approved constraints preserved

- Imported models still start **Original under Studio lighting**; curated Axis-1 still defaults to its authored palette. Studio overrides do not leak into Inspect.
- Source materials and textures remain protected by the Checkpoint 2 clone layer.
- **Auto does not assume STEP is Z-up.** Current OCCT metadata describes units, not reliable up-axis; absent certified metadata Auto preserves source axes.
- STL/OBJ/STEP/STP still go through the original importer/workers. Reopening does not replace the STEP parser with a mesh shortcut.
- Multi-file OBJ companions are kept, and all component-relative placements remain intact. This checkpoint did not add multi-primary-file assembly import: the existing one-primary-model behavior remains.
- Ambiguous duplicate companion basenames in one import are now rejected rather than resolving to an arbitrary texture. Identical filenames in different saved models are supported and do not overwrite each other.
- **The user's g-clamp and phone stand are excluded** from public/bundled samples. CAX-IF files remain test fixtures only, outside public.

## Sample provenance and acceptance

All sample files were downloaded from exact official endpoints, independently of the reference website. Innerscene pages visibly allow CC0 use/modification/redistribution, including commercial use, without required credit. Kenney's official page and downloaded Train Kit 1.1 license likewise state CC0. Attribution is supplied voluntarily.

| Sample | Actual components | Triangles | Accepted source bounds (mm) | Measured native Chrome open time* |
|---|---:|---:|---|---:|
| Axis-1 (existing authored showcase) | 65 | 127,778 | 108 × 110.1 × 108 | 3.25 s |
| Open planetary gearbox | 10 | 13,398 | 107.918 × 107.959 × 31.5 | 3.55 s |
| Bevel gearbox | 21 | 9,318 | 143.1 × 143.1 × 98 | 1.11 s |
| Electric city train | 4 | 1,628 | 1.10 × 1.68 × 2.48, **explicit mm assumption** | 0.29 s |

\* Local dev app, Chrome ANGLE/Metal, opening to saved sample readiness including thumbnail work; not network production performance or physical-device guarantees. Earlier software-GL samples were substantially slower and are retained in the [software report](../../artifacts/testing/library-checkpoint3/sample-acceptance-software.json).

The train is an illustrative low-poly asset with unspecified OBJ units; the card/manifest do **not** claim real train dimensions. All STEP units are converted by OCCT to mm. Geometric suitability checks exercised component separation and source appearance; no kinematic correctness, tolerances or manufactured load rating is claimed.

- [Actual browser acceptance report](../../artifacts/testing/library-checkpoint3/sample-acceptance.json)
- [Acceptance/thumbnail generation script](../../artifacts/testing/library-checkpoint3/accept-samples.mjs)
- [Axis-1 manifest](../../public/samples/axis-1/manifest.json)
- [Planetary manifest](../../public/samples/planetary/manifest.json)
- [Bevel manifest](../../public/samples/bevel/manifest.json)
- [Kenney manifest](../../public/samples/train/manifest.json) and [downloaded license](../../public/samples/train/License.txt)

## Verification

- **Strict TypeScript / Vite production build: pass.**
- **66/66 unit tests:** 18 repository tests using dev-only fake-indexeddb, 6 orientation tests, plus all 42 prior tests.
- **21/21 actual-browser workflows pass in one final production-build run, without retries**, including all 7 CP3 workflows and 14 viewer/appearance preservation groups: [release results](../../artifacts/testing/library-checkpoint3-release-results.json).
- That final run uses `QA_CAPTURE=0` only to avoid redundant page screenshot recapture. All behavioral, native storage, hash, source-equivalence/pixel, PNG export and accessibility assertions remain enabled. Reviewed screenshots were captured in the prior successful [7/7 capture run](../../artifacts/testing/library-checkpoint3-final-fixed-results.json).
- **25 unique axe WCAG A/AA surfaces: zero detected violations**, including Explore, saved library and reduced-motion phone browsing; [combined evidence summary](../../artifacts/testing/library-checkpoint3/summary.json).
- Production dependency audit reports **zero vulnerabilities**. fake-indexeddb 6.2.6 is a dev dependency, imported only by repository tests; no package references appear in production JS. Runtime backup/restore uses fflate 0.8.3 (MIT).

### What the browser tests actually proved

1. A real 18-component STEP assembly was saved as native bytes, reloaded from a direct saved-model URL and reopened through OCCT. Original hash, camera, part transforms, root orientation, appearance, explosion and X section all matched. [STEP record](../../artifacts/testing/library-checkpoint3/step-persistence.json).
2. A real four-component Kenney OBJ with MTL and PNG persisted after reload, retained textures, survived rename/favorite/sort, and exported a local backup. **A fresh browser profile with no prior blobs restored from the backup alone** and reopened the textured model with matching source refs/hashes.
3. One card animated, the main viewer's render counter stopped during browsing, and rapidly cycling cards left **no active model, parser, geometry or textures**. The shared renderer is kept idle while still on the collection, then disposed when leaving. Final cleanup: 41 rendered frames, one actual buffer resize, zero inactive geometry/textures. [Cleanup record](../../artifacts/testing/library-checkpoint3/preview-cleanup.json).
4. Root Z-up/Y-up/reset left component placements/source geometry intact; point distances survived orientation and reload; a PNG export rendered the oriented model and measurement.
5. Injected native `QuotaExceededError` and unavailable IndexedDB left temporary viewing intact; retry succeeded. A missing saved blob refused reopen without replacing the current viewer.
6. Reduced-motion/touch viewport checks used an explicit Preview action and manual rotation, with no autoplay and no horizontal overflow. These are browser emulation, not physical touch.
7. Incompatible future importer state was retained unchanged while source geometry opened safely; autosave/overwrite was disabled rather than silently discarding that state.

Unit tests additionally cover real IndexedDB upgrade logic under fake-indexeddb, atomic rollback, duplicate names, binary file metadata, deduplication, deletion/cleanup, unsupported/corrupt backups and refusing corrupt record overwrites. Mock tests were not used as a substitute for browser Blob/texture/reload tests.

### Failures found and corrected

- Direct saved/sample hash links initially sliced off one character. Corrected and verified by full reload/direct links.
- Dynamic preview controls initially shifted the Rename button during pointer focus. Their space is now reserved, and focus activation is keyboard-specific so a touch Preview click is not inadvertently toggled off.
- Preview animation initially called `renderer.setSize()` every frame, reallocating the GPU drawing buffer. Native cleanup runs exposed long stalls. Fixed by resizing only on changed card dimensions, using an unpreserved preview buffer and limiting animation renders to 30 fps. Native rapid-switch cleanup then passed in seconds; the test asserts resize count remains stable during animation.
- Earlier combined software-GL and intermediate native runs timed out and are **not counted as successful gates**. After fixing preview allocation and finishing privacy-copy corrections, **all 21 workflows passed together on the final build** using native Chrome ANGLE/Metal. Playwright retries stayed zero; the final run intentionally reuses reviewed page screenshots while retaining every functional/export/storage/pixel/axe check.

## Implementation map

- [Library types](../../src/library/types.ts): versioned on-device records, original file references, inspection state.
- [Repository](../../src/library/repository.ts): IndexedDB v2, migration, atomic source/state operations, hash verification, local backup/restore.
- [State compatibility](../../src/library/state.ts): stable source component keys and conservative resume.
- [Orientation](../../src/library/orientation.ts): single reversible root and oriented assembled bounds/matrices.
- [Catalog](../../src/library/catalog.ts): exact accepted sources and provenance.
- [Shared preview](../../src/library/preview.ts): one lazy renderer, cancellable loading, frame/resize/resource diagnostics.
- [Collection UI](../../src/library/Library.tsx) and [styles](../../src/library/library.css).
- [App integration](../../src/App.tsx): routes, explicit save, periodic changed-state save, status/error handling and resume.
- [Existing Viewer](../../src/Viewer.tsx): suspended RAF, source-safe consistent thumbnail rendering on its own renderer, root-aware clipping/export.
- [Repository unit tests](../../src/library/repository.test.ts), [orientation unit tests](../../src/library/orientation.test.ts), [real-browser workflows](../../tests/library.spec.ts).

No source geometry or available STEP body was approximated/redrawn. The sample list contains exactly the intended four entries, not private workspace models.

## Screenshots

- [Explore desktop](../../artifacts/screenshots/library-checkpoint3/05-explore-desktop.png)
- [Personal library](../../artifacts/screenshots/library-checkpoint3/03-personal-library.png)
- [Live preview](../../artifacts/screenshots/library-checkpoint3/06-active-preview.png)
- [Saved STEP after reload](../../artifacts/screenshots/library-checkpoint3/02-step-after-reload.png)
- [Textured OBJ after reload](../../artifacts/screenshots/library-checkpoint3/04-textured-obj-restored.png)
- [Orientation + measurement export](../../artifacts/screenshots/library-checkpoint3/07-oriented-measurement-export.png)
- [Save failure, temporary view retained](../../artifacts/screenshots/library-checkpoint3/08-save-failure-temporary.png)
- [Storage unavailable](../../artifacts/screenshots/library-checkpoint3/09-storage-unavailable.png)
- [Phone Explore](../../artifacts/screenshots/library-checkpoint3/10-explore-phone.png)
- Accepted sample geometry pairs: [Axis-1 original](../../artifacts/screenshots/library-checkpoint3/samples/axis-1-original.png), [planetary separated](../../artifacts/screenshots/library-checkpoint3/samples/planetary-separated.png), [bevel separated](../../artifacts/screenshots/library-checkpoint3/samples/bevel-separated.png), [train original](../../artifacts/screenshots/library-checkpoint3/samples/train-original.png).

## Remaining boundaries, not hidden blockers

- Stored data remains **on this browser profile/device/origin**. Best-effort browser eviction or cleared site data can remove it. Backups are required for durable/cross-device transfer; there is no automatic cloud sync.
- The database stores raw originals and re-derives geometry on reopening/first hover. There is no persistent tessellation cache; STEP hover can have a cold-loading delay. Only the active card is parsed/rendered.
- Concurrent tabs use atomic metadata patches, but the last saved inspection state wins; no collaborative editing/conflict merge is claimed.
- Incompatible state is deliberately not overwritten; reopening originals remains possible, and backup preserves prior data. Malformed record/schema errors protect the collection instead of silently clearing it.
- ZIP import has schema/hash and size guards (160 MB input / 200 MB declared expanded limit), but the app is not a hardened hostile-archive/file sandbox.
- Large existing main chunk remains about **1,034 KB raw / 377 KB gzip**, with a build warning. This checkpoint adds no speculative quality/performance claims.
- Safari/Firefox, real-device touch, screen-reader review and sustained low-power GPU performance remain unverified. X-ray remains conventional alpha visualization; sections/measurements remain tessellated mesh tools, not exact B-rep metrology.

No functional Checkpoint 3 blocker remains in the tested local Chrome workflow. Ready for review; not deployed.
