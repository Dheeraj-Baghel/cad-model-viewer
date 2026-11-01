# Homepage motor restored on the right

## Current user direction

The centred/older-gearbox experiment was rejected. The homepage must use the existing **65-part Axis-1 motor/planetary actuator on the right**, with the editorial text on the left. Do not substitute the compact blue gearbox or centre the subject again. The experimental homepage-only source was removed; source model, authored disassembly paths, original camera safe rectangle and library sample remain the established ones.

Exploded labels are retained as requested in the preceding feedback:

- Upper cover, carrier, stator, output flange, encoder and case labels persist through both the overview and the final workspace chapter.
- Leaders track actual component positions. Labels no longer disappear when a ray through a hollow cover/bearing centre hits a different part.
- Labels use the available right-hand stage and avoid the active text. Phone callouts stay beneath the copy; two are shown to avoid crowding.
- Clicking a label still selects its real part. Selection, reverse scrolling, same-canvas viewer handoff and the reduced-motion alternative remain operable.

## Verification

- Strict TypeScript and production build pass; **66 unit tests pass**.
- **26/26 production Chrome workflows pass in one final run, zero retries**: [results](../artifacts/testing/homepage-motor-restored-final-results.json). Includes original viewer/library/appearance/Explore native-scroll regression coverage plus two new [homepage checks](../tests/homepage.spec.ts).
- Eighteen existing viewer/story axe surfaces report zero violations in the final run. Earlier runs caught a missing role on the label group and an existing reduced-motion slider-reset bug; both were corrected and the complete suite rerun.
- The slider fix seeks GSAP before assigning the exact progress so a lazy tween cannot capture the first nonzero slider position as its initial state. Returning to zero now returns the exact assembled transforms.
- Final run avoids repeated page screenshot capture only; all behavioral, native input, storage, export, pixel/equivalence and accessibility checks remain enabled. Saved desktop/phone images were visually inspected.

## Images

- [Restored right-hand motor](../artifacts/screenshots/homepage-motor-restored/1440-0.png)
- [Final exploded view with six labels](../artifacts/screenshots/homepage-motor-restored/1440-97.png)
- [Phone labels below the copy](../artifacts/screenshots/homepage-motor-restored/390-90.png)

Explore, library storage, imports and source geometry were not redesigned or reset. No deployment or unrelated application changes. Physical devices and other browsers remain unverified.
