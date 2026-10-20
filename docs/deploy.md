# Deploy from this machine (DEP-1)

How we ship the web apps, and the token situation. Written 20 Oct 2026 because
"deployed" had been a claim nobody could reproduce.

## The token

`weeon-teachers/.env.local` holds `VERCEL_API_KEY` (a Vercel **personal access
token**, 60 chars, account `kingkongfrom` — scope
`eduardos-projects-461f55b8`). It works:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
$v = (Select-String -Path .env.local -Pattern '^VERCEL_API_KEY=(.*)$').Matches.Groups[1].Value.Trim()
vercel whoami --token=$v          # -> kingkongfrom
vercel project ls --token=$v      # -> weeon-teachers, weeon-admin, weeon-marketing, weeon-management, ...
```

The CLI ignores `VERCEL_TOKEN` from the environment on this machine (it reports
"no credentials"); pass `--token=$v` explicitly.

| Repo | Vercel project | Production URL |
| --- | --- | --- |
| `weeon-teachers` | `weeon-teachers` | teachers.weeon.school |
| `weeon-tenants` | `weeon-admin` | app.weeon.school |
| `weeon-marketing` | `weeon-marketing` | www.weeon.school |
| `weeon-management` | `weeon-management` | *-eduardos-projects-461f55b8.vercel.app |

`.vercel/project.json` is committed in each repo, so the CLI links correctly
from any clone (ids are public, not secrets).

## Deploy commands

```powershell
# preview for a repo
vercel deploy --token=$v

# production
vercel deploy --prod --token=$v
```

Without `--prebuilt` the CLI builds remotely; that is fine and avoids needing
the project's env locally.

## CI (`.github/workflows/deploy.yml`, all four Next repos)

Runs on every PR and on `main`/`master`:

- PR → preview deployment + a comment with the URL (the URL is what the
  Playwright smoke uses via `E2E_BASE_URL`).
- `main`/`master` → production.
- **Skips itself** while the `VERCEL_TOKEN` repository secret is absent, so
  nothing goes red before the owner adds it.

Owner action to enable it: GitHub → each repo → Settings → Secrets → Actions →
add `VERCEL_TOKEN` (same value as `VERCEL_API_KEY`). `VERCEL_ORG_ID` /
`VERCEL_PROJECT_ID` are optional; the workflow falls back to the ids committed
in `.vercel/project.json`.

## Mobile (EAS) — still blocked
`weeon-mobile` is not linked to a Vercel project (it is an Expo app). Building it
needs an Expo access token in `EXPO_TOKEN`; `npx eas-cli whoami` reports not
logged in, so until the owner creates the token, mobile ships by hand:

```powershell
npx eas-cli login
npx eas-cli build --profile preview -p android
```

## E2E suite status (20 Oct)

Secrets configured by the owner: `VERCEL_TOKEN`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `E2E_TEACHER_USERNAME/PASSWORD` (`evarela02`),
`E2E_CLASS_ID`, `E2E_ASSESSMENT_ID`; repo variable `E2E_BASE_URL` =
`https://teachers.weeon.school`.

Two **spec** bugs were fixed (the app was fine):

- every journey used `getByLabel(/contraseña|password/i)`, which also matches the
  **Mostrar contraseña** button, so Playwright strict mode aborted. Logins now
  handle the one-form and two-step variants and target `input[type=password]`.
- the gradebook journey edited `data-cell="0:0"`, which is the computed
  **General** aggregate, not a grade column.

Green against production (10): public smoke (3), login smoke, teacher signs in,
gradebook autosave, attendance mark persists, messaging composer validates,
teacher turn-in + photo (the journey that would have caught the 20 Oct
regressions).

**Resolved 20 Oct — the gradebook autosave was never broken.** Row 0's student
has an active Apoyos whose period registro is pending, so the app correctly
refuses the grade and returns the flags (`needsPeriodRegistration: true`). The
journey now edits a student who is not gated, in a column worth ≥5 points (the
save clamps to the column max), and restores the original value.

**Known red — QA-12 (owner decision)**

`a11y` authenticated pages report **color-contrast** (serious) on ~30 elements
across Inicio and the gradebook: `text-foreground/45`–`/55` at 9–10 px in the
gradebook headers and footer, hub card subtitles, and `opacity-75/80` badges.
Two were fixed (header wordmark, sidebar group labels); the rest is a
**design-token pass**. Rule of thumb: `text-foreground/70` or darker below 12 px.

The `e2e` CI job stays red on the a11y checks until QA-12 lands, on purpose. The
behavioural journeys themselves all pass.


