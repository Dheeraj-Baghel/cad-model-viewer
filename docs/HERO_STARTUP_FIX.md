# Hero starts in its final position - 26 October 2026

## User requirement and cause

The supplied screenshots show the same hero first near the bottom controls and
then higher in the left column. The user prefers rendering directly in that
final position over a rough upward entrance/return animation.

A cold Chrome startup probe reproduced it: the hero initially had a +8 px
transform and y=458 px at 1440 x 900, then settled at y=243.20 px with a
-206.80 px transform. The legacy `hero-accent` keyframes override the fixed
column's -50% centering; when they finish, the transform transition creates a
second upward movement. This was not movement of the motor or native scroll.

## Changes

- Removed the hero's intro animation in [cadmium.css](../src/cadmium.css).
- Active/inactive copy now shares one final transform. Removed transform
  transitions and the phone's 8 px entrance offset. Chapters cross-fade over
  240 ms without a position tween or delayed activation.
- Kept the existing final desktop position, tablet/phone top band, font choices,
  footer handoff and reduced-motion document. No model/camera, storage, import,
  library or viewer implementation changes.
- Added [startup regressions](../tests/hero-startup.spec.ts). The existing
  [homepage geometry tests](../tests/homepage.spec.ts) now wait for the actual
  65-part viewport readiness, rather than treating immediately visible text as
  proof that the lazy model has loaded.

## Verification

- Strict TypeScript/production build pass; **75 unit tests pass**.
- **10/10 focused production Chrome workflows pass**, no retries: cold startup
  with fonts delayed 700 ms, cached reload at 1440 x 900, 1280 x 720, 1000 x 800
  and 390 x 844; reverse chapter navigation; live browser Back from the viewer;
  desktop/phone callouts, reduced-motion slider reset and same-canvas handoff;
  native Explore/Library wheel/touch/click regressions.
- [Final results](../artifacts/testing/hero-startup-focused-final-results.json).
- Per-frame startup samples show only a 0.5 px desktop font-metric adjustment
  (not an animated slide), and **0 px** tablet/phone vertical change. The hero is
  fully opaque on its first sampled frame; after font loading its position stays
  within 1 px. The CTA remains above bottom controls.
- [Desktop render](../artifacts/testing/hero-startup/desktop-final.png) visually
  inspected; motor-right/text-left composition retained.

A broader 31-workflow attempt exceeded the shell's 180-second budget. It also
reported a library camera-resume mismatch and raced the lazy viewport in the
old homepage tests. The homepage readiness race was corrected and both checks
pass in the focused final run; library camera-resume was outside this CSS task
and was not changed. **The full suite is not certified for this change.** The
first software-rendered probe had too few frames because of a long stall; final
runs use native Chrome/ANGLE Metal. Safari/Firefox, physical phones and human
motion review remain unverified. No deployment or unrelated app changes.
