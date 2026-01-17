import { 
  courses, 
  lessons, 
  enrollments, 
  conversationLabs, 
  labBookings, 
  subscriptions,
  userStats,
  instructors,
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
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Courses
  getCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  
  // Lessons
  getLessonsByCourseId(courseId: string): Promise<Lesson[]>;
  getLessonById(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  
  // Enrollments
  getEnrollmentsByUserId(userId: string): Promise<Enrollment[]>;
  getEnrollmentByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | undefined>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  
  // Conversation Labs
  getConversationLabs(): Promise<ConversationLab[]>;
  getConversationLabById(id: string): Promise<ConversationLab | undefined>;
  createConversationLab(lab: InsertConversationLab): Promise<ConversationLab>;
  
  // Lab Bookings
  getLabBookingsByUserId(userId: string): Promise<LabBooking[]>;
  getLabBookingByUserAndLab(userId: string, labId: string): Promise<LabBooking | undefined>;
  createLabBooking(booking: InsertLabBooking): Promise<LabBooking>;
  
  // Subscriptions
  getSubscriptionByUserId(userId: string): Promise<Subscription | undefined>;
  createOrUpdateSubscription(subscription: InsertSubscription): Promise<Subscription>;
  
  // User Stats
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createOrUpdateUserStats(stats: InsertUserStats): Promise<UserStats>;
  
  // Instructors
  getInstructors(): Promise<Instructor[]>;
  getInstructorById(id: string): Promise<Instructor | undefined>;
  createInstructor(instructor: InsertInstructor): Promise<Instructor>;
}

export class DatabaseStorage implements IStorage {
  // Courses
  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.isPublished, true));
  }

  async getCourseById(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  // Lessons
  async getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
    return db.select().from(lessons).where(eq(lessons.courseId, courseId));
  }

  async getLessonById(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lesson: InsertLesson): Promise<Lesson> {
    const [newLesson] = await db.insert(lessons).values(lesson).returning();
    return newLesson;
  }

  // Enrollments
  async getEnrollmentsByUserId(userId: string): Promise<Enrollment[]> {
    return db.select().from(enrollments).where(eq(enrollments.userId, userId));
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
    return db.select().from(conversationLabs);
  }

  async getConversationLabById(id: string): Promise<ConversationLab | undefined> {
    const [lab] = await db.select().from(conversationLabs).where(eq(conversationLabs.id, id));
    return lab;
  }

  async createConversationLab(lab: InsertConversationLab): Promise<ConversationLab> {
    const [newLab] = await db.insert(conversationLabs).values(lab).returning();
    return newLab;
  }

  // Lab Bookings
  async getLabBookingsByUserId(userId: string): Promise<LabBooking[]> {
    return db.select().from(labBookings).where(eq(labBookings.userId, userId));
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
}

export const storage = new DatabaseStorage();
