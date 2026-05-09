# CogniBoost — Operations Guide

**Audience:** Whoever operates the platform day-to-day after handover (manager + any developer they engage).
**Companion:** `HANDOVER_OVERVIEW.md` (executive summary), `OPERATIONS_PROTOCOL.md` (legacy document, still applicable for change management), `DEPLOYMENT.md` (legacy deployment-detail doc).

---

## How the Site Goes Live

1. Code lives at `github.com/creaactivai/Cogniboost`, branch `main`.
2. Pushes to `main` automatically trigger:
   - Railway: build via Nixpacks (`npm ci --include=dev` → `npm run build`) → start with `npm run db:push && node dist/index.cjs`. Migrations auto-apply. New code is live ~3–4 min after merge.
   - Vercel: builds the frontend in parallel and deploys it.
3. There is **no separate "deploy" button**. Merging to main = deploying.

## Daily / Weekly Health Checks

| Cadence | Check | How |
|---|---|---|
| Daily | Site responds | Open `cogniboost.co` and click into a course |
| Daily | Latest deploy succeeded | Railway → Deployments → top item should be ✅ ACTIVE |
| Weekly | OpenAI credits balance | platform.openai.com → Billing → balance > $5 |
| Weekly | Stripe webhook deliveries | Stripe → Developers → Webhooks → check failure rate |
| Weekly | Sentry errors | Sentry project → unresolved errors in last 7 days |
| Monthly | Domain expiration | Registrar → cogniboost.co renewal date |
| Monthly | Apple Developer renewal | Apple Developer Program: $99/year |

A `health-check/` folder exists in the repo with weekly maintenance scripts — see `health-check/README.md` if present.

## Common Issues — Symptom → Fix

### "Quiz generation fails with an error"

Most likely:
1. **OpenAI account out of credits** → Add credits at platform.openai.com → Billing.
2. **OpenAI API key revoked** → Rotate key on OpenAI, update `AI_INTEGRATIONS_OPENAI_API_KEY` in Railway Variables.
3. **`AI_INTEGRATIONS_OPENAI_BASE_URL` is set** → It must be unset/deleted on Railway. If set, all OpenAI calls route to a dead Replit proxy.

The new validation (PR #1) surfaces the actual OpenAI error message to the admin. Read it — the cause is almost always in the message text.

### "Customer paid but is still on Free tier"

Almost always one of:
1. **Webhook didn't fire** — Resend the latest `customer.subscription.updated` event from Stripe Dashboard → Customer page → Events → ⋯ → Resend.
2. **Stripe customer was deleted/duplicated and our DB has the dead ID** — Resending an event from the surviving customer triggers PR #2's `findUserForCustomer` helper, which falls back to email lookup and rewrites the stored customer ID.
3. **Two user rows with the same email** (guest checkout + later registration) — Manual DB merge required. SQL pattern:
   ```sql
   -- Identify both rows
   SELECT id, subscription_tier, stripe_customer_id, password_hash IS NOT NULL AS has_pw, created_at
   FROM users WHERE email = '<user_email>' ORDER BY created_at;

   -- Promote the row that has the password (the one she logs into)
   UPDATE users SET subscription_tier='premium', status='active', stripe_customer_id='<live_cus_id>', updated_at=now()
   WHERE email='<user_email>' AND password_hash IS NOT NULL;

   -- Delete the orphan
   DELETE FROM users WHERE email='<user_email>' AND password_hash IS NULL AND stripe_customer_id <> '<live_cus_id>';
   ```
   Then have the user log out and back in.

### "Cannot login on iPhone but works on desktop"

Already fixed in PR #2 (`sameSite: 'lax'` on session cookie). If it recurs, it means an OAuth callback is using a different domain than the cookie was set for — check `GOOGLE_CALLBACK_URL` and `APPLE_CALLBACK_URL` env vars are on the same domain as `APP_URL`.

### "Brute-force or spam abuse on login or checkout"

Already fixed in PR #4 (rate limiters mounted on the correct paths). Limits:
- Login: 5 attempts / 15 min per IP
- Checkout: 10 attempts / hour per IP

If genuine users are getting limited, raise the cap in `server/middleware/security.ts`.

### "Site looks stale despite recent merge"

1. Railway → Deployments → confirm the latest commit is ACTIVE.
2. If deploy is FAILED, click "View logs" — the failure is almost always one of:
   - Missing env var (build crashes on env validation)
   - npm install fails (network blip — retry by clicking "Redeploy")
   - TypeScript error (rare — Vercel CI catches these on PR)
3. If deploy is succeeding but UI is stale, ask the user to hard-refresh (Cmd+Shift+R) — Vercel sometimes serves cached assets briefly.

### "Stripe webhook event arrives twice and applies twice"

Already prevented by PR #3's `stripe_webhook_events` table. If you suspect a stuck event, query:
```sql
SELECT * FROM stripe_webhook_events ORDER BY processed_at DESC LIMIT 20;
```
To force a re-process, delete the row by `event_id` and replay from Stripe.

## Incident Response Order of Operations

1. **Site down (5xx everywhere):** Check Railway → Deployments. If the active deploy crashed, redeploy the previous successful one (Railway → ⋯ → "Redeploy this version").
2. **Database error:** Check Railway Postgres add-on metrics. If at storage cap, upgrade plan. If connections exhausted, restart the service.
3. **Stripe webhook failures:** Stripe → Developers → Webhooks → click endpoint → see failed deliveries. Common causes: webhook secret rotated but not updated in Railway env (`STRIPE_WEBHOOK_SECRET`), or our endpoint URL changed (Stripe still pointing at old domain).
4. **OpenAI failures (quizzes/AI tutor):** platform.openai.com → status / billing.

## Deploying Changes

The recommended workflow once handover is complete:

```bash
# 1. Make changes on a branch
git checkout -b fix/short-description
# edit files
git add . && git commit -m "fix: short description"
git push -u origin HEAD

# 2. Open a PR
gh pr create --title "fix: ..." --body "..."

# 3. Wait for Vercel preview to go green
gh pr view --web

# 4. Merge
gh pr merge --squash

# 5. Watch Railway deploy
# Railway dashboard → Deployments → wait for ACTIVE
```

**Never push directly to main.** Always go through a PR so Vercel CI catches type errors before they hit production.

## Environment Variables — Reference

These live in **Railway → Service → Variables** (not in the repo). The full list:

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `SESSION_SECRET` | Yes | Cookie signing — random 64-byte hex |
| `APP_URL` | Yes | e.g. `https://cogniboost.co` |
| `APP_BASE_URL` | Yes | Same as APP_URL or with port |
| `STRIPE_SECRET_KEY_BOOST` | Yes | Stripe API secret (`sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY_BOOST` | Yes | Stripe publishable (`pk_live_...`) — also exposed to frontend |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_FLEX` | Yes | Stripe Price ID for Flex plan |
| `STRIPE_PRICE_STANDARD` | Yes | Stripe Price ID for Basic plan |
| `STRIPE_PRICE_PREMIUM` | Yes | Stripe Price ID for Premium plan |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Yes | OpenAI key (`sk-proj-...` or `sk-...`) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | **Must be unset** | Setting this routes to dead Replit proxy |
| `RESEND_API_KEY` | Yes | Resend API key |
| `RESEND_FROM_EMAIL` | Yes | e.g. `noreply@cogniboost.co` |
| `GCS_BUCKET_NAME` | Yes | Google Cloud Storage bucket for audio/PDFs |
| `GCS_SERVICE_ACCOUNT` | Yes | JSON service account credentials |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth |
| `GOOGLE_CALLBACK_URL` | Yes | e.g. `https://cogniboost.co/auth/google/callback` |
| `APPLE_CLIENT_ID` | Yes | Apple Sign-in service ID |
| `APPLE_KEY_ID` | Yes | Apple key ID |
| `APPLE_PRIVATE_KEY` | Yes | Apple private key (multiline) |
| `APPLE_TEAM_ID` | Yes | Apple developer team ID |
| `APPLE_CALLBACK_URL` | Yes | e.g. `https://cogniboost.co/auth/apple/callback` |
| `SENTRY_DSN` | Yes | Sentry project DSN |
| `NODE_ENV` | Yes | `production` |
| `PORT` | Auto | Set by Railway |
| `REPLIT_CONNECTORS_HOSTNAME` | Legacy / harmless | Leftover from Replit hosting; can be deleted later |

## Database — Schema Migration

The schema is defined in `shared/schema.ts` (Drizzle ORM). Migrations are applied on every deploy via the Railway start command:

```
npm run db:push && node dist/index.cjs
```

`db:push` is **idempotent** — running it on a healthy DB does nothing; on a DB missing recent columns, it adds them. There is no separate migrations folder of SQL files; Drizzle generates the diff at runtime.

To make a schema change:
1. Edit `shared/schema.ts`.
2. Push to a branch. PR. Merge.
3. Next deploy applies the change automatically.

⚠️ **Drizzle's push is destructive on column drops/renames.** If you remove a column from the schema, the next `db:push` drops it from the live DB without warning. For destructive changes, drop a manual SQL backup first.

## Lesson + Audio Production Pipeline

Lesson HTML and audio MP3s are produced **outside the app**, then uploaded:

1. Author lesson HTML using prompts in `lesson-factory/MODULE_PROMPT_TEMPLATE.md` (paste into Claude / ChatGPT).
2. Generate audio with `lesson-factory/generate_audio.py` (uses ElevenLabs API for cloned voice).
3. Upload HTML + audio MP3s through the admin dashboard:
   - Lesson HTML: paste into the lesson editor's HTML field.
   - Audio: drag-drop MP3s in the lesson editor's audio section. They go to GCS and the lesson auto-rewrites `AUDIO_BASE_URL` to serve them.

Scale planned: 5 courses × 40 modules × 4 lessons = ~160 lessons total. Each module ~30–35 min to author + audio-generate.

## Backups & Disaster Recovery

- **Postgres backups:** Railway provides automated backups for paid plans. Verify in Railway → Postgres add-on → Backups tab. Take manual backups before any destructive schema migration.
- **Code:** Git repo on GitHub is the source of truth. Forks and clones are backups.
- **GCS files:** No automatic backup. If the bucket is deleted, audio/PDF assets are lost. Consider enabling GCS Object Versioning.

## Where the Sensitive Stuff Lives

- **Secrets:** Railway env vars (not committed to git, never in code).
- **OAuth client secrets:** Google Cloud Console + Apple Developer.
- **Stripe API keys:** Stripe Dashboard → Developers → API keys.
- **Database connection string:** Railway Postgres add-on → Connect tab.

The repo never contains plaintext secrets. If you find one in a commit, **rotate it immediately** and `git filter-branch` it out of history.

## Useful Commands (run from repo root)

```bash
# Local dev (requires .env file with all the vars above)
npm install
npm run dev                   # localhost:8080 (or per env)

# Type check
npm run check

# Build production bundle
npm run build

# Push schema changes (run against the env's DATABASE_URL)
npm run db:push

# Tail Railway logs (after `railway login` + `railway link`)
railway logs --service cogniboost
```

## Known Operational Quirks

1. **Vercel and Railway both build the project.** Vercel only serves the frontend; Railway runs the backend. They share the same git repo. If only the frontend changes, Vercel re-deploys; backend code changes trigger Railway. Both fire on every push to main.
2. **First deploy after env var change** can take ~3–4 min instead of ~2 because Railway re-installs node_modules.
3. **Drizzle's `db:push`** sometimes fails the first time when adding columns with NOT NULL + no default. Workaround: deploy in two steps — add column nullable, backfill, then add NOT NULL.
4. **iOS Safari** has been historically flaky around session cookies. Always test mobile flows on a real iPhone before assuming desktop pass = mobile pass.

---

**For the executive overview see `HANDOVER_OVERVIEW.md`. For the actual ownership-transfer process see `HANDOVER_TRANSFER_CHECKLIST.md`.**
