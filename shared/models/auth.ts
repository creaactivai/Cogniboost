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

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
