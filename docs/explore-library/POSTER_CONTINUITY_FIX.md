# Static poster / hover continuity correction - 26 October 2026

## User-reported defect and missed coverage

The screenshots show a black actuator with a green cap before hovering, then
bronze/graphite with different framing after hovering. The preceding hover fix
verified the correct 65-part live product and cache identity, but retained an
old static poster. Identity assertions were insufficient to catch this visible
presentation mismatch; the thumbnail should have been compared with the live
first frame before claiming the Explore correction complete.

## Fix

- Regenerated all four catalogue posters through the **actual PreviewController**
  with rotation disabled. Geometry, material policy, studio lighting, initial
  angle, projection and fit are now those used by live hover, not an independent
  thumbnail rendering setup.
- [Poster generation script](../../scripts/build-preview-posters.mjs) records
  model keys/part counts and output hashes in the [generation record](../../artifacts/testing/poster-continuity/generation.json).
- New versioned poster URLs bypass previously cached images. Existing original
  thumbnails/source assets are preserved, not overwritten.
- Explore always uses the current catalogue poster, even if the sample was saved
  with an older personal thumbnail. Your Library retains user-saved thumbnails;
  no stored records or images are migrated/deleted.
- Cleared revoked Blob URLs when a Poster loses its Blob prop, avoiding stale
  image state when switching back to the canonical catalogue image.

## Verification

- TypeScript/production build and **80 unit tests pass**.
- **10/10 focused production Chrome workflows pass**, no retries:
  [results](../../artifacts/testing/poster-continuity-final-results.json).
- New [pixel regressions](../../tests/poster-continuity.spec.ts) compare actual
  browser screenshots of all four cards before and after the live first draw at
  desktop and phone widths, using reduced motion only to hold the camera at its
  initial angle. Mean RGB difference must be below 2/255 and strongly changed
  pixels below 2.5%; this permits rasterization/hover-border differences, not a
  different finish or model scale. Actual rotating hover is covered separately
  by the existing preview workflow.
- [Before](../../artifacts/testing/poster-continuity/1440-axis-1-before.png) and
  [after](../../artifacts/testing/poster-continuity/1440-axis-1-after.png) visually
  inspected: the bronze actuator, cap, base and frame agree.
- Tests inject a visibly wrong stored sample thumbnail and verify canonical
  Explore images survive refresh/reload while Your Library still shows the
  personal thumbnail. Favorites, model/name clicks, model-only hover, smooth
  rotation, cache identity, filtering, native wheel/touch and mobile accessibility
  checks also pass.

No live-renderer/model changes, deployment, storage reset or unrelated app edits.
Other browsers and physical phones remain unverified; this is a focused visual
correction, not a full-app release gate.
