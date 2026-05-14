# CogniBoost — Project Status & Final Handover

**Date:** 2026-05-14
**Status:** Engagement transitioning to **full handover**. Coral Lozano / CogniBoost ESL Academy takes ownership of code, infrastructure, accounts, and project management.
**Companion documents:** `HANDOVER_OVERVIEW.md`, `HANDOVER_OPERATIONS_GUIDE.md`, `HANDOVER_TRANSFER_CHECKLIST.md`, `MASTER_PLAN_REVISED.md`

---

## 1. Executive Summary

CogniBoost is a live, revenue-generating ESL platform at **cogniboost.co**. The platform is online and serving paying students today. Over the May 2026 engagement, we shipped a foundation layer of resilience fixes followed by Phases 0 and 1 of the v2.0 Master Plan build (per the May 13 Coral-locked decisions).

This document gives you (Coral) a complete picture of:
- **What's live** on production today
- **What's pending** with realistic effort estimates
- **How to operate** the platform (links to runbook)
- **How ownership transfers** to you (links to seven-phase checklist)
- **What decisions are locked** and which remain open

Read this end-to-end, then `HANDOVER_TRANSFER_CHECKLIST.md` for the action plan.

---

## 2. What's Live on Production (Done)

### 2.1 Resilience baseline (Pre-engagement fixes, shipped May 5–6 2026)

A two-month silent deploy outage was discovered and resolved. All deploys were failing since 2026-03-05 due to a Railway/Nixpacks behavior change; production was stuck on the March 5 build for two months.

| # | Fix | PR |
|---|---|---|
| 1 | Quiz crashes — 0-question NaN, AI quiz validation, video-quiz progress refresh | [#1](https://github.com/creaactivai/Cogniboost/pull/1) |
| 2 | Stripe customer re-link (Reinilza-class) + iOS Safari cookie + duplicate-email login | [#2](https://github.com/creaactivai/Cogniboost/pull/2) |
| 3 | Stripe webhook idempotency (`stripe_webhook_events` table + atomic claim) | [#3](https://github.com/creaactivai/Cogniboost/pull/3) |
| 4 | Rate limiters mounted on the correct paths (login + checkout) | [#4](https://github.com/creaactivai/Cogniboost/pull/4) |
| 5 | Railway build unblocker (`npm ci --include=dev` — unblocked 2 months of deploys) | [#5](https://github.com/creaactivai/Cogniboost/pull/5) |

After PR #5, all queued commits caught up to production. Deploy chain stable since.

### 2.2 Phase 0 — Foundation (shipped 2026-05-13)

| Component | Status | Notes |
|---|---|---|
| Anthropic Claude SDK adopted | ✅ Live | `@anthropic-ai/sdk@^0.95.2`. Singleton client at `server/anthropicClient.ts`. Refuses Replit-style proxy keys. |
| `ANTHROPIC_API_KEY` env var | ✅ Set on Railway | Owned currently under our umbrella (per Coral Q7); transitions to your account in Phase 3 |
| Default models | ✅ | Claude Sonnet 4.6 for grading (`ANTHROPIC_MODEL_GRADING`), Opus 4.7 for content gen (`ANTHROPIC_MODEL_CONTENT`) |
| Writing grader (5-dim CEFR rubric A1-C2) | ✅ Live | `server/grading/writingPrompt.ts` per Master Plan §§4 + 18 + 19 |
| Smoke test | ✅ Passes | Real sample essay graded in ~108s, $0.097/essay cost, all validation checks green |
| v2.0 schema additions | ✅ Live | 10 new tables: `submissions`, `vocabulary`, `vocabulary_mastery`, `lab_topics`, `lab_sessions`, `lab_registrations`, `lab_feedback`, `listening_assessments`, `reading_passages`, `certificates`. 7 new `users` columns. Auto-applied via `npm run db:push` on every deploy. |
| Streaming + max_tokens fix | ✅ | Initial smoke test surfaced two SDK issues — adopted streaming with `.finalMessage()` and bumped `max_tokens` to 8192. PR #9. |

### 2.3 Phase 1 — Writing-grading user loop + Lesson Library (shipped 2026-05-14)

The demo loop Coral asked for is now live and runnable on production.

| Phase | What | PR |
|---|---|---|
| 1.1 | Submission API — `POST /api/submissions`, `/queue`, `/teacher-review`, `/return`. Async grading via setImmediate. | [#10](https://github.com/creaactivai/Cogniboost/pull/10) |
| 1.2/1.3 | Student writing editor (`/dashboard/writing/new`) + submission view (`/dashboard/submissions/:id`) with auto-poll, color-coded annotations, Spanish L1 pattern callouts | [#11](https://github.com/creaactivai/Cogniboost/pull/11) |
| 1.4 | Teacher grading queue (`/dashboard/teacher`) + submission review with score override + return-to-student | [#12](https://github.com/creaactivai/Cogniboost/pull/12) |
| 1.4-nav | Sidebar nav entries: "Writing" (students), "Grading queue" + "Lesson Library" (teachers, only render when `isAdmin`) | [#13](https://github.com/creaactivai/Cogniboost/pull/13) |
| 1.5 | Lesson Library (`/dashboard/teacher/lessons`) + 17-section plan view per Master Plan §7.4. Inline JSON editor for plan authoring. | [#14](https://github.com/creaactivai/Cogniboost/pull/14) |

**Live demo flow (current):**

1. Student → **Writing** sidebar → editor at `/dashboard/writing/new` → write essay → Submit
2. Redirect to `/dashboard/submissions/:id` → shows "Grading in progress…" with animated indicator
3. Claude grades in ~108 seconds → page auto-refreshes to show overall score, 5 dimension scores, inline annotations, strengths, improvement priorities, Spanish L1 patterns, vocabulary usage
4. Teacher → **Grading queue** sidebar → sees the submission → opens review
5. Teacher adjusts score (0-100), writes feedback → **Save review** → status flips to `teacher_reviewed`
6. Teacher clicks **Return to student** → status `returned` → student sees finalized grade in their submission view
7. Teacher can also browse **Lesson Library** → grouped by course, plan-completeness % per row → click any → see 17-section plan → edit via JSON editor

### 2.4 Documentation deliverables

| Document | Purpose |
|---|---|
| `MASTER_PLAN_REVISED.md` | The full v2.0 engineering plan — what's built, what's planned, Coral's locked decisions, phase-by-phase deliverables |
| `HANDOVER_OVERVIEW.md` | Executive summary of the platform — what CogniBoost is, costs, vendors, known limits |
| `HANDOVER_OPERATIONS_GUIDE.md` | Day-to-day operations runbook — deploys, common issues, env var reference, schema migration handling |
| `HANDOVER_TRANSFER_CHECKLIST.md` | Seven-phase ownership-transfer playbook — what transfers, what gets rotated, what gets recreated |
| `LIVE_CLASSES_REVISED_PLAN.md` | Specific engineering plan for the Jitsi-based live classes feature (separate roadmap item) |
| `CogniBoost_Response_to_Engineering.pdf` | Coral's locked decisions on the seven open questions |
| `CogniBoost_Q4_Engineer_Headcount_Response.pdf` | Engineer headcount + timeline estimates (now informational only post-handover) |

---

## 3. What's Pending (Not Yet Built)

### 3.1 Phase 1.6 — Conversation Labs (last Phase 1 deliverable)

Schema is in place from Phase 0; UI and orchestration not yet built. Effort: ~3–5 working days for one engineer at full Claude Code productivity.

- Lab Pack admin — CRUD for `lab_topics` (the reusable conversation kits)
- Lab session admin — CRUD for `lab_sessions`, scheduling, recurrence
- Student Lab calendar + registration UI
- Lab quota enforcement per plan tier (Flex 1/mo, Basic 4/mo, Premium unlimited)
- 2-question feedback form auto-firing at session end, emails `info@cognimight.com`
- N-min-before reminder email cron (in-process scheduler + Postgres advisory lock)
- 4–6 hand-authored starter Lab Packs (content work for Coral)

After Phase 1.6 ships, **Phase 1 is fully complete and the platform is demo-ready to paying customers** with the full writing-and-Lab pedagogy.

### 3.2 Phase 2 — Differentiation features (~5–8 weeks)

The features that meaningfully differentiate CogniBoost from Duolingo/Babbel.

| Feature | Effort (1 eng) |
|---|---|
| Reading comprehension grader (passages + mixed-question quiz) | ~5 days |
| Listening comprehension grader (audio + hidden transcript + questions) | ~5 days |
| Vocabulary mastery system (SRS, productive-use tracking, daily review deck) | ~7 days |
| Student progress dashboard (6-axis CEFR radar, vocab counter, streak, weakness diagnostics) | ~5 days |
| Teacher annotation tools (color-coded markup, voice notes, action buttons) | ~5 days |
| One-Click Generator — Flow 1 per-lesson (HTML upload → full assessment suite) | ~5 days |
| One-Click Generator — Flow 2 Lab Pack (level + theme → full Lab Pack) | ~3 days |
| Three-pass review interface for content admin | ~3 days |
| Per-dimension teacher override + section-by-section lesson plan editor | ~3 days |

**Total Phase 2:** ~5–6 weeks for one engineer, ~3 weeks for two in parallel.

### 3.3 Phase 3 — Scale & polish (~3–6 weeks)

| Feature | Effort (1 eng) |
|---|---|
| Certification system + public verification page + QR + LinkedIn integration | ~5 days |
| Cohort/level analytics for teachers (risk flags, attendance heatmaps) | ~5 days |
| Automated nudges with mandatory teacher approval | ~3 days |
| Mobile PWA polish (installable on home screen) | ~3 days |
| Anthropic billing transition from our umbrella to Coral's account | ~1 day (operational) |

**Total Phase 3:** ~4 weeks for one engineer, ~2.5 weeks for two.

### 3.4 Quality / tech debt (parallelizable)

| Item | Severity | Notes |
|---|---|---|
| ~20 pre-existing TypeScript errors | Low | Survive because production build uses esbuild (no type check). Worth burning down. |
| Zero automated tests | Medium | New features should add coverage. Vercel CI only validates typescript-build. |
| No CI smoke test for grading | Low | A nightly CI step could grade one sample essay (~$0.10/run) and alert on regressions. |
| OpenAI legacy quiz-gen path still exists | Low | Works fine. Deprecate when Phase 2 quiz generator lands on Claude. |
| Email notifications missing for submission `status='returned'` | Low | Small follow-up PR. |
| Hand-authored Lab Pack content | Operational | Coral commits to ~30–50 Lab Packs (10 themes × 5 levels) once Flow 2 of generator ships. |

### 3.5 Explicitly out of scope (Coral's locked decisions)

| Item | Decision | Why |
|---|---|---|
| Ms. Coral mobile app | Deferred | Q2 — separate sprint when mobile project is staffed |
| Strict 8-week cohort enforcement | Rejected | Q1 — pure self-paced model |
| Rich-text writing editor | v1 plain textarea | Encourages styling over writing for B1/B2; revisit if requested |

---

## 4. Coral's Locked Decisions (May 13, 2026)

| # | Question | Locked answer |
|---|---|---|
| 1 | Cohort vs self-paced | **Fully self-paced.** No cohorts. |
| 2 | Ms. Coral mobile scaffolding | **Defer entirely.** Scope a separate sprint when the mobile project is staffed. |
| 3 | Certificate wording | **Conservative.** "CogniBoost B1 Completion Certificate, aligned with CEFR descriptors." |
| 4 | Engineer headcount | **Pending Coral's pick post-handover** — A (1 eng, ~late August launch, fragile) or B (2 eng, ~mid-July launch, recommended) |
| 5 | Disruption tolerance | **Brief Sunday-evening downtime OK** in target-market local time. |
| 6 | AI grading review | **Teacher-review-first**, transition to auto-publish when override rate <10% for 2 consecutive weeks. |
| 7 | Anthropic billing | **Our umbrella for v1 → Coral's account by Phase 3.** Migration is the last step of the build. |

---

## 5. How to Operate (Reference Material)

Coral and her developer(s) should read:

1. **`HANDOVER_OPERATIONS_GUIDE.md`** first — covers deploy pipeline, daily/weekly health checks, common-issues lookup table (quiz fail / customer paid but free / iOS login / brute-force / stale UI / duplicate webhooks), full env-var reference, schema migration handling, lesson + audio pipeline, backups, sensitive-data map.

2. **`MASTER_PLAN_REVISED.md`** for the full engineering plan — what's built, what's planned, file-level references.

3. **GitHub `creaactivai/Cogniboost` repo** — single source of truth for code. PR-merge-to-`main` auto-deploys via Railway (backend) and Vercel (frontend).

### Quick reference

| Where | What |
|---|---|
| `cogniboost.co` | Live production site |
| GitHub `creaactivai/Cogniboost` | Code repo, `main` branch |
| Railway service `Cogniboost` | Backend + Postgres add-on. Variables, deployments, logs all there. |
| Vercel project `cogniboost` | Frontend |
| Anthropic Console | API keys + billing for grading |
| Stripe `Cogniboost LLC` | Subscriptions + webhooks |
| Resend | Transactional email |
| GCS bucket | Audio MP3 + PDF storage |
| `info@cognimight.com` | Lab feedback emails land here (Phase 1.6) |

---

## 6. How Ownership Transfers (Action Plan)

**Read `HANDOVER_TRANSFER_CHECKLIST.md` for the seven-phase playbook.** Summary of the phases:

| Phase | Action | Effort |
|---|---|---|
| 0 | Pre-handover prep — confirm everything works, decide what to retain | ~2 hours |
| 1 | Account inventory — list every vendor account + decide transfer mechanism | ~1 hour |
| 2 | Pre-transfer decisions — Stripe new vs existing, domain transfer, OAuth recreate | ~1 hour with Coral |
| 3 | Execution — ordered low-risk → high-risk so the site doesn't go down mid-transfer | 5–7 days |
| 4 | 90-min knowledge transfer call — recorded, walks Coral through every dashboard | 90 min |
| 5 | Credential rotation — every secret we've ever seen, rotated post-transfer | ~2 hours |
| 6 | 30-day post-handover support window | 30 days |
| 7 | Final sign-off + access removal | 30 min |

**Key transfer mechanisms by vendor:**

- **GitHub repo** — Settings → Transfer to Coral's GitHub org (or fork to her org + archive ours)
- **Railway project** — Project Settings → Members → invite Coral → make her owner → remove ourselves
- **Vercel project** — Same pattern as Railway
- **Stripe** — Can NOT be transferred between accounts. Two paths: (a) keep existing account, add Coral as co-owner with full permissions, OR (b) create new Stripe account on Coral's side, migrate subscribers (consult Stripe support for >50 subs)
- **Anthropic** — Can NOT be transferred. Coral creates new account + new API key. We swap in Railway env vars.
- **Apple Developer** — Can NOT be transferred. Coral enrolls separately ($99/yr).
- **Domain** (`cogniboost.co`) — Initiate outbound transfer at registrar to Coral's registrar. 5–7 days.
- **GCS / Google Cloud** — Transfer project ownership via IAM, OR Coral creates new project + new bucket and we migrate files.

---

## 7. Open Items Coral Needs to Decide (Pre-Transfer)

| # | Item | Recommendation |
|---|---|---|
| 1 | Engineer headcount for Phase 1.6 + Phase 2 + Phase 3 | Option B (2 engineers) if launching before September matters; Option A (1 engineer) if cash flow is the constraint |
| 2 | Domain: transfer `cogniboost.co` or migrate to a different domain | Transfer (preserves SEO, existing student URLs) |
| 3 | Stripe: keep existing account with co-owner, or fresh account | Keep existing — fresh account loses all current subscribers |
| 4 | GCS: transfer project ownership, or new bucket | Transfer (simpler, no asset migration) |
| 5 | Apple Developer membership | Coral enrolls fresh ($99/yr) — required for Sign-in-with-Apple |
| 6 | Anthropic account | Coral creates fresh, swap key during transfer Phase 3 |
| 7 | 30-day post-handover support contract | Suggested: included as part of handover deliverable; daily ops only, no new features |

---

## 8. Pre-Existing Risks Coral Should Know About

| Risk | Severity | Mitigation in place |
|---|---|---|
| Railway deploy-failure alerting not configured | High | Manual: check Deployments tab daily. **Coral should set up Slack/email alerts in Railway → Settings → Notifications post-handover** to prevent another silent-outage scenario. |
| Anthropic billing brittleness | Medium | Auto-recharge enabled. Monitor monthly credit balance. |
| No automated tests | Medium | Vercel CI catches typescript errors only. Phase 2 should add coverage. |
| Pre-existing TypeScript errors (~20) | Low | All in production-build paths that esbuild ignores. Worth burning down. |
| Duplicate-email user records | Low | PR #2 mitigates via email-fallback re-link. Schema-level enforcement is a follow-up. |
| Replit-residue env var `REPLIT_CONNECTORS_HOSTNAME` | Low | Harmless; can be deleted during transfer. |

---

## 9. Suggested Order for the Handover Call

90-minute call. Recommended agenda:

1. (15 min) Walk through `HANDOVER_OVERVIEW.md` — what CogniBoost is, costs, what's live
2. (15 min) Walk through this document — what's done, what's pending
3. (20 min) Live demo of the writing-grading flow + Lesson Library on cogniboost.co
4. (15 min) Walk through Railway dashboard, Stripe dashboard, key operational surfaces
5. (10 min) Common-issues lookup in `HANDOVER_OPERATIONS_GUIDE.md`
6. (15 min) Q&A + transfer-phase decisions (Items in §7)

Record the call. Recording becomes part of the handover artifact set.

---

## 10. Sign-Off

After the 30-day post-handover support window, both parties sign:

- A one-page sign-off acknowledging successful transfer
- A list of all artifacts handed over (code, docs, credentials, account access)
- Any remaining open commitments

This document is part of that artifact set.

---

**Status as of 2026-05-14:** Platform is live, Phase 0 + Phase 1.1–1.5 shipped, Phase 1.6 is the last item before the full demo loop is complete. Handover ready to execute.
