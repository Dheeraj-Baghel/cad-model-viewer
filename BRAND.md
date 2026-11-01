# CADmium — continuous mechanical inspection

## Brief and inherited assets

The user named the app CADmium and requested a continuous assembly-led scroll landing that enters a focused CAD viewer without rebuilding the scene. Existing FORMA brand assets and local fonts were inspected before coding, so no missing-brand confirmation was needed. Retain the mineral foundation but give CADmium a quieter editorial identity.

The one persistent scene starts assembled, approaches closer, separates cover/carrier, then gears, shaft/bearings and housing, ending in a readable exploded hold. One GSAP ScrollTrigger master timeline owns the reversible choreography. Explore model pauses guidance; Resume story restores current progress. Reduced motion provides stable geometry with explicit controls.

The viewer requires real local STL, STEP/STP via Open Cascade/WASM and OBJ/MTL/textures. Measurements must be described as mesh-derived, not exact CAD metrology. The procedural demo is illustrative, not sourced/manufacturing-validated hardware. Existing unrelated projects remain untouched.

## Palette

- Graphite `#17242D`: primary typography and engineering identity.
- Titanium `#586C7A`: secondary labels, verified against light surfaces in the original brand loop.
- Glacier `#EDF3F5`: uninterrupted studio/app foundation.
- Porcelain `#FFFFFF`: workspace controls and light tool surfaces.
- Instrument blue `#1769D2`: actions, datum, selected states.
- Copper `#A44923`: restrained technical axis accent.

Dark viewer surfaces and accessible light-blue control variants use CSS tokens. Landing retains its deliberately light mineral identity.

Typography: **Space Grotesk** for identity and spatial headings; **IBM Plex Sans** for editorial copy and controls, with **IBM Plex Mono** for technical values. All are locally hosted with OFL notices.

Voice: precise, calm and useful—an inspection instrument with editorial clarity.

Signature: one machined assembly in a controlled studio, a blue datum and fine progress/technical rails. Boldness lives in the subject, not gradients or repeated cards.

## Pattern library

- **Persistent product-led opening:** complete assembly prominently visible in the first screen; immediately communicates the app's subject.
- **Continuous editorial story:** five real stages of inspection, no disconnected background blocks or feature-card grid. Desktop text occupies left negative space; mobile text uses a fixed reserved band after verification found overlap.
- **Contextual annotations:** sparse projected part labels and selected-component descriptions; not pop-ups on every movement.
- **Focused workspace:** compact toolbar, collapsible real mesh/hierarchy tree and properties, mobile drawers.
- **Local file import:** explicit formats, units, conversion stages, cancel/error recovery and privacy boundary.

Studied Teenage Engineering's isolated product presentation, Onshape view-only/navigation documentation and Autodesk viewport/tool references. See [source notices](THIRD_PARTY.md).

## Motion

One 750 ms ease-out hero editorial accent; 200 ms UI transitions. Scroll-scrubbed assembly movement follows the master timeline rather than independent section entrances. The timeline has purposeful pauses; reversing follows original transforms. Reduced motion disables scroll animation and essential text is not initially animation-hidden.

## Verification budget and status

Complete app, desktop 1440 and phone 390 browser round, one batch of fixes, one confirming round, stop. **8 unit tests, 7 browser workflow groups, 13 axe surfaces with zero detected violations** passed in the confirming round. A captured early blank mobile viewer-entry frame remains a visual release check; it is documented instead of silently claiming complete transition verification. See [verification](VERIFICATION.md).
