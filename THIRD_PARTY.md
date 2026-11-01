# CADmium — assets and dependency notices

## Showcase assembly (Axis-1 actuator)

- **Gearbox core (10 solids):** the Innerscene *Three-planet 4:1 gearbox open assembly*.
  - Source: [Innerscene](https://www.innerscene.com/tools/library/3d-parts/three-planet-4-1-gearbox-open-assembly-2dfb48c4).
  - License: **CC0 1.0** public domain dedication, as stated on the page and in its JSON-LD `license` field. No attribution is required, but it is given here.
  - Downloaded 2026-10-21. The unmodified STEP is kept at `artifacts/asset-eval/planetary-open.step`.
  - Tessellated offline by [scripts/build-showcase.cjs](scripts/build-showcase.cjs) with occt-import-js into [gearboxData.ts](src/showcase/gearboxData.ts), keeping the exact B-rep normals.
- **Additions (55 parts):** authored for this project in [actuator.ts](src/showcase/actuator.ts):
  - Cover, O-ring and end plate.
  - 608 and 6804 bearings (races, balls, cage, seals).
  - Shaft, BLDC motor (flange, can, stator, windings, rotor, 10 magnets, end cap), encoder board and ISO 4762-style screws.

The screw threads are display rings, not true helices. The assembly is illustrative: no load rating, tolerance class or kinematic validation is claimed.

The studio lighting is a procedural softbox scene built from Three.js primitives. No HDRI file is used. App copy and identity were authored for this project.

## Checkpoint 3 curated collection — exact sources verified 24 October 2026

The collection uses the existing project-authored Axis-1 plus these independently verified **CC0-1.0** sources. No model, thumbnail, copy or code from the reference CADmium site was copied. Thumbnails were rendered by this app from the actual accepted source geometry.

- **Open planetary gearbox:** [source page](https://www.innerscene.com/tools/library/3d-parts/three-planet-4-1-gearbox-open-assembly-2dfb48c4), [exact STEP endpoint](https://www.innerscene.com/api/library/three-planet-4-1-gearbox-open-assembly-2dfb48c4/download), [local provenance and hashes](public/samples/planetary/manifest.json).
- **Right-angle bevel gearbox:** [source page](https://www.innerscene.com/tools/library/3d-parts/bevel-gearbox-8f8cea23), [exact STEP endpoint](https://www.innerscene.com/api/library/bevel-gearbox-8f8cea23/download), [local provenance and hashes](public/samples/bevel/manifest.json).
- **Electric city train / Kenney Train Kit 1.1:** [official page](https://kenney.nl/assets/train-kit), [exact archive](https://kenney.nl/media/pages/assets/train-kit/cf8521d625-1727040883/kenney_train-kit.zip). Bundled source entries: `Models/OBJ format/train-electric-city-a.obj`, its MTL and `Models/OBJ format/Textures/colormap.png`, unmodified. [Archive license](public/samples/train/License.txt), [local provenance and hashes](public/samples/train/manifest.json). Additional credits Guus Vermeulen and Tony Schaer are retained. OBJ units are unspecified; mm is an explicitly labelled display assumption, not real train scale.

Innerscene's individual pages declare CC0 in JSON-LD and visibly state: “Free to use, modify and redistribute for any purpose, including commercially, with no credit required.” [Library terms](https://www.innerscene.com/tools/library/terms). Kenney's official page links [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) and its downloaded archive license permits personal, educational and commercial use; credit is voluntary. Attribution is supplied nevertheless in every card's Source & license disclosure and manifest.

The user's g-clamp and phone stand are **excluded** from bundled/public samples. CAX-IF STEP fixtures remain test-only and were not placed under public. [Sample geometry/texture/separation/performance acceptance](artifacts/testing/library-checkpoint3/sample-acceptance.json) documents the actual browser checks.

### Additional dependencies

- **fflate 0.8.3:** MIT; existing installed library now declared as a runtime dependency for local ZIP backup/restore. [Upstream](https://github.com/101arrowz/fflate).
- **fake-indexeddb 6.2.6:** Apache-2.0, dev dependency only, imported only by repository unit tests. It is not a production storage replacement and does not enter the Vite app import graph. [Upstream](https://github.com/dumbmatter/fakeIndexedDB).

## Local fonts (existing notices)

Google font distribution, served locally under SIL OFL 1.1:

- Space Grotesk Medium: [asset](public/fonts/space-grotesk-medium.ttf), [license](public/licenses/space-grotesk-OFL.txt), [source](https://github.com/google/fonts/tree/main/ofl/spacegrotesk).
- IBM Plex Sans Regular/Semibold: [regular](public/fonts/ibm-plex-sans-regular.ttf), [semibold](public/fonts/ibm-plex-sans-semibold.ttf), [license](public/licenses/ibm-plex-sans-OFL.txt), [source](https://github.com/google/fonts/tree/main/ofl/ibmplexsans).
- IBM Plex Mono: [asset](public/fonts/ibm-plex-mono.ttf), [license](public/licenses/ibm-plex-mono-OFL.txt), [source](https://github.com/google/fonts/tree/main/ofl/ibmplexmono).

## Open Cascade and STEP pipeline

**occt-import-js 0.0.23**, by kovacsv, declares LGPL-2.1. The supplied unmodified JavaScript/WASM distribution and Open Cascade notice are copied from its npm package:

- [JavaScript bridge](public/occt/occt-import-js.js)
- [WASM binary](public/occt/occt-import-js.wasm)
- [occt-import-js license](public/occt/license.occt-import-js.txt)
- [Open Cascade license](public/occt/license.occt.txt)
- [Corresponding upstream source, build instructions and repository](https://github.com/kovacsv/occt-import-js)
- [Versioned npm package](https://www.npmjs.com/package/occt-import-js/v/0.0.23)

Keep notices and source/build references with any redistributed deployment. The classic [STEP worker](public/occt/step.worker.js) is project-authored glue; no upstream WASM modifications were made. The replaceable local WASM and bridge are loaded on demand and not statically embedded in the application bundle.

Tests use cube-unit and CAX-IF STEP fixtures from the installed occt-import-js package; they are not advertised as original CADmium designs or runtime sample assets. Model files supplied by the user remain subject to their own rights/licenses.

## Other dependencies

- React / React DOM: MIT.
- Three.js, RoomEnvironment, OrbitControls, STL/OBJ/MTL loaders: MIT.
- Lucide icons: ISC.
- GSAP / ScrollTrigger: follow the [GSAP standard license](https://gsap.com/standard-license/); no assumption that it uses MIT.
- TypeScript, Vite, Vitest, Playwright and axe: installed development/test packages carry their respective notices.

See [resolved versions](package-lock.json).

## Reference patterns studied

- [Teenage Engineering OP–1 field](https://teenage.engineering/products/op-1): isolated product focus, generous space, quiet product/editorial continuity. Official page title was fetched in reference research.
- [Onshape view-only toolbar](https://cad.onshape.com/help/Content/Collaboration/using_the_view_only_toolbar.htm): compact navigation and inspection controls.
- [Onshape view navigation](https://cad.onshape.com/help/Content/View/view_navigation_and_the_view_cube.htm): canonical camera views.
- [Autodesk viewing toolbars](https://help.autodesk.com/cloudhelp/ENU/Collab-Home/files/using-the-viewer/Design_Collab_Viewing_Toolbar.html): model browser and contextual inspection. Autodesk Fusion presentation was considered in web research; no product artwork was copied.

CADmium is not affiliated with those companies. Product UI references do not imply identical CAD functionality, exact geometry precision or format coverage.
