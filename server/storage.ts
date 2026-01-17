import { 
  courses, 
  lessons, 
  enrollments, 
  conversationLabs, 
  labBookings, 
  subscriptions,
  userStats,
  instructors,
  payments,
  lessonProgress,
  users,
  type Course, 
  type InsertCourse, 
  type Lesson,
  type InsertLesson,
  type Enrollment,
  type InsertEnrollment,
  type ConversationLab,
  type InsertConversationLab,
  type LabBooking,
  type InsertLabBooking,
  type Subscription,
  type InsertSubscription,
  type UserStats,
  type InsertUserStats,
  type Instructor,
  type InsertInstructor,
  type Payment,
  type InsertPayment,
  type LessonProgress,
  type User,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  // Courses
  getCourses(): Promise<Course[]>;
  getAllCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  
  // Lessons
  getLessonsByCourseId(courseId: string): Promise<Lesson[]>;
  getLessonById(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, lesson: Partial<InsertLesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<boolean>;
  
  // Enrollments
  getEnrollmentsByUserId(userId: string): Promise<Enrollment[]>;
  getAllEnrollments(): Promise<Enrollment[]>;
  getEnrollmentByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | undefined>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  
  // Conversation Labs
  getConversationLabs(): Promise<ConversationLab[]>;
  getConversationLabById(id: string): Promise<ConversationLab | undefined>;
  createConversationLab(lab: InsertConversationLab): Promise<ConversationLab>;
  updateConversationLab(id: string, lab: Partial<InsertConversationLab>): Promise<ConversationLab | undefined>;
  deleteConversationLab(id: string): Promise<boolean>;
  
  // Lab Bookings
  getLabBookingsByUserId(userId: string): Promise<LabBooking[]>;
  getAllLabBookings(): Promise<LabBooking[]>;
  getLabBookingByUserAndLab(userId: string, labId: string): Promise<LabBooking | undefined>;
  createLabBooking(booking: InsertLabBooking): Promise<LabBooking>;
  
  // Subscriptions
  getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  createOrUpdateSubscription(subscription: InsertSubscription): Promise<Subscription>;
  
  // User Stats
  getUserStats(userId: string): Promise<UserStats | undefined>;
  getAllUserStats(): Promise<UserStats[]>;
  createOrUpdateUserStats(stats: InsertUserStats): Promise<UserStats>;
  
  // Instructors
  getInstructors(): Promise<Instructor[]>;
  getInstructorById(id: string): Promise<Instructor | undefined>;
  createInstructor(instructor: InsertInstructor): Promise<Instructor>;
  updateInstructor(id: string, instructor: Partial<InsertInstructor>): Promise<Instructor | undefined>;
  deleteInstructor(id: string): Promise<boolean>;
  
  // Payments
  getPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Lesson Progress
  getLessonProgressByUserId(userId: string): Promise<LessonProgress[]>;
  getAllLessonProgress(): Promise<LessonProgress[]>;
  
  // Admin Analytics
  getAdminStats(): Promise<{
    totalStudents: number;
    totalCourses: number;
    totalLabs: number;
    totalRevenue: string;
    activeSubscriptions: number;
  }>;
  
  // Users
  getUser(userId: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Courses
  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.isPublished, true));
  }

  async getAllCourses(): Promise<Course[]> {
    return db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async getCourseById(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined> {
    const [updated] = await db.update(courses).set(course).where(eq(courses.id, id)).returning();
    return updated;
  }

  async deleteCourse(id: string): Promise<boolean> {
    const result = await db.delete(courses).where(eq(courses.id, id));
    return true;
  }

  // Lessons
  async getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
    return db.select().from(lessons).where(eq(lessons.courseId, courseId)).orderBy(lessons.orderIndex);
  }

  async getLessonById(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [newLesson] = await db.insert(lessons).values(lesson).returning();
    return newLesson;
  }

  async updateLesson(id: string, lesson: Partial<InsertLesson>): Promise<Lesson | undefined> {
    const [updated] = await db.update(lessons).set(lesson).where(eq(lessons.id, id)).returning();
    return updated;
  }

  async deleteLesson(id: string): Promise<boolean> {
    await db.delete(lessons).where(eq(lessons.id, id));
    return true;
  }

  // Enrollments
  async getEnrollmentsByUserId(userId: string): Promise<Enrollment[]> {
    return db.select().from(enrollments).where(eq(enrollments.userId, userId));
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    return db.select().from(enrollments).orderBy(desc(enrollments.enrolledAt));
  }

  async getEnrollmentByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | undefined> {
    const [enrollment] = await db.select().from(enrollments)
      .where(eq(enrollments.userId, userId))
      .where(eq(enrollments.courseId, courseId));
    return enrollment;
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const [newEnrollment] = await db.insert(enrollments).values(enrollment).returning();
    return newEnrollment;
  }

  // Conversation Labs
  async getConversationLabs(): Promise<ConversationLab[]> {
    return db.select().from(conversationLabs).orderBy(desc(conversationLabs.scheduledAt));
  }

  async getConversationLabById(id: string): Promise<ConversationLab | undefined> {
    const [lab] = await db.select().from(conversationLabs).where(eq(conversationLabs.id, id));
    return lab;
  }

  async createConversationLab(lab: InsertConversationLab): Promise<ConversationLab> {
    const [newLab] = await db.insert(conversationLabs).values(lab).returning();
    return newLab;
  }

  async updateConversationLab(id: string, lab: Partial<InsertConversationLab>): Promise<ConversationLab | undefined> {
    const [updated] = await db.update(conversationLabs).set(lab).where(eq(conversationLabs.id, id)).returning();
    return updated;
  }

  async deleteConversationLab(id: string): Promise<boolean> {
    await db.delete(conversationLabs).where(eq(conversationLabs.id, id));
    return true;
  }

  // Lab Bookings
  async getLabBookingsByUserId(userId: string): Promise<LabBooking[]> {
    return db.select().from(labBookings).where(eq(labBookings.userId, userId));
  }

  async getAllLabBookings(): Promise<LabBooking[]> {
    return db.select().from(labBookings).orderBy(desc(labBookings.bookedAt));
  }

  async getLabBookingByUserAndLab(userId: string, labId: string): Promise<LabBooking | undefined> {
    const [booking] = await db.select().from(labBookings)
      .where(eq(labBookings.userId, userId))
      .where(eq(labBookings.labId, labId));
    return booking;
  }

  async createLabBooking(booking: InsertLabBooking): Promise<LabBooking> {
    const [newBooking] = await db.insert(labBookings).values(booking).returning();
    return newBooking;
  }

  // Subscriptions
  async getSubscriptionByUserId(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async createOrUpdateSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const existing = await this.getSubscriptionByUserId(subscription.userId);
    if (existing) {
      const [updated] = await db.update(subscriptions)
        .set({ ...subscription, updatedAt: new Date() })
        .where(eq(subscriptions.userId, subscription.userId))
        .returning();
      return updated;
    }
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  // User Stats
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats;
  }

  async getAllUserStats(): Promise<UserStats[]> {
    return db.select().from(userStats);
  }

  async createOrUpdateUserStats(stats: InsertUserStats): Promise<UserStats> {
    const existing = await this.getUserStats(stats.userId);
    if (existing) {
      const [updated] = await db.update(userStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(userStats.userId, stats.userId))
        .returning();
      return updated;
    }
    const [newStats] = await db.insert(userStats).values(stats).returning();
    return newStats;
  }

  // Instructors
  async getInstructors(): Promise<Instructor[]> {
    return db.select().from(instructors);
  }

  async getInstructorById(id: string): Promise<Instructor | undefined> {
    const [instructor] = await db.select().from(instructors).where(eq(instructors.id, id));
    return instructor;
  }

  async createInstructor(instructor: InsertInstructor): Promise<Instructor> {
    const [newInstructor] = await db.insert(instructors).values(instructor).returning();
    return newInstructor;
  }

  async updateInstructor(id: string, instructor: Partial<InsertInstructor>): Promise<Instructor | undefined> {
    const [updated] = await db.update(instructors).set(instructor).where(eq(instructors.id, id)).returning();
    return updated;
  }

  async deleteInstructor(id: string): Promise<boolean> {
    await db.delete(instructors).where(eq(instructors.id, id));
    return true;
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  // Lesson Progress
  async getLessonProgressByUserId(userId: string): Promise<LessonProgress[]> {
    return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
  }

  async getAllLessonProgress(): Promise<LessonProgress[]> {
    return db.select().from(lessonProgress);
  }

  // Admin Analytics
  async getAdminStats(): Promise<{
    totalStudents: number;
    totalCourses: number;
    totalLabs: number;
    totalRevenue: string;
    activeSubscriptions: number;
  }> {
    const [studentsResult] = await db.select({ count: count() }).from(userStats);
    const [coursesResult] = await db.select({ count: count() }).from(courses);
    const [labsResult] = await db.select({ count: count() }).from(conversationLabs);
    const [subsResult] = await db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.cancelAtPeriodEnd, false));
    const [revenueResult] = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(payments).where(eq(payments.status, "completed"));

    return {
      totalStudents: studentsResult?.count || 0,
      totalCourses: coursesResult?.count || 0,
      totalLabs: labsResult?.count || 0,
      totalRevenue: revenueResult?.total || "0",
      activeSubscriptions: subsResult?.count || 0,
    };
  }

  // Users
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }
}

export const storage = new DatabaseStorage();
