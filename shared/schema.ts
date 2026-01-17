import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const courseLevelEnum = pgEnum("course_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "standard", "premium"]);
export const labStatusEnum = pgEnum("lab_status", ["scheduled", "in_progress", "completed", "cancelled"]);

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  level: courseLevelEnum("level").notNull(),
  topic: text("topic").notNull(),
  duration: integer("duration").notNull(), // in minutes
  lessonsCount: integer("lessons_count").notNull().default(0),
  instructorId: varchar("instructor_id").references(() => instructors.id),
  price: decimal("price", { precision: 10, scale: 2 }),
  isFree: boolean("is_free").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Instructors table
export const instructors = pgTable("instructors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  specialization: text("specialization"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lessons table
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").references(() => courses.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  duration: integer("duration").notNull(), // in minutes
  orderIndex: integer("order_index").notNull(),
  isPreview: boolean("is_preview").notNull().default(false),
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
  lastWatchedAt: timestamp("last_watched_at").defaultNow(),
});

// Conversation Labs table
export const conversationLabs = pgTable("conversation_labs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  topic: text("topic").notNull(),
  level: courseLevelEnum("level").notNull(),
  instructorId: varchar("instructor_id").references(() => instructors.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  maxParticipants: integer("max_participants").notNull().default(12),
  currentParticipants: integer("current_participants").notNull().default(0),
  status: labStatusEnum("status").notNull().default("scheduled"),
  meetingUrl: text("meeting_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lab bookings table
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

// Relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(instructors, {
    fields: [courses.instructorId],
    references: [instructors.id],
  }),
  lessons: many(lessons),
  enrollments: many(enrollments),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
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

// Insert schemas
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true });
export const insertInstructorSchema = createInsertSchema(instructors).omit({ id: true, createdAt: true });
export const insertLessonSchema = createInsertSchema(lessons).omit({ id: true, createdAt: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true });
export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({ id: true });
export const insertConversationLabSchema = createInsertSchema(conversationLabs).omit({ id: true, createdAt: true, currentParticipants: true });
export const insertLabBookingSchema = createInsertSchema(labBookings).omit({ id: true, bookedAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserStatsSchema = createInsertSchema(userStats).omit({ id: true, updatedAt: true });

// Types
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
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
