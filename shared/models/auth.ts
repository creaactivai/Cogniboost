import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, boolean, text, pgEnum } from "drizzle-orm/pg-core";

// User status enum: active (paying/using), hold (pending payment), inactive (churned/locked)
export const userStatusEnum = pgEnum("user_status", ["active", "hold", "inactive"]);

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Placement quiz status enum
export const placementQuizStatusEnum = pgEnum("placement_quiz_status", ["in_progress", "completed", "expired"]);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  birthDate: timestamp("birth_date"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  addedManually: boolean("added_manually").notNull().default(false),
  skipOnboarding: boolean("skip_onboarding").notNull().default(false),
  assignedPlan: text("assigned_plan"),
  invitationToken: varchar("invitation_token"),
  invitationSentAt: timestamp("invitation_sent_at"),
  status: userStatusEnum("status").notNull().default("active"),
  isLocked: boolean("is_locked").notNull().default(false),
  lockedAt: timestamp("locked_at"),
  lockedReason: text("locked_reason"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  lastActiveAt: timestamp("last_active_at"),
  // Onboarding fields
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  englishLevel: text("english_level"), // A1, A2, B1, B2, C1, C2
  learningGoals: text("learning_goals").array(), // career, travel, academic, personal
  availability: text("availability"), // mornings, afternoons, evenings, weekends
  interests: text("interests").array(), // business, technology, travel, culture, etc.
  weeklyHoursGoal: text("weekly_hours_goal"), // 1-3, 4-6, 7-10, 10+
  welcomeEmailSent: boolean("welcome_email_sent").notNull().default(false),
  onboardingReminderSent: boolean("onboarding_reminder_sent").notNull().default(false),
  // Placement quiz results
  placementLevel: text("placement_level"), // A1, A2, B1, B2, C1, C2 from placement quiz
  placementConfidence: text("placement_confidence"), // low, medium, high
  placementAttemptId: varchar("placement_attempt_id"), // Reference to last placement quiz attempt
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Placement quiz attempts table
export const placementQuizAttempts = pgTable("placement_quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // Nullable for anonymous users
  anonymousId: varchar("anonymous_id"), // UUID for anonymous users (stored in localStorage)
  status: placementQuizStatusEnum("status").notNull().default("in_progress"),
  currentStep: text("current_step").notNull().default("1"), // Current question number
  currentDifficulty: text("current_difficulty").notNull().default("B1"), // Adaptive difficulty level
  answers: jsonb("answers").notNull().default([]), // Array of {questionId, answer, isCorrect, difficulty}
  questionIds: jsonb("question_ids").default([]), // Array of static question IDs for this quiz
  computedLevel: text("computed_level"), // Final computed level A1-C2
  confidence: text("confidence"), // low, medium, high
  totalQuestions: text("total_questions").notNull().default("20"),
  correctAnswers: text("correct_answers").notNull().default("0"),
  ipHash: text("ip_hash"), // Hashed IP for rate limiting
  userAgentHash: text("user_agent_hash"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // Quiz expires after 30 minutes
});

// Lead status enum for marketing funnel
export const leadStatusEnum = pgEnum("lead_status", ["new", "engaged", "nurture", "qualified", "converted", "inactive"]);

// Leads table for marketing/conversion (pre-quiz info capture)
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  
  // Placement quiz results
  placementLevel: text("placement_level"), // Filled after quiz completion
  placementConfidence: text("placement_confidence"),
  quizAttemptId: varchar("quiz_attempt_id"),
  
  // Lead scoring and status
  status: leadStatusEnum("lead_status").notNull().default("new"),
  score: text("score").notNull().default("0"), // 0-100 lead score
  
  // Source/UTM tracking
  source: text("source"), // organic, paid, referral, social
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  referrerUrl: text("referrer_url"),
  landingPage: text("landing_page"),
  
  // Conversion tracking
  convertedToUser: boolean("converted_to_user").notNull().default(false),
  userId: varchar("user_id").references(() => users.id), // If they later sign up
  convertedAt: timestamp("converted_at"),
  
  // Email sequence tracking
  resultEmailSent: boolean("result_email_sent").notNull().default(false),
  resultEmailSentAt: timestamp("result_email_sent_at"),
  day1EmailSent: boolean("day1_email_sent").notNull().default(false),
  day1EmailSentAt: timestamp("day1_email_sent_at"),
  day3EmailSent: boolean("day3_email_sent").notNull().default(false),
  day3EmailSentAt: timestamp("day3_email_sent_at"),
  day7EmailSent: boolean("day7_email_sent").notNull().default(false),
  day7EmailSentAt: timestamp("day7_email_sent_at"),
  
  // Engagement tracking
  lastEmailOpenedAt: timestamp("last_email_opened_at"),
  lastEmailClickedAt: timestamp("last_email_clicked_at"),
  emailOpenCount: text("email_open_count").notNull().default("0"),
  emailClickCount: text("email_click_count").notNull().default("0"),
  
  // Lifecycle dates
  quizCompletedAt: timestamp("quiz_completed_at"),
  lastActivityAt: timestamp("last_activity_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin invitations table - emails that should receive admin access when they log in
export const adminInvitations = pgTable("admin_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  department: varchar("department"), // e.g., "content", "support", "marketing"
  invitedBy: varchar("invited_by").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type PlacementQuizAttempt = typeof placementQuizAttempts.$inferSelect;
export type InsertPlacementQuizAttempt = typeof placementQuizAttempts.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type AdminInvitation = typeof adminInvitations.$inferSelect;
export type InsertAdminInvitation = typeof adminInvitations.$inferInsert;
