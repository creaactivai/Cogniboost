# CogniBoost Master Engineering Plan — Revised

**Source:** `CogniBoost_Master_Engineering_Plan.pdf` v1.0, May 2026 (61 pages).
**Same vision delivered, corrected for actual stack, existing schema, and current production realities.**

The original plan reads like a thoughtful greenfield specification. Most of its content is excellent — the rubrics, the prompt library, the three-pass QA system, the lesson library design. But it assumes a Next.js + Redis + S3 stack and a freshly-designed schema. We're a year into production on Vite + Express + Drizzle + Postgres + GCS, on Railway. Adopting the plan verbatim means rewriting most of the platform. This document keeps the pedagogy and the content protocols, and maps the engineering work onto what already exists.

---

## TL;DR — What's Different

| Topic | Original plan | Revised |
|---|---|---|
| **Frontend framework** | Next.js for curriculum + teacher dashboard | **Stay on Vite + React + wouter.** No Next.js rewrite — it's a multi-month refactor with zero user-visible benefit. |
| **Backend framework** | Node.js + TypeScript (or Python FastAPI) | **Express + TypeScript** (already in production). FastAPI ruled out. |
| **Job queue** | Redis + BullMQ | **In-process scheduler** for cron tasks. AI grading runs synchronously for v1 (60-sec response is acceptable), moves to queue only if traffic demands. |
| **Session store** | Redis | **Postgres** (`connect-pg-simple`, already wired). |
| **File storage** | AWS S3 or Cloudflare R2 | **GCS** (already wired, ~$1-5/mo). Don't migrate. |
| **Analytics** | PostHog | **GA4** (already wired with measurement ID). PostHog optional later. |
| **AI provider** | Claude Sonnet 4.6 + Opus 4.7 | **Adopt Claude.** Currently on `gpt-4o-mini`. Claude is materially better for rubric-based grading. ~$0.03/essay vs $0.001 with OpenAI — still negligible at our scale. Worth the upgrade. |
| **Database schema** | Greenfield design (users, students, lessons by level+week, submissions, vocabulary, vocabulary_mastery, speaking_sessions, listening_assessments, certificates) | **Map concepts onto existing tables.** See "Schema Mapping" below. Most additions are columns + new tables; no table renames. |
| **CEFR levels** | A1–C1 (5 levels) | **A1–C2** (6 levels, already in schema). Keep both; C2 is rare for adult ESL but harmless to support. |
| **8-week cohort model** | Plan assumes strict 8-week cohorts | **Decision required** — see "Strategic Product Decisions." |
| **"Ms. Coral" separate mobile app** | Build now (web side), activate when mobile launches | **Defer.** The mobile app itself doesn't exist yet. Build the *integration scaffolding* (feature flag, deep links, schema for speaking sessions) only if/when the Ms. Coral mobile project starts. |
| **Timeline** | 5-7 months solo, 3-4 months with two engineers | **Revised below.** Substantial refactoring of existing tables + greenfield features = similar total but different distribution. |

---

## What the Original Plan Got Right (Keep Verbatim)

These sections should be adopted as-is — they don't depend on our stack:

1. **Section 4.2 — Writing Rubric Structure** (5 dimensions × 20 points: Task Achievement, Coherence & Cohesion, Lexical Range, Grammatical Range & Accuracy, Register & Tone). This is solid CEFR-aligned pedagogy.
2. **Section 4.3 — JSON Response Schema** for grading output (overall_score, level_assessment, dimensions, inline_annotations, strengths, improvement_priorities, vocabulary_used_correctly, vocabulary_misused, estimated_cefr_for_this_writing). Use exactly.
3. **Section 4.4 — Teacher Override Workflow** (teacher sees all 5 dim scores, can adjust each, add inline annotations, add voice note, mark reviewed). Implement exactly.
4. **Section 5.2 — Reading Question Types Mix** (4 MCQ + 2 T/F-Not Given + 2 vocabulary in context + 2 short answer). Use exactly.
5. **Section 6 — Student Progress Dashboard** (CEFR radar chart, vocabulary mastery counter, streak, weakness diagnostics, certification readiness). All five pillars adopt as-is.
6. **Section 7.4 — Individual Lesson Plan Page** (17 sections: Header, Learning Objectives, Grammar Focus, Vocabulary Target, Lesson Structure, Video Resources, Authentic Materials, Quiz Preview, Writing Prompt, Speaking App Prompts, Lab Activities, Teacher Notes, Differentiation, Cultural Notes, Assessment Criteria, Common Mistakes, Homework). This is the gold standard.
7. **Section 9 — Vocabulary Mastery System** with its distinction between *exposed*, *learning*, *familiar*, *mastered* statuses, and the rule that only *productive use* (writing, speaking, typed gap-fill) counts toward mastery. Adopt verbatim — this is genuinely novel pedagogy that differentiates from Duolingo/Babbel.
8. **Section 12 — Conversation Lab Structure** (60 min broken into Warmup 5 / Teaching 15 / Breakouts 30 / Regroup 10, with feedback form email to info@cognimight.com). Adopt as-is.
9. **Section 13 — One-Click AI Lesson Generator.** This is the highest-leverage feature in the entire plan. From one uploaded HTML, generate lesson quiz + reading passage + reading quiz + writing prompt + listening script + listening quiz + vocabulary flashcards + Lab guide + teacher plan + common-Spanish-speaker-mistakes + cultural notes. Adopt the workflow.
10. **Section 14 — Five Rules of AI Content Generation** (never generic, always specify format, include examples, constrain by CEFR, always human review). Engrave these into the codebase.
11. **Section 15 — Three-Pass Review System** (automated validation → AI self-check → human review). Adopt and build the review interface.
12. **Section 18 — Prompt Library (Appendix A).** All four prompts (writing grading, short answer grading, speaking analysis, reading passage generation) are production-ready. Copy directly into the backend.
13. **Section 19 — CEFR Rubrics for Each Level (Appendix B).** Use to parameterize the writing grading prompt by level.

---

## What Needs Correction

### 1. No Next.js Rewrite

The plan recommends Next.js for the curriculum web app and teacher dashboard. We're on Vite + React + wouter + TanStack Query. Reasons not to rewrite:

- The frontend has roughly 50 components, all in working production
- wouter and TanStack Query give us 90% of what Next.js routing + data fetching offers, with less ceremony
- Next.js's main benefit (SSR for SEO) doesn't apply — this is a logged-in SaaS
- We'd lose months of work and gain nothing user-visible
- The teacher dashboard pages can be added as new wouter routes, same as student pages today

**Decision:** Add new pages to the existing Vite app as wouter routes. Use the existing `@tanstack/react-query` + `@radix-ui` + Tailwind patterns. No framework change.

### 2. No Redis / BullMQ for v1

The plan recommends Redis for sessions and BullMQ for AI grading jobs. We don't have Redis and don't need to add it for v1:

- Sessions are already in Postgres via `connect-pg-simple` (`server/replit_integrations/auth/replitAuth.ts`)
- AI grading: a 200-word essay graded by Claude returns in ~10-30 seconds. Acceptable to handle synchronously inside the request. Show a loading indicator on the frontend. Move to background queue only if we hit performance issues at scale.
- For longer jobs (one-click lesson generation, which calls Claude ~8 times in parallel), use Promise.all with a 90-second timeout; show progress in UI.

**When to revisit:** when we hit either (a) >100 simultaneous grading requests, or (b) >30s p95 grading latency. Then add a queue. Until then, simple synchronous execution.

### 3. No File-Storage Migration

The plan recommends S3 or R2. We're on GCS with all audio/PDF/lesson assets already there. Migration cost: at minimum days of risk for zero functional benefit.

**Decision:** Keep GCS. Skip the storage section of the plan.

### 4. Adopt Claude, Drop OpenAI for Grading

This is the one stack change worth making. Current state: `gpt-4o-mini` via OpenAI for AI quiz generation. The plan correctly identifies Claude as better for nuanced rubric grading.

Migration plan:
- Add `ANTHROPIC_API_KEY` to Railway env vars (same Anthropic billing as Trismegistus/Hyarmen if we're already paying there)
- New file `server/anthropicClient.ts` mirroring `server/openaiClient.ts` patterns
- Use Claude Sonnet for grading (cheap-and-fast bucket)
- Use Claude Opus only for content generation that's high-stakes (lesson plans, reading passages) or edge cases (low-confidence grade re-checks)
- Keep `gpt-4o-mini` for the existing quiz generation paths (works, costs less); migrate to Claude opportunistically

Cost reality check:
- 200-word essay graded with Claude Sonnet: ~$0.03 per essay
- 100 essays/week = $3.10/week, $13/month
- Lesson generation (Opus): ~$0.20 per lesson, 20 lessons/month = $4/month
- **Total Claude add-on:** ~$17/month at projected v1 volumes. Negligible.

### 5. Schema — Map, Don't Rewrite

The plan's schema in Section 3 is greenfield. Our schema (`shared/schema.ts`) has a year of production data. Here's the mapping:

| Plan's table | Our reality | Action |
|---|---|---|
| `users` | `users` already exists | Add columns: `preferredLanguage` (already there as `language`), `lastActiveAt`. |
| `students` (separate) | We don't split; profile fields live on `users` | **Don't split.** Add to `users`: `currentLevel`, `currentWeek`, `cohortId`, `enrollmentDate`, `targetCertificationDate`, `totalSpeakingMinutes`, `streakDays`. |
| `lessons` (level + week + lesson_number) | Our `lessons` belong to `courseModules` belong to `courses` | **Two options** — see "Strategic Decision 1: Cohort vs Self-Paced" below. |
| `submissions` (writing/reading_quiz/listening_quiz/speaking_recording/project) | We have `quizAttempts` for closed-quiz attempts | **New table `submissions`** for AI-graded writing + open-ended reading + listening summaries. Keep `quizAttempts` for the existing MCQ flows. The two coexist. |
| `vocabulary` | Doesn't exist | **New table** as specified. |
| `vocabulary_mastery` | Doesn't exist | **New table** as specified. |
| `speaking_sessions` | Doesn't exist | **Defer.** Only needed if Ms. Coral launches. |
| `lab_feedback` | We have `labBookings` but not `lab_feedback` | **New table** as specified. Email-to-admin feature is straightforward. |
| `listening_assessments` | Doesn't exist | **New table** as specified. |
| `certificates` | Doesn't exist | **New table** as specified. |
| `cohorts` | Doesn't exist | Required only if we adopt cohort model. See Strategic Decision 1. |

All new tables added via Drizzle schema edits in `shared/schema.ts`. `db:push` applies them on next deploy (this is already automatic per `railway.json` startCommand).

---

## Strategic Product Decisions (Need Your Call)

These three are not engineering choices — they're product/business calls that the plan assumes one way but we can defer.

### Decision 1 — Cohort model vs self-paced

The plan structures everything around **8-week cohorts**: students enrolled in Week 3 of B1, all on the same lesson at the same time, with synchronous Conversation Labs. Today, CogniBoost is self-paced — students enroll, work through lessons at their own speed.

**Cohort model pros:**
- Live Conversation Labs work better (everyone on similar material)
- Vocabulary mastery + spaced repetition + class discussion compound
- Certification feels like a real milestone (32 lessons + 6 Labs + final exam over 8 weeks)
- Sharper marketing story ("Get certified at B1 in 8 weeks")

**Cohort model cons:**
- Requires admin to manage cohort starts (weekly or monthly enrollment cohorts)
- Students can't start whenever they want — friction in the funnel
- Operational overhead: each cohort needs a teacher commitment for 8 weeks
- Big change to current student experience

**Recommendation:** Cohort-aware *but optional*. Add `cohort_id` (nullable) to user/student record. Cohort members get the synchronized week-by-week experience. Non-cohort users (legacy + casual signups) keep the self-paced experience. Slowly migrate marketing toward cohort-first as content depth makes self-paced impractical.

### Decision 2 — Ms. Coral mobile app

The plan repeatedly references Ms. Coral as a separate speaking-practice mobile app. It's not built. The plan says "build the integration on CogniBoost now, activate when Ms. Coral launches" via feature flag.

**Reality check:**
- Mobile app is a separate codebase (React Native? Native iOS/Android? Decision not made)
- Mobile app needs its own team / contractor
- Cost: ~3-6 months of focused work for v1, before any user can use it
- Without Ms. Coral live, the "Practice today's lesson with Ms. Coral" button is just a future placeholder

**Recommendation:** Defer the Ms. Coral integration scaffolding until the mobile app project actually starts. Adding `speaking_sessions` table and feature-flagged buttons to CogniBoost right now would generate dead code that decays. When Ms. Coral build kicks off, add the scaffolding in parallel.

If the client *insists* on Ms. Coral being part of this engagement: scope the mobile app as a separate parallel project with its own timeline (and probably its own developer).

### Decision 3 — Certification depth

The plan specifies real certificates with verification page (`cogniboost.co/verify/[code]`), QR codes, LinkedIn integration, and rigorous requirements (32 lessons + 7 quizzes passed + 7 projects submitted + 6 Labs attended + final exam ≥75% + final presentation video).

**This is a big commitment.** If we issue certificates that look CEFR-aligned, we're implicitly making claims about CEFR equivalence. Legally and ethically, those claims need to be defensible:
- Are we accredited by any CEFR body? (Probably no.)
- Do we say "CogniBoost CEFR-aligned certificate" (defensible) or "CEFR B1 certified" (could be challenged)?
- LinkedIn integration means our certificates appear in employers' eyes — even more reason to be careful with claims.

**Recommendation:** Build the *infrastructure* (verification page, QR, LinkedIn add) but be conservative with wording. Phrase as "CogniBoost B1 Completion Certificate, aligned with CEFR descriptors" rather than "B1 CEFR Certified." Consult a Spanish-speaking ESL accreditation body before launching if international recognition matters.

---

## Schema Additions — Concrete Drizzle Edits

These are the table additions for `shared/schema.ts`. All auto-apply via `npm run db:push` on next deploy.

```ts
// Add to existing pgTable("users")
preferredLanguage: text("preferred_language").default("es"),
lastActiveAt: timestamp("last_active_at"),
currentWeek: integer("current_week").default(1),  // 1-8 cohort week
cohortId: varchar("cohort_id").references(() => cohorts.id),
enrollmentDate: timestamp("enrollment_date").defaultNow(),
targetCertificationDate: date("target_certification_date"),
totalSpeakingMinutes: integer("total_speaking_minutes").default(0),
streakDays: integer("streak_days").default(0),

// New table — cohorts (optional, only if Decision 1 = cohort)
export const cohorts = pgTable("cohorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  level: courseLevelEnum("level").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  teacherId: varchar("teacher_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// New table — submissions (AI-graded open-ended work)
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  lessonId: varchar("lesson_id").references(() => lessons.id),
  assignmentType: text("assignment_type").notNull(),  // writing | reading_quiz | listening_quiz | speaking | project
  content: text("content").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
  aiGrade: text("ai_grade"),       // JSON stringified Claude response
  aiScore: decimal("ai_score", { precision: 5, scale: 2 }),
  teacherScore: decimal("teacher_score", { precision: 5, scale: 2 }),
  teacherFeedback: text("teacher_feedback"),
  teacherReviewedAt: timestamp("teacher_reviewed_at"),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("pending_ai"),  // pending_ai | ai_graded | teacher_reviewed | returned
});

// New table — vocabulary
export const vocabulary = pgTable("vocabulary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: text("word").notNull(),
  translationEs: text("translation_es").notNull(),
  level: courseLevelEnum("level").notNull(),
  partOfSpeech: text("part_of_speech"),
  exampleSentenceEn: text("example_sentence_en"),
  exampleSentenceEs: text("example_sentence_es"),
  phonetic: text("phonetic"),  // IPA
  audioUrl: text("audio_url"),
  collocations: text("collocations").array(),
  isIdiom: boolean("is_idiom").default(false),
  falseFriendWarning: text("false_friend_warning"),
});

// New table — vocabulary_mastery
export const vocabularyMastery = pgTable("vocabulary_mastery", {
  studentId: varchar("student_id").notNull().references(() => users.id),
  vocabularyId: varchar("vocabulary_id").notNull().references(() => vocabulary.id),
  exposureCount: integer("exposure_count").default(0),
  correctUses: integer("correct_uses").default(0),
  incorrectUses: integer("incorrect_uses").default(0),
  lastReviewedAt: timestamp("last_reviewed_at"),
  masteryLevel: text("mastery_level").default("new"),  // new | learning | familiar | mastered
  nextReviewDue: timestamp("next_review_due"),
}, (t) => ({ pk: primaryKey({ columns: [t.studentId, t.vocabularyId] }) }));

// New table — listening_assessments
export const listeningAssessments = pgTable("listening_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").references(() => lessons.id),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript"),  // hidden from students
  durationSeconds: integer("duration_seconds"),
  questions: text("questions"),  // JSON
  level: courseLevelEnum("level").notNull(),
});

// New table — lab_feedback
export const labFeedback = pgTable("lab_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  labBookingId: varchar("lab_booking_id").references(() => labBookings.id),
  rating: integer("rating").notNull(),  // 1-5
  improvementText: text("improvement_text"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  emailedToAdmin: boolean("emailed_to_admin").default(false),
});

// New table — certificates
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  level: courseLevelEnum("level").notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  finalExamScore: decimal("final_exam_score", { precision: 5, scale: 2 }),
  projectScore: decimal("project_score", { precision: 5, scale: 2 }),
  attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }),
  verificationCode: text("verification_code").notNull().unique(),
  qrCodeUrl: text("qr_code_url"),
  pdfUrl: text("pdf_url"),
});

// (lessons table additions — only if we adopt cohort model)
// Add to existing pgTable("lessons"):
// week: integer("week"),         // 1-8, nullable for non-cohort lessons
// lessonNumber: text("lesson_number"),  // "1.1", "1.2", etc
// grammarFocus: text("grammar_focus"),
// teacherNotes: text("teacher_notes"),  // structured lesson plan content
// vocabularyWordIds: text("vocabulary_word_ids").array(),
```

That's the schema diff. About 50 lines of additions. No table drops, no renames. Drizzle's `db:push` handles it automatically.

---

## Revised Build Priority & Timeline

The original plan's three-phase structure is sound. Here it is mapped to our reality:

### Phase 0 — Stack Adjustments (Week 1)

Before any new features, do the foundational changes:

- Adopt Claude API for grading. Add `anthropicClient.ts`. Test with one essay end-to-end.
- Schema additions (above) merged + `db:push`'d to staging.
- Decision 1, 2, 3 locked with the client.

**Effort:** 1 week of one engineer.

### Phase 1 — Foundation (Weeks 2-9, ~8 weeks)

The features that everything else depends on:

1. **AI-Graded Writing System** (highest leverage, per plan Section 4) — `/api/submissions` endpoint, Claude grading prompt from Appendix A, three-pass QA from Section 15.
2. **Submissions infrastructure** — frontend writing editor with autosave (already partially exists via the audio upload patterns), submission view with teacher-override workflow.
3. **Teacher Dashboard skeleton** — four pages per Section 7.1: Today, Lesson Library, Students, Analytics. Just routing and shell; content fills in over Phases 2-3.
4. **Lesson Library** with all existing lesson plans imported (per Section 7.2-7.5). Two-clicks rule: nav → click lesson. Each lesson page renders the 17-section plan from Section 7.4. This is the teacher's deliverable that the client specifically asked for.
5. **Lab feedback form** at end-of-Lab (per Section 12.5) — 2 questions, email to `info@cognimight.com` on submit. Use existing `server/resendClient.ts` with new `lab_feedback` template.

**Cumulative effort:** ~8 weeks. By end of Phase 1, the platform has AI-graded writing, the teacher dashboard, and the Lesson Library.

### Phase 2 — Differentiation (Weeks 10-17, ~8 weeks)

The features that make CogniBoost meaningfully better than Duolingo/Babbel:

6. **AI-Graded Reading Comprehension** (Section 5) — `reading_passages` table + content admin to generate via Claude + student reading view + mixed-question grading.
7. **Listening Comprehension Assessments** (Section 8 + 11) — `listening_assessments` table + audio player + question types.
8. **Vocabulary Mastery System** (Section 9) — `vocabulary` + `vocabulary_mastery` tables + SRS daily review deck + production-focused tracking.
9. **Student Progress Dashboard** (Section 6) — CEFR radar chart + vocabulary mastery counter + streak + weakness diagnostics + certification readiness.
10. **Teacher student deep-dive page + annotation tools** (Sections 7.6-7.9) — annotation UI on submissions, color-coded markup, voice comments.
11. **One-Click AI Lesson Generator** (Section 13) — admin tool that takes an HTML upload and produces everything. Highest content-throughput multiplier.
12. **(Optional) Ms. Coral feature-flag scaffolding** — only if Decision 2 is "build now," and Ms. Coral mobile project is actually staffed in parallel.

**Cumulative effort:** ~8 weeks. By end of Phase 2, the differentiating feature set is shippable.

### Phase 3 — Scale & Polish (Weeks 18-23, ~6 weeks)

13. **Certification System** with public verification page (Section 10) — `cogniboost.co/verify/[code]`, QR codes, LinkedIn integration.
14. **Cohort analytics for teachers** — cohort overview page, risk flags, attendance heatmaps (Section 7.7).
15. **Automated nudges with teacher approval** (Section 7.10) — AI drafts messages, teacher reviews + sends.
16. **Mobile-responsive polish (PWA)** — installable on phone home screen.
17. **Three-pass review interface** for content admin (Section 15) — review queue UI for AI-generated content.

**Cumulative effort:** ~6 weeks. By end of Phase 3, the platform is shippable as the "leading ESL platform for adult Spanish-speaking professionals" the plan envisions.

### Total

| Phase | Weeks | What's added |
|---|---|---|
| 0 | 1 | Stack adjustments, decisions locked |
| 1 | 8 | Writing AI grading + teacher dashboard + Lesson Library + Lab feedback |
| 2 | 8 | Reading + Listening + Vocabulary Mastery + Student Dashboard + Annotation + One-Click Generator |
| 3 | 6 | Certification + Cohort Analytics + Nudges + PWA + Review Interface |
| **Total** | **23 weeks** (~5.5 months) solo | Complete platform |

Two engineers in parallel: ~3.5 months. Matches the original plan's estimate.

---

## Cost Additions

| Item | Monthly | Notes |
|---|---|---|
| Anthropic Claude API | $20-50 | Sonnet for grading, Opus for content gen. Scales with usage. |
| Existing infra (Railway + Vercel + Postgres + GCS + Stripe + Resend + OpenAI + Sentry + GA4) | ~$30-60 | Already in HANDOVER_OVERVIEW.md. |
| **Total** | **$50-110/mo** | Roughly doubles current burn, but adds the entire AI-graded pedagogy. |

For comparison, Duolingo's annual revenue per active user is ~$15. At 100 paying students × $50 avg subscription = $5000/mo revenue, against ~$110/mo costs. Margin is fine.

---

## What to Skip From the Original Plan

- ❌ **Next.js migration** — explained above.
- ❌ **Redis + BullMQ** for v1 — synchronous + Postgres session store suffices.
- ❌ **S3/R2 migration** — GCS works.
- ❌ **PostHog adoption** — GA4 is wired and giving us data.
- ❌ **Strict 8-week cohort enforcement** — make it optional, support both.
- ❌ **Ms. Coral integration code now** — defer until the mobile app project exists.
- ❌ **The plan's `users` + `students` split** — keep merged on our `users` table.
- ❌ **`lessons.level + week + lesson_number` as primary org** — keep our course/module/lesson hierarchy; add week/lesson_number as optional metadata for cohort flow.

---

## What to Adopt From the Original Plan Verbatim

- ✅ **Section 4 — AI-graded writing rubric and response schema.**
- ✅ **Section 6 — Five Pillars of Student Dashboard.**
- ✅ **Section 7.4 — 17-section lesson plan structure.**
- ✅ **Section 9 — Vocabulary mastery model (productive use only).**
- ✅ **Section 12 — 60-min Lab structure + feedback form.**
- ✅ **Section 13 — One-Click AI Lesson Generator workflow.**
- ✅ **Section 14 — Five rules of AI content generation.**
- ✅ **Section 15 — Three-pass review system.**
- ✅ **Section 18 — Prompt library (all four prompts).**
- ✅ **Section 19 — CEFR rubrics per level.**
- ✅ **Claude API** as the grading engine (Sonnet) and content generator (Opus for high-stakes).

---

## Open Questions for the Client Before Kickoff

1. **Cohort vs self-paced?** (Decision 1 above — locked before Phase 1.)
2. **Ms. Coral — is the mobile app being built in parallel, or is this a future-only consideration?** (Decision 2.)
3. **Certificate wording — "CEFR-aligned" or stronger?** Any accreditation aspiration? (Decision 3.)
4. **One engineer or two?** (Affects timeline: 5.5 months solo vs 3.5 months pair.)
5. **Production tolerance for refactor-required changes** — e.g., adding `submissions` table is additive (low risk), but if we change how `users` is structured, existing customers might get logged out briefly. Acceptable, or zero-downtime required?
6. **AI grading auto-publish vs teacher-review-first?** The plan says don't auto-publish for first 60 days. Agreed?
7. **Anthropic billing — under whose account?** (If under Trismegistus/Hyarmen umbrella, can leverage existing volume. If under client's, they need a new Anthropic account + payment method.)

---

## Recommended Next Step

1. Lock the seven open questions above with the client in a 60-min call.
2. Once locked, kick off Phase 0 (one week): adopt Claude, merge schema additions, smoke test the writing grading prompt end-to-end with one essay.
3. After Phase 0 ships clean, begin Phase 1 in earnest.

The original plan is a strong artifact — credit to its author. This document is the bridge between that vision and the production codebase that actually exists.
