# Documentation map

Use this index to find planning specs, engineering notes, and reference data. Application code lives under `src/`; this folder is **non-runtime** documentation and supporting material.

## Planning and execution

| Document | Purpose |
|----------|---------|
| [planning/FIELD_APP_TECHPULSE_AZURE_README.md](planning/FIELD_APP_TECHPULSE_AZURE_README.md) | Execution guide: screens, event families, Azure mapping, pipeline |
| [planning/IMPLEMENTATION_PLAN.md](planning/IMPLEMENTATION_PLAN.md) | Phased engineering plan (foundation → capture → Azure) |
| [planning/CURSOR_FIELD_APP_ITERATIONS.md](planning/CURSOR_FIELD_APP_ITERATIONS.md) | Ordered iteration checklist and Cursor prompt template |
| [planning/CURSOR_FIELD_APP_ITERATION_AUDIT_README.md](planning/CURSOR_FIELD_APP_ITERATION_AUDIT_README.md) | How to audit implementation against iterations + contracts |

## Reference packages (repo root)

These stay at the repository root because tooling and manifests use stable paths:

- **`TechPulse_Full_Lineage_Atlas_Package/`** — TechPulse lineage, model/datapoint catalogs
- **`Azure Analysis/`** — JSON event schemas, canonical manifest, ingestion/coverage docs (`npm run validate:canonical-manifest` reads from here)

## Field Nation (buyer API context)

- [field-nation/README.md](field-nation/README.md) — work order lifecycle notes (not the field app’s canonical event source of truth)

## Engineering notes inside `src/`

| Location | Topic |
|----------|--------|
| `src/docs/` | Error handling, observability, auth hardening |
| `src/API_CLIENT_INTEGRATION.md` | API client integration |
| `src/MSW_SETUP_GUIDE.md` | Mock Service Worker setup |
| `src/TYPESCRIPT_MIGRATION.md` | TypeScript migration notes |
| `src/azure-functions/README.md` | Azure Functions stub for evidence processing |
| `public/handoff/` | Handoff assets (OpenAPI, starters, design tokens) |

## Scripts and CI

- **`scripts/`** — `validate-canonical-manifest.mjs`, `a11y-check.cjs` (axe + Puppeteer)
- **`.github/workflows/fieldapp-contracts.yml`** — lint, manifest validation, Vitest, accessibility job on built `dist/`
