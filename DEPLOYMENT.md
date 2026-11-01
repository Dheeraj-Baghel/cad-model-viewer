# CADmium deployment

## Live services

- **Production:** https://cad-model-viewer.vercel.app
- **Vercel project:** `softtech10/cad-model-viewer`
- **Private source:** https://github.com/Dheeraj-Baghel/cad-model-viewer
- **Production branch:** `main`

The repository is connected to Vercel. Pushing to `main` starts an automatic
production deployment. Preview deployments are available through normal
Vercel Git workflows.

## Reproducible build

- Vercel preset: Vite
- Node: `24.x` (declared in `package.json`)
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`
- No application environment variables, backend, database, account or paid
  service is required. Imported models and the model library remain in the
  visitor's browser.

Before publishing this deployment:

```text
npm ci
npm test       # 80/80 unit tests
npm run build  # strict TypeScript + Vite production build
npm audit      # 0 findings after Vite 6.4.5 patch
```

The cloud build also completed successfully. Public HTTP checks returned 200
for the application, favicon, Open Cascade worker/WASM and bundled STEP sample.

## Hosted verification

A bounded fresh-browser check against the production URL passed **8/8**:

1. production document/title loads
2. 65-part Axis-1 showcase initializes
3. four-item Explore catalogue loads
4. real bundled STEP sample opens (21 parts)
5. local OBJ upload/import works
6. desktop has no page/console errors
7. mobile Explore has four cards and no horizontal overflow
8. mobile has no page errors

The existing full Playwright suite was also attempted against production. It
reached 24/38 passes, but then filled the machine's remaining disk with retained
traces/screenshots (`ENOSPC`), causing cascading and timing failures. Those
ignored artifacts were removed. Treat the bounded 8-check run plus the complete
local unit/build gate as the valid release evidence; do not report the partial
hosted run as a product failure or a full hosted pass.

## Safe updates

```bash
cd cad-model-viewer
npm ci
npm test
npm run build
git add -A
git commit -m "Describe the change"
git push origin main
```

Vercel then deploys the pushed commit automatically. Confirm deployment status
with:

```bash
npx vercel inspect https://cad-model-viewer.vercel.app
```

Do not commit `node_modules`, `dist`, Playwright outputs, temporary scripts,
`.vercel`, local environment files, or user-imported CAD models. These paths
are excluded by `.gitignore` / `.vercelignore`.
