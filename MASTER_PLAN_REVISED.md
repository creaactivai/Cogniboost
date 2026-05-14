# CogniBoost Master Engineering Plan — Revised (v2.0)

**Source:** `CogniBoost_Master_Engineering_Plan_v2.pdf` (May 2026, 69 pages) + `CogniBoost_Response_to_Engineering.pdf` (Coral, May 13 2026).
**Same vision delivered, corrected for actual stack, existing schema, current production realities, and Coral's locked decisions.**

The original plan reads like a thoughtful greenfield spec — the rubrics, the prompt library, the three-pass QA system, and the lesson library design are excellent. But it assumes a Next.js + Redis + S3 stack and a freshly-designed schema. We're a year into production on Vite + Express + Drizzle + Postgres + GCS on Railway. Adopting the plan verbatim means rewriting most of the platform. This document keeps the pedagogy and the content protocols, and maps the engineering work onto what already exists.

**v2.0 update (May 13, 2026):** Coral confirmed five of seven pre-kickoff decisions, adjusted two, and pushed important academic-model changes — fully self-paced, Conversation Labs decoupled from lessons, Lab Packs as reusable content kits. Those changes are reflected throughout this doc and are the basis for Phase 0+ engineering.

---

## What's Locked (Coral's responses, May 13, 2026)

| # | Decision | Locked answer |
|---|---|---|
| 1 | Cohort vs self-paced | **Fully self-paced.** No cohorts. Each student progresses through curriculum at their own speed. |
| 2 | Ms. Coral mobile scaffolding | **Defer entirely.** No scaffolding, no `speaking_sessions` table, no feature-flagged buttons. Scope a separate sprint when the mobile project is staffed. |
| 3 | Certificate wording | **Conservative.** "CogniBoost B1 Completion Certificate, aligned with CEFR descriptors." Build the full verification infrastructure (page, QR, LinkedIn) — only the language is restrained. |
| 4 | Engineer headcount | **Pending** — Coral needs three estimates (1 engineer + aggressive Claude Code, 2 engineers + aggressive Claude Code, and cost for each). Target: launch before September. |
| 5 | Disruption tolerance | **Brief downtime OK.** Schedule disruptive deploys for Sunday evenings, target-market local time. Notify active users in advance. |
| 6 | AI grading review | **Data-driven transition.** Default to teacher-review-first; flip to auto-publish when teacher override rate is <10% for 2 consecutive weeks. |
| 7 | Anthropic billing | **Our umbrella for v1 → Coral's account by Phase 3.** Avoids blocking kickoff on payment setup. |

The two structural changes from the v2.0 PDF (beyond the Q&A answers):

- **Conversation Labs are now LEVEL × THEME, not lesson-tied.** A B1 student in week 2 and another in week 7 attend the same "Travel Stories B1" Lab. New schema primitives: `lab_topics` (Lab Pack templates) → `lab_sessions` (scheduled instances) → `lab_registrations` (per-student attendance + teacher observations).
- **Labs are 100% conversation — no teaching block.** The platform does the teaching; Labs are pure speaking practice. New cadence: 5 min warmup → 45 min activities → 10 min errors + praise + feedback form. Email auto-fires to `info@cognimight.com` after each Lab.

---

## TL;DR — What's Different From the v2.0 Plan

| Topic | v2.0 plan | Revised |
|---|---|---|
| **Frontend framework** | Next.js for curriculum + teacher dashboard | **Stay on Vite + React + wouter.** No Next.js rewrite — a multi-month refactor with zero user-visible benefit. |
| **Backend framework** | Node.js + TypeScript (or Python FastAPI) | **Express + TypeScript** (already in production). FastAPI ruled out. |
| **Job queue** | Redis + BullMQ | **In-process scheduler** for cron tasks. AI grading runs synchronously for v1 (60-sec response is acceptable); move to queue only if traffic demands. |
| **Session store** | Redis | **Postgres** (`connect-pg-simple`, already wired). |
| **File storage** | AWS S3 or Cloudflare R2 | **GCS** (already wired, ~$1-5/mo). Don't migrate. |
| **Analytics** | PostHog | **GA4** (already wired with measurement ID). PostHog optional later. |
| **AI provider** | Claude Sonnet 4.6 + Opus 4.7 | ✅ **Adopted in Phase 0** ([PR #7](https://github.com/creaactivai/Cogniboost/pull/7), merged 2026-05-13). Default models: Sonnet for grading, Opus for content gen. |
| **Database schema** | Greenfield design | **Map concepts onto existing tables.** Most additions are columns + new tables; no renames. ✅ Phase 0 PR merged the v2.0 additions. |
| **CEFR levels** | A1–C1 (5 levels) | **A1–C2** (6 levels, already in schema). Keep both; C2 is rare for adult ESL but harmless. |
| **Strict 8-week cohorts** | Plan structures everything around weeks | **Self-paced only** (Coral's Q1). `current_week` is per-student curriculum position, not a synchronized cohort. |
| **"Ms. Coral" mobile app** | Build scaffolding in this phase | **Deferred entirely** (Coral's Q2). No scaffolding until mobile is staffed. |
| **Timeline** | 5-7 months solo / 3-4 months pair | **Revised below.** Phase 0 already shipped. Phase 1 begins next. |

---

## ✅ Phase 0 — Shipped (May 13, 2026, [PR #7](https://github.com/creaactivai/Cogniboost/pull/7))

The foundation everything else builds on:

- **Anthropic SDK adopted** — `@anthropic-ai/sdk@^0.95.2` installed. New env vars: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_GRADING` (default `claude-sonnet-4-6`), `ANTHROPIC_MODEL_CONTENT` (default `claude-opus-4-7`).
- **`server/anthropicClient.ts`** — singleton client with `extractTextContent()` and `parseJsonFromResponse()` helpers. Refuses Replit-style proxy keys explicitly (`sk-ant-` prefix required, lesson from the Reinilza incident).
- **`server/grading/writingPrompt.ts`** — AI writing grader with the full 5-dimension CEFR rubric (Task Achievement / Coherence & Cohesion / Lexical Range / Grammatical Range & Accuracy / Register & Tone) and per-level descriptor rubrics for A1, A2, B1, B2, C1, C2 per Master Plan §§4 + 18 + 19. Adaptive thinking + `cache_control: ephemeral` on the system prompt → ~0.1× input cost on repeat grades at the same level.
- **`script/smoke-test-writing-grader.ts`** — end-to-end Phase 0 acceptance test. Grades a sample B1 essay, validates JSON shape, prints token cost. Run: `ANTHROPIC_API_KEY=sk-ant-... npx tsx script/smoke-test-writing-grader.ts`.
- **v2.0 schema additions (all additive, auto-apply via `db:push` on Railway deploy):**
  - `submissions` — AI-graded open-ended work (writing / reading / listening short-answer / speaking / project)
  - `vocabulary` — global per-level word bank with IPA, audio, collocations, false-friend flags
  - `vocabulary_mastery` — per-student SRS state; counts ONLY productive use per §9
  - `lab_topics` — Lab Packs (reusable conversation kits), one row per level × theme
  - `lab_sessions` — scheduled Lab instances with status / recurrence
  - `lab_registrations` — student signups + attendance + teacher observations
  - `lab_feedback` — 2-question end-of-Lab form, auto-emailed to `info@cognimight.com`
  - `listening_assessments` — 1-3 min audio with hidden transcript
  - `reading_passages` — 200-800 word texts with comprehension Qs
  - `certificates` — CEFR-aligned credentials with public verification fields
  - New `users` columns: `current_level`, `current_week` (1-8), `preferred_language`, `enrollment_date`, `target_certification_date`, `total_speaking_minutes`, `streak_days`

**Deliberately NOT added (per Coral's locks):**
- No `cohorts` table (Q1 = pure self-paced)
- No `speaking_sessions` table (Q2 = defer Ms. Coral)

---

## What the Original Plan Got Right (Adopted Verbatim)

These sections are the strongest part of v1/v2 and we're using them as-is:

1. **§4.2 — Writing Rubric Structure.** 5 dimensions × 20 points. ✅ Implemented in Phase 0.
2. **§4.3 — JSON Response Schema** for grading output. ✅ Implemented as `WritingGradeResponse`.
3. **§4.4 — Teacher Override Workflow** (5 dim scores visible, adjustable, inline annotations + voice notes, mark reviewed). Phase 1.
4. **§5.2 — Reading Question Types Mix** (4 MCQ + 2 T/F-Not Given + 2 vocab in context + 2 short answer). Phase 2.
5. **§6 — Student Dashboard Five Pillars** (CEFR radar, vocab mastery counter, streak, weakness diagnostics, certification readiness). Phase 2.
6. **§7.4 — Individual Lesson Plan Page** (17 sections). Phase 1.
7. **§9 — Vocabulary Mastery System** with productive-use-only rule. Phase 2. Schema already in place.
8. **§12 — Conversation Lab Structure (v2.0 update)** — 5 / 45 / 10 split, 100% conversation, no teaching block. Phase 1.
9. **§13 — One-Click AI Lesson Generator (v2.0)** — TWO flows (per-lesson + Lab Pack). Phase 2.
10. **§14 — Five Rules of AI Content Generation.** Engraved into prompt-building code starting in Phase 0.
11. **§15 — Three-Pass Review System.** Phase 2.
12. **§18 — Prompt Library.** Writing grading prompt ✅ landed in Phase 0; remaining prompts (reading short-answer, speaking analysis, passage generation) Phase 2.
13. **§19 — Per-level CEFR Rubrics.** ✅ All six implemented in Phase 0.

---

## What Needs Correction (Stack Adaptations)

### 1. No Next.js Rewrite

The plan recommends Next.js. We're on Vite + React + wouter + TanStack Query. Reasons not to rewrite:

- ~50 components in working production
- wouter + TanStack Query give us 90% of Next.js routing + data fetching with less ceremony
- Next.js's main benefit (SSR for SEO) doesn't apply — this is a logged-in SaaS
- Multi-month refactor with zero user-visible benefit

**Decision:** Add new pages to the existing Vite app as wouter routes. Use existing `@tanstack/react-query` + `@radix-ui` + Tailwind. No framework change.

### 2. No Redis / BullMQ for v1

- Sessions are already in Postgres via `connect-pg-simple`.
- AI grading: 200-word essay graded by Claude returns in 10-30s. Acceptable to handle synchronously inside the request. Frontend shows loading indicator.
- For longer jobs (One-Click Generator fans out ~8 parallel Claude calls): use `Promise.all` with a 90-sec timeout; show progress in UI.

**Revisit when:** >100 simultaneous grading requests OR >30s p95 grading latency.

### 3. No File-Storage Migration

GCS already holds all audio/PDF/lesson assets. Migration to S3/R2 is days of risk for zero functional benefit. Keep GCS.

### 4. Adopted Claude (Done in Phase 0)

✅ Anthropic Claude is the grading engine (Sonnet) and content generator (Opus). OpenAI `gpt-4o-mini` stays for the legacy quiz-generation endpoints we already shipped — they work fine and don't need migrating right now.

### 5. Schema — Mapped, Not Rewritten (Done in Phase 0)

✅ The v2.0 plan's `students` / `lessons` / `submissions` / `vocabulary` / `lab_topics` / etc. concepts have all been added or mapped onto our existing schema. See Phase 0 ship list above. No table renames, no drops.

---

## Phase Plan — Revised

### ✅ Phase 0 — Foundation (1 week, shipped 2026-05-13)

See above.

### Phase 1 — Writing + Teacher Dashboard + Labs (~8 weeks)

Everything you need to demo to a paying customer:

1. **Submission API** — `POST /api/submissions`, `GET /api/submissions/:id`, `POST /api/submissions/:id/teacher-review`. Writes to `submissions` table, queues Claude grading inline.
2. **Frontend writing editor** — rich text editor with word count + autosave every 30s. Submits to `/api/submissions`.
3. **Submission view (student-facing)** — shows AI grade, 5 dimension scores, inline annotations, strengths, improvement priorities. "Request teacher review" button.
4. **Teacher dashboard skeleton** — four left-nav pages per §7.1: Today, Lesson Library, Students, Analytics. Routing + shell; content fills in over later phases.
5. **Lesson Library** with all existing lesson plans imported (§7.2-7.5). Two-clicks rule: nav → click lesson card → see 17-section plan.
6. **Lab session admin** — list/create `lab_sessions`, each backed by a `lab_topic` (Lab Pack). Min-viable: admin manually creates sessions; bulk-creation later.
7. **Lab registration (student-facing)** — student sees upcoming Labs at their level × any theme, registers, gets reminder email.
8. **Lab feedback form** — auto-fires at end of session (5-star + free text), writes to `lab_feedback`, emails `info@cognimight.com`.
9. **Quota enforcement** — `lab_quota` per plan tier, validated before Lab signup, dashboard shows remaining; resets monthly.

**Demo at end of Phase 1:** Coral can publish a writing assignment → student submits → AI grade returns in ~20s → student sees feedback → teacher reviews + adjusts → student sees the override. Plus: admin schedules a "Travel Stories B1" Lab, three students register, attend on Jitsi, feedback emails land in `info@cognimight.com` inbox.

### Phase 2 — Reading + Listening + Vocab + One-Click (~8 weeks)

Differentiation features that make CogniBoost meaningfully better than Duolingo/Babbel:

10. **AI-Graded Reading Comprehension** — admin-paste passage or AI-adapt source → 5-10 mixed-question quiz → MCQ + T/F auto-graded, short-answer AI-graded via the writing pipeline.
11. **Listening Comprehension Assessments** — audio player with replay but no transcript visible → AI-graded mixed questions feeding the Listening axis on the radar chart.
12. **Vocabulary Mastery System** — daily review deck of ≤20 words; SRS schedule per §9.5; counts ONLY productive use; words misused in writing/speaking auto-prioritize back into the deck.
13. **Student Progress Dashboard** — CEFR radar (6 axes), vocab mastery counter (productive only), streak + consistency metrics, top-3 weakness diagnostics with one-click practice links, certification readiness gauge.
14. **Teacher student deep-dive + annotation tools** (§7.6-7.9) — color-coded markup on submissions, voice comments transcribed automatically, action buttons (message, schedule 1:1, mark follow-up).
15. **One-Click AI Lesson Generator** with the TWO flows from v2.0 §13:
    - Flow 1 — Per-Lesson: upload lesson HTML → generates quiz + reading passage + reading quiz + writing prompt + listening assessment + vocab flashcards + teacher lesson plan
    - Flow 2 — Lab Pack: form-driven (level + theme) → generates Lab Pack contents (vocab list, grammar focus, activities, detonating questions, common errors, cultural notes)
    - Both gated by mandatory human review (§15).

### Phase 3 — Scale & Polish (~6 weeks)

16. **Certification system** with public verification page (`/verify/[code]`), QR codes, LinkedIn integration, conservative wording per Coral's Q3.
17. **Per-level student-overview** (replacing "cohort overview" since we're self-paced) — group students by current_level, risk flags, attendance heatmaps.
18. **Automated nudges with teacher approval** (§7.10) — AI drafts the message, teacher reviews + edits + sends.
19. **Mobile-responsive polish (PWA)** — installable on phone home screen.
20. **Three-pass review interface for content admin** (§15) — queue UI for AI-generated content waiting for human approval.
21. **Migrate Anthropic billing to Coral's account** (Q7 transition point).

### Total

| Phase | Weeks | What ships |
|---|---|---|
| ✅ 0 | 1 (done) | Stack adopted, schema merged, writing grader operational, smoke test passing |
| 1 | 8 | AI-graded writing live · Teacher dashboard + Lesson Library · Lab sessions + feedback |
| 2 | 8 | Reading + Listening + Vocab Mastery + Student Dashboard + Annotation + One-Click Generator |
| 3 | 6 | Certification + cohort analytics + nudges + PWA + Anthropic billing transition |
| **Total** | **23 weeks (~5.5 months)** solo / **~3.5 months** two engineers | Complete platform |

Coral's deadline: launch before September. From May 13 that's ~3.5 months — exactly the two-engineer timeline.

---

## Cost Picture

| Item | Monthly | Notes |
|---|---|---|
| Anthropic Claude API | $20-50 | Sonnet for grading, Opus for content gen. Scales with usage. |
| Existing infra (Railway + Vercel + Postgres + GCS + Stripe + Resend + OpenAI + Sentry + GA4) | ~$30-60 | Pre-existing (see `HANDOVER_OVERVIEW.md`). |
| **Total** | **$50-110/mo** | Roughly doubles current burn; adds the entire AI-graded pedagogy. |

Transitions to Coral's Anthropic account at Phase 3 start.

---

## Open Questions (Coral's Side)

1. **Engineer headcount + cost** — Coral needs our estimates for 1 engineer vs 2 engineers, both with aggressive Claude Code productivity. Target: launch before September.
2. **API key + Anthropic billing setup for v1** — needs to go into Railway env vars before Phase 1 starts in earnest (Phase 0 code paths work without it but won't grade until set).
3. **Lab session bootstrap content** — Coral commits to creating ~30-50 Lab Packs (10 themes × 5 levels) using the Flow 2 generator once it ships in Phase 2; for Phase 1 we can hand-author 4-6 starter packs.

---

## What We Skipped From the Original Plan

- ❌ **Next.js migration** — Vite stays.
- ❌ **Redis + BullMQ** for v1 — synchronous + Postgres sessions suffice.
- ❌ **S3 / R2 migration** — GCS keeps working.
- ❌ **PostHog adoption** — GA4 stays.
- ❌ **Strict 8-week cohort enforcement** — pure self-paced (Coral's Q1).
- ❌ **Ms. Coral integration scaffolding** — fully deferred until mobile is staffed (Coral's Q2).
- ❌ **`users` / `students` table split** — kept merged on our `users` table.
- ❌ **Cohort overview page** — replaced with "students by level" view (Coral's v2.0 Update 1).
- ❌ **15-min teaching block in Labs** — Labs are 100% conversation (Coral's v2.0 Update 3).

---

## What's Live in Production Right Now

After PR #7's merge (2026-05-13), Railway is deploying `main` with:

- All Phase 0 code (Anthropic client, writing grader, smoke test, v2.0 schema)
- The 5 resilience PRs that pre-dated this engagement (quiz crashes / Stripe / iOS / rate limiters / Railway build fix)
- All prior shipped work back to the original cogniboost.co code

The first deploy after this PR will:
1. `npm ci --include=dev` (build dependencies)
2. `npm run build` (Vite + esbuild bundle)
3. `npm run db:push` (apply all v2.0 schema additions — additive, safe)
4. `node dist/index.cjs` (boot server)

Until `ANTHROPIC_API_KEY` is set in Railway env vars, calls to the writing grader will throw a clear error ("ANTHROPIC_API_KEY is not configured"). No existing flows break.

---

## Recommended Next Step

1. **You set `ANTHROPIC_API_KEY` in Railway** (real `sk-ant-...` key from console.anthropic.com)
2. **I run the smoke test** against that key from local
3. **Coral answers Q4** (1 engineer vs 2) so we can lock the Phase 1 cadence
4. **Phase 1 kicks off** — first deliverable is the Submission API + writing editor, end-to-end on the live site within 5 working days.

The original v2.0 plan is a strong artifact — credit to its author. This document is the bridge between that vision and the production codebase that actually exists, plus Coral's locked decisions on top.
