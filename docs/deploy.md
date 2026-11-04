# Deploy — see the canonical doc

There is **one** deploy story for all four Next apps. Do not restate it here — a copy drifted and told people to look for tokens in the wrong repo.

**Canonical:** workspace `docs/index.md` § 4 → [`weeon-tenants/docs/deploy.md`](https://github.com/kingkongfrom/weeon-tenants/blob/master/docs/deploy.md).

Where that file lives depends on how you cloned:

- **Full workspace clone** (`Kingkongfrom/`): `../weeon-tenants/docs/deploy.md`
- **This repo alone**: the GitHub link above, or clone `weeon-tenants` beside it.

## What this repo needs to know

| Item | Value |
| ---- | ----- |
| Vercel project | see `.vercel/project.json` (committed — ids are public, not secrets) |
| Token | `VERCEL_API_KEY` in this repo's `.env.local`; the CLI needs it passed explicitly with `--token=` |
| CI | `.github/workflows/deploy.yml` — previews on PR, production on `main`; skips itself while the `VERCEL_TOKEN` secret is missing |
| Branch | `main` |

Mobile (`weeon-mobile`) does not deploy to Vercel — it ships through EAS, and
EAS is still unauthenticated on this machine (**DEP-1**).
