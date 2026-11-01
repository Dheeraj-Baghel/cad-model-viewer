# Explore interaction correction — native scrolling and model clicks

The user reported that Explore appeared unresponsive. This was a real implementation bug missed by the original CP3 checks, not a browser setup problem.

## Reproduced

- Both the running development app (4326) and production preview (4340) kept `viewer-mode` on Explore's outer shell. That class sets `height:100dvh; overflow:hidden`.
- At 1440×900 the document's scroll height was exactly 900, and a real mouse-wheel event left `scrollY` at 0. Content below the first screen was clipped. Reproduced via direct URL and story → Explore.
- Header navigation/search controls received clicks, but model pictures/titles had no open action: only the small arrow button opened a model. Many important controls were below the clipped screen.
- Earlier Playwright locator actions could programmatically scroll an overflow-hidden ancestor. They therefore did not prove that ordinary wheel/touch navigation worked. The previous completion report overstated interaction coverage.

## Corrected

- Explore and Your Library now use a separate normal-flow `collection-mode`, not the viewport-locked CAD viewer layout.
- The retained main canvas/workspace are hidden and **inert** while browsing, with their existing render suspension preserved. They remain mounted and become interactive again in the viewer.
- The whole model image is a native accessible button, not just its arrow. Model titles also open the model. Favorite, Preview, license, rename and delete actions remain separate.
- No storage/schema, imported source, material, geometry or inspection-state changes.

## Verified on the corrected production build

- Strict TypeScript/Vite build and **66/66 unit tests pass**.
- **24/24 browser workflows pass together without retries**, including all original appearance/library/viewer regressions and three new real-input checks. [Release results](../../artifacts/testing/explore-interaction-fix-release-results.json).
- New [regression tests](../../tests/collection-interaction.spec.ts) use native wheel input, pointer coordinate hit-tests and Chrome touch-event swipes/taps—not forced clicks or scrollIntoView—to reach below-fold content, open images/titles, navigate tabs, open/close import and return between viewer/story/collection.
- [Desktop real-input record](../../artifacts/testing/explore-interaction-fix/desktop.json).
- Visually inspected [below-fold model reached by wheel](../../artifacts/screenshots/explore-interaction-fix/desktop-bottom-model-reachable.png) and [phone after touch scrolling](../../artifacts/screenshots/explore-interaction-fix/phone-native-touch-scroll.png).

Chrome native ANGLE/Metal was used. Phone touch is browser emulation, not physical-device testing. The final all-workflow run reuses captured screenshots only; all behavior, export, persistence, pixel/equivalence and accessibility assertions remain enabled. No deployment or other application changes.
