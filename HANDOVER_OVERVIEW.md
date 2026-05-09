# CogniBoost — Handover Overview

**Audience:** Incoming project manager / business owner.
**Purpose:** Single-page understanding of what you're inheriting.
**Companion docs:** `HANDOVER_OPERATIONS_GUIDE.md` (technical runbook), `HANDOVER_TRANSFER_CHECKLIST.md` (step-by-step transfer).

---

## What CogniBoost Is

CogniBoost is a **bilingual (English/Spanish) Learning Management System** focused on English language instruction across CEFR levels A1–C2. It is a live, revenue-generating SaaS at **cogniboost.co**.

- **Students** subscribe to one of three tiers, take structured lessons (~160 lessons across 5 courses, 40 modules), watch built-in audio/video content, complete AI-generated quizzes, and join scheduled "Conversation Labs" with instructors.
- **Admins** create courses, modules, lessons, upload audio/video material, and review student progress through a dedicated admin dashboard.
- The platform monetizes through Stripe subscriptions and is positioned for individual learners (B2C) with potential for institutional licensing.

## What's Live Today

| Metric | Value |
|---|---|
| Domain | cogniboost.co |
| Backend host | Railway (region: US West) |
| Frontend host | Vercel (separate deploy from same monorepo) |
| Database | Postgres (Railway-hosted) |
| Most recent code deploy | The commit on the `main` branch of `creaactivai/Cogniboost` GitHub repo |
| Code last shipped | Five resilience PRs (#1–#5) in May 2026 covering quiz crashes, Stripe webhook re-link, iOS Safari login, webhook idempotency, rate limiting, and a Railway build unblocker |
| Schema status | All migrations auto-run on deploy via `npm run db:push` (idempotent) |

## Tier Structure

| Tier | Monthly price | Lessons unlocked | Conversation Labs | Notes |
|---|---|---|---|---|
| Free | $0 | First 3 lessons of Module 1 | 0 | Marketing funnel |
| Flex | $14.99 | Lessons up to user's CEFR level | 1 / month | |
| Basic | $49.99 | All lessons | 4 / month | |
| Premium | $99.99 | All lessons + meeting credits | Unlimited | |

Pricing & tier definitions live in `client/src/components/landing/pricing.tsx` and `client/src/lib/tier-access.ts`. Stripe Price IDs are configured via `STRIPE_PRICE_FLEX`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM` env vars.

## Architecture in One Picture

```
                          ┌─────────────────────┐
                          │   cogniboost.co     │
                          │   (DNS / domain)    │
                          └──────────┬──────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                                      │
        ┌─────────▼─────────┐                ┌──────────▼───────────┐
        │   Vercel          │                │   Railway            │
        │   (frontend       │                │   (Express + Node    │
        │    React/Vite)    │  ── /api/* ──> │    backend, Postgres │
        └───────────────────┘                │    add-on, runs      │
                                             │    db:push at start) │
                                             └──┬─────┬──────┬──────┘
                                                │     │      │
                                ┌───────────────┘     │      └────────────────────┐
                                │                     │                            │
                       ┌────────▼────────┐  ┌────────▼────────┐         ┌────────▼────────┐
                       │   Stripe        │  │   OpenAI        │         │   GCS (Google   │
                       │   (subs +       │  │   (gpt-4o-mini  │         │   Cloud Storage)│
                       │    webhooks)    │  │    for quizzes) │         │   (audio/PDF/   │
                       └─────────────────┘  └─────────────────┘         │    images)      │
                                                                         └─────────────────┘
                                                                                  ▲
                       ┌─────────────────┐  ┌─────────────────┐                  │
                       │   Resend        │  │   Google + Apple│                  │
                       │   (transactional│  │    OAuth        │                  │
                       │    email)       │  │   (login)       │                  │
                       └─────────────────┘  └─────────────────┘                  │
                                                                                  │
                                                                  ┌──────────────┘
                                                          ┌───────▼───────┐
                                                          │   Sentry      │
                                                          │   (error      │
                                                          │    tracking)  │
                                                          └───────────────┘
```

**Key data path:** student request → Vercel-served React app → `/api/*` → Railway Express → Postgres / Stripe / OpenAI / GCS / Resend → response.

## Monthly Operating Cost — Approximate

| Vendor | Plan | Monthly cost (USD) | Notes |
|---|---|---|---|
| Railway | Hobby/Pro | $5–20 | Backend + Postgres add-on |
| Vercel | Hobby (free) | $0 | Frontend only; could exceed free tier with traffic spikes |
| Stripe | Pay-as-you-go | 2.9% + $0.30 per transaction | No fixed cost |
| OpenAI | Pay-as-you-go | $1–10 | `gpt-4o-mini` for quiz gen; ~$0.001/quiz |
| GCS | Pay-as-you-go | $1–5 | Storage + egress for audio/PDFs |
| Resend | Free tier or Pro | $0–20 | Transactional email |
| Sentry | Free tier | $0 | Error tracking |
| Domain (cogniboost.co) | Annual | ~$15/year | Renewed at registrar |
| Google OAuth | Free | $0 | |
| Apple OAuth | Apple Developer Program | $99/year | Required for Sign-in-with-Apple |
| **Total recurring** | | **~$30–60 / month + $114/year** | Excludes transaction fees |

Transaction fees scale with revenue (Stripe takes ~3% of subscriptions). At 100 active premium subscribers ($99.99/mo each), Stripe fees would be ~$300/mo.

## Recent Critical History (last 90 days)

- **2026-03-05 → 2026-05-05:** Production deploys silently failed for ~2 months due to a Railway/Nixpacks behavior change. The site stayed up on the March 5 build while every push to main failed to deploy without alerting. Fixed in PR #5 (`npm ci --include=dev`).
- **2026-05-06:** Five resilience PRs shipped (quiz validation, Stripe webhook recovery, iOS Safari cookie, webhook idempotency, rate limiting).
- **2026-05-08:** Discovered a real customer (Reinilza, premium tier) was seeing the Free UI due to duplicate Stripe customers. Resolved by Stripe webhook replay.

## Known Limitations / Open Items

| Item | Severity | Notes |
|---|---|---|
| **No writing component** | Feature gap | Reading/writing skills missing from pedagogy. Reading v1 scoped for ~3 days build, Writing v1 for ~2 weeks. Not yet in flight. |
| **Duplicate-email user rows** | Bug class | Guest checkout + later registration can create two user rows with same email. Caused the Reinilza incident. PR #2's `getUserByEmail` ranking mitigates but doesn't prevent. Needs schema-level uniqueness enforcement. |
| **Replit-residue env vars** | Tech debt | `REPLIT_CONNECTORS_HOSTNAME` and originally `AI_INTEGRATIONS_OPENAI_BASE_URL` were leftover from when the platform ran on Replit. The latter was removed; the former is still present but harmless. Worth cleaning up. |
| **No deploy-failure alerting** | Risk | The 2-month silent outage happened because Railway deploy-failure notifications weren't enabled. Should be turned on in Railway → Settings → Notifications. |
| **No automated tests** | Risk | The codebase has no test suite. All validation is via Vercel CI (typescript only) + manual smoke tests. New features should add coverage. |
| **OpenAI billing brittleness** | Operational | OpenAI auto-recharge needs to stay enabled. If credits hit $0, all AI features (quiz generation, AI tutor chat) fail silently with `429 insufficient_quota`. |

## What Has Been Recently Stabilized

- ✅ Stripe webhook event-id idempotency (no double-applies on retry)
- ✅ Stripe webhook customer re-link via email fallback (Reinilza-class recovery)
- ✅ iOS Safari session cookie (`sameSite: 'lax'`) — login now works on iPhone
- ✅ Login + checkout rate limiting on the correct paths
- ✅ Quiz generation validates AI output and surfaces real OpenAI errors to admins
- ✅ Railway build chain (`--include=dev` ensures dev tools install)
- ✅ Auto-`db:push` on every deploy keeps schema in sync

## Roadmap (proposed, not committed)

| Phase | Item | Effort |
|---|---|---|
| Next | Reading v1 (leveled passages + comprehension quizzes) | ~3 days |
| Next + 2 weeks | Writing v1 (prompts + AI grading on grammar/structure/vocab) | ~10 days |
| Later | Email-uniqueness schema enforcement + duplicate-row repair script | 1–2 days |
| Later | Personalized/adaptive content selection (v2) | Multi-week, post v1 usage data |
| Later | Audio file production for remaining lessons (cloned voice) | Admin-side, ~25 hours total via lesson-factory toolkit |

## Repo & Code

- **GitHub:** https://github.com/creaactivai/Cogniboost
- **Primary branch:** `main`
- **Tech stack:** React 18 + Vite, TypeScript, Tailwind, shadcn/ui, Express 4, Drizzle ORM, Postgres, Passport.js (OAuth + local), Stripe SDK, OpenAI SDK
- **CI:** Vercel preview build on every PR (TypeScript + frontend bundle); no test runner

## Contacts & Vendor Accounts

See `HANDOVER_TRANSFER_CHECKLIST.md` for the full account inventory and the ownership-transfer steps for each vendor.

---

**This document is the high-level overview. For day-to-day operation see `HANDOVER_OPERATIONS_GUIDE.md`. For the actual transfer process see `HANDOVER_TRANSFER_CHECKLIST.md`.**
