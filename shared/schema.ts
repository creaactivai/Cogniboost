import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, pgEnum, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Re-export chat models (for AI integrations)
export * from "./models/chat";

// Enums
export const courseLevelEnum = pgEnum("course_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "flex", "basic", "premium"]);
export const labStatusEnum = pgEnum("lab_status", ["scheduled", "in_progress", "completed", "cancelled"]);

// Course categories table (custom categories created by admins)
export const courseCategories = pgTable("course_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  level: courseLevelEnum("level").notNull(),
  topic: text("topic").notNull(),
  duration: text("duration"), // flexible duration string (e.g., "4 weeks")
  modulesCount: integer("modules_count").notNull().default(1), // number of modules in the course
  lessonsCount: integer("lessons_count").notNull().default(0),
  instructorId: varchar("instructor_id").references(() => instructors.id),
  price: decimal("price", { precision: 10, scale: 2 }),
  isFree: boolean("is_free").notNull().default(false),
  isPremium: boolean("is_premium").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Course Modules table - organize lessons within a course
export const courseModules = pgTable("course_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(), // 1-based index for display order
  videoUrl: text("video_url"), // YouTube URL (or custom video URL in future)
  videoTranscript: text("video_transcript"), // Plain text transcript for quiz generation
  videoSource: text("video_source").default("youtube"), // 'youtube' or 'custom'
  createdAt: timestamp("created_at").defaultNow(),
});

// Instructors table
export const instructors = pgTable("instructors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  specializations: text("specializations").array(),
  languages: text("languages").array(),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  totalLabs: integer("total_labs").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lessons table
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => courses.id).notNull(),
  moduleId: varchar("module_id").references(() => courseModules.id), // optional module assignment
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  vimeoId: text("vimeo_id"), // Vimeo video ID for embedding
  htmlContent: text("html_content"), // HTML slide content for lessons
  duration: integer("duration").notNull().default(0), // in minutes
  orderIndex: integer("order_index").notNull(),
  pdfMaterials: text("pdf_materials").array(), // URLs to PDF files in object storage
  audioMaterials: text("audio_materials").array(), // "filename::url" pairs for lesson audio MP3s
  isPreview: boolean("is_preview").notNull().default(false),
  isOpen: boolean("is_open").notNull().default(false), // Open lessons bypass prerequisite checks
  isPublished: boolean("is_published").notNull().default(false),
  // Phase 1.5 (Master Plan v2.0 §7.4) — teacher-facing 17-section lesson plan.
  // Stored as a single JSON doc so the structure can evolve without schema
  // churn; the Phase 2 One-Click Generator writes directly to this field.
  // Shape: { learningObjectives, grammarFocus, vocabularyTarget,
  // lessonStructure, videoResources, authenticMaterials, quizPreview,
  // writingPrompt, speakingAppPrompts, labActivities, teacherNotes,
  // differentiation, culturalNotes, assessmentCriteria, commonMistakes,
  // homework } — all sections optional.
  teacherLessonPlan: jsonb("teacher_lesson_plan"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enrollments table
export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  courseId: varchar("course_id").references(() => courses.id).notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Lesson progress table
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  lessonId: varchar("lesson_id").references(() => lessons.id).notNull(),
  watchedSeconds: integer("watched_seconds").notNull().default(0),
  isCompleted: boolean("is_completed").notNull().default(false),
  quizPassed: boolean("quiz_passed").notNull().default(false), // Track if user passed the lesson's quiz
  lastWatchedAt: timestamp("last_watched_at").defaultNow(),
});

// Conversation Labs table (legacy - keeping for backwards compatibility)
export const conversationLabs = pgTable("conversation_labs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  topic: text("topic").notNull(),
  level: courseLevelEnum("level").notNull(),
  instructorId: varchar("instructor_id").references(() => instructors.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // in minutes
  maxParticipants: integer("max_participants").notNull().default(12),
  currentParticipants: integer("current_participants").notNull().default(0),
  status: labStatusEnum("status").notNull().default("scheduled"),
  meetingUrl: text("meeting_url"),
  isPremium: boolean("is_premium").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recurrence pattern enum
export const recurrencePatternEnum = pgEnum("recurrence_pattern", ["none", "weekly"]);

// Live Sessions table - main container for live classes
export const liveSessions = pgTable("live_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  instructorId: varchar("instructor_id").references(() => instructors.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(60), // in minutes
  status: labStatusEnum("status").notNull().default("scheduled"),
  meetingUrl: text("meeting_url"),
  isPremium: boolean("is_premium").notNull().default(false),
  // Recurring session fields
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: recurrencePatternEnum("recurrence_pattern").notNull().default("none"),
  seriesId: varchar("series_id"), // Groups recurring sessions together
  recurrenceEndDate: timestamp("recurrence_end_date"), // When to stop generating sessions
  createdAt: timestamp("created_at").defaultNow(),
});

// Session Rooms table - breakout rooms within a live session
export const sessionRooms = pgTable("session_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => liveSessions.id).notNull(),
  topic: text("topic").notNull(),
  level: courseLevelEnum("level").notNull(),
  maxParticipants: integer("max_participants").notNull().default(6),
  currentParticipants: integer("current_participants").notNull().default(0),
  roomUrl: text("room_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Room Bookings table - students book specific rooms
export const roomBookings = pgTable("room_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  roomId: varchar("room_id").references(() => sessionRooms.id).notNull(),
  bookedAt: timestamp("booked_at").defaultNow(),
  attendedAt: timestamp("attended_at"),
  cancelledAt: timestamp("cancelled_at"),
});

// Lab bookings table (legacy - keeping for backwards compatibility)
export const labBookings = pgTable("lab_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  labId: varchar("lab_id").references(() => conversationLabs.id).notNull(),
  bookedAt: timestamp("booked_at").defaultNow(),
  attendedAt: timestamp("attended_at"),
  cancelledAt: timestamp("cancelled_at"),
});

// User subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tier: subscriptionTierEnum("tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User progress stats table
export const userStats = pgTable("user_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  totalHoursStudied: decimal("total_hours_studied", { precision: 10, scale: 2 }).notNull().default("0"),
  coursesCompleted: integer("courses_completed").notNull().default(0),
  labsAttended: integer("labs_attended").notNull().default(0),
  currentLevel: courseLevelEnum("current_level").notNull().default("A1"),
  xpPoints: integer("xp_points").notNull().default(0),
  speakingMinutes: integer("speaking_minutes").notNull().default(0),
  vocabularyWords: integer("vocabulary_words").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment status enum
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed", "refunded"]);

// Payments table for tracking financial transactions
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  tier: subscriptionTierEnum("tier").notNull().default("free"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Idempotency log for Stripe webhook deliveries.
// Stripe retries failed deliveries and may also send duplicates; without this
// table, a `customer.subscription.updated` event can be applied twice and
// double-mutate user state (tier flip, status flip, duplicate emails).
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Master Plan v2.0 — Self-paced curriculum + AI grading + Lab Packs.
//
// Decision 1 (locked, Coral's response): SELF-PACED ONLY. No cohorts table.
// Decision 2: Labs are LEVEL × THEME — `lab_topics` defines reusable Lab Packs;
//             `lab_sessions` schedules instances; `lab_registrations` tracks
//             per-student attendance; `lab_feedback` collects the 2-question
//             end-of-class form.
// Decision 3: Ms. Coral integration deferred — no `speaking_sessions` here.
// All schema additions auto-apply on next Railway deploy via `npm run db:push`.
// ─────────────────────────────────────────────────────────────────────────────

// AI-graded open-ended submissions (writing, reading short-answer, listening
// summary, speaking transcripts later). Distinct from quizAttempts (closed
// MCQ). Per Master Plan v2.0 §3 + §4.
export const submissionStatusEnum = pgEnum("submission_status", [
  "pending_ai",
  "ai_graded",
  "teacher_reviewed",
  "returned",
]);

export const submissionTypeEnum = pgEnum("submission_type", [
  "writing",
  "reading_quiz",
  "listening_quiz",
  "speaking_recording",
  "project",
]);

export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  lessonId: varchar("lesson_id"),
  assignmentType: submissionTypeEnum("assignment_type").notNull(),
  content: text("content").notNull(),                       // raw student submission (writing text OR transcript)
  submittedAt: timestamp("submitted_at").defaultNow(),
  aiGrade: jsonb("ai_grade"),                               // full WritingGradeResponse / SpeakingGradeResponse shape
  aiScore: decimal("ai_score", { precision: 5, scale: 2 }), // 0-100
  teacherScore: decimal("teacher_score", { precision: 5, scale: 2 }),
  teacherFeedback: text("teacher_feedback"),
  teacherReviewedAt: timestamp("teacher_reviewed_at"),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),
  status: submissionStatusEnum("status").notNull().default("pending_ai"),
  // Speaking-recording extension (added 2026-05-15). All nullable so existing
  // writing/reading submissions are unaffected. Audio/video file lives in GCS.
  moduleId: varchar("module_id"),
  speakingProjectId: varchar("speaking_project_id"),
  writingProjectId: varchar("writing_project_id"),
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  transcript: text("transcript"),
  durationSeconds: integer("duration_seconds"),
});

// Writing Projects — one per module (CogniBoost Writing Rubric v2.0, May 2026).
// Topical writing prompts that mirror Speaking Projects: students write
// a piece using the module's target vocabulary, grammar, and expressions.
// AI grading via server/grading/writingPrompt.ts.
export const writingProjects = pgTable("writing_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull(),
  level: courseLevelEnum("level").notNull(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  targetVocabulary: text("target_vocabulary").array().default(sql`'{}'::text[]`),
  targetGrammar: text("target_grammar").array().default(sql`'{}'::text[]`),
  targetExpressions: text("target_expressions").array().default(sql`'{}'::text[]`),
  targetWordCountMin: integer("target_word_count_min").notNull().default(40),
  targetWordCountMax: integer("target_word_count_max").notNull().default(80),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Speaking Projects — one per module (CogniBoost Speaking Rubric, May 2026).
// Each Speaking Project asks the student to record audio/video applying the
// module's vocabulary, grammar, and target expressions. AI grading pipeline:
// Whisper transcribes → Claude scores against the speaking rubric.
export const speakingProjects = pgTable("speaking_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull(),
  level: courseLevelEnum("level").notNull(),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  targetVocabulary: text("target_vocabulary").array().default(sql`'{}'::text[]`),
  targetGrammar: text("target_grammar").array().default(sql`'{}'::text[]`),
  targetExpressions: text("target_expressions").array().default(sql`'{}'::text[]`),
  targetDurationSeconds: integer("target_duration_seconds").notNull().default(60),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Class Labs (Phase 1.6, interest-driven design, Coral 2026-05-15) ───
// Coral's pedagogical model: students self-select by INTEREST (Movies,
// Sports, Food, etc.) and each (interest × level) combo is ADAPTED to
// teach a specific grammar focus. Same interest, different grammar at
// each level. "Stealth grammar teaching" through topical conversation.

// Universal interest topic, shared across levels.
// Example: "Movies", "Sports", "Food & Cooking"
export const labInterestTopics = pgTable("lab_interest_topics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  icon: text("icon"),                                        // emoji or icon name
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Scheduled instance — each session carries its OWN grammar / vocab /
// expressions. The same (Interest × Level) cycles through different
// grammars over time (rotation_week 1..8 typically tracks the curriculum's
// 8 modules). Students self-select by Interest and may attend any session
// matching their level regardless of their personal curriculum progress.
// Distinct from the legacy `live_sessions` table (kept for backwards compat).
export const labSessionsV2 = pgTable("lab_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interestTopicId: varchar("interest_topic_id").notNull(),
  level: courseLevelEnum("level").notNull(),
  title: text("title").notNull(),                            // shown to students
  description: text("description"),                          // session abstract
  grammarFocus: text("grammar_focus"),                       // what grammar this session practices
  vocabulary: text("vocabulary").array().default(sql`'{}'::text[]`),
  expressions: text("expressions").array().default(sql`'{}'::text[]`),
  moduleReference: text("module_reference"),                 // optional, e.g. "A1 Module 1"
  rotationWeek: integer("rotation_week"),                    // optional, 1..8 within the rotation
  instructorId: varchar("instructor_id"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  meetingUrl: text("meeting_url"),                           // Jitsi room URL, Google Meet, etc.
  maxParticipants: integer("max_participants").notNull().default(8),
  status: text("status").notNull().default("scheduled"),     // scheduled / in_progress / completed / cancelled
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: text("recurrence_pattern"),
  seriesId: varchar("series_id"),                            // groups recurring sessions
  recurrenceEndDate: timestamp("recurrence_end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student registration / attendance for a Lab session.
export const labRegistrations = pgTable("lab_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  labSessionId: varchar("lab_session_id").notNull(),
  studentId: varchar("student_id").notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
  attended: boolean("attended"),                             // null until post-class marked
  speakingTimeMinutes: integer("speaking_time_minutes"),
  teacherFeedback: text("teacher_feedback"),
  teacherRating: integer("teacher_rating"),                  // 1-5 stars
  cancelled: boolean("cancelled").notNull().default(false),
  cancelledAt: timestamp("cancelled_at"),
});

// Vocabulary — global word bank, per-level. Used by Lab Packs + lessons.
export const vocabulary = pgTable("vocabulary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  word: text("word").notNull(),
  translationEs: text("translation_es").notNull(),
  level: courseLevelEnum("level").notNull(),
  partOfSpeech: text("part_of_speech"),
  exampleSentenceEn: text("example_sentence_en"),
  exampleSentenceEs: text("example_sentence_es"),
  phonetic: text("phonetic"),                               // IPA
  audioUrl: text("audio_url"),
  collocations: text("collocations").array(),
  isIdiom: boolean("is_idiom").default(false),
  falseFriendWarning: text("false_friend_warning"),         // L1 interference flag
  createdAt: timestamp("created_at").defaultNow(),
});

// Per-student vocabulary mastery — only counts PRODUCTIVE use (writing, speaking,
// typed gap-fill) per Master Plan v2.0 §9. Recognition does not count.
export const vocabularyMastery = pgTable(
  "vocabulary_mastery",
  {
    studentId: varchar("student_id").notNull(),
    vocabularyId: varchar("vocabulary_id").notNull().references(() => vocabulary.id),
    exposureCount: integer("exposure_count").default(0),
    correctUses: integer("correct_uses").default(0),
    incorrectUses: integer("incorrect_uses").default(0),
    lastReviewedAt: timestamp("last_reviewed_at"),
    masteryLevel: text("mastery_level").default("new"),     // new | learning | familiar | mastered
    nextReviewDue: timestamp("next_review_due"),            // SRS schedule
  },
  (t) => [primaryKey({ columns: [t.studentId, t.vocabularyId] })],
);

// (Old Lab Packs / labTopics / labSessions / labRegistrations / labFeedback
//  definitions were removed 2026-05-15 — they were a duplicate Phase 1.6
//  draft that conflicted with the refactored interest-driven schema above
//  (labInterestTopics, labSessionsV2, labRegistrations). The duplicates
//  were causing every Vercel + Railway build to fail with
//  "Multiple exports with the same name labRegistrations". The new schema
//  is what's deployed in production.)

// Listening assessments — 1-3 min audio clips, no transcript visible to student.
// Per Master Plan v2.0 §11.
export const listeningAssessments = pgTable("listening_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id"),                           // optional — sometimes tied to a lesson
  level: courseLevelEnum("level").notNull(),
  title: text("title").notNull(),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript"),                           // HIDDEN from students during play
  durationSeconds: integer("duration_seconds"),
  questions: jsonb("questions"),                            // mix of closed + open
  createdAt: timestamp("created_at").defaultNow(),
});

// Reading passages — Lab/lesson-tied 200-800 word texts with comprehension Qs.
// Per Master Plan v2.0 §5.
export const readingPassages = pgTable("reading_passages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id"),                           // optional
  level: courseLevelEnum("level").notNull(),
  title: text("title").notNull(),
  passage: text("passage").notNull(),
  wordCount: integer("word_count"),
  vocabularyWordIds: text("vocabulary_word_ids").array(),
  grammarFeaturesUsed: jsonb("grammar_features_used"),
  questions: jsonb("questions"),                            // MCQ + T/F + short-answer mix
  sourceAttribution: text("source_attribution"),            // for adapted authentic content
  createdAt: timestamp("created_at").defaultNow(),
});

// Certificates — CEFR-aligned completion credentials with public verification.
// Per Master Plan v2.0 §10. Conservative wording (Coral Q3): "aligned with CEFR".
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  level: courseLevelEnum("level").notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  finalExamScore: decimal("final_exam_score", { precision: 5, scale: 2 }),
  projectScore: decimal("project_score", { precision: 5, scale: 2 }),
  attendancePercentage: decimal("attendance_percentage", { precision: 5, scale: 2 }),
  verificationCode: text("verification_code").notNull().unique(),
  qrCodeUrl: text("qr_code_url"),
  pdfUrl: text("pdf_url"),
});

// Relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(instructors, {
    fields: [courses.instructorId],
    references: [instructors.id],
  }),
  modules: many(courseModules),
  lessons: many(lessons),
  enrollments: many(enrollments),
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseModules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
  quizzes: many(quizzes),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  module: one(courseModules, {
    fields: [lessons.moduleId],
    references: [courseModules.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const conversationLabsRelations = relations(conversationLabs, ({ one, many }) => ({
  instructor: one(instructors, {
    fields: [conversationLabs.instructorId],
    references: [instructors.id],
  }),
  bookings: many(labBookings),
}));

export const labBookingsRelations = relations(labBookings, ({ one }) => ({
  lab: one(conversationLabs, {
    fields: [labBookings.labId],
    references: [conversationLabs.id],
  }),
}));

// Live Sessions Relations
export const liveSessionsRelations = relations(liveSessions, ({ one, many }) => ({
  instructor: one(instructors, {
    fields: [liveSessions.instructorId],
    references: [instructors.id],
  }),
  rooms: many(sessionRooms),
}));

export const sessionRoomsRelations = relations(sessionRooms, ({ one, many }) => ({
  session: one(liveSessions, {
    fields: [sessionRooms.sessionId],
    references: [liveSessions.id],
  }),
  bookings: many(roomBookings),
}));

export const roomBookingsRelations = relations(roomBookings, ({ one }) => ({
  room: one(sessionRooms, {
    fields: [roomBookings.roomId],
    references: [sessionRooms.id],
  }),
}));

// Insert schemas
export const insertCourseCategorySchema = createInsertSchema(courseCategories).omit({ id: true, createdAt: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true });
export const insertCourseModuleSchema = createInsertSchema(courseModules).omit({ id: true, createdAt: true });
export const insertInstructorSchema = createInsertSchema(instructors).omit({ id: true, createdAt: true });
export const insertLessonSchema = createInsertSchema(lessons).omit({ id: true, createdAt: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true });
export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({ id: true });
export const insertConversationLabSchema = createInsertSchema(conversationLabs).omit({ id: true, createdAt: true, currentParticipants: true });
export const insertLabBookingSchema = createInsertSchema(labBookings).omit({ id: true, bookedAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserStatsSchema = createInsertSchema(userStats).omit({ id: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertLiveSessionSchema = createInsertSchema(liveSessions).omit({ id: true, createdAt: true });
export const insertSessionRoomSchema = createInsertSchema(sessionRooms).omit({ id: true, createdAt: true, currentParticipants: true });
export const insertRoomBookingSchema = createInsertSchema(roomBookings).omit({ id: true, bookedAt: true });

// Types
export type CourseCategory = typeof courseCategories.$inferSelect;
export type InsertCourseCategory = z.infer<typeof insertCourseCategorySchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type CourseModule = typeof courseModules.$inferSelect;
export type InsertCourseModule = z.infer<typeof insertCourseModuleSchema>;
export type Instructor = typeof instructors.$inferSelect;
export type InsertInstructor = z.infer<typeof insertInstructorSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type ConversationLab = typeof conversationLabs.$inferSelect;
export type InsertConversationLab = z.infer<typeof insertConversationLabSchema>;
export type LabBooking = typeof labBookings.$inferSelect;
export type InsertLabBooking = z.infer<typeof insertLabBookingSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type LiveSession = typeof liveSessions.$inferSelect;
export type InsertLiveSession = z.infer<typeof insertLiveSessionSchema>;
export type SessionRoom = typeof sessionRooms.$inferSelect;
export type InsertSessionRoom = z.infer<typeof insertSessionRoomSchema>;
export type RoomBooking = typeof roomBookings.$inferSelect;
export type InsertRoomBooking = z.infer<typeof insertRoomBookingSchema>;

// Quizzes table - can be associated with a lesson, course, or module
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").references(() => lessons.id),
  courseId: varchar("course_id").references(() => courses.id),
  moduleId: varchar("module_id").references(() => courseModules.id), // for module video activity quizzes
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull().default("ai"), // 'ai' for AI-generated, 'manual' for admin-created
  passingScore: integer("passing_score").notNull().default(70), // percentage
  totalPoints: integer("total_points").notNull().default(100), // total points for the quiz
  timeLimit: integer("time_limit"), // in minutes, null = no limit
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz Questions table - multiple choice questions
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").references(() => quizzes.id).notNull(),
  question: text("question").notNull(),
  options: text("options").array().notNull(), // array of answer options
  correctOptionIndex: integer("correct_option_index").notNull(), // 0-based index
  points: integer("points").notNull().default(10), // points for this question
  explanation: text("explanation"), // explanation for the correct answer
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz Attempts table - track student attempts
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  quizId: varchar("quiz_id").references(() => quizzes.id).notNull(),
  score: integer("score").notNull(), // percentage
  answers: text("answers").array(), // student's answers (option indices)
  isPassed: boolean("is_passed").notNull().default(false),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Quiz Relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [quizzes.lessonId],
    references: [lessons.id],
  }),
  course: one(courses, {
    fields: [quizzes.courseId],
    references: [courses.id],
  }),
  module: one(courseModules, {
    fields: [quizzes.moduleId],
    references: [courseModules.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
}));

// Insert schemas for quizzes
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({ id: true, createdAt: true });
export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({ id: true, completedAt: true });

// Types for quizzes
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;

/* =====================================================================
 * FINAL EXAMS + CERTIFICATES (Phase 1.7)
 * ---------------------------------------------------------------------
 * One Final Exam per CEFR level. Unlocked after 100% module completion.
 * Three sections: quiz (40%) + writing (30%) + speaking (30%), pass at 70.
 * Every question references the moduleId that taught the underlying
 * topic + carries a CEFR can-do descriptor so the exam is provably
 * curriculum-aligned and level-appropriate.
 * ===================================================================== */

export const finalExamQuestionTypeEnum = pgEnum("final_exam_question_type", [
  "multiple_choice",
  "fill_in",
  "true_false",
]);

export const finalExamAttemptStatusEnum = pgEnum("final_exam_attempt_status", [
  "in_progress",   // started, hasn't finalized
  "quiz_done",     // submitted the quiz section
  "writing_done",  // writing section submitted
  "speaking_done", // speaking section submitted
  "graded",        // all sections graded and final score computed
  "passed",        // graded + meets passingScore threshold
  "failed",        // graded + below threshold
]);

// One per CEFR level. courseId is set when this exam covers a specific
// course (typical case: 1 course per level), but we keep the field
// nullable in case Coral wants level-spanning exams later.
export const finalExams = pgTable("final_exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: courseLevelEnum("level").notNull().unique(),    // one active exam per level
  courseId: varchar("course_id").references(() => courses.id),
  title: text("title").notNull(),                         // "A1 Mastery Exam — Beginner Level"
  description: text("description"),
  passingScore: integer("passing_score").notNull().default(70),
  quizWeight: integer("quiz_weight").notNull().default(40),
  writingWeight: integer("writing_weight").notNull().default(30),
  speakingWeight: integer("speaking_weight").notNull().default(30),
  writingPrompt: text("writing_prompt"),                  // CEFR-aligned writing task
  writingMinWords: integer("writing_min_words").default(80),
  writingMaxWords: integer("writing_max_words").default(150),
  speakingPrompt: text("speaking_prompt"),                // CEFR-aligned speaking task
  speakingMinSeconds: integer("speaking_min_seconds").default(60),
  speakingMaxSeconds: integer("speaking_max_seconds").default(180),
  durationMinutes: integer("duration_minutes").notNull().default(45), // overall exam time budget
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quiz question bank. Each question references the module it tests +
// the CEFR descriptor (can-do statement) it maps to.
export const finalExamQuestions = pgTable("final_exam_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examId: varchar("exam_id").references(() => finalExams.id, { onDelete: "cascade" }).notNull(),
  moduleId: varchar("module_id").references(() => courseModules.id), // nullable if cross-cutting
  questionType: finalExamQuestionTypeEnum("question_type").notNull().default("multiple_choice"),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>(),            // for multiple_choice
  correctAnswer: text("correct_answer").notNull(),        // index "0".."N" for MC, exact string for fill_in, "true"/"false" for TF
  explanation: text("explanation"),                        // shown after grading
  cefrDescriptor: text("cefr_descriptor"),                 // e.g. "A1: Can introduce themselves..."
  points: integer("points").notNull().default(1),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// One row per attempt. Quiz answers live inline; writing/speaking
// scores reference submissions in the existing submissions table so we
// reuse the rubric grader.
export const finalExamAttempts = pgTable("final_exam_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  examId: varchar("exam_id").references(() => finalExams.id).notNull(),
  status: finalExamAttemptStatusEnum("status").notNull().default("in_progress"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  quizAnswers: jsonb("quiz_answers").$type<Record<string, string>>(),  // questionId → answer
  quizScore: decimal("quiz_score", { precision: 5, scale: 2 }),         // 0-100
  writingSubmissionId: varchar("writing_submission_id"),                 // FK submissions.id
  writingScore: decimal("writing_score", { precision: 5, scale: 2 }),
  speakingSubmissionId: varchar("speaking_submission_id"),
  speakingScore: decimal("speaking_score", { precision: 5, scale: 2 }),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }),        // weighted, 0-100
  passed: boolean("passed"),
});

// Certificates — issued only when a Final Exam attempt is "passed".
// verificationCode is a short URL-safe code that resolves at
// /verify/{code} (public) so employers can confirm authenticity.
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  examAttemptId: varchar("exam_attempt_id").references(() => finalExamAttempts.id).notNull(),
  level: courseLevelEnum("level").notNull(),
  studentName: text("student_name").notNull(),          // captured at issue time so renames don't break old certs
  finalScore: decimal("final_score", { precision: 5, scale: 2 }).notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
  verificationCode: text("verification_code").notNull().unique(),
  signatureName: text("signature_name").notNull().default("Coral Lozano, M.Ed."),
  revoked: boolean("revoked").notNull().default(false),
  revokedReason: text("revoked_reason"),
});

export const insertFinalExamSchema = createInsertSchema(finalExams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFinalExamQuestionSchema = createInsertSchema(finalExamQuestions).omit({ id: true, createdAt: true });
export const insertFinalExamAttemptSchema = createInsertSchema(finalExamAttempts).omit({ id: true, startedAt: true });
export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, issuedAt: true });

export type FinalExam = typeof finalExams.$inferSelect;
export type InsertFinalExam = z.infer<typeof insertFinalExamSchema>;
export type FinalExamQuestion = typeof finalExamQuestions.$inferSelect;
export type InsertFinalExamQuestion = z.infer<typeof insertFinalExamQuestionSchema>;
export type FinalExamAttempt = typeof finalExamAttempts.$inferSelect;
export type InsertFinalExamAttempt = z.infer<typeof insertFinalExamAttemptSchema>;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;

// Course levels array for UI
export const courseLevels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CourseLevel = typeof courseLevels[number];

// Course topics array for UI
export const courseTopics = [
  "Business English",
  "Travel & Tourism",
  "Technology",
  "Culture & Arts",
  "Healthcare",
  "Finance",
  "Academic English",
  "Everyday Conversations",
] as const;
export type CourseTopic = typeof courseTopics[number];
