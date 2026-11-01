# CADmium cinematic presentation architecture

## Viewer invariants recorded before integration

- `Viewer.tsx` owns the only `WebGLRenderer`, Three scene, camera pair, `OrbitControls`, render scheduler, raycaster, clipping planes, measurements and GPU disposal.
- The landing and workspace retain the same `Viewer` React instance and canvas. `App.tsx` switches UI modes without replacing the renderer.
- STEP/STP is parsed by the existing local `public/occt/step.worker.js` pipeline using `occt-import-js`. Parser mesh indices, hierarchy, names, face ranges and colors remain the source of imported component structure.
- STL remains one mesh. OBJ groups remain separate only when the parser emits separate meshes. The presentation layer never invents a genuine assembly for a fused solid.
- Engineering state (`ViewOptions`, hidden parts, selection, clipping and measurement points) stays in `App.tsx` / `Viewer.tsx`. Story animation does not write to it.
- Source `Part.origin`, source geometry buffers and imported metadata are immutable from the presentation system's point of view.

## Selected architecture

CADmium uses a persistent single-renderer architecture because the existing viewer was already designed to survive the story-to-workspace handoff. The marketing story and inspection workspace share one renderer, model and asset lifetime, but use separate control modes:

- Story mode disables `OrbitControls` until **Explore model** is selected.
- Workspace mode restores normal orbit/pan/zoom and applies viewer-owned display options.
- The same mesh instances remain selectable; no meshes are merged and no second CAD importer or WebGL context is created.
- Failure of WebGL leaves all HTML content, the viewer CTA and local-file controls available.

## Assembly normalization

`src/presentation/assemblyAdapter.ts` creates a read-only `NormalizedAssembly` index for the current `Model`:

- deterministic assembly and occurrence IDs;
- source part ID and occurrence index;
- parser hierarchy path and parent path;
- immutable snapshots of local/world matrices, positions, quaternions and scales;
- world bounds, centers, units, material names, colors and metadata.

Repeated occurrences remain independent because identity includes hierarchy path and occurrence index. The adapter references real meshes; it does not flatten the hierarchy or duplicate geometry.

## Explosion choreography

`ExplosionController` caches each mesh's assembled position, quaternion and scale once. Every update computes a transform directly from normalized progress:

1. Clamp progress.
2. Map it through the component's activation interval.
3. Apply smoothstep easing.
4. Reconstruct position as `original + axis * distance * amount`.
5. Reconstruct orientation as `originalQuaternion * slerp(identity, authoredRotation, amount)`.
6. Restore original scale.

There is no integration from the previous frame, so forward/reverse scrubbing and repeated updates cannot accumulate drift. `reset()` restores exact cached transforms.

The built-in 37-mesh planetary-drive study uses authored metadata in `featuredAssembly.ts`: cover and fasteners lift first, then carrier, gears, shaft/bearing group and lower housing. It is explicitly an illustrative assembly, not a sourced transmission or validated service sequence.

Arbitrary imported multipart files use deterministic geometry-based separation from the assembly center, bounded by the assembly diagonal. Concentric parts get a stable ID-derived fallback vector. This is a visual spread, not a physically valid disassembly path. A fused STEP/STL remains one component and cannot be genuinely exploded.

## Camera and scroll

`story.ts` owns one GSAP `ScrollTrigger` and one scalar progress value. `frameAtProgress()` derives all story channels from that value. The trigger is scoped by ID and cleanup kills only its own trigger and timeline.

`StoryCameraController` interpolates five authored narrative poses plus the viewer handoff pose. It derives position, target, FOV and clipping planes from assembly bounds and viewport aspect ratio. Orientation is interpolated as quaternions. Mobile uses a simplified, wider framing and a reserved editorial band.

Projected annotations are derived from live part bounds, camera projection and a raycast occlusion check. Labels outside the viewport or behind another component are omitted. Displayed names and descriptions come from model metadata; no material property or dimension is invented.

## Viewer handoff

`App.openViewer()` switches layout state while preserving the existing `Viewer` ref and canvas. Landing animation unmounts, workspace options reset transient explosion/measurement/section state, controls are re-enabled and the model is reframed. Returning to the story restores the saved page scroll and the demo model when an imported private model had been open.

## Development diagnostics

Run development mode with `?debug=1` to expose the non-production diagnostics panel. It includes deterministic story and explosion sliders, component bounds, explosion vectors, component IDs, camera target, annotation toggle, assembled reset and hierarchy inspection.

## Production asset boundary

The homepage currently uses the existing procedural multipart planetary-drive study (37 independently selectable meshes). It is clearly labeled illustrative. No production-authored STEP/GLB showcase asset is present in the repository. When one is approved, keep STEP as the precision/import source and either use its real multipart tessellation or add a curated pre-tessellated presentation asset with an occurrence-ID mapping; do not replace the existing STEP workflow.
