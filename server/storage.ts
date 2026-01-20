import { 
  courseCategories,
  courses, 
  courseModules,
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
  liveSessions,
  sessionRooms,
  roomBookings,
  quizzes,
  quizQuestions,
  quizAttempts,
  placementQuizAttempts,
  leads,
  adminInvitations,
  type CourseCategory,
  type InsertCourseCategory,
  type Course, 
  type InsertCourse, 
  type CourseModule,
  type InsertCourseModule,
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
  type LiveSession,
  type InsertLiveSession,
  type SessionRoom,
  type InsertSessionRoom,
  type RoomBooking,
  type InsertRoomBooking,
  type Quiz,
  type InsertQuiz,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type PlacementQuizAttempt,
  type InsertPlacementQuizAttempt,
  type Lead,
  type InsertLead,
  type AdminInvitation,
  type InsertAdminInvitation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, count, and } from "drizzle-orm";

export interface IStorage {
  // Course Categories
  getCourseCategories(): Promise<CourseCategory[]>;
  createCourseCategory(category: InsertCourseCategory): Promise<CourseCategory>;
  
  // Courses
  getCourses(): Promise<Course[]>;
  getAllCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  
  // Course Modules
  getModulesByCourseId(courseId: string): Promise<CourseModule[]>;
  getModuleById(id: string): Promise<CourseModule | undefined>;
  createModule(module: InsertCourseModule): Promise<CourseModule>;
  createModulesForCourse(courseId: string, count: number): Promise<CourseModule[]>;
  updateModule(id: string, module: Partial<InsertCourseModule>): Promise<CourseModule | undefined>;
  deleteModule(id: string): Promise<boolean>;
  deleteModulesByCourseId(courseId: string): Promise<boolean>;
  
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
  getCourseProgressWithUnlockStatus(userId: string, courseId: string): Promise<{
    lessons: Array<{
      id: string;
      title: string;
      orderIndex: number;
      isOpen: boolean;
      isPreview: boolean;
      isCompleted: boolean;
      quizPassed: boolean;
      hasQuiz: boolean;
      isUnlocked: boolean;
    }>;
    overallProgress: number;
  }>;
  markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress>;
  updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number): Promise<LessonProgress>;
  markQuizPassed(userId: string, lessonId: string): Promise<LessonProgress>;
  
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
  getAllUsers(): Promise<User[]>;
  getUsersByStatus(status: 'active' | 'hold' | 'inactive'): Promise<User[]>;
  getAdminUsers(): Promise<User[]>;
  updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined>;
  
  // Admin Invitations
  getAdminInvitations(): Promise<AdminInvitation[]>;
  createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation>;
  deleteAdminInvitation(id: string): Promise<boolean>;
  updateUser(userId: string, updates: Partial<{
    status: 'active' | 'hold' | 'inactive';
    isLocked: boolean;
    lockedAt: Date | null;
    lockedReason: string | null;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    englishLevel: string;
    learningGoals: string[];
    availability: string;
    weeklyHoursGoal: string;
    interests: string[];
    onboardingCompleted: boolean;
    welcomeEmailSent: boolean;
    onboardingReminderSent: boolean;
    placementLevel: string;
    placementConfidence: string;
    placementAttemptId: string;
    updatedAt: Date;
  }>): Promise<User | undefined>;
  lockUser(userId: string, reason?: string): Promise<User | undefined>;
  unlockUser(userId: string): Promise<User | undefined>;
  createManualStudent(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    birthDate: Date;
    addedManually: boolean;
    skipOnboarding: boolean;
    assignedPlan: string;
    invitationToken: string;
    invitationSentAt: Date;
    onboardingCompleted: boolean;
    status: 'active' | 'hold' | 'inactive';
  }): Promise<User>;
  getStudentMetrics(): Promise<{
    totalStudents: number;
    activeStudents: number;
    holdStudents: number;
    inactiveStudents: number;
    churnRate: number;
    newStudentsThisMonth: number;
    churnedThisMonth: number;
  }>;
  
  // Onboarding
  getOnboardingStats(): Promise<{
    totalUsers: number;
    completedOnboarding: number;
    pendingOnboarding: number;
    welcomeEmailsSent: number;
    remindersSent: number;
    completionRate: number;
  }>;
  sendOnboardingReminders(): Promise<{
    sent: number;
    failed: number;
    alreadySent: number;
  }>;
  
  // Live Sessions (new breakout rooms model)
  getLiveSessions(): Promise<LiveSession[]>;
  getLiveSessionById(id: string): Promise<LiveSession | undefined>;
  createLiveSession(session: InsertLiveSession): Promise<LiveSession>;
  updateLiveSession(id: string, session: Partial<InsertLiveSession>): Promise<LiveSession | undefined>;
  deleteLiveSession(id: string): Promise<boolean>;
  
  // Session Rooms
  getSessionRooms(sessionId: string): Promise<SessionRoom[]>;
  getSessionRoomById(id: string): Promise<SessionRoom | undefined>;
  createSessionRoom(room: InsertSessionRoom): Promise<SessionRoom>;
  updateSessionRoom(id: string, room: Partial<InsertSessionRoom>): Promise<SessionRoom | undefined>;
  deleteSessionRoom(id: string): Promise<boolean>;
  
  // Room Bookings
  getRoomBookingsByUserId(userId: string): Promise<RoomBooking[]>;
  getRoomBookingsByRoomId(roomId: string): Promise<RoomBooking[]>;
  createRoomBooking(booking: InsertRoomBooking): Promise<RoomBooking>;
  
  // Quizzes
  getQuizzesByLessonId(lessonId: string): Promise<Quiz[]>;
  getQuizzesByCourseId(courseId: string): Promise<Quiz[]>;
  getQuizById(id: string): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: string, quiz: Partial<InsertQuiz>): Promise<Quiz | undefined>;
  deleteQuiz(id: string): Promise<boolean>;
  
  // Quiz Questions
  getQuizQuestions(quizId: string): Promise<QuizQuestion[]>;
  getQuizQuestionById(id: string): Promise<QuizQuestion | undefined>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  updateQuizQuestion(id: string, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined>;
  deleteQuizQuestion(id: string): Promise<boolean>;
  deleteQuizQuestionsByQuizId(quizId: string): Promise<boolean>;
  
  // Quiz Attempts
  getQuizAttemptsByUserId(userId: string): Promise<QuizAttempt[]>;
  getQuizAttemptsByQuizId(quizId: string): Promise<QuizAttempt[]>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  
  // Placement Quiz
  createPlacementQuizAttempt(attempt: InsertPlacementQuizAttempt): Promise<PlacementQuizAttempt>;
  getPlacementQuizAttemptById(id: string): Promise<PlacementQuizAttempt | undefined>;
  getPlacementQuizAttemptsByUserId(userId: string): Promise<PlacementQuizAttempt[]>;
  getPlacementQuizAttemptsByAnonymousId(anonymousId: string): Promise<PlacementQuizAttempt[]>;
  getPlacementQuizAttemptsToday(userId: string): Promise<number>;
  getPlacementQuizAttemptsTodayByAnonymousId(anonymousId: string, ipHash: string): Promise<number>;
  getActiveQuizByAnonymousId(anonymousId: string): Promise<PlacementQuizAttempt | undefined>;
  updatePlacementQuizAttempt(id: string, updates: Partial<InsertPlacementQuizAttempt>): Promise<PlacementQuizAttempt | undefined>;
  completePlacementQuiz(attemptId: string, computedLevel: string, confidence: string): Promise<PlacementQuizAttempt | undefined>;
  claimAnonymousQuizAttempt(anonymousId: string, userId: string): Promise<PlacementQuizAttempt | undefined>;
  
  // Leads
  createLead(lead: InsertLead): Promise<Lead>;
  getLeadById(id: string): Promise<Lead | undefined>;
  getLeadByEmail(email: string): Promise<Lead | undefined>;
  updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined>;
  updateLeadWithQuizResult(id: string, level: string, confidence: string, quizAttemptId: string): Promise<Lead | undefined>;
  
  // Lead Automation
  getAllLeads(): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsPendingDay1Email(): Promise<Lead[]>;
  getLeadsPendingDay3Email(): Promise<Lead[]>;
  getLeadsPendingDay7Email(): Promise<Lead[]>;
  getLeadAnalytics(): Promise<{
    totalLeads: number;
    newLeads: number;
    engagedLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    inactiveLeads: number;
    conversionRate: number;
    avgScore: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
  }>;
  markLeadEmailSent(id: string, emailType: 'result' | 'day1' | 'day3' | 'day7'): Promise<Lead | undefined>;
  updateLeadScore(id: string): Promise<Lead | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Course Categories
  async getCourseCategories(): Promise<CourseCategory[]> {
    return db.select().from(courseCategories).orderBy(courseCategories.displayName);
  }

  async createCourseCategory(category: InsertCourseCategory): Promise<CourseCategory> {
    const [newCategory] = await db.insert(courseCategories).values(category).returning();
    return newCategory;
  }

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
    // Get all lessons for this course
    const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, id));
    
    // Delete lesson progress for all lessons in this course
    for (const lesson of courseLessons) {
      await db.delete(lessonProgress).where(eq(lessonProgress.lessonId, lesson.id));
    }
    
    // Delete all lessons for this course
    await db.delete(lessons).where(eq(lessons.courseId, id));
    
    // Delete all modules for this course
    await db.delete(courseModules).where(eq(courseModules.courseId, id));
    
    // Delete the course
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  }

  // Course Modules
  async getModulesByCourseId(courseId: string): Promise<CourseModule[]> {
    return db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(courseModules.orderIndex);
  }

  async getModuleById(id: string): Promise<CourseModule | undefined> {
    const [module] = await db.select().from(courseModules).where(eq(courseModules.id, id));
    return module;
  }

  async createModule(module: InsertCourseModule): Promise<CourseModule> {
    const [newModule] = await db.insert(courseModules).values(module).returning();
    return newModule;
  }

  async createModulesForCourse(courseId: string, count: number): Promise<CourseModule[]> {
    const modulesToCreate = Array.from({ length: count }, (_, i) => ({
      courseId,
      title: `Módulo ${i + 1}`,
      description: null,
      orderIndex: i + 1,
    }));
    
    const createdModules = await db.insert(courseModules).values(modulesToCreate).returning();
    return createdModules;
  }

  async updateModule(id: string, module: Partial<InsertCourseModule>): Promise<CourseModule | undefined> {
    const [updated] = await db.update(courseModules).set(module).where(eq(courseModules.id, id)).returning();
    return updated;
  }

  async deleteModule(id: string): Promise<boolean> {
    await db.delete(courseModules).where(eq(courseModules.id, id));
    return true;
  }

  async deleteModulesByCourseId(courseId: string): Promise<boolean> {
    await db.delete(courseModules).where(eq(courseModules.courseId, courseId));
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
    // Delete lesson progress first
    await db.delete(lessonProgress).where(eq(lessonProgress.lessonId, id));
    // Delete the lesson
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
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
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
      .where(and(eq(labBookings.userId, userId), eq(labBookings.labId, labId)));
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
    // Get all live sessions for this instructor
    const instructorSessions = await db.select().from(liveSessions).where(eq(liveSessions.instructorId, id));
    
    // Delete session rooms for all sessions
    for (const session of instructorSessions) {
      await db.delete(sessionRooms).where(eq(sessionRooms.sessionId, session.id));
    }
    
    // Delete live sessions
    await db.delete(liveSessions).where(eq(liveSessions.instructorId, id));
    
    // Delete conversation labs
    await db.delete(conversationLabs).where(eq(conversationLabs.instructorId, id));
    
    // Unlink courses from this instructor (set instructorId to null)
    await db.update(courses).set({ instructorId: null }).where(eq(courses.instructorId, id));
    
    // Delete the instructor
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

  async getCourseProgressWithUnlockStatus(userId: string, courseId: string): Promise<{
    lessons: Array<{
      id: string;
      title: string;
      orderIndex: number;
      isOpen: boolean;
      isPreview: boolean;
      isCompleted: boolean;
      quizPassed: boolean;
      hasQuiz: boolean;
      isUnlocked: boolean;
    }>;
    overallProgress: number;
  }> {
    // Get all lessons for the course ordered by orderIndex
    const courseLessons = await db.select()
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
      .orderBy(lessons.orderIndex);
    
    // Get user's progress for all lessons in this course
    const userProgress = await db.select()
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId));
    
    // Get all quizzes for lessons in this course
    const lessonQuizzes = await db.select()
      .from(quizzes)
      .where(eq(quizzes.courseId, courseId));
    
    // Create a map of lessonId -> progress
    const progressMap = new Map(userProgress.map(p => [p.lessonId, p]));
    
    // Create a map of lessonId -> has quiz
    const quizMap = new Map(lessonQuizzes.map(q => [q.lessonId, true]));
    
    // Calculate unlock status for each lesson
    const lessonsWithStatus = courseLessons.map((lesson, index) => {
      const progress = progressMap.get(lesson.id);
      const hasQuiz = quizMap.has(lesson.id);
      const isCompleted = progress?.isCompleted ?? false;
      const quizPassed = progress?.quizPassed ?? false;
      
      // Determine if lesson is unlocked:
      // 1. First lesson is always unlocked
      // 2. Open lessons are always unlocked
      // 3. Preview lessons are always unlocked
      // 4. Sequential lessons require previous lesson to be completed AND quiz passed (if it has one)
      let isUnlocked = false;
      
      if (index === 0 || lesson.isOpen || lesson.isPreview) {
        isUnlocked = true;
      } else {
        // Check previous sequential lesson (skip open lessons)
        let prevIndex = index - 1;
        while (prevIndex >= 0 && courseLessons[prevIndex].isOpen) {
          prevIndex--;
        }
        
        if (prevIndex < 0) {
          // No previous sequential lesson, this one is unlocked
          isUnlocked = true;
        } else {
          const prevLesson = courseLessons[prevIndex];
          const prevProgress = progressMap.get(prevLesson.id);
          const prevHasQuiz = quizMap.has(prevLesson.id);
          const prevCompleted = prevProgress?.isCompleted ?? false;
          const prevQuizPassed = prevProgress?.quizPassed ?? false;
          
          // Unlock if previous is completed AND (no quiz OR quiz passed)
          isUnlocked = prevCompleted && (!prevHasQuiz || prevQuizPassed);
        }
      }
      
      return {
        id: lesson.id,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        isOpen: lesson.isOpen,
        isPreview: lesson.isPreview,
        isCompleted,
        quizPassed,
        hasQuiz,
        isUnlocked,
      };
    });
    
    // Calculate overall progress (percentage of completed lessons)
    const completedCount = lessonsWithStatus.filter(l => l.isCompleted).length;
    const overallProgress = courseLessons.length > 0 
      ? Math.round((completedCount / courseLessons.length) * 100) 
      : 0;
    
    return {
      lessons: lessonsWithStatus,
      overallProgress,
    };
  }

  async markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress> {
    // Check if progress record exists
    const [existing] = await db.select()
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      ));
    
    if (existing) {
      // Update existing record
      const [updated] = await db.update(lessonProgress)
        .set({ isCompleted: true, lastWatchedAt: new Date() })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db.insert(lessonProgress)
        .values({ userId, lessonId, isCompleted: true, watchedSeconds: 0 })
        .returning();
      return created;
    }
  }

  async updateLessonProgress(userId: string, lessonId: string, watchedSeconds: number): Promise<LessonProgress> {
    // Check if progress record exists
    const [existing] = await db.select()
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      ));
    
    if (existing) {
      // Update existing record
      const [updated] = await db.update(lessonProgress)
        .set({ watchedSeconds, lastWatchedAt: new Date() })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db.insert(lessonProgress)
        .values({ userId, lessonId, watchedSeconds })
        .returning();
      return created;
    }
  }

  async markQuizPassed(userId: string, lessonId: string): Promise<LessonProgress> {
    // Check if progress record exists
    const [existing] = await db.select()
      .from(lessonProgress)
      .where(and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.lessonId, lessonId)
      ));
    
    if (existing) {
      // Update existing record
      const [updated] = await db.update(lessonProgress)
        .set({ quizPassed: true, lastWatchedAt: new Date() })
        .where(eq(lessonProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new record
      const [created] = await db.insert(lessonProgress)
        .values({ userId, lessonId, quizPassed: true, watchedSeconds: 0 })
        .returning();
      return created;
    }
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

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isAdmin, false)).orderBy(desc(users.createdAt));
  }

  async getUsersByStatus(status: 'active' | 'hold' | 'inactive'): Promise<User[]> {
    return db.select().from(users)
      .where(and(eq(users.isAdmin, false), eq(users.status, status)))
      .orderBy(desc(users.createdAt));
  }

  async getAdminUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isAdmin, true)).orderBy(desc(users.createdAt));
  }

  async updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Admin Invitations
  async getAdminInvitations(): Promise<AdminInvitation[]> {
    return db.select().from(adminInvitations).orderBy(desc(adminInvitations.createdAt));
  }

  async createAdminInvitation(invitation: InsertAdminInvitation): Promise<AdminInvitation> {
    const [created] = await db.insert(adminInvitations).values(invitation).returning();
    return created;
  }

  async deleteAdminInvitation(id: string): Promise<boolean> {
    const result = await db.delete(adminInvitations).where(eq(adminInvitations.id, id));
    return true;
  }

  async updateUser(userId: string, updates: Partial<{
    status: 'active' | 'hold' | 'inactive';
    isLocked: boolean;
    lockedAt: Date | null;
    lockedReason: string | null;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    englishLevel: string;
    learningGoals: string[];
    availability: string;
    weeklyHoursGoal: string;
    interests: string[];
    onboardingCompleted: boolean;
    welcomeEmailSent: boolean;
    onboardingReminderSent: boolean;
    updatedAt: Date;
  }>): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...updates, updatedAt: updates.updatedAt || new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async lockUser(userId: string, reason?: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ 
        isLocked: true, 
        lockedAt: new Date(), 
        lockedReason: reason || null,
        status: 'inactive',
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async unlockUser(userId: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ 
        isLocked: false, 
        lockedAt: null, 
        lockedReason: null,
        status: 'active',
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async createManualStudent(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    birthDate: Date;
    addedManually: boolean;
    skipOnboarding: boolean;
    assignedPlan: string;
    invitationToken: string;
    invitationSentAt: Date;
    onboardingCompleted: boolean;
    status: 'active' | 'hold' | 'inactive';
  }): Promise<User> {
    const [newUser] = await db.insert(users)
      .values({
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        addedManually: data.addedManually,
        skipOnboarding: data.skipOnboarding,
        assignedPlan: data.assignedPlan,
        invitationToken: data.invitationToken,
        invitationSentAt: data.invitationSentAt,
        onboardingCompleted: data.onboardingCompleted,
        status: data.status,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  }

  async getStudentMetrics(): Promise<{
    totalStudents: number;
    activeStudents: number;
    holdStudents: number;
    inactiveStudents: number;
    churnRate: number;
    newStudentsThisMonth: number;
    churnedThisMonth: number;
  }> {
    const allStudents = await db.select().from(users).where(eq(users.isAdmin, false));
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalStudents = allStudents.length;
    const activeStudents = allStudents.filter(u => u.status === 'active').length;
    const holdStudents = allStudents.filter(u => u.status === 'hold').length;
    const inactiveStudents = allStudents.filter(u => u.status === 'inactive').length;
    
    const newStudentsThisMonth = allStudents.filter(u => 
      u.createdAt && new Date(u.createdAt) >= startOfMonth
    ).length;
    
    const churnedThisMonth = allStudents.filter(u => 
      u.status === 'inactive' && u.updatedAt && new Date(u.updatedAt) >= startOfMonth
    ).length;
    
    const previousActiveCount = activeStudents + churnedThisMonth;
    const churnRate = previousActiveCount > 0 
      ? Math.round((churnedThisMonth / previousActiveCount) * 100 * 100) / 100
      : 0;
    
    return {
      totalStudents,
      activeStudents,
      holdStudents,
      inactiveStudents,
      churnRate,
      newStudentsThisMonth,
      churnedThisMonth
    };
  }

  // Onboarding
  async getOnboardingStats(): Promise<{
    totalUsers: number;
    completedOnboarding: number;
    pendingOnboarding: number;
    welcomeEmailsSent: number;
    remindersSent: number;
    completionRate: number;
  }> {
    const allUsers = await db.select().from(users).where(eq(users.isAdmin, false));
    
    const totalUsers = allUsers.length;
    const completedOnboarding = allUsers.filter(u => u.onboardingCompleted).length;
    const pendingOnboarding = totalUsers - completedOnboarding;
    const welcomeEmailsSent = allUsers.filter(u => u.welcomeEmailSent).length;
    const remindersSent = allUsers.filter(u => u.onboardingReminderSent).length;
    const completionRate = totalUsers > 0 
      ? Math.round((completedOnboarding / totalUsers) * 100 * 100) / 100
      : 0;
    
    return {
      totalUsers,
      completedOnboarding,
      pendingOnboarding,
      welcomeEmailsSent,
      remindersSent,
      completionRate
    };
  }

  async sendOnboardingReminders(): Promise<{
    sent: number;
    failed: number;
    alreadySent: number;
  }> {
    // Get users who haven't completed onboarding and haven't received a reminder
    const usersToRemind = await db.select().from(users).where(
      and(
        eq(users.isAdmin, false),
        eq(users.onboardingCompleted, false),
        eq(users.onboardingReminderSent, false)
      )
    );
    
    let sent = 0;
    let failed = 0;
    const alreadySent = 0;
    
    // Import sendEmail dynamically
    const { sendEmail } = await import("./resendClient");
    
    for (const user of usersToRemind) {
      if (!user.email) {
        failed++;
        continue;
      }
      
      try {
        await sendEmail(user.email, 'onboarding_reminder', {
          firstName: user.firstName || 'estudiante',
          onboardingUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://cogniboost.co'}/onboarding`,
        });
        
        // Mark reminder as sent
        await db.update(users)
          .set({ onboardingReminderSent: true, updatedAt: new Date() })
          .where(eq(users.id, user.id));
        
        sent++;
      } catch (error) {
        console.error(`Failed to send reminder to ${user.email}:`, error);
        failed++;
      }
    }
    
    return { sent, failed, alreadySent };
  }

  // Live Sessions
  async getLiveSessions(): Promise<LiveSession[]> {
    return db.select().from(liveSessions).orderBy(desc(liveSessions.scheduledAt));
  }

  async getLiveSessionById(id: string): Promise<LiveSession | undefined> {
    const [session] = await db.select().from(liveSessions).where(eq(liveSessions.id, id));
    return session;
  }

  async createLiveSession(session: InsertLiveSession): Promise<LiveSession> {
    const [newSession] = await db.insert(liveSessions).values(session).returning();
    return newSession;
  }

  async updateLiveSession(id: string, session: Partial<InsertLiveSession>): Promise<LiveSession | undefined> {
    const [updated] = await db.update(liveSessions).set(session).where(eq(liveSessions.id, id)).returning();
    return updated;
  }

  async deleteLiveSession(id: string): Promise<boolean> {
    await db.delete(liveSessions).where(eq(liveSessions.id, id));
    return true;
  }

  // Session Rooms
  async getSessionRooms(sessionId: string): Promise<SessionRoom[]> {
    return db.select().from(sessionRooms).where(eq(sessionRooms.sessionId, sessionId));
  }

  async getSessionRoomById(id: string): Promise<SessionRoom | undefined> {
    const [room] = await db.select().from(sessionRooms).where(eq(sessionRooms.id, id));
    return room;
  }

  async createSessionRoom(room: InsertSessionRoom): Promise<SessionRoom> {
    const [newRoom] = await db.insert(sessionRooms).values(room).returning();
    return newRoom;
  }

  async updateSessionRoom(id: string, room: Partial<InsertSessionRoom>): Promise<SessionRoom | undefined> {
    const [updated] = await db.update(sessionRooms).set(room).where(eq(sessionRooms.id, id)).returning();
    return updated;
  }

  async deleteSessionRoom(id: string): Promise<boolean> {
    await db.delete(sessionRooms).where(eq(sessionRooms.id, id));
    return true;
  }

  // Room Bookings
  async getRoomBookingsByUserId(userId: string): Promise<RoomBooking[]> {
    return db.select().from(roomBookings).where(eq(roomBookings.userId, userId));
  }

  async getRoomBookingsByRoomId(roomId: string): Promise<RoomBooking[]> {
    return db.select().from(roomBookings).where(eq(roomBookings.roomId, roomId));
  }

  async createRoomBooking(booking: InsertRoomBooking): Promise<RoomBooking> {
    const [newBooking] = await db.insert(roomBookings).values(booking).returning();
    return newBooking;
  }

  // Quizzes
  async getQuizzesByLessonId(lessonId: string): Promise<Quiz[]> {
    return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
  }

  async getQuizzesByCourseId(courseId: string): Promise<Quiz[]> {
    return db.select().from(quizzes).where(eq(quizzes.courseId, courseId));
  }

  async getQuizById(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async updateQuiz(id: string, quiz: Partial<InsertQuiz>): Promise<Quiz | undefined> {
    const [updated] = await db.update(quizzes).set(quiz).where(eq(quizzes.id, id)).returning();
    return updated;
  }

  async deleteQuiz(id: string): Promise<boolean> {
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
    await db.delete(quizAttempts).where(eq(quizAttempts.quizId, id));
    await db.delete(quizzes).where(eq(quizzes.id, id));
    return true;
  }

  // Quiz Questions
  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    return db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.orderIndex);
  }

  async getQuizQuestionById(id: string): Promise<QuizQuestion | undefined> {
    const [question] = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id));
    return question;
  }

  async createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [newQuestion] = await db.insert(quizQuestions).values(question).returning();
    return newQuestion;
  }

  async updateQuizQuestion(id: string, question: Partial<InsertQuizQuestion>): Promise<QuizQuestion | undefined> {
    const [updated] = await db.update(quizQuestions).set(question).where(eq(quizQuestions.id, id)).returning();
    return updated;
  }

  async deleteQuizQuestion(id: string): Promise<boolean> {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
    return true;
  }

  async deleteQuizQuestionsByQuizId(quizId: string): Promise<boolean> {
    await db.delete(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    return true;
  }

  // Quiz Attempts
  async getQuizAttemptsByUserId(userId: string): Promise<QuizAttempt[]> {
    return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.completedAt));
  }

  async getQuizAttemptsByQuizId(quizId: string): Promise<QuizAttempt[]> {
    return db.select().from(quizAttempts).where(eq(quizAttempts.quizId, quizId)).orderBy(desc(quizAttempts.completedAt));
  }

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [newAttempt] = await db.insert(quizAttempts).values(attempt).returning();
    return newAttempt;
  }

  // Placement Quiz
  async createPlacementQuizAttempt(attempt: InsertPlacementQuizAttempt): Promise<PlacementQuizAttempt> {
    const [newAttempt] = await db.insert(placementQuizAttempts).values(attempt).returning();
    return newAttempt;
  }

  async getPlacementQuizAttemptById(id: string): Promise<PlacementQuizAttempt | undefined> {
    const [attempt] = await db.select().from(placementQuizAttempts).where(eq(placementQuizAttempts.id, id));
    return attempt;
  }

  async getPlacementQuizAttemptsByUserId(userId: string): Promise<PlacementQuizAttempt[]> {
    return db.select().from(placementQuizAttempts).where(eq(placementQuizAttempts.userId, userId)).orderBy(desc(placementQuizAttempts.startedAt));
  }

  async getPlacementQuizAttemptsToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db.select({ count: count() })
      .from(placementQuizAttempts)
      .where(and(
        eq(placementQuizAttempts.userId, userId),
        sql`${placementQuizAttempts.startedAt} >= ${today}`
      ));
    return result[0]?.count || 0;
  }

  async updatePlacementQuizAttempt(id: string, updates: Partial<InsertPlacementQuizAttempt>): Promise<PlacementQuizAttempt | undefined> {
    const [updated] = await db.update(placementQuizAttempts).set(updates).where(eq(placementQuizAttempts.id, id)).returning();
    return updated;
  }

  async completePlacementQuiz(attemptId: string, computedLevel: string, confidence: string): Promise<PlacementQuizAttempt | undefined> {
    const [updated] = await db.update(placementQuizAttempts)
      .set({
        status: "completed",
        computedLevel,
        confidence,
        completedAt: new Date(),
      })
      .where(eq(placementQuizAttempts.id, attemptId))
      .returning();
    
    // Also update user's placement results (only if userId exists)
    if (updated && updated.userId) {
      await db.update(users).set({
        placementLevel: computedLevel,
        placementConfidence: confidence,
        placementAttemptId: attemptId,
        updatedAt: new Date(),
      }).where(eq(users.id, updated.userId));
    }
    
    return updated;
  }

  async getPlacementQuizAttemptsByAnonymousId(anonymousId: string): Promise<PlacementQuizAttempt[]> {
    return db.select().from(placementQuizAttempts)
      .where(eq(placementQuizAttempts.anonymousId, anonymousId))
      .orderBy(desc(placementQuizAttempts.startedAt));
  }

  async getPlacementQuizAttemptsTodayByAnonymousId(anonymousId: string, ipHash: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db.select({ count: count() })
      .from(placementQuizAttempts)
      .where(and(
        eq(placementQuizAttempts.anonymousId, anonymousId),
        eq(placementQuizAttempts.ipHash, ipHash),
        sql`${placementQuizAttempts.startedAt} >= ${today}`
      ));
    return result[0]?.count || 0;
  }

  async getActiveQuizByAnonymousId(anonymousId: string): Promise<PlacementQuizAttempt | undefined> {
    const [attempt] = await db.select().from(placementQuizAttempts)
      .where(and(
        eq(placementQuizAttempts.anonymousId, anonymousId),
        eq(placementQuizAttempts.status, "in_progress")
      ))
      .orderBy(desc(placementQuizAttempts.startedAt))
      .limit(1);
    return attempt;
  }

  async claimAnonymousQuizAttempt(anonymousId: string, userId: string): Promise<PlacementQuizAttempt | undefined> {
    // Find the most recent completed attempt for this anonymous user
    const [attempt] = await db.select().from(placementQuizAttempts)
      .where(and(
        eq(placementQuizAttempts.anonymousId, anonymousId),
        eq(placementQuizAttempts.status, "completed")
      ))
      .orderBy(desc(placementQuizAttempts.completedAt))
      .limit(1);
    
    if (!attempt) return undefined;
    
    // Update the attempt to associate with the user
    const [updated] = await db.update(placementQuizAttempts)
      .set({ userId })
      .where(eq(placementQuizAttempts.id, attempt.id))
      .returning();
    
    // Update user's placement results
    if (updated && updated.computedLevel && updated.confidence) {
      await db.update(users).set({
        placementLevel: updated.computedLevel,
        placementConfidence: updated.confidence,
        placementAttemptId: updated.id,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
    }
    
    return updated;
  }

  // Leads
  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadByEmail(email: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads)
      .where(eq(leads.email, email.toLowerCase()))
      .orderBy(desc(leads.createdAt))
      .limit(1);
    return lead;
  }

  async updateLead(id: string, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async updateLeadWithQuizResult(id: string, level: string, confidence: string, quizAttemptId: string): Promise<Lead | undefined> {
    const [updated] = await db.update(leads)
      .set({ 
        placementLevel: level, 
        placementConfidence: confidence, 
        quizAttemptId,
        quizCompletedAt: new Date(),
        status: "engaged",
        score: "20", // Quiz completion adds 20 points
        updatedAt: new Date() 
      })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  // Lead Automation methods
  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return db.select().from(leads)
      .where(sql`${leads.status} = ${status}`)
      .orderBy(desc(leads.createdAt));
  }

  // Get leads who completed quiz at least 1 day ago but haven't received day1 email
  async getLeadsPendingDay1Email(): Promise<Lead[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return db.select().from(leads)
      .where(and(
        eq(leads.day1EmailSent, false),
        eq(leads.resultEmailSent, true),
        sql`${leads.quizCompletedAt} < ${oneDayAgo}`,
        eq(leads.convertedToUser, false)
      ))
      .orderBy(leads.quizCompletedAt);
  }

  // Get leads who completed quiz at least 3 days ago but haven't received day3 email
  async getLeadsPendingDay3Email(): Promise<Lead[]> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return db.select().from(leads)
      .where(and(
        eq(leads.day3EmailSent, false),
        eq(leads.day1EmailSent, true),
        sql`${leads.quizCompletedAt} < ${threeDaysAgo}`,
        eq(leads.convertedToUser, false)
      ))
      .orderBy(leads.quizCompletedAt);
  }

  // Get leads who completed quiz at least 7 days ago but haven't received day7 email
  async getLeadsPendingDay7Email(): Promise<Lead[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return db.select().from(leads)
      .where(and(
        eq(leads.day7EmailSent, false),
        eq(leads.day3EmailSent, true),
        sql`${leads.quizCompletedAt} < ${sevenDaysAgo}`,
        eq(leads.convertedToUser, false)
      ))
      .orderBy(leads.quizCompletedAt);
  }

  async getLeadAnalytics(): Promise<{
    totalLeads: number;
    newLeads: number;
    engagedLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    inactiveLeads: number;
    conversionRate: number;
    avgScore: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    const allLeads = await db.select().from(leads);
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const statusCounts: Record<string, number> = {
      new: 0,
      engaged: 0,
      nurture: 0,
      qualified: 0,
      converted: 0,
      inactive: 0
    };
    
    const byLevel: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalScore = 0;
    let leadsThisWeek = 0;
    let leadsThisMonth = 0;
    
    for (const lead of allLeads) {
      // Count by status
      const status = lead.status || 'new';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Count by level
      if (lead.placementLevel) {
        byLevel[lead.placementLevel] = (byLevel[lead.placementLevel] || 0) + 1;
      }
      
      // Count by source
      const source = lead.source || 'organic';
      bySource[source] = (bySource[source] || 0) + 1;
      
      // Total score
      totalScore += parseInt(lead.score || '0', 10);
      
      // Time-based counts
      if (lead.createdAt && new Date(lead.createdAt) >= oneWeekAgo) {
        leadsThisWeek++;
      }
      if (lead.createdAt && new Date(lead.createdAt) >= oneMonthAgo) {
        leadsThisMonth++;
      }
    }
    
    const totalLeads = allLeads.length;
    const convertedLeads = statusCounts.converted || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const avgScore = totalLeads > 0 ? totalScore / totalLeads : 0;
    
    return {
      totalLeads,
      newLeads: statusCounts.new || 0,
      engagedLeads: statusCounts.engaged || 0,
      qualifiedLeads: statusCounts.qualified || 0,
      convertedLeads,
      inactiveLeads: statusCounts.inactive || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgScore: Math.round(avgScore * 100) / 100,
      leadsThisWeek,
      leadsThisMonth,
      byLevel,
      bySource
    };
  }

  async markLeadEmailSent(id: string, emailType: 'result' | 'day1' | 'day3' | 'day7'): Promise<Lead | undefined> {
    const now = new Date();
    let updates: Record<string, any> = { updatedAt: now };
    
    switch (emailType) {
      case 'result':
        updates.resultEmailSent = true;
        updates.resultEmailSentAt = now;
        break;
      case 'day1':
        updates.day1EmailSent = true;
        updates.day1EmailSentAt = now;
        updates.status = 'nurture'; // Move to nurture after day 1 email
        break;
      case 'day3':
        updates.day3EmailSent = true;
        updates.day3EmailSentAt = now;
        break;
      case 'day7':
        updates.day7EmailSent = true;
        updates.day7EmailSentAt = now;
        updates.status = 'qualified'; // After full sequence, mark as qualified
        break;
    }
    
    const [updated] = await db.update(leads)
      .set(updates)
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async updateLeadScore(id: string): Promise<Lead | undefined> {
    const lead = await this.getLeadById(id);
    if (!lead) return undefined;
    
    let score = 0;
    
    // Quiz completion: +20 points
    if (lead.placementLevel) score += 20;
    
    // Email engagement
    const openCount = parseInt(lead.emailOpenCount || '0', 10);
    const clickCount = parseInt(lead.emailClickCount || '0', 10);
    score += Math.min(openCount * 5, 20); // Max 20 from opens
    score += Math.min(clickCount * 10, 30); // Max 30 from clicks
    
    // Recency bonus: if active in last 7 days
    if (lead.lastActivityAt) {
      const daysSinceActivity = (Date.now() - new Date(lead.lastActivityAt).getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceActivity < 7) score += 15;
      else if (daysSinceActivity < 14) score += 10;
      else if (daysSinceActivity < 30) score += 5;
    }
    
    // Phone provided: +10 points
    if (lead.phone) score += 10;
    
    // Cap at 100
    score = Math.min(score, 100);
    
    const [updated] = await db.update(leads)
      .set({ score: score.toString(), updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
