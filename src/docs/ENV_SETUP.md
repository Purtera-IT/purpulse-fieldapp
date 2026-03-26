# PurPulse — Environment Variable Setup
**Read this before asking "why are mock jobs showing?"**

---

## The Single Most Important Thing

Vite **bakes env vars into the bundle at build time**. Changing a variable without republishing does nothing.
After editing any `VITE_*` variable → **Publish the app again**.

---

## Minimum Variables Required to See Real Azure Jobs

Set these in **Base44 Dashboard → Code → Environment Variables** (not in a `.env` file — those are local only):

| Variable | Value | Purpose |
|---|---|---|
| `VITE_USE_ASSIGNMENTS_API` | `true` | Switches job list from Base44 entities → Azure API |
| `VITE_AZURE_API_BASE_URL` | `https://api-test.purpulse.app` | Azure Function App base URL (no trailing slash) |

Without both of these set AND a fresh publish, `getJobs()` always falls back to `base44.entities.Job.list()` — the demo rows.

---

## If Your Azure API Requires an Entra Token (Typical)

| Variable | Value |
|---|---|
| `VITE_USE_ENTRA_TOKEN_FOR_AZURE_API` | `true` |
| `VITE_ENTRA_CLIENT_ID` | Azure app registration Client ID |
| `VITE_ENTRA_TENANT_ID` | Azure Directory (Tenant) ID |
| `VITE_ENTRA_API_SCOPE` | e.g. `api://{client-id}/Assignments.Read` |
| `VITE_ENTRA_REDIRECT_URI` | `https://zippy-field-flow-pro.base44.app` (optional, defaults to `window.location.origin`) |

If `VITE_USE_ENTRA_TOKEN_FOR_AZURE_API` is not `true`, the client falls back to the Base44 session token for Azure API calls (only works if your Azure Function accepts Base44 JWTs).

---

## Verification Checklist (Browser DevTools)

After a fresh publish with variables set:

1. Open **Network tab** in DevTools
2. Reload the FieldJobs page
3. You should see requests to `api-test.purpulse.app/api/me` and `.../api/assignments`
4. If you only see Base44 domains → env vars are not in the build yet → republish

**Still seeing mock jobs after that?**
- Check `/api/me` response: is `internal_technician_id` present?
- Check `/api/assignments` response: are there assignment rows?
- If `/api/assignments` returns `[]` → the technician is in Postgres but has no assigned WOs in Field Nation
- If `/api/me` returns 404 → email mismatch between Entra JWT and `technicians.email` in Postgres

---

## Diagnostic Page

Navigate to `/EnvDiagnostic` in the app (visible only in the app, not externally) to see exactly which flags are active in the current build without opening DevTools.

---

## Local Development

Create `src/.env.local` (git-ignored):

```bash
VITE_USE_ASSIGNMENTS_API=true
VITE_AZURE_API_BASE_URL=https://api-test.purpulse.app

# Optional: Entra token for Azure API
VITE_USE_ENTRA_TOKEN_FOR_AZURE_API=true
VITE_ENTRA_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_ENTRA_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_ENTRA_API_SCOPE=api://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/Assignments.Read

# Dev/staging only — allow URL access tokens for Cypress
VITE_ALLOW_URL_TOKEN=true
```

---

## CORS

Your Azure Function App must allow the Base44 app origin:

```
https://zippy-field-flow-pro.base44.app
```

Add it under **Function App → CORS** in Azure Portal, or in your `host.json`:

```json
{
  "extensions": {
    "http": {
      "cors": {
        "allowedOrigins": ["https://zippy-field-flow-pro.base44.app"]
      }
    }
  }
}
``