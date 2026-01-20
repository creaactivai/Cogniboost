import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Re-export chat models (for AI integrations)
export * from "./models/chat";

// Enums
export const courseLevelEnum = pgEnum("course_level", ["A1", "A2", "B1", "B2", "C1", "C2"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "standard", "premium"]);
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
  duration: integer("duration").notNull().default(0), // in minutes
  orderIndex: integer("order_index").notNull(),
  pdfMaterials: text("pdf_materials").array(), // URLs to PDF files in object storage
  isPreview: boolean("is_preview").notNull().default(false),
  isOpen: boolean("is_open").notNull().default(false), // Open lessons bypass prerequisite checks
  isPublished: boolean("is_published").notNull().default(false),
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

// Quizzes table - can be associated with a lesson or course
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").references(() => lessons.id),
  courseId: varchar("course_id").references(() => courses.id),
  title: text("title").notNull(),
  description: text("description"),
  passingScore: integer("passing_score").notNull().default(70), // percentage
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
