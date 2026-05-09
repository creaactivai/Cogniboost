# CogniBoost — Transfer Checklist

**Audience:** The outgoing operator (you) and the incoming manager.
**Purpose:** A single, ordered checklist for transferring full ownership of the platform to the client without losing service or leaking credentials.
**Companions:** `HANDOVER_OVERVIEW.md`, `HANDOVER_OPERATIONS_GUIDE.md`.

This document is the **action plan**. The other two documents are **reference material** for the manager to read after the handover.

---

## Phase 0 — Pre-Handover Prep (do this BEFORE meeting with the client manager)

- [ ] **Confirm everything in `HANDOVER_OVERVIEW.md` is accurate** — pricing, costs, vendors, current state.
- [ ] **Confirm the production deploy is healthy** — Railway shows latest commit ACTIVE; cogniboost.co loads; a test login + quiz generation succeed end-to-end.
- [ ] **Run a final smoke test:** create a $1 Stripe test-mode subscription, verify webhook delivery, verify user tier flips to paid, log out + log back in to confirm session reflects it.
- [ ] **Decide what to retain.** Some items (Apple Developer membership, OpenAI account credits, GCS bucket) cannot be cleanly "transferred" — they have to be either re-created on the client side or have ownership swapped at the vendor level. Decide per item below.
- [ ] **Generate a one-time admin credential for the client manager** so they can log into cogniboost.co before identity-provider-level transfers happen.
- [ ] **Schedule a 90-minute live walkthrough** with the client manager. Record it.
- [ ] **Schedule a 30-day post-handover support window.** Decide if this is paid time or included.

---

## Phase 1 — Account Inventory

For every external service, the **owner** is the email or account login that has root/billing access today.

| Service | Today's owner (your account) | Transfer mechanism | Notes |
|---|---|---|---|
| GitHub repo (`creaactivai/Cogniboost`) | Org `creaactivai` | Transfer repo to client GitHub org | After transfer, you can keep collaborator access if continuing as developer. |
| Domain `cogniboost.co` | Your registrar account | Initiate "outbound transfer" to client's registrar account, OR push to client's account at same registrar | Domain transfer takes 5–7 days. Plan accordingly. |
| Railway project | Your Railway account | Railway → Project Settings → Members → invite client → make them owner → remove yourself | Railway supports ownership transfer via team membership. |
| Vercel project | Your Vercel account | Vercel → Project Settings → Transfer to a team | Same pattern as Railway. |
| Stripe account | Your Stripe account | Stripe does NOT support full account transfer between owners | Recommended: client creates new Stripe account, points new live keys + new webhook secret + new Price IDs. Coordinate downtime. |
| OpenAI account | Your OpenAI account | OpenAI does NOT support account transfer | Client creates new OpenAI account, generates new API key, swap in Railway. |
| Google Cloud (GCS bucket + OAuth client) | Your Google Cloud project | Transfer project ownership via IAM | Or have client create a new project + new OAuth client + new GCS bucket and migrate files. |
| Apple Developer Program | Your Apple ID | Apple does NOT support transfer of program enrollment | Client enrolls separately ($99/year); regenerate Sign-in with Apple keys. |
| Resend | Your Resend account | Resend → Settings → Team → invite + transfer | Or new account. |
| Sentry | Your Sentry account | Sentry → Settings → Members → transfer ownership | Or new project. |

**Important:** For the services that can't transfer (Stripe, OpenAI, Apple), the cleanest path is the client creates fresh accounts and you swap the credentials in Railway env vars. The downside: existing Stripe customers cannot follow you to the new account — they'd need to re-subscribe. **If you have paying customers today, consult Stripe support before changing accounts.**

---

## Phase 2 — Pre-Transfer Decisions (with the client manager)

Walk through each row of Phase 1 with the client manager and decide:

- [ ] **Stripe:** new account or keep existing? If keeping existing, what's the path for the client to gain billing access? (Stripe supports adding a co-owner with billing permissions.)
- [ ] **Domain:** does the client want to keep `cogniboost.co` (transfer) or migrate to a different domain they already own?
- [ ] **GitHub repo:** transfer the existing repo, or fork to client org and archive yours?
- [ ] **Apple Developer:** does the client already have an Apple Developer Program membership? If not, they need to enroll ($99/year, ~24h approval).
- [ ] **OpenAI billing:** client provides their own OpenAI key with their own billing, or does invoice continue under your account (with reimbursement)?
- [ ] **Email FROM address:** keep `noreply@cogniboost.co` or change to something at the client's domain?

Document the decisions before doing the actual transfers.

---

## Phase 3 — Transfer Execution Order (do these in this exact order)

The order matters: anything pointing at OAuth callbacks, webhook URLs, or env vars needs to be re-pointed at the new owner's resources sequentially, not in parallel, or the site goes down mid-transfer.

### 3.1 — Repository (lowest risk, no service impact)

1. [ ] In GitHub, transfer `creaactivai/Cogniboost` to the client's org. (Settings → General → Transfer ownership)
2. [ ] In Railway, update the GitHub integration to use the new repo location. (Railway should auto-detect the redirect.)
3. [ ] In Vercel, same thing.
4. [ ] Confirm a no-op commit can still trigger a clean deploy.

### 3.2 — Sentry, Resend, GCS (low-traffic services)

1. [ ] Transfer Sentry project to client's Sentry account. Verify errors still report after transfer.
2. [ ] Transfer Resend account/project. Update `RESEND_API_KEY` in Railway env vars only if a new key was issued. Send a test email to confirm.
3. [ ] Either transfer GCS bucket ownership (Google Cloud IAM) or create a new bucket on client side and migrate files. If new bucket: update `GCS_BUCKET_NAME` and `GCS_SERVICE_ACCOUNT` in Railway. Verify a test audio file loads.

### 3.3 — OAuth providers (causes a brief login hiccup; do during low-traffic window)

For Google:
1. [ ] Client creates new OAuth Client ID in their Google Cloud Console.
2. [ ] Add the same callback URL (`https://cogniboost.co/auth/google/callback`) to the new client.
3. [ ] In Railway, update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Wait for redeploy.
4. [ ] Test a Google login. Existing users keep their accounts (we identify users by email, not by Google's `sub`).
5. [ ] Delete the old OAuth client.

For Apple:
1. [ ] Client enrolls in Apple Developer Program (or uses existing one).
2. [ ] Create new Service ID + new Sign-in-with-Apple key.
3. [ ] Update `APPLE_CLIENT_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_TEAM_ID` in Railway.
4. [ ] Test an Apple login.

### 3.4 — OpenAI (small risk: AI features fail if misconfigured)

1. [ ] Client creates OpenAI account, adds payment method, loads $20+ credit, enables auto-recharge.
2. [ ] Client creates a new API key (`sk-proj-...`).
3. [ ] In Railway, replace `AI_INTEGRATIONS_OPENAI_API_KEY`. **Confirm `AI_INTEGRATIONS_OPENAI_BASE_URL` is unset.**
4. [ ] After redeploy, generate a test quiz. Should succeed.
5. [ ] You revoke your old OpenAI key.

### 3.5 — Stripe (highest risk, do during a maintenance window)

If keeping the same Stripe account: just add the client as a co-owner with full permissions. Skip the rest.

If switching to a new Stripe account:
1. [ ] **Warn customers** — email any active subscribers about a brief maintenance window.
2. [ ] Client creates new Stripe account, completes business verification.
3. [ ] Recreate the three Products + Prices (Flex / Basic / Premium) at the same prices. Capture the new Price IDs.
4. [ ] Configure new webhook endpoint pointing at `https://cogniboost.co/api/stripe/webhook`. Capture the new webhook signing secret.
5. [ ] In Railway, update `STRIPE_SECRET_KEY_BOOST`, `STRIPE_PUBLISHABLE_KEY_BOOST`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_FLEX`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM`.
6. [ ] After redeploy, do a $1 test subscription. Verify webhook fires. Verify user tier flips.
7. [ ] **Existing customers:** because subscriptions live on the old Stripe account, they will continue to bill on the old account. Decide:
   - **Option A:** Cancel old-account subscriptions and ask customers to re-subscribe on the new account. Highest friction, cleanest cutover.
   - **Option B:** Keep both Stripe accounts running in parallel — old for existing customers (no new signups), new for everyone going forward. Operationally complex; not recommended unless you have <50 active subs.
   - **Option C:** Use Stripe's Customer + Subscription migration API to copy customers over (requires Stripe support engagement).
8. [ ] Once cutover is complete, revoke API keys on the old Stripe account.

### 3.6 — Database (highest risk; only if changing hosts)

If keeping Railway Postgres: nothing to do — the DB transfers with the Railway project.

If migrating DB to a different host (e.g., Neon, Supabase):
1. [ ] `pg_dump` from the current Railway DB.
2. [ ] Restore into the new DB.
3. [ ] Update `DATABASE_URL` in Railway env vars.
4. [ ] After redeploy, smoke-test login + a course view.
5. [ ] Verify `npm run db:push` is a no-op against the new DB.

### 3.7 — Domain

1. [ ] Initiate domain transfer at your registrar to client's registrar (or to client's account at same registrar).
2. [ ] Wait 5–7 days for transfer to complete.
3. [ ] Throughout the wait, DNS continues to point at Railway/Vercel — no service interruption.
4. [ ] Once transferred, client controls renewals.

### 3.8 — Railway + Vercel Project Ownership

1. [ ] Add client as Owner-tier member in Railway project. Verify they can access logs, env vars, deploys.
2. [ ] Same for Vercel.
3. [ ] Once verified, remove yourself (or downgrade to Viewer if continuing as developer).

---

## Phase 4 — Knowledge Transfer Session

Schedule **90 minutes** with the client manager. Walk through:

- [ ] **Read-along of `HANDOVER_OVERVIEW.md`** (15 min) — context and what they own.
- [ ] **Live tour of cogniboost.co** (15 min) — student flow, admin dashboard, course/lesson editor, payments, user management.
- [ ] **Live tour of Railway dashboard** (15 min) — Deployments tab, Variables tab, Logs tab. Trigger a no-op redeploy together.
- [ ] **Live tour of Stripe dashboard** (10 min) — Customers, Subscriptions, Webhooks, how to refund, how to resend an event.
- [ ] **Read-along of `HANDOVER_OPERATIONS_GUIDE.md` "Common Issues" section** (15 min) — the playbook for the four most likely incidents.
- [ ] **Q&A** (20 min).

Record the session. The recording is part of the handover deliverable.

---

## Phase 5 — Credential Rotation (after handover, before Phase 6)

After the client takes ownership but before the post-handover support window starts, **rotate every credential** that you ever had access to. This is the security hygiene step that protects both parties.

- [ ] Generate new `SESSION_SECRET` (random 64-byte hex). Update in Railway. (Logs everyone out — schedule for low-traffic.)
- [ ] Rotate Stripe API keys (revoke old, create new, update Railway).
- [ ] Rotate `STRIPE_WEBHOOK_SECRET` if webhook secret regeneration is supported by Stripe (re-create webhook endpoint).
- [ ] Rotate Google OAuth client secret.
- [ ] Regenerate Apple Sign-in private key.
- [ ] Rotate Resend API key.
- [ ] Rotate OpenAI API key (already done in Phase 3.4 if account changed).
- [ ] Regenerate GCS service account JSON key.
- [ ] Database password — rotate via Railway Postgres add-on.
- [ ] Sentry DSN regeneration if needed.

After rotation, the client has cryptographic exclusivity. You can no longer access the running services even with the old credentials.

---

## Phase 6 — 30-Day Post-Handover Support Window

For the agreed support period, you remain available for:

- [ ] Critical incidents (site down, payments broken, login broken)
- [ ] Bug fixes that surface within the support window
- [ ] Questions about the codebase as the client's developer ramps up

Define in advance:

- [ ] **Hours of availability** (e.g., 9am–5pm on business days)
- [ ] **Response SLA** (e.g., 4 hours for critical, 24 hours for non-critical)
- [ ] **Scope** (no new features; only fixes to existing functionality)
- [ ] **Compensation** (paid retainer? hours-based? included as part of handover fee?)

Document this in writing as part of the handover agreement.

---

## Phase 7 — Sign-Off

After the support window ends:

- [ ] Final 30-minute call to confirm everything is healthy.
- [ ] Final removal of any remaining access (collaborator status on GitHub, Railway viewer access, etc.) — unless continuing as developer-on-retainer.
- [ ] Hand over any physical artifacts (recorded walkthrough, written notes, this handover repo).
- [ ] Sign-off document (one-pager, signed by both parties) acknowledging successful handover.
- [ ] Archive your local working copy and credentials. Optionally delete from your password manager once retention period elapses.

---

## Quick Reference — What Lives Where

| Item | Lives in | Who can change it after handover |
|---|---|---|
| Source code | GitHub `creaactivai/Cogniboost` (or post-transfer org) | Client + their developers |
| Live secrets | Railway env vars | Client (project owner) |
| Database | Railway Postgres add-on | Client (project owner) |
| Domain DNS | Domain registrar | Client (post-transfer) |
| Pricing & plans | Stripe Products/Prices + `client/src/components/landing/pricing.tsx` | Client |
| Lesson content | DB (`lessons` table, populated via admin UI) | Client admins |
| Audio files | GCS bucket (`GCS_BUCKET_NAME`) | Client admins via admin UI |
| Email templates | `server/resendClient.ts` (committed to repo) | Client developers |
| Webhook routing | Stripe Dashboard → Webhooks | Client |

---

## Final Note

This handover is a **process, not an event.** The site keeps running throughout. The risk points are Phase 3.5 (Stripe) and Phase 3.6 (Database), and only if the client elects to switch hosts/accounts. If they keep both, this handover is mostly bureaucratic — transfer membership, rotate keys, hand off documentation.

Good luck.
