# purpulseAssignmentsProxy

Forwards technician calls to PurPulse Azure API so the **SPA does not need `VITE_AZURE_API_BASE_URL` at build time** (Base44 Secrets are server-only).

## Secrets (Base44)

| Name | Example |
|------|---------|
| `PURPULSE_API_BASE_URL` | `https://api-test.purpulse.app` |
| or `AZURE_API_BASE_URL` | same |

## Routes (after Base44 maps the function)

- `GET .../me` → upstream `GET {base}/api/me`
- `GET .../assignments?assigned_to=...` → upstream `GET {base}/api/assignments?...`

The browser sends `Authorization: Bearer <Entra or API token>`; this handler forwards it unchanged.

## Frontend

**Base44-hosted (`*.base44.app`):** `src/lib/purpulseApiConfig.ts` turns on the same-origin proxy automatically when `VITE_AZURE_API_BASE_URL` is not in the bundle (no bake-time `VITE_*` required). Opt out with `VITE_USE_ASSIGNMENTS_API=false`.

**Other hosts:** set **`VITE_USE_ASSIGNMENTS_API=true`** and either **`VITE_AZURE_API_BASE_URL`** (direct) or **`VITE_USE_PURPULSE_ASSIGNMENTS_PROXY=true`**, plus optional **`VITE_PURPULSE_PROXY_PATH`** if not `/mock/api/purpulse`.

Do **not** put the Azure API URL in the client when using proxy mode — only the Deno function needs **`PURPULSE_API_BASE_URL`** in Secrets.
