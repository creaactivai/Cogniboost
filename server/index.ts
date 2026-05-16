// Global error handlers - MUST be first to catch any startup crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
// Note: stripe-replit-sync is imported dynamically inside initStripe() to avoid crash on Railway
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { initializeMonitoring, errorHandler } from './monitoring.js';
import { setupSecurityHeaders, setupRateLimiting } from './middleware/security';
import { validateEnv } from './env';
import { pool } from './db';

// Validate environment variables FIRST (fail fast if misconfigured)
validateEnv();

// Run pending database migrations (idempotent — safe to run on every boot)
async function runStartupMigrations() {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token varchar`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamp`);
    console.log('Startup migrations: password columns verified');

    // Email sequence tracking columns
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_day2_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_day5_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_day7_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ending_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expired_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reengagement_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_failed_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_progress_sent timestamp`);
    console.log('Startup migrations: email sequence columns verified');

    // Phase 0 v2.0 schema additions — self-paced curriculum tracking columns
    // (Master Plan v2.0 §3). Added 2026-05-13. Without these, SELECT * FROM users
    // throws "column does not exist" and blocks login + email cron jobs.
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level text`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS current_week integer DEFAULT 1`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'es'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS enrollment_date timestamp`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS target_certification_date timestamp`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_speaking_minutes integer DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_days integer DEFAULT 0`);
    console.log('Startup migrations: Phase 0 v2.0 curriculum columns verified');

    // Phase 1.5 (Master Plan v2.0 §7.4) — teacher-facing 17-section lesson plan
    // stored as JSON on the lessons table. Without this column, SELECT * FROM
    // lessons fails and the teacher Lesson Library at /dashboard/teacher/lessons
    // returns empty. Added 2026-05-14.
    await pool.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS teacher_lesson_plan jsonb`);
    console.log('Startup migrations: Phase 1.5 lesson-plan column verified');

    // Submissions table (Master Plan §3) — was defined in shared/schema.ts
    // but never migrated to production. Phase 1.5 writing-grading writes to
    // this table; without it those writes fail silently with 500s. Discovered
    // 2026-05-15 while seeding Speaking Projects. Re-creating here.
    await pool.query(`DO $$ BEGIN
      CREATE TYPE submission_status AS ENUM ('pending_ai','ai_graded','teacher_reviewed','returned');
    EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`DO $$ BEGIN
      CREATE TYPE submission_type AS ENUM ('writing','reading_quiz','listening_quiz','speaking_recording','project');
    EXCEPTION WHEN duplicate_object THEN null; END $$`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id varchar NOT NULL,
        lesson_id varchar,
        assignment_type submission_type NOT NULL,
        content text NOT NULL,
        submitted_at timestamp DEFAULT now(),
        ai_grade jsonb,
        ai_score decimal(5,2),
        teacher_score decimal(5,2),
        teacher_feedback text,
        teacher_reviewed_at timestamp,
        final_score decimal(5,2),
        status submission_status NOT NULL DEFAULT 'pending_ai',
        module_id varchar,
        speaking_project_id varchar,
        audio_url text,
        video_url text,
        transcript text,
        duration_seconds integer
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS submissions_student_idx ON submissions(student_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS submissions_speaking_proj_idx ON submissions(speaking_project_id)`);
    console.log('Startup migrations: submissions table verified');

    // Speaking Projects (added 2026-05-15, Coral). One Speaking Project per
    // module — students record audio (or video) demonstrating they can USE
    // the module's vocabulary, grammar, and target expressions in production.
    // AI grading pipeline: Whisper transcribes → Claude scores against the
    // CogniBoost Speaking Rubric (5 dimensions, 0-100, pass ≥70). Submissions
    // reuse the existing `submissions` table for the teacher review pipeline.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS speaking_projects (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id varchar NOT NULL,
        level course_level NOT NULL,
        title text NOT NULL,
        prompt text NOT NULL,
        target_vocabulary text[] DEFAULT '{}',
        target_grammar text[] DEFAULT '{}',
        target_expressions text[] DEFAULT '{}',
        target_duration_seconds integer NOT NULL DEFAULT 60,
        is_published boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS speaking_projects_module_id_idx ON speaking_projects(module_id)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS speaking_projects_module_unique ON speaking_projects(module_id)`);
    console.log('Startup migrations: speaking_projects table verified');

    // Extend submissions table for speaking recordings. The columns are all
    // nullable so existing writing submissions are unaffected.
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS module_id varchar`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS speaking_project_id varchar`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS audio_url text`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS video_url text`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS transcript text`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS duration_seconds integer`);
    console.log('Startup migrations: submissions speaking columns verified');

    // Seed A1 Speaking Projects (idempotent — one row per module, looked up
    // by module_id via the unique index). Coral reviewed + approved the 8
    // drafts on 2026-05-15. is_published=false so they don't go live until
    // she flips the flag.
    const A1_SPEAKING_DRAFTS = [
      {
        order: 1,
        title: 'Module 1 — Greetings & Introductions',
        prompt: 'Introduce yourself and a friend or family member. Say your names, where you are from, your nationalities, your jobs, and one number you know in English (like your age or phone number).',
        vocab: ['name','friend','age','from','country','nationality','American','Mexican','Dominican','numbers 1-100','job','profession','Nice to meet you'],
        grammar: ['verb TO BE (I am / he is / she is / we are)','possessive adjectives (my, his, her)','articles a/an'],
        expressions: ['Hi, my name is...','I am from...','This is my friend / my brother / my mom...','He/She is...','Nice to meet you'],
      },
      {
        order: 2,
        title: 'Module 2 — Family & Professions',
        prompt: 'Talk about your family. Describe 3 family members (parents, siblings, partner, kids). Say their names, ages, what they do for work, and one thing about each of them.',
        vocab: ['father','mother','brother','sister','husband','wife','son','daughter','grandparents','teacher','engineer','doctor','accountant','designer','manager','student','housewife','retired'],
        grammar: ['verb TO BE full mastery (affirmative, negative, questions)',`HAVE GOT for family ("I have got two brothers")`,'possessives'],
        expressions: ['I have got... brothers/sisters','My father is a...','She works as a...','He is X years old','His name is...'],
      },
      {
        order: 3,
        title: 'Module 3 — Daily Routine & Time',
        prompt: 'Describe a typical day in your life. Say what time you wake up, what you do in the morning, afternoon, and evening, and how often you do 2 activities (always, usually, sometimes, never).',
        vocab: ['wake up','get up','have breakfast','have lunch','have dinner','take a shower','go to work','watch TV','go to bed','days of the week','morning','afternoon','evening','night'],
        grammar: ['Present Simple (affirmative, negative, questions with do/does)','adverbs of frequency (always, usually, often, sometimes, never)','time expressions (at 7am, in the morning, on Mondays)'],
        expressions: ['I wake up at...','Every day I...','I usually... in the afternoon','I never...','On weekends I...'],
      },
      {
        order: 4,
        title: 'Module 4 — Food & Restaurant',
        prompt: `Talk about food. Mention 3 foods you like and 1 you don't like. Then imagine you are at a restaurant — practice ordering a meal (a drink, a main dish, and dessert).`,
        vocab: ['eggs','bread','rice','chicken','salad','pasta','soup','water','coffee','juice','menu','waiter','bill','table','breakfast','lunch','dinner'],
        grammar: [`like / love / hate + -ing form ("I love cooking")`,'countable/uncountable nouns',`some/any ("some bread", "any vegetables")`],
        expressions: ['I love eating...',`I don't like... at all`,'I would like a...','Can I have... please?','The bill, please'],
      },
      {
        order: 5,
        title: 'Module 5 — Shopping, City & Directions',
        prompt: 'Describe your neighborhood. Mention 3 places that are near your home (a bank, a supermarket, a park...). Then give simple directions from your home to one of those places.',
        vocab: ['bank','supermarket','park','hospital','restaurant','pharmacy','bus','taxi','train','on foot','clothes','small','medium','large'],
        grammar: ['prepositions of place (next to, near, in front of, behind, opposite)','imperatives for directions (turn left/right, go straight, cross the street)'],
        expressions: ['Near my home there is/are...','I usually go by...','To get to... go straight and turn left','It is next to...'],
      },
      {
        order: 6,
        title: 'Module 6 — Weather & Descriptions',
        prompt: 'Describe the weather in your country in 2 different seasons. Then describe what you usually wear and what you usually do in each kind of weather.',
        vocab: ['sunny','rainy','cloudy','windy','cold','hot','warm','cool','seasons','temperature','coat','umbrella','sunglasses','hat'],
        grammar: [`descriptive adjectives + TO BE ("It is sunny", "The weather is hot")`,`present simple for habits ("When it rains, I stay home")`],
        expressions: ['It is usually...','In summer / winter / spring...','When it is..., I wear...','I love / hate ... weather'],
      },
      {
        order: 7,
        title: 'Module 7 — Plans & Invitations',
        prompt: 'Talk about your plans for next weekend. Say what you ARE GOING TO do on Saturday and Sunday. Then invite a friend to one of those activities and explain when and where.',
        vocab: ['seasons','months','dates','visit','travel','meet','celebrate','watch a movie','go to the beach','party','dinner','event','plans'],
        grammar: ['Future with BE GOING TO (affirmative, negative, questions)',`dates and month expressions ("on March 5th", "in December")`],
        expressions: ['Next weekend I am going to...','On Saturday I am going to...','Would you like to... with me?',`Let's meet at...`],
      },
      {
        order: 8,
        title: 'Module 8 — A1 Showcase (Final Integration)',
        prompt: 'This is your final A1 showcase. In about 1 minute, introduce yourself completely: who you are, where you are from, your family, your job, your daily routine, your favorite food, and what you are going to do next month. Use everything you learned in A1.',
        vocab: ['All A1 vocabulary integrated (family, jobs, time, food, places, weather, dates)'],
        grammar: ['All A1 structures integrated (TO BE, HAVE GOT, Present Simple, frequency adverbs, BE GOING TO, prepositions, like + ing)'],
        expressions: ['Combine expressions from M1-M7 — full self-introduction integrating module content'],
      },
    ];
    for (const d of A1_SPEAKING_DRAFTS) {
      await pool.query(
        `INSERT INTO speaking_projects (module_id, level, title, prompt, target_vocabulary, target_grammar, target_expressions, target_duration_seconds, is_published)
         SELECT cm.id, 'A1', $1, $2, $3, $4, $5, 60, false
         FROM course_modules cm
         JOIN courses c ON c.id = cm.course_id
         WHERE c.level = 'A1' AND cm.order_index = $6
         ON CONFLICT (module_id) DO NOTHING`,
        [d.title, d.prompt, d.vocab, d.grammar, d.expressions, d.order]
      );
    }
    console.log('Startup migrations: A1 speaking projects seeded (8 drafts, unpublished)');

    // Writing Projects (added 2026-05-15, Coral). Topical writing prompts —
    // one per module — that mirror Speaking Projects. Same per-module
    // (vocab/grammar/expressions) targets but written instead of spoken.
    // AI grading via the existing CogniBoost Writing Rubric v2.0 grader
    // (server/grading/writingPrompt.ts).
    await pool.query(`
      CREATE TABLE IF NOT EXISTS writing_projects (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id varchar NOT NULL,
        level course_level NOT NULL,
        title text NOT NULL,
        prompt text NOT NULL,
        target_vocabulary text[] DEFAULT '{}',
        target_grammar text[] DEFAULT '{}',
        target_expressions text[] DEFAULT '{}',
        target_word_count_min integer NOT NULL DEFAULT 40,
        target_word_count_max integer NOT NULL DEFAULT 80,
        is_published boolean NOT NULL DEFAULT false,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS writing_projects_module_unique ON writing_projects(module_id)`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS writing_project_id varchar`);
    console.log('Startup migrations: writing_projects table verified');

    // Seed A1 writing projects (idempotent — Coral approved 2026-05-15).
    const A1_WRITING_DRAFTS = [
      {
        order: 1,
        title: 'Module 1 — Greetings & Introductions',
        prompt: 'Write a short message to introduce yourself to a new online study group. Say your name, where you are from, your age, your job, and one thing you like to do in your free time.',
        vocab: ['name','friend','age','from','country','nationality','job','profession','free time','hobby'],
        grammar: ['verb TO BE','possessive adjectives (my, his, her)','articles a/an'],
        expressions: ['My name is...','I am from...','I am ... years old','I am a [job]','I like...'],
      },
      {
        order: 2,
        title: 'Module 2 — Family & Professions',
        prompt: 'Describe your family in a short paragraph. Talk about three family members: their names, ages, what they do for work, and one detail about each of them.',
        vocab: ['father','mother','brother','sister','husband','wife','son','daughter','teacher','engineer','doctor','designer','accountant','manager','student'],
        grammar: ['verb TO BE full mastery','HAVE GOT for family','possessives'],
        expressions: ['I have got... brothers/sisters','My father is a...','She works as a...','He is X years old'],
      },
      {
        order: 3,
        title: 'Module 3 — Daily Routine & Time',
        prompt: 'Write about your typical Tuesday. What time do you wake up? What do you do in the morning, afternoon, and evening? Mention how often you do at least two activities (always, usually, sometimes, never).',
        vocab: ['wake up','have breakfast','have lunch','have dinner','go to work','watch TV','go to bed','morning','afternoon','evening','night','days of the week'],
        grammar: ['Present Simple','adverbs of frequency (always/usually/sometimes/never)','time expressions (at 7am, in the morning)'],
        expressions: ['I wake up at...','Every day I...','I usually... in the afternoon','I never...'],
      },
      {
        order: 4,
        title: 'Module 4 — Food & Restaurant',
        prompt: `Write about food. Mention three foods you love and one you don't like. Then describe your favorite restaurant — what you usually order there and why you like it.`,
        vocab: ['eggs','bread','rice','chicken','salad','pasta','soup','water','coffee','juice','menu','waiter','bill','table'],
        grammar: [`like / love / hate + -ing form`,'countable/uncountable nouns','some/any'],
        expressions: ['I love eating...',`I don't like... at all`,'My favorite restaurant is...','I usually order...'],
      },
      {
        order: 5,
        title: 'Module 5 — Shopping, City & Directions',
        prompt: 'Describe your neighborhood. Mention three places that are near your home (a bank, a park, a supermarket, etc.). Then write simple directions from your home to one of those places.',
        vocab: ['bank','supermarket','park','hospital','restaurant','pharmacy','bus','taxi','train','clothes','sizes'],
        grammar: ['prepositions of place (next to, near, in front of)','imperatives for directions'],
        expressions: ['Near my home there is...','Go straight and turn left','It is next to...'],
      },
      {
        order: 6,
        title: 'Module 6 — Weather & Descriptions',
        prompt: 'Write about the weather in your country in two different seasons. Describe what clothes you usually wear and what activities you usually do in each kind of weather.',
        vocab: ['sunny','rainy','cloudy','windy','cold','hot','warm','cool','coat','umbrella','sunglasses','hat','seasons'],
        grammar: [`descriptive adjectives + TO BE`,`Present Simple for habits`],
        expressions: ['It is usually...','In summer / winter...','When it is..., I wear...','I love/hate ... weather'],
      },
      {
        order: 7,
        title: 'Module 7 — Plans & Invitations',
        prompt: `Write about your plans for next weekend. Say what you ARE GOING TO do on Saturday and Sunday. Then write a short invitation to a friend for one of those activities — include when, where, and what you'll do.`,
        vocab: ['seasons','months','dates','visit','travel','meet','party','dinner','event','plans'],
        grammar: ['Future with BE GOING TO',`dates and month expressions`],
        expressions: ['Next weekend I am going to...','On Saturday I am going to...','Would you like to... with me?',`Let's meet at...`],
      },
      {
        order: 8,
        title: 'Module 8 — A1 Showcase (Final Integration)',
        prompt: 'Write a complete self-introduction for a job application or social media profile. Include who you are, where you are from, your family, your job, your daily routine, your favorite food, and what you are going to do next month. Use everything you learned in A1.',
        vocab: ['All A1 vocabulary integrated (family, jobs, time, food, places, weather, dates)'],
        grammar: ['All A1 structures integrated (TO BE, HAVE GOT, Present Simple, frequency adverbs, BE GOING TO, prepositions, like + ing)'],
        expressions: ['Combine expressions from M1-M7 — full self-introduction integrating module content'],
      },
    ];
    for (const d of A1_WRITING_DRAFTS) {
      await pool.query(
        `INSERT INTO writing_projects (module_id, level, title, prompt, target_vocabulary, target_grammar, target_expressions, target_word_count_min, target_word_count_max, is_published)
         SELECT cm.id, 'A1', $1, $2, $3, $4, $5, 40, 80, false
         FROM course_modules cm
         JOIN courses c ON c.id = cm.course_id
         WHERE c.level = 'A1' AND cm.order_index = $6
         ON CONFLICT (module_id) DO NOTHING`,
        [d.title, d.prompt, d.vocab, d.grammar, d.expressions, d.order]
      );
    }
    console.log('Startup migrations: A1 writing projects seeded (8 drafts, unpublished)');

    // Lab reminder flags (added 2026-05-16). Two booleans per session so
    // the cron can fire the 24h-ahead reminder and the 30min-ahead reminder
    // independently. Both default false; flipped to true after the email
    // is sent so we never spam.
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS reminder_30min_sent boolean NOT NULL DEFAULT false`);
    console.log('Startup migrations: lab_sessions reminder flags verified');

    // Class Labs (Phase 1.6 — Coral, 2026-05-15). Re-modeled per Coral's
    // "interest-driven stealth grammar" design: students self-select by
    // INTEREST (Movies, Sports, Food, etc.) and each (interest × level)
    // combination is ADAPTED to teach a specific grammar focus. Same
    // interest, different grammar across levels — e.g. "Movies" at A1
    // teaches verb TO BE; at B1 teaches past simple + past continuous.
    //
    // The existing live_sessions + lab_bookings tables stay as legacy
    // (9 rows of older Google-Meet style sessions). The new model below
    // is what the Phase 1.6 UI will consume.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lab_interest_topics (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        icon text,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        display_order integer DEFAULT 0,
        created_at timestamp DEFAULT now()
      )
    `);

    // lab_sessions — each scheduled instance carries its OWN grammar / vocab /
    // expressions (per-session, not per-topic). This is Coral's refined design:
    // within the same Interest × Level, different sessions over time rotate
    // through different grammars (e.g. A1 Movies rotates through M1..M8
    // grammar across 8 weeks). Students self-select by interest and can
    // attend any session matching their level regardless of where they are
    // in the self-paced curriculum.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lab_sessions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        interest_topic_id varchar NOT NULL,
        level course_level NOT NULL,
        title text NOT NULL,
        description text,
        grammar_focus text,
        vocabulary text[] DEFAULT '{}',
        expressions text[] DEFAULT '{}',
        module_reference text,
        rotation_week integer,
        instructor_id varchar,
        scheduled_at timestamp NOT NULL,
        duration_minutes integer NOT NULL DEFAULT 60,
        meeting_url text,
        max_participants integer NOT NULL DEFAULT 8,
        status text NOT NULL DEFAULT 'scheduled',
        is_recurring boolean NOT NULL DEFAULT false,
        recurrence_pattern text,
        series_id varchar,
        recurrence_end_date timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    // Idempotent migrations on top of the CREATE TABLE — these ensure the
    // columns exist even on databases that were created from the older,
    // pre-refactor schema (which had lab_topic_id + minimal fields).
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS interest_topic_id varchar`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS level course_level`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS title text`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS description text`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS grammar_focus text`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS vocabulary text[] DEFAULT '{}'`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS expressions text[] DEFAULT '{}'`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS module_reference text`);
    await pool.query(`ALTER TABLE lab_sessions ADD COLUMN IF NOT EXISTS rotation_week integer`);
    await pool.query(`CREATE INDEX IF NOT EXISTS lab_sessions_scheduled_idx ON lab_sessions(scheduled_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS lab_sessions_status_idx ON lab_sessions(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS lab_sessions_interest_level_idx ON lab_sessions(interest_topic_id, level)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lab_registrations (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        lab_session_id varchar NOT NULL,
        student_id varchar NOT NULL,
        registered_at timestamp DEFAULT now(),
        attended boolean,
        speaking_time_minutes integer,
        teacher_feedback text,
        teacher_rating integer,
        cancelled boolean NOT NULL DEFAULT false,
        cancelled_at timestamp
      )
    `);
    // One active registration per (session, student) — preventing double-booking
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS lab_registrations_unique ON lab_registrations(lab_session_id, student_id) WHERE NOT cancelled`);
    await pool.query(`CREATE INDEX IF NOT EXISTS lab_registrations_student_idx ON lab_registrations(student_id)`);
    console.log('Startup migrations: Phase 1.6 Class Lab tables verified (interest-driven design)');
  } catch (err) {
    console.error('Startup migration error (non-fatal):', err);
  }
}

const app = express();

// Initialize Sentry BEFORE any other middleware
initializeMonitoring(app);

// Setup security headers (Helmet)
setupSecurityHeaders(app);

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Initialize Stripe schema and sync on startup
// Uses dynamic import so stripe-replit-sync doesn't crash on Railway if not present
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  // Only run stripe-replit-sync in Replit environments
  const isReplit = !!(process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL || process.env.REPLIT_DOMAINS);

  if (!isReplit) {
    console.log('Non-Replit environment detected, skipping stripe-replit-sync (using direct Stripe keys instead)');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    const { runMigrations } = await import('stripe-replit-sync');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    // Get StripeSync instance
    const stripeSync = await getStripeSync();

    // Set up managed webhook
    const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
    const webhookBaseUrl = domains[0] ? `https://${domains[0]}` : null;

    if (webhookBaseUrl) {
      console.log('Setting up managed webhook...');
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        if (result?.webhook?.url) {
          console.log(`Webhook configured: ${result.webhook.url}`);
        } else {
          console.log('Managed webhook setup completed');
        }
      } catch (webhookError) {
        console.log('Managed webhook setup skipped (may already exist):', webhookError);
      }
    }

    // Sync all existing Stripe data in background
    console.log('Syncing Stripe data in background...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: Error) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

// Health check endpoint - MUST respond quickly for Railway / load balancers
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register Stripe webhook route BEFORE express.json() - CRITICAL for webhooks
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('Webhook body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Now apply JSON middleware for all other routes
app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Setup rate limiting BEFORE routes
setupRateLimiting(app);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run DB migrations before anything else (idempotent)
  await runStartupMigrations();

  // Initialize Stripe on startup
  await initStripe();

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Sentry error handler must be registered after all controllers
  app.use(errorHandler());

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);

      // Start email sequence cron — runs every hour
      import("./emailSequences").then(({ runAllEmailSequences }) => {
        // Run once on startup (5 min delay to let everything initialize)
        setTimeout(() => {
          runAllEmailSequences().catch((e) => console.error("[Email Cron] Startup run error:", e));
        }, 5 * 60 * 1000);

        // Then every hour
        setInterval(() => {
          runAllEmailSequences().catch((e) => console.error("[Email Cron] Interval error:", e));
        }, 60 * 60 * 1000);

        log("Email sequence cron scheduled (every hour)");
      }).catch((e) => console.error("[Email Cron] Failed to load:", e));
    },
  );
})();
