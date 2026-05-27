import type { Express } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import multer from "multer";
import OpenAI from "openai";
import { YoutubeTranscript } from "youtube-transcript";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerHealthCheckRoutes } from "./health-check";
import { uploadToGcs } from "./gcsDirectUpload";
import { registerOAuthRoutes } from "./auth/oauthRoutes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import { sendEmail, type EmailTemplate } from "./resendClient";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { selectQuizQuestions, placementQuestions, calculatePlacementLevel, type PlacementQuestion as StaticPlacementQuestion } from "@shared/placementQuestions";
import {
  validateRequest,
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
  createInstructorSchema,
  updateInstructorSchema,
} from "./validation";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || 'sk-placeholder-not-configured',
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (session + passport + local strategy)
  await setupAuth(app);
  console.log('Session + passport initialized');

  // Register auth routes (signup, login, logout, forgot/reset password)
  registerAuthRoutes(app);

  // Register OAuth routes (Google + Apple)
  registerOAuthRoutes(app);

  // Register object storage routes
  registerObjectStorageRoutes(app);

  // Auth middleware — declared here at the top of registerRoutes so that
  // every endpoint below (including the new /api/labs/live-now route at
  // line ~463) can reference it without hitting a Temporal Dead Zone
  // ReferenceError. Previously this was declared mid-function at line
  // ~1430 which caused the server to crash on startup when the LIVE NOW
  // endpoint was moved earlier in the file.
  const requireAuth = async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Login required" });
    }
    next();
  };

  // Health check endpoint for Railway/monitoring
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Account activation endpoint for manually added students
  const activationSchema = z.object({
    token: z.string().min(1, "Token requerido"),
    birthDate: z.string().optional(), // YYYY-MM-DD format for verification
  });

  app.post("/api/auth/activate", async (req, res) => {
    try {
      const validation = activationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validation.error.errors });
      }

      const { token, birthDate } = validation.data;

      // Get current authenticated user
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Debes iniciar sesión primero" });
      }

      // Find user by invitation token (optimized single query)
      const invitedUser = await storage.getUserByInvitationToken(token);

      if (!invitedUser) {
        return res.status(404).json({ error: "Token de invitación inválido" });
      }

      // Check if token has already been used (single-use validation)
      if (invitedUser.invitationUsedAt) {
        return res.status(400).json({ error: "Este enlace de activación ya fue utilizado" });
      }

      // Check if token has expired (7 days)
      if (invitedUser.invitationExpiresAt) {
        const now = new Date();
        if (now > new Date(invitedUser.invitationExpiresAt)) {
          return res.status(400).json({ error: "El enlace de activación ha expirado. Contacta al administrador para obtener uno nuevo." });
        }
      }

      // Verify birth date matches (security verification)
      if (invitedUser.birthDate) {
        if (!birthDate) {
          // Return that birth date verification is required
          return res.status(400).json({ 
            error: "Se requiere verificación de fecha de nacimiento",
            requiresBirthDateVerification: true 
          });
        }

        const invitedBirthDate = new Date(invitedUser.birthDate);
        const providedBirthDate = new Date(birthDate);
        
        // Compare year, month, day only
        const invitedDateStr = invitedBirthDate.toISOString().split('T')[0];
        const providedDateStr = providedBirthDate.toISOString().split('T')[0];
        
        if (invitedDateStr !== providedDateStr) {
          return res.status(400).json({ error: "La fecha de nacimiento no coincide con nuestros registros" });
        }
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const now = new Date();

      // If the logged-in user is different from the invited user, transfer data
      if (invitedUser.id !== userId) {
        // Transfer the subscription tier and plan to the current user
        await storage.updateUser(userId, {
          onboardingCompleted: invitedUser.skipOnboarding || currentUser.onboardingCompleted,
          status: 'active',
          updatedAt: now,
        } as any);
        
        // Mark the invitation as used
        await storage.updateUser(invitedUser.id, {
          invitationToken: null,
          invitationUsedAt: now,
          status: 'inactive',
          updatedAt: now,
        } as any);
      } else {
        // Same user, just activate
        await storage.updateUser(userId, {
          invitationToken: null,
          invitationUsedAt: now,
          onboardingCompleted: invitedUser.skipOnboarding || true,
          status: 'active',
          emailVerified: true,
          updatedAt: now,
        } as any);
      }

      res.json({ success: true, message: "Cuenta activada exitosamente" });
    } catch (error) {
      console.error("Error activating account:", error);
      res.status(500).json({ error: "Error al activar la cuenta" });
    }
  });

  // Email verification endpoint for self-registered users
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token de verificación requerido" });
      }

      // Find user by email verification token (optimized single query)
      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(404).json({ error: "Token de verificación inválido" });
      }

      // Check if token has expired (24 hours)
      if (user.emailVerificationExpiresAt) {
        const now = new Date();
        if (now > new Date(user.emailVerificationExpiresAt)) {
          return res.status(400).json({ error: "El enlace de verificación ha expirado. Por favor solicita uno nuevo." });
        }
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.json({ success: true, message: "Tu correo ya ha sido verificado", alreadyVerified: true });
      }

      // Mark email as verified
      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        updatedAt: new Date(),
      } as any);

      res.json({ success: true, message: "Correo verificado exitosamente" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ error: "Error al verificar el correo" });
    }
  });

  // Resend verification email endpoint
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Debes iniciar sesión primero" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      if (user.emailVerified) {
        return res.json({ success: true, message: "Tu correo ya está verificado", alreadyVerified: true });
      }

      if (!user.email) {
        return res.status(400).json({ error: "No tienes un correo registrado" });
      }

      // Generate new verification token
      const { randomBytes } = await import("crypto");
      const newToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.updateUser(userId, {
        emailVerificationToken: newToken,
        emailVerificationExpiresAt: expiresAt,
        updatedAt: new Date(),
      } as any);

      // Send verification email
      const { sendEmail } = await import("./resendClient");
      const baseUrl = process.env.APP_URL || 'https://cogniboost.co';
      const verificationUrl = `${baseUrl}/verify-email?token=${newToken}`;

      await sendEmail(user.email, 'email_verification', {
        firstName: user.firstName || 'estudiante',
        verificationUrl,
      });

      res.json({ success: true, message: "Correo de verificación enviado" });
    } catch (error) {
      console.error("Error resending verification email:", error);
      res.status(500).json({ error: "Error al enviar el correo de verificación" });
    }
  });

  // API Routes

  // Level order for course access control
  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  
  // Helper to get user's level index safely
  const getUserLevelIndex = (user: any): number => {
    const userLevel = user?.placementLevel || user?.englishLevel || 'A1';
    const index = levelOrder.indexOf(userLevel);
    return index >= 0 ? index : 0; // Default to A1 (index 0) if invalid
  };
  
  // Helper to check if user can access a course level
  const canAccessCourseLevel = (user: any, courseLevel: string): boolean => {
    const userLevelIndex = getUserLevelIndex(user);
    const courseLevelIndex = levelOrder.indexOf(courseLevel);
    // If course has invalid level, deny access for safety
    if (courseLevelIndex < 0) return false;
    return courseLevelIndex <= userLevelIndex;
  };
  
  // Get all courses (filtered by user level if authenticated)
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getCourses();
      
      // If user is authenticated, filter courses by their level and below
      const userId = (req.user as any)?.id;
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          // Filter courses to show only those at user's level or below
          // This allows users to study previous levels for review
          const filteredCourses = courses.filter(course => 
            canAccessCourseLevel(user, course.level)
          );
          
          return res.json(filteredCourses);
        }
      }
      
      // For unauthenticated users, show all published courses
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  // Get course by ID (enforces level-based access for authenticated users)
  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      // Check level-based access for authenticated users
      const userId = (req.user as any)?.id;
      if (userId) {
        const user = await storage.getUser(userId);
        if (user && !user.isAdmin && !canAccessCourseLevel(user, course.level)) {
          return res.status(403).json({ 
            error: "No tienes acceso a este nivel de curso",
            requiredLevel: course.level,
            userLevel: user.placementLevel || user.englishLevel || 'A1'
          });
        }
      }
      
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ error: "Failed to fetch course" });
    }
  });

  // Get lessons for a course (with content gating for free/unauthenticated users)
  app.get("/api/courses/:courseId/lessons", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { courseId } = req.params;
      
      // Check course exists and verify level access
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      // Check level-based access for authenticated users
      if (userId) {
        const user = await storage.getUser(userId);
        if (user && !user.isAdmin && !canAccessCourseLevel(user, course.level)) {
          return res.status(403).json({ 
            error: "No tienes acceso a este nivel de curso",
            requiredLevel: course.level,
            userLevel: user.placementLevel || user.englishLevel || 'A1'
          });
        }
      }
      
      const lessonsRaw = await storage.getLessonsByCourseId(courseId);
      const FREE_LESSON_LIMIT = 3; // First 3 lessons of Module 1 are free

      // Build module-aware ordering: lessons grouped by module (sorted by module orderIndex),
      // then sorted by lesson orderIndex within each module. This matches the admin dashboard order.
      const modules = await storage.getModulesByCourseId(courseId);
      const sortedLessons: typeof lessonsRaw = [];
      for (const mod of modules) {
        const moduleLessons = lessonsRaw
          .filter(l => l.moduleId === mod.id)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        sortedLessons.push(...moduleLessons);
      }
      // Append orphan lessons (no module) at the end
      const orphans = lessonsRaw
        .filter(l => !l.moduleId || !modules.some(m => m.id === l.moduleId))
        .sort((a, b) => a.orderIndex - b.orderIndex);
      sortedLessons.push(...orphans);

      // Check user's subscription tier - default to free for unauthenticated users
      let subscriptionTier = 'free';
      if (userId) {
        const user = await storage.getUser(userId);
        subscriptionTier = user?.subscriptionTier || 'free';
      }

      // If user has paid subscription, return full content
      if (subscriptionTier !== 'free') {
        return res.json(sortedLessons.map(l => ({ ...l, isLockedBySubscription: false })));
      }

      // Module 1 = first module by orderIndex
      const module1 = modules.length > 0 ? modules[0] : null;
      const module1Id = module1?.id;

      // Get lessons in Module 1 for counting position
      const module1Lessons = sortedLessons.filter(l => l.moduleId === module1Id);

      // For free/unauthenticated users, redact premium lesson content
      const gatedLessons = sortedLessons.map((lesson) => {
        let isLocked = false;
        if (!module1Id) {
          isLocked = true;
        } else if (lesson.moduleId !== module1Id) {
          isLocked = true;
        } else {
          const positionInModule1 = module1Lessons.findIndex(l => l.id === lesson.id);
          isLocked = positionInModule1 < 0 || positionInModule1 >= FREE_LESSON_LIMIT;
        }

        if (isLocked) {
          return {
            ...lesson,
            vimeoId: null,
            pdfMaterials: [],
            audioMaterials: [],
            content: null,
            isLockedBySubscription: true,
          };
        }
        return { ...lesson, isLockedBySubscription: false };
      });

      res.json(gatedLessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ error: "Failed to fetch lessons" });
    }
  });

  // Get all conversation labs
  app.get("/api/labs", async (req, res) => {
    try {
      const labs = await storage.getConversationLabs();
      res.json(labs);
    } catch (error) {
      console.error("Error fetching labs:", error);
      res.status(500).json({ error: "Failed to fetch labs" });
    }
  });

  // GET /api/labs/live-now — sessions currently live for this user's
  // level. MUST be defined BEFORE /api/labs/:id or Express matches
  // "live-now" as an :id value.
  app.get('/api/labs/live-now', requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { pool } = await import("./db");
      const user = await storage.getUser(userId);
      const studentLevel = user?.placementLevel || user?.englishLevel;
      const isAdmin = !!user?.isAdmin;

      const params: any[] = [];
      let where = `status IN ('scheduled', 'live')
                    AND scheduled_at - INTERVAL '5 minutes' <= now()
                    AND scheduled_at + (duration_minutes * INTERVAL '1 minute') + INTERVAL '10 minutes' >= now()`;
      if (!isAdmin && studentLevel) {
        params.push(studentLevel);
        where += ` AND level = $${params.length}`;
      }
      const { rows } = await (pool as any).query(
        `SELECT s.*, it.name as interest_name, it.icon as interest_icon
         FROM lab_sessions s
         LEFT JOIN lab_interest_topics it ON it.id = s.interest_topic_id
         WHERE ${where}
         ORDER BY scheduled_at ASC`,
        params
      );
      res.json(rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        level: r.level,
        scheduledAt: r.scheduled_at,
        durationMinutes: r.duration_minutes,
        meetingUrl: r.meeting_url,
        interestName: r.interest_name,
        interestIcon: r.interest_icon,
        startsInMs: new Date(r.scheduled_at).getTime() - Date.now(),
      })));
    } catch (e: any) {
      console.error('[labs/live-now]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // Get lab by ID
  app.get("/api/labs/:id", async (req, res) => {
    try {
      const lab = await storage.getConversationLabById(req.params.id);
      if (!lab) {
        return res.status(404).json({ error: "Lab not found" });
      }
      res.json(lab);
    } catch (error) {
      console.error("Error fetching lab:", error);
      res.status(500).json({ error: "Failed to fetch lab" });
    }
  });

  // Get user enrollments
  app.get("/api/enrollments", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const enrollments = await storage.getEnrollmentsByUserId(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  // Get user enrollments with course info and progress
  app.get("/api/enrollments/with-progress", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Use optimized method with JOIN queries instead of N+1 queries
      const enrichedEnrollments = await storage.getEnrollmentsWithDetails(userId);

      res.json(enrichedEnrollments);
    } catch (error) {
      console.error("Error fetching enrollments with progress:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  // Enroll in a course
  app.post("/api/enrollments", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { courseId } = req.body;
      if (!courseId) {
        return res.status(400).json({ error: "Course ID is required" });
      }

      // Prevent duplicate enrollments
      const existing = await storage.getEnrollmentByUserAndCourse(userId, courseId);
      if (existing) {
        return res.status(200).json(existing);
      }

      const enrollment = await storage.createEnrollment({ userId, courseId });
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ error: "Failed to create enrollment" });
    }
  });

  // Get user's lab bookings
  app.get("/api/lab-bookings", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const bookings = await storage.getLabBookingsByUserId(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching lab bookings:", error);
      res.status(500).json({ error: "Failed to fetch lab bookings" });
    }
  });

  // (Legacy POST /api/lab-bookings removed — was shadowing the V2 endpoint
  // at line 8250 that expects { labSessionId } and enforces level + tier
  // quotas. The frontend always uses labSessionId now.)

  // Get user stats (basic stats for all users, detailed stats for premium)
  app.get("/api/user-stats", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      const stats = await storage.getUserStats(userId);
      const resolvedLevel = stats?.currentLevel || user?.placementLevel || user?.englishLevel || "A1";

      // Compute live stats from source-of-truth tables. The user_stats
      // table is no longer incremented on every lesson completion (legacy)
      // so we derive the metrics directly from enrollments, lab
      // registrations and submissions. This guarantees the dashboard
      // matches what the catalog and progress page show.
      const { db } = await import("./db");
      const { enrollments, labRegistrations, labSessionsV2, submissions, lessonProgress, lessons } =
        await import("@shared/schema");
      const { eq, and, lt, sql } = await import("drizzle-orm");

      // Courses completed = enrollments with completedAt set (the schema
      // stores completion as a timestamp, not a percentage column)
      const enrolls = await db
        .select({ id: enrollments.id, completedAt: enrollments.completedAt })
        .from(enrollments)
        .where(eq(enrollments.userId, userId));
      const coursesCompleted = enrolls.filter((e: any) => e.completedAt != null).length;

      // Labs attended = lab_registrations whose session is in the past
      // (and the student was registered). Best-effort: anyone who held a
      // booking past the scheduled time counts.
      const now = new Date();
      let labsAttended = 0;
      try {
        const labRows = await db
          .select({ scheduledAt: labSessionsV2.scheduledAt })
          .from(labRegistrations)
          .innerJoin(labSessionsV2, eq(labRegistrations.labSessionId, labSessionsV2.id))
          .where(and(eq(labRegistrations.userId, userId), lt(labSessionsV2.scheduledAt, now)));
        labsAttended = labRows.length;
      } catch {
        // Schema mismatch on legacy installs — leave at 0
      }

      // Speaking minutes — sum of speaking submission durations (if any)
      let speakingMinutes = 0;
      try {
        const speakSubs = await db
          .select({ duration: submissions.durationSeconds })
          .from(submissions)
          .where(and(eq(submissions.studentId, userId), eq(submissions.assignmentType, "speaking_recording")));
        const secs = speakSubs.reduce((sum: number, s: any) => sum + (Number(s.duration) || 0), 0);
        speakingMinutes = Math.round(secs / 60);
      } catch {
        speakingMinutes = 0;
      }

      // Hours studied = sum of duration of completed lessons.
      let totalHoursStudied = "0.0";
      try {
        const completed = await db
          .select({ duration: lessons.duration })
          .from(lessonProgress)
          .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
          .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.isCompleted, true)));
        const totalMin = completed.reduce((sum: number, l: any) => sum + (Number(l.duration) || 0), 0);
        totalHoursStudied = (totalMin / 60).toFixed(1);
      } catch {
        totalHoursStudied = stats?.totalHoursStudied || "0.0";
      }

      // XP — derived: 10 per lesson completed + 50 per lab attended + 25 per writing/speaking submission
      let lessonsCompleted = 0;
      try {
        const completedRows = await db
          .select({ id: lessonProgress.id })
          .from(lessonProgress)
          .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.isCompleted, true)));
        lessonsCompleted = completedRows.length;
      } catch {}
      let submissionsCount = 0;
      try {
        const subRows = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.studentId, userId));
        submissionsCount = subRows.length;
      } catch {}
      const xpPoints = lessonsCompleted * 10 + labsAttended * 50 + submissionsCount * 25;

      res.json({
        totalHoursStudied,
        coursesCompleted,
        labsAttended,
        currentLevel: resolvedLevel,
        xpPoints,
        speakingMinutes,
        vocabularyWords: stats?.vocabularyWords || 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Get user subscription
  app.get("/api/subscription", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Primary source of truth: users.subscriptionTier (updated by Stripe webhooks + checkout)
      const user = await storage.getUser(userId);
      const tier = user?.subscriptionTier || "free";

      // Also check subscriptions table as fallback (legacy)
      const subscription = await storage.getSubscriptionByUserId(userId);

      if (subscription) {
        // If subscriptions table has a record, prefer the higher-privilege tier
        const tierPriority: Record<string, number> = { free: 0, flex: 1, basic: 2, premium: 3 };
        const effectiveTier = (tierPriority[tier] || 0) >= (tierPriority[subscription.tier] || 0) ? tier : subscription.tier;
        res.json({ ...subscription, tier: effectiveTier });
      } else {
        // No subscriptions record — return user's tier directly
        res.json({
          tier,
          stripeCustomerId: user?.stripeCustomerId || null,
          stripeSubscriptionId: user?.stripeSubscriptionId || null,
          cancelAtPeriodEnd: false,
        });
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Select free plan - marks user as having explicitly chosen free tier
  app.post("/api/subscription/select-free", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Update user to mark they've selected the free plan
      await storage.updateUser(userId, {
        subscriptionTier: "free",
        assignedPlan: "free",
        updatedAt: new Date(),
      } as any);
      
      res.json({ success: true, tier: "free" });
    } catch (error) {
      console.error("Error selecting free plan:", error);
      res.status(500).json({ error: "Failed to select free plan" });
    }
  });

  // ============== STRIPE PAYMENT ROUTES ==============

  // Stripe price IDs for each plan (to be updated after creating products in Stripe dashboard)
  const STRIPE_PRICE_IDS: Record<string, string> = {
    flex: process.env.STRIPE_PRICE_FLEX || "",
    standard: process.env.STRIPE_PRICE_STANDARD || "",
    premium: process.env.STRIPE_PRICE_PREMIUM || "",
  };

  // Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error fetching Stripe config:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // Create checkout session for subscription (supports both logged-in and guest checkout)
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { priceId, planName, email: guestEmail } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.APP_URL || "https://cogniboost.co";

      // ─── DOUBLE-CHECKOUT GUARD ────────────────────────────────────────────
      // Prevents the recurring double-charge bug where a user (logged-in or
      // guest) already has an active Stripe subscription but creates another
      // checkout — typically because the platform briefly shows them as
      // "free" while the webhook linkage propagates, so they click subscribe
      // again. Each previous duplicate ended in a manual cancellation +
      // refund in Stripe. We now block the second checkout up-front.
      //
      // Strategy:
      //   1. Determine the email we should check (logged-in user.email or
      //      `req.body.email` for guest-with-email-collected flows).
      //   2. List the customer(s) in Stripe with that email.
      //   3. For each, list their subscriptions and look for one whose
      //      status is in the active-ish set ('trialing','active','past_due','unpaid').
      //   4. If found, return 409 Conflict with a friendly message + a
      //      direction to log in or contact support — DO NOT create a
      //      second Stripe checkout session.
      const ACTIVEISH = new Set(['trialing', 'active', 'past_due', 'unpaid']);
      let emailForCheck: string | null = null;
      let loggedInUser: Awaited<ReturnType<typeof storage.getUser>> | undefined;

      if (userId) {
        loggedInUser = await storage.getUser(userId);
        emailForCheck = loggedInUser?.email?.toLowerCase() || null;
      } else if (typeof guestEmail === 'string' && guestEmail.includes('@')) {
        emailForCheck = guestEmail.toLowerCase();
      }

      if (emailForCheck) {
        try {
          const matchingCustomers = await stripe.customers.list({ email: emailForCheck, limit: 5 });
          for (const cust of matchingCustomers.data) {
            const subs = await stripe.subscriptions.list({ customer: cust.id, limit: 5, status: 'all' });
            const activeSub = subs.data.find(s => ACTIVEISH.has(s.status));
            if (activeSub) {
              console.warn(`[Checkout Guard] Blocked duplicate checkout for ${emailForCheck} (customer=${cust.id}, sub=${activeSub.id}, status=${activeSub.status})`);
              return res.status(409).json({
                error: 'duplicate_subscription',
                message: 'Ya tienes una suscripción activa con este correo. Ingresa a tu cuenta para acceder a la plataforma. Si crees que esto es un error, escríbenos a clozano@cognimight.com.',
                loginUrl: `${baseUrl}/login`,
                accountUrl: `${baseUrl}/dashboard`,
              });
            }
          }
        } catch (guardErr: any) {
          // Guard failure shouldn't block the checkout — but log loudly so we notice.
          console.error('[Checkout Guard] Failed to verify duplicate subscription (allowing checkout to proceed):', guardErr?.message);
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      let sessionConfig: any = {
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 7,
          metadata: {
            planName: planName || "subscription",
          },
        },
        locale: "es",
        metadata: {
          planName: planName || "subscription",
        },
      };

      // If user is logged in, attach to their account
      if (userId && loggedInUser) {
        let customerId = loggedInUser.stripeCustomerId;

        if (!customerId) {
          const customer = await stripe.customers.create({
            email: loggedInUser.email || undefined,
            name: `${loggedInUser.firstName || ""} ${loggedInUser.lastName || ""}`.trim() || undefined,
            metadata: { userId },
          });
          customerId = customer.id;
          await storage.updateUser(userId, { stripeCustomerId: customerId });
        }

        sessionConfig.customer = customerId;
        sessionConfig.subscription_data.metadata.userId = userId;
        sessionConfig.metadata.userId = userId;
        sessionConfig.success_url = `${baseUrl}/dashboard?payment=success`;
        sessionConfig.cancel_url = `${baseUrl}/#pricing`;
      } else {
        // Guest checkout - Stripe will collect email and create customer automatically for subscriptions
        // Pre-fill the email if the client already collected it (and it passed the guard).
        if (emailForCheck) {
          sessionConfig.customer_email = emailForCheck;
        }
        sessionConfig.success_url = `${baseUrl}/purchase-complete?session_id={CHECKOUT_SESSION_ID}`;
        sessionConfig.cancel_url = `${baseUrl}/#pricing`;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Retrieve checkout session details (for linking guest purchases to accounts)
  app.get("/api/stripe/checkout-session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const stripe = await getUncachableStripeClient();
      
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer', 'subscription'],
      });
      
      res.json({
        customerEmail: session.customer_details?.email,
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
        planName: session.metadata?.planName,
      });
    } catch (error) {
      console.error("Error retrieving checkout session:", error);
      res.status(500).json({ error: "Failed to retrieve session" });
    }
  });

  // Link a Stripe customer to a user account (after guest checkout + login)
  app.post("/api/stripe/link-customer", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { customerId, subscriptionId, planName } = req.body;

      if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
      }

      // Map plan name to subscription tier
      let subscriptionTier: "flex" | "basic" | "premium" = "basic";
      if (planName) {
        const lowerPlan = planName.toLowerCase();
        if (lowerPlan.includes("flex")) subscriptionTier = "flex";
        else if (lowerPlan.includes("premium")) subscriptionTier = "premium";
        else if (lowerPlan.includes("basic") || lowerPlan.includes("estándar") || lowerPlan.includes("standard")) subscriptionTier = "basic";
      }

      // Update user with Stripe customer ID, subscription tier, and mark onboarding as complete
      await storage.updateUser(userId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || undefined,
        subscriptionTier,
        onboardingCompleted: true,
        status: 'active',
      });

      // Send subscription activated email (the webhook likely fired before the user existed)
      const user = await storage.getUser(userId);
      if (user?.email) {
        const displayPlan = planName || subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
        const planPrices: Record<string, string> = { flex: '14.99', basic: '49.99', premium: '99.99' };

        sendEmail(user.email, 'subscription_activated', {
          firstName: user.firstName || 'Estudiante',
          planName: displayPlan,
          dashboardUrl: `${process.env.APP_URL || 'https://cogniboost.co'}/dashboard`,
        }).then(() => {
          console.log(`[link-customer] Subscription activated email sent to ${user.email} for plan ${planName}`);
        }).catch(err => {
          console.error(`[link-customer] Failed to send subscription activated email to ${user.email}:`, err);
        });

        // Notify admin about new subscription
        const academyEmail = "cognimight@gmail.com";
        sendEmail(academyEmail, 'admin_subscription_notification', {
          studentName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No proporcionado',
          studentEmail: user.email,
          planName: displayPlan,
          tier: subscriptionTier,
          amount: planPrices[subscriptionTier] || '0',
          timestamp: new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' }),
          adminUrl: `${process.env.APP_URL || 'https://cogniboost.co'}/admin/financials`,
        }).then(() => {
          console.log(`[link-customer] Admin notification sent for new subscription: ${user.email} → ${displayPlan}`);
        }).catch(err => {
          console.error(`[link-customer] Failed to send admin subscription notification:`, err);
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error linking customer:", error);
      res.status(500).json({ error: "Failed to link customer" });
    }
  });

  // Create customer portal session for subscription management
  app.post("/api/stripe/create-portal-session", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ error: "No Stripe customer found" });
      }

      const stripe = await getUncachableStripeClient();
      
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.APP_URL || "https://cogniboost.co"}/dashboard/settings`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Get instructors
  app.get("/api/instructors", async (req, res) => {
    try {
      const instructors = await storage.getInstructors();
      res.json(instructors);
    } catch (error) {
      console.error("Error fetching instructors:", error);
      res.status(500).json({ error: "Failed to fetch instructors" });
    }
  });

  // ============== PROGRESS TRACKING ROUTES ==============

  // Get user's progress for a course with unlock status for each lesson
  app.get("/api/courses/:courseId/progress", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { courseId } = req.params;
      const progress = await storage.getCourseProgressWithUnlockStatus(userId, courseId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ error: "Failed to fetch course progress" });
    }
  });

  // Helper function to check if a lesson is accessible by subscription tier
  async function isLessonAccessible(userId: string, lessonId: string): Promise<{ accessible: boolean; reason?: string }> {
    const lesson = await storage.getLessonById(lessonId);
    if (!lesson) {
      return { accessible: false, reason: "Lesson not found" };
    }
    
    const user = await storage.getUser(userId);
    const subscriptionTier = user?.subscriptionTier || 'free';
    const FREE_LESSON_LIMIT = 3;
    
    // If user has a paid subscription, allow access
    if (subscriptionTier !== 'free') {
      return { accessible: true };
    }
    
    // For free users, only first 3 lessons of Module 1 are accessible
    // Get modules for this course to identify Module 1 (first by orderIndex)
    const modules = await storage.getModulesByCourseId(lesson.courseId);
    const module1 = modules.length > 0 ? modules[0] : null;
    const module1Id = module1?.id;
    
    // If no Module 1 exists (legacy course or data issue), deny access by default for free users
    // This is a secure default - in case of missing data, require upgrade
    if (!module1Id) {
      return { accessible: false, reason: "Actualiza tu plan para acceder a este contenido premium" };
    }
    
    // If lesson is not in Module 1, deny access
    if (lesson.moduleId !== module1Id) {
      return { accessible: false, reason: "Actualiza tu plan para acceder a este contenido premium" };
    }
    
    // For lessons in Module 1, check position within the module
    const courseLessons = await storage.getLessonsByCourseId(lesson.courseId);
    const module1Lessons = courseLessons
      .filter(l => l.moduleId === module1Id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const positionInModule1 = module1Lessons.findIndex(l => l.id === lessonId);
    
    // First 3 lessons of Module 1 are free
    if (positionInModule1 >= 0 && positionInModule1 < FREE_LESSON_LIMIT) {
      return { accessible: true };
    }
    
    return { accessible: false, reason: "Actualiza tu plan para acceder a este contenido premium" };
  }

  // Mark a lesson as completed
  app.post("/api/lessons/:lessonId/complete", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { lessonId } = req.params;
      
      // Enforce subscription tier access
      const access = await isLessonAccessible(userId, lessonId);
      if (!access.accessible) {
        return res.status(403).json({ error: access.reason || "Access denied" });
      }
      
      const result = await storage.markLessonComplete(userId, lessonId);
      res.json(result);
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      res.status(500).json({ error: "Failed to mark lesson complete" });
    }
  });

  // Update lesson progress (watched time)
  app.post("/api/lessons/:lessonId/progress", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { lessonId } = req.params;
      
      // Enforce subscription tier access
      const access = await isLessonAccessible(userId, lessonId);
      if (!access.accessible) {
        return res.status(403).json({ error: access.reason || "Access denied" });
      }
      
      const { watchedSeconds } = req.body;
      const result = await storage.updateLessonProgress(userId, lessonId, watchedSeconds);
      res.json(result);
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      res.status(500).json({ error: "Failed to update lesson progress" });
    }
  });

  // ============== STUDENT SCORES ROUTES ==============

  // Get comprehensive student scores for a course (modules, lessons, quizzes)
  // Premium feature - free users get limited data
  app.get("/api/courses/:courseId/scores", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check subscription tier - detailed scores is premium
      const user = await storage.getUser(userId);
      const subscriptionTier = user?.subscriptionTier || 'free';
      
      if (subscriptionTier === 'free') {
        // Return limited data for free users
        return res.json({
          courseId: req.params.courseId,
          modules: [],
          overallScore: 0,
          gpa: 0,
          isPassed: false,
          premiumFeature: true,
          message: "Actualiza tu plan para ver puntuaciones detalladas"
        });
      }
      
      const { courseId } = req.params;
      
      // Get course with modules
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      const modules = await storage.getModulesByCourseId(courseId);
      const lessons = await storage.getLessonsByCourseId(courseId);
      const quizzes = await storage.getQuizzesByCourseId(courseId);
      const userAttempts = await storage.getQuizAttemptsByUserId(userId);
      
      // Calculate scores per module
      const moduleScores = modules.map(module => {
        const moduleLessons = lessons.filter(l => l.moduleId === module.id);
        const lessonScores = moduleLessons.map(lesson => {
          const lessonQuizzes = quizzes.filter(q => q.lessonId === lesson.id && q.isPublished);
          const quizScores = lessonQuizzes.map(quiz => {
            const attempts = userAttempts.filter(a => a.quizId === quiz.id);
            const bestAttempt = attempts.length > 0 
              ? attempts.reduce((best, current) => current.score > best.score ? current : best)
              : null;
            return {
              quizId: quiz.id,
              quizTitle: quiz.title,
              passingScore: quiz.passingScore,
              totalPoints: quiz.totalPoints || 100,
              bestScore: bestAttempt?.score || 0,
              isPassed: bestAttempt?.isPassed || false,
              attempts: attempts.length
            };
          });
          
          const avgLessonScore = quizScores.length > 0 
            ? quizScores.reduce((sum, q) => sum + q.bestScore, 0) / quizScores.length
            : 0;
          const allQuizzesPassed = quizScores.length > 0 && quizScores.every(q => q.isPassed);
          
          return {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            orderIndex: lesson.orderIndex,
            quizzes: quizScores,
            averageScore: Math.round(avgLessonScore),
            allQuizzesPassed
          };
        });
        
        const avgModuleScore = lessonScores.length > 0 
          ? lessonScores.reduce((sum, l) => sum + l.averageScore, 0) / lessonScores.length
          : 0;
        const allLessonsPassed = lessonScores.length > 0 && lessonScores.every(l => l.allQuizzesPassed);
        
        return {
          moduleId: module.id,
          moduleTitle: module.title,
          orderIndex: module.orderIndex,
          lessons: lessonScores,
          averageScore: Math.round(avgModuleScore),
          allLessonsPassed
        };
      });
      
      // Calculate overall course score (average of module scores)
      const validModuleScores = moduleScores.filter(m => m.lessons.length > 0);
      const courseScore = validModuleScores.length > 0
        ? validModuleScores.reduce((sum, m) => sum + m.averageScore, 0) / validModuleScores.length
        : 0;
      
      // Convert to GPA scale (0-4.0)
      const gpa = (courseScore / 100) * 4;
      
      res.json({
        courseId,
        courseTitle: course.title,
        modules: moduleScores,
        overallScore: Math.round(courseScore),
        gpa: Math.round(gpa * 100) / 100, // Round to 2 decimals
        isPassed: courseScore >= 70 // 70% to pass
      });
    } catch (error) {
      console.error("Error fetching course scores:", error);
      res.status(500).json({ error: "Failed to fetch course scores" });
    }
  });

  // Get all student scores across all enrolled courses (for dashboard)
  // Premium feature - free users get basic data only
  app.get("/api/student/scores", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check subscription tier - detailed analytics is premium
      const user = await storage.getUser(userId);
      const subscriptionTier = user?.subscriptionTier || 'free';
      
      if (subscriptionTier === 'free') {
        // Return limited data for free users
        return res.json({
          courses: [],
          overallGpa: 0,
          totalCoursesEnrolled: 0,
          coursesPassed: 0,
          premiumFeature: true,
          message: "Actualiza tu plan para ver estadísticas detalladas de cursos"
        });
      }
      
      const enrollments = await storage.getEnrollmentsByUserId(userId);
      const allAttempts = await storage.getQuizAttemptsByUserId(userId);
      
      const courseScores = await Promise.all(enrollments.map(async (enrollment) => {
        const course = await storage.getCourseById(enrollment.courseId);
        if (!course) return null;
        
        const modules = await storage.getModulesByCourseId(enrollment.courseId);
        const lessons = await storage.getLessonsByCourseId(enrollment.courseId);
        const quizzes = await storage.getQuizzesByCourseId(enrollment.courseId);
        
        // Calculate module scores
        const moduleScores = modules.map(module => {
          const moduleLessons = lessons.filter(l => l.moduleId === module.id);
          const lessonScores = moduleLessons.map(lesson => {
            const lessonQuizzes = quizzes.filter(q => q.lessonId === lesson.id && q.isPublished);
            const quizScores = lessonQuizzes.map(quiz => {
              const attempts = allAttempts.filter(a => a.quizId === quiz.id);
              const bestAttempt = attempts.length > 0 
                ? attempts.reduce((best, current) => current.score > best.score ? current : best)
                : null;
              return bestAttempt?.score || 0;
            });
            return quizScores.length > 0 
              ? quizScores.reduce((sum, s) => sum + s, 0) / quizScores.length
              : 0;
          });
          return lessonScores.length > 0 
            ? lessonScores.reduce((sum, s) => sum + s, 0) / lessonScores.length
            : 0;
        });
        
        const courseScore = moduleScores.length > 0 
          ? moduleScores.reduce((sum, s) => sum + s, 0) / moduleScores.length
          : 0;
        const gpa = (courseScore / 100) * 4;
        
        return {
          courseId: course.id,
          courseTitle: course.title,
          courseLevel: course.level,
          score: Math.round(courseScore),
          gpa: Math.round(gpa * 100) / 100,
          isPassed: courseScore >= 70,
          modulesCompleted: moduleScores.filter(s => s >= 70).length,
          totalModules: modules.length
        };
      }));
      
      const validCourses = courseScores.filter(Boolean);
      const overallGpa = validCourses.length > 0
        ? validCourses.reduce((sum, c) => sum + (c?.gpa || 0), 0) / validCourses.length
        : 0;
      
      res.json({
        courses: validCourses,
        overallGpa: Math.round(overallGpa * 100) / 100,
        totalCoursesEnrolled: validCourses.length,
        coursesPassed: validCourses.filter(c => c?.isPassed).length
      });
    } catch (error) {
      console.error("Error fetching student scores:", error);
      res.status(500).json({ error: "Failed to fetch student scores" });
    }
  });

  // ============== ONBOARDING API ROUTES ==============

  // Save onboarding data with Zod validation
  const onboardingSchema = z.object({
    englishLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
    learningGoals: z.array(z.string()).min(1, "At least one goal required"),
    availability: z.enum(["mornings", "afternoons", "evenings", "weekends", "flexible"]),
    weeklyHoursGoal: z.enum(["1-3", "4-6", "7-10", "10+"]),
    interests: z.array(z.string()).min(1, "At least one interest required"),
  });

  app.post("/api/onboarding", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const validation = onboardingSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
      }
      
      const { englishLevel, learningGoals, availability, weeklyHoursGoal, interests } = validation.data;
      
      const user = await storage.updateUser(userId, {
        englishLevel,
        learningGoals,
        availability,
        weeklyHoursGoal,
        interests,
        onboardingCompleted: true,
        updatedAt: new Date(),
      });
      
      res.json({ success: true, user });
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      res.status(500).json({ error: "Failed to save onboarding data" });
    }
  });

  // Get onboarding status
  app.get("/api/onboarding/status", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        onboardingCompleted: user.onboardingCompleted,
        englishLevel: user.englishLevel,
        learningGoals: user.learningGoals,
        availability: user.availability,
        weeklyHoursGoal: user.weeklyHoursGoal,
        interests: user.interests,
      });
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  // ============== AUTH MIDDLEWARE ==============

  // (Auth middleware moved to top of registerRoutes — see line ~270
  //  to fix TDZ: routes registered before this point couldn't use it.)

  // ============== AI TUTOR CHAT ==============

  // Daily message limits by subscription tier
  const AI_TUTOR_LIMITS: Record<string, number> = {
    free: 5,
    flex: 20,
    basic: 100,
    premium: -1 // unlimited
  };

  // AI Tutor chat endpoint
  app.post("/api/ai-tutor/chat", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Debes iniciar sesión para usar el tutor" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const subscriptionTier = user.subscriptionTier || "free";
      const dailyLimit = AI_TUTOR_LIMITS[subscriptionTier] || 5;

      // Check daily usage (simplified - in production use a proper rate limiter)
      // For now, we'll just track it in memory or skip the limit check for premium users
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Mensaje requerido" });
      }

      if (message.length > 1000) {
        return res.status(400).json({ error: "El mensaje es demasiado largo (máximo 1000 caracteres)" });
      }

      // Get user's English level for personalized responses
      const englishLevel = user.englishLevel || "A1";
      const levelDescriptions: Record<string, string> = {
        "A1": "absolute beginner, just starting to learn English",
        "A2": "elementary level, knows basic phrases and vocabulary",
        "B1": "intermediate level, can handle everyday situations",
        "B2": "upper intermediate, can discuss a variety of topics",
        "C1": "advanced, can express complex ideas fluently",
        "C2": "proficient, near-native level of English"
      };

      const systemPrompt = `You are an AI English tutor for CogniBoost, a professional English learning platform for Spanish-speaking Latin American adults.

Student's current level: ${englishLevel} (${levelDescriptions[englishLevel] || levelDescriptions["A1"]})

Your role:
1. Help students practice conversational English
2. Correct grammar and vocabulary errors gently, explaining why in Spanish when needed
3. Adapt your language complexity to match their level (${englishLevel})
4. For A1-A2 levels: Use simple sentences, provide Spanish translations for new words
5. For B1-B2 levels: Encourage longer responses, introduce idioms and phrasal verbs
6. For C1-C2 levels: Discuss complex topics, refine nuances and professional language

Guidelines:
- Be encouraging and supportive
- If the student writes in Spanish, respond primarily in English but include Spanish explanations
- Provide corrections inline with explanations in parentheses
- Suggest better ways to express ideas
- Keep responses concise but helpful (max 150 words)
- Use professional context examples (business meetings, emails, presentations)
- End with a question or prompt to keep the conversation going`;

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.slice(-10).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content
        })),
        { role: "user", content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7
      });

      const responseMessage = completion.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

      res.json({
        message: responseMessage,
        messagesUsedToday: 1, // Simplified - would track in DB in production
        dailyLimit: dailyLimit === -1 ? "unlimited" : dailyLimit
      });
    } catch (error: any) {
      console.error("AI Tutor chat error:", error);
      if (error.status === 429) {
        return res.status(429).json({ error: "Demasiadas solicitudes. Por favor espera un momento." });
      }
      res.status(500).json({ error: "Error al procesar tu mensaje. Intenta de nuevo." });
    }
  });

  // ============== ADMIN API ROUTES ==============

  // Admin middleware - check if user is authenticated and is an admin
  const requireAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Login required" });
    }
    
    // Check if user is an admin
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }
    next();
  };

  // Register health-check routes (weekly maintenance)
  registerHealthCheckRoutes(app, storage, requireAdmin);

  // Admin: Get dashboard stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Admin: Get all course categories
  app.get("/api/admin/course-categories", requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getCourseCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching course categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Admin: Create course category
  app.post("/api/admin/course-categories", requireAdmin, async (req, res) => {
    try {
      const { insertCourseCategorySchema } = await import("@shared/schema");
      const parseResult = insertCourseCategorySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid category data", details: parseResult.error.flatten() });
      }
      const category = await storage.createCourseCategory(parseResult.data);
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating course category:", error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: "Category already exists" });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Admin: Get all courses (including unpublished)
  app.get("/api/admin/courses", requireAdmin, async (req, res) => {
    try {
      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching all courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  // Admin: Create course
  app.post("/api/admin/courses", requireAdmin, validateRequest(createCourseSchema), async (req, res) => {
    try {
      const { modulesCount = 1, ...courseData } = req.body;
      const course = await storage.createCourse({ ...courseData, modulesCount });

      // Auto-create modules for the course
      if (modulesCount > 0) {
        await storage.createModulesForCourse(course.id, modulesCount);
      }

      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  // Admin: Update course
  app.patch("/api/admin/courses/:id", requireAdmin, validateRequest(updateCourseSchema), async (req, res) => {
    try {
      const course = await storage.updateCourse(req.params.id, req.body);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ error: "Failed to update course" });
    }
  });

  // Admin: Delete course
  app.delete("/api/admin/courses/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCourse(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  // Admin: Get single course by ID
  app.get("/api/admin/courses/:id", requireAdmin, async (req, res) => {
    try {
      const course = await storage.getCourseById(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ error: "Failed to fetch course" });
    }
  });

  // Admin: Get lessons for a specific course
  app.get("/api/admin/courses/:id/lessons", requireAdmin, async (req, res) => {
    try {
      const lessons = await storage.getLessonsByCourseId(req.params.id);
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching course lessons:", error);
      res.status(500).json({ error: "Failed to fetch lessons" });
    }
  });

  // Admin: Get modules for a specific course
  app.get("/api/admin/courses/:id/modules", requireAdmin, async (req, res) => {
    try {
      const modules = await storage.getModulesByCourseId(req.params.id);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching course modules:", error);
      res.status(500).json({ error: "Failed to fetch modules" });
    }
  });

  // Admin: Create modules for a course
  app.post("/api/admin/courses/:id/modules", requireAdmin, async (req, res) => {
    try {
      const { count, title, description } = req.body;

      // If title is provided, create a single named module
      if (title) {
        const existingModules = await storage.getModulesByCourseId(req.params.id);
        const maxOrder = existingModules.length > 0
          ? Math.max(...existingModules.map(m => m.orderIndex))
          : 0;
        const newModule = await storage.createModule({
          courseId: req.params.id,
          title,
          description: description || null,
          orderIndex: maxOrder + 1,
        });
        return res.status(201).json(newModule);
      }

      // Otherwise batch-create by count
      if (!count || count < 1) {
        return res.status(400).json({ error: "Provide title or count" });
      }
      const modules = await storage.createModulesForCourse(req.params.id, count);
      res.status(201).json(modules);
    } catch (error) {
      console.error("Error creating course modules:", error);
      res.status(500).json({ error: "Failed to create modules" });
    }
  });

  // Admin: Update a module
  app.patch("/api/admin/modules/:id", requireAdmin, validateRequest(updateModuleSchema), async (req, res) => {
    try {
      const module = await storage.updateModule(req.params.id, req.body);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      console.error("Error updating module:", error);
      res.status(500).json({ error: "Failed to update module" });
    }
  });

  // Admin: Delete a module
  app.delete("/api/admin/modules/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteModule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting module:", error);
      res.status(500).json({ error: "Failed to delete module" });
    }
  });

  // Admin: Fetch YouTube transcript for module video activity
  app.post("/api/admin/modules/:id/fetch-transcript", requireAdmin, async (req, res) => {
    try {
      const { videoUrl } = req.body;
      if (!videoUrl) {
        return res.status(400).json({ error: "videoUrl is required" });
      }

      const moduleData = await storage.getModuleById(req.params.id);
      if (!moduleData) {
        return res.status(404).json({ error: "Module not found" });
      }

      // Extract YouTube video ID from various URL formats
      let videoId: string | null = null;
      try {
        const url = new URL(videoUrl);
        if (url.hostname.includes("youtube.com")) {
          videoId = url.searchParams.get("v");
        } else if (url.hostname === "youtu.be") {
          videoId = url.pathname.slice(1);
        }
      } catch {
        // Try as raw video ID
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoUrl)) {
          videoId = videoUrl;
        }
      }

      if (!videoId) {
        return res.status(400).json({ error: "Could not extract YouTube video ID from URL" });
      }

      // Fetch transcript from YouTube
      let transcript: string;
      try {
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
        transcript = transcriptItems.map(item => item.text).join(" ");
      } catch (err: any) {
        return res.status(422).json({
          error: "Could not fetch transcript automatically. The video may not have captions available. Please paste the transcript manually.",
          details: err?.message
        });
      }

      // Save to module
      await storage.updateModule(req.params.id, {
        videoUrl,
        videoTranscript: transcript,
        videoSource: "youtube",
      });

      res.json({ transcript, videoId });
    } catch (error) {
      console.error("Error fetching transcript:", error);
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  });

  // Admin: Generate video quiz for a module
  app.post("/api/admin/modules/:id/generate-video-quiz", requireAdmin, async (req, res) => {
    try {
      const { numberOfQuestions = 10 } = req.body;
      const moduleData = await storage.getModuleById(req.params.id);
      if (!moduleData) {
        return res.status(404).json({ error: "Module not found" });
      }

      if (!moduleData.videoTranscript) {
        return res.status(400).json({ error: "Module has no video transcript. Fetch or paste a transcript first." });
      }

      // Get course level
      const course = await storage.getCourseById(moduleData.courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      // Check if a quiz already exists for this module
      let quiz = await storage.getQuizByModuleId(req.params.id);
      if (quiz) {
        // Delete existing questions to regenerate
        await storage.deleteQuizQuestionsByQuizId(quiz.id);
      } else {
        // Create new quiz
        quiz = await storage.createQuiz({
          moduleId: req.params.id,
          courseId: moduleData.courseId,
          title: `Video Activity: ${moduleData.title}`,
          description: `Comprehension and listening quiz based on the module video`,
          type: "ai",
          passingScore: 70,
          totalPoints: numberOfQuestions * 10,
          isPublished: true,
        });
      }

      // Limit transcript to ~4000 chars for context window
      const transcriptText = moduleData.videoTranscript.slice(0, 4000);

      const prompt = `Generate ${numberOfQuestions} multiple choice quiz questions IN ENGLISH based on a video transcript.
The student watched a video WITHOUT subtitles. Test their comprehension and listening skills.

Video Source: YouTube
Course Level: ${course.level} (CEFR)
Module: ${moduleData.title}
Video Transcript:
${transcriptText}

Generate questions in these categories:
- COMPREHENSION (60%): Test understanding of main ideas, arguments, and details discussed in the video
- LISTENING DETAIL (40%): Test specific details, numbers, names, or phrases that require careful listening

CRITICAL RULES:
- ALL questions, options, and explanations must be written entirely in ENGLISH
- Questions must ONLY reference content from the transcript above
- Each question must have exactly 4 options, with one correct answer
- Difficulty must match ${course.level} CEFR level
- Include a brief explanation for each correct answer
- Prefix each explanation with [COMPREHENSION] or [LISTENING] to indicate the skill tested

Return a JSON array with this exact format:
[
  {
    "question": "What was the main topic discussed in the video?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0,
    "explanation": "[COMPREHENSION] The video primarily discusses..."
  }
]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert English teacher creating quiz questions to test listening comprehension. Students watched a video without subtitles. All output must be in English. Generate questions strictly based on the transcript. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      let generatedQuestions;
      try {
        const parsed = JSON.parse(content);
        generatedQuestions = parsed.questions || parsed;
      } catch {
        throw new Error("Invalid JSON response from AI");
      }

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error("AI returned no questions. Try regenerating, or check the transcript content.");
      }

      const validQuestions = generatedQuestions.filter((q: any) =>
        q &&
        typeof q.question === "string" && q.question.trim().length > 0 &&
        Array.isArray(q.options) && q.options.length === 4 &&
        q.options.every((o: any) => typeof o === "string" && o.trim().length > 0) &&
        Number.isInteger(q.correctOptionIndex) &&
        q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3
      );

      if (validQuestions.length === 0) {
        throw new Error("AI returned malformed questions (missing options or invalid correctOptionIndex). Try regenerating.");
      }

      // Create questions in database
      const createdQuestions = [];
      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];
        const question = await storage.createQuizQuestion({
          quizId: quiz.id,
          question: q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          orderIndex: i,
        });
        createdQuestions.push(question);
      }

      res.json({ quiz, questions: createdQuestions });
    } catch (error: any) {
      console.error("Error generating video quiz:", error);
      res.status(500).json({ error: error?.message || "Failed to generate video quiz" });
    }
  });

  // Student: Get modules with video quiz status for a course
  app.get("/api/courses/:courseId/modules", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const modules = await storage.getModulesByCourseId(req.params.courseId);

      // For each module with a video, check if student passed the quiz
      const modulesWithStatus = await Promise.all(
        modules.map(async (mod) => {
          let videoQuizStatus = null;
          if (mod.videoUrl) {
            const quiz = await storage.getQuizByModuleId(mod.id);
            if (quiz && userId) {
              const attempts = await storage.getQuizAttemptsByQuizId(quiz.id);
              const userAttempts = attempts.filter(a => a.userId === userId);
              const passed = userAttempts.some(a => a.isPassed);
              const bestScore = userAttempts.length > 0
                ? Math.max(...userAttempts.map(a => a.score))
                : null;
              videoQuizStatus = {
                quizId: quiz.id,
                passed,
                bestScore,
                attempts: userAttempts.length,
              };
            }
          }
          return {
            id: mod.id,
            courseId: mod.courseId,
            title: mod.title,
            description: mod.description,
            orderIndex: mod.orderIndex,
            videoUrl: mod.videoUrl,
            videoSource: mod.videoSource,
            // Do NOT expose transcript to students
            videoQuizStatus,
          };
        })
      );

      res.json(modulesWithStatus);
    } catch (error) {
      console.error("Error fetching course modules:", error);
      res.status(500).json({ error: "Failed to fetch modules" });
    }
  });

  // Student: Get video quiz for a module
  app.get("/api/modules/:moduleId/video-quiz", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const quiz = await storage.getQuizByModuleId(req.params.moduleId);
      if (!quiz || !quiz.isPublished) {
        return res.status(404).json({ error: "No video quiz found for this module" });
      }

      const questions = await storage.getQuizQuestions(quiz.id);

      // Strip correctOptionIndex for students
      const studentQuestions = questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        orderIndex: q.orderIndex,
      }));

      // Get previous attempts
      const attempts = await storage.getQuizAttemptsByQuizId(quiz.id);
      const userAttempts = attempts.filter(a => a.userId === userId);

      res.json({
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          passingScore: quiz.passingScore,
          timeLimit: quiz.timeLimit,
          totalPoints: quiz.totalPoints,
        },
        questions: studentQuestions,
        previousAttempts: userAttempts.length,
        bestScore: userAttempts.length > 0
          ? Math.max(...userAttempts.map(a => a.score))
          : null,
        isPassed: userAttempts.some(a => a.isPassed),
      });
    } catch (error) {
      console.error("Error fetching video quiz:", error);
      res.status(500).json({ error: "Failed to fetch video quiz" });
    }
  });

  // Admin: Get lesson by ID
  app.get("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    try {
      const lesson = await storage.getLessonById(req.params.id);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ error: "Failed to fetch lesson" });
    }
  });

  // Admin: Create lesson
  app.post("/api/admin/lessons", requireAdmin, validateRequest(createLessonSchema), async (req, res) => {
    try {
      const lesson = await storage.createLesson(req.body);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      res.status(500).json({ error: "Failed to create lesson" });
    }
  });

  // Admin: Update lesson
  app.patch("/api/admin/lessons/:id", requireAdmin, validateRequest(updateLessonSchema), async (req, res) => {
    try {
      const lesson = await storage.updateLesson(req.params.id, req.body);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Error updating lesson:", error);
      res.status(500).json({ error: "Failed to update lesson" });
    }
  });

  // Admin: Delete lesson
  app.delete("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteLesson(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lesson:", error);
      res.status(500).json({ error: "Failed to delete lesson" });
    }
  });

  // Admin: Upload HTML lesson content with auto-parsing
  app.post("/api/admin/lessons/upload-html", requireAdmin, async (req, res) => {
    try {
      const { htmlContent, filename, courseId, moduleId } = req.body;
      
      if (!htmlContent || !courseId) {
        return res.status(400).json({ error: "HTML content and courseId are required" });
      }
      
      // Validate HTML content size (max 5MB)
      if (htmlContent.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "HTML content too large (max 5MB)" });
      }
      
      // Verify course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      // Verify module exists if provided
      if (moduleId) {
        const modules = await storage.getModulesByCourseId(courseId);
        if (!modules.find(m => m.id === moduleId)) {
          return res.status(404).json({ error: "Module not found" });
        }
      }
      
      // Parse metadata from HTML content
      let title = "Untitled Lesson";
      let description = "";
      let duration = 15; // default 15 minutes
      let level = "A1";
      let week = 1;
      let lessonNum = 1;
      
      // Try to extract title from <title> tag or h1
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      // Try to extract from h1
      const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) {
        title = h1Match[1].trim();
      }
      
      // Parse filename for level, week, lesson (e.g., a1w1l1-slides.html)
      if (filename) {
        const filePattern = /([abc][12])w(\d+)l(\d+)/i;
        const fileMatch = filename.match(filePattern);
        if (fileMatch) {
          level = fileMatch[1].toUpperCase();
          week = parseInt(fileMatch[2]);
          lessonNum = parseInt(fileMatch[3]);
        }
      }
      
      // Try to extract duration from content
      const durationMatch = htmlContent.match(/Duration:\s*(\d+)\s*minutes/i);
      if (durationMatch) {
        duration = parseInt(durationMatch[1]);
      }
      
      // Get existing lessons to determine order index
      const existingLessons = await storage.getLessonsByCourseId(courseId);
      const moduleFilteredLessons = moduleId 
        ? existingLessons.filter(l => l.moduleId === moduleId)
        : existingLessons;
      const orderIndex = moduleFilteredLessons.length + 1;
      
      // Create the lesson with HTML content
      const lesson = await storage.createLesson({
        courseId,
        moduleId: moduleId || null,
        title,
        description: `${level} Week ${week} Lesson ${lessonNum}`,
        htmlContent,
        duration,
        orderIndex,
        isPreview: true, // Make first lessons available to free users
        isPublished: true,
      });
      
      res.status(201).json({
        lesson,
        parsed: { title, level, week, lessonNum, duration }
      });
    } catch (error) {
      console.error("Error uploading HTML lesson:", error);
      res.status(500).json({ error: "Failed to upload lesson" });
    }
  });

  // Admin: Bulk upload HTML lessons
  app.post("/api/admin/lessons/bulk-upload-html", requireAdmin, async (req, res) => {
    try {
      const { files, courseId, moduleId } = req.body;
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "Files array is required" });
      }
      
      if (!courseId) {
        return res.status(400).json({ error: "courseId is required" });
      }
      
      // Verify course exists
      const course = await storage.getCourseById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      
      // Verify module exists if provided
      if (moduleId) {
        const modules = await storage.getModulesByCourseId(courseId);
        if (!modules.find(m => m.id === moduleId)) {
          return res.status(404).json({ error: "Module not found" });
        }
      }
      
      // Get existing lessons count once for order index calculation
      const existingLessons = await storage.getLessonsByCourseId(courseId);
      const baseOrderIndex = moduleId 
        ? existingLessons.filter(l => l.moduleId === moduleId).length
        : existingLessons.length;
      
      const results: any[] = [];
      const errors: any[] = [];
      
      for (const file of files) {
        try {
          const { htmlContent, filename } = file;
          
          // Validate htmlContent exists and is not too large
          if (!htmlContent) {
            errors.push({ filename, error: "Missing HTML content" });
            continue;
          }
          
          if (htmlContent.length > 5 * 1024 * 1024) {
            errors.push({ filename, error: "File too large (max 5MB)" });
            continue;
          }
          
          // Parse metadata from HTML content
          let title = "Untitled Lesson";
          let duration = 15;
          let level = "A1";
          let week = 1;
          let lessonNum = 1;
          
          // Extract title
          const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1].trim();
          
          const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          if (h1Match) title = h1Match[1].trim();
          
          // Parse filename
          if (filename) {
            const filePattern = /([abc][12])w(\d+)l(\d+)/i;
            const fileMatch = filename.match(filePattern);
            if (fileMatch) {
              level = fileMatch[1].toUpperCase();
              week = parseInt(fileMatch[2]);
              lessonNum = parseInt(fileMatch[3]);
            }
          }
          
          // Extract duration
          const durationMatch = htmlContent.match(/Duration:\s*(\d+)\s*minutes/i);
          if (durationMatch) {
            const parsedDuration = parseInt(durationMatch[1]);
            if (!isNaN(parsedDuration)) duration = parsedDuration;
          }
          
          // Calculate order index based on baseOrderIndex and current results
          const orderIndex = baseOrderIndex + results.length + 1;
          
          const lesson = await storage.createLesson({
            courseId,
            moduleId: moduleId || null,
            title,
            description: `${level} Week ${week} Lesson ${lessonNum}`,
            htmlContent,
            duration,
            orderIndex,
            isPreview: orderIndex <= 3, // First 3 lessons are preview
            isPublished: true,
          });
          
          results.push({ filename, lesson, parsed: { title, level, week, lessonNum, duration } });
        } catch (err: any) {
          errors.push({ filename: file.filename, error: err.message });
        }
      }
      
      res.json({ 
        success: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error) {
      console.error("Error bulk uploading lessons:", error);
      res.status(500).json({ error: "Failed to bulk upload lessons" });
    }
  });

  // Upload PDF file (protected, for lesson materials)
  app.post("/api/upload/pdf", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await uploadToGcs(req.file.buffer, req.file.originalname, 'application/pdf');
      res.json(result);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      res.status(500).json({ error: "Failed to upload PDF" });
    }
  });

  // Upload audio MP3 file (protected, for lesson audio materials)
  app.post("/api/upload/audio", requireAdmin, uploadAudio.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await uploadToGcs(req.file.buffer, req.file.originalname, 'audio/mpeg');
      res.json(result);
    } catch (error) {
      console.error("Error uploading audio:", error);
      res.status(500).json({ error: "Failed to upload audio file" });
    }
  });

  // Serve lesson audio files — redirects to GCS URL based on lesson's audioMaterials
  app.get("/api/audio/:lessonId/:filename", async (req, res) => {
    try {
      const { lessonId, filename } = req.params;
      const lesson = await storage.getLessonById(lessonId);

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      if (!lesson.audioMaterials || lesson.audioMaterials.length === 0) {
        return res.status(404).json({ error: "No audio files for this lesson" });
      }

      // audioMaterials format: ["filename::url", ...]
      const entry = lesson.audioMaterials.find(m => m.startsWith(filename + "::"));
      if (!entry) {
        return res.status(404).json({ error: "Audio file not found" });
      }

      const url = entry.split("::").slice(1).join("::");

      // Redirect to the storage URL
      res.redirect(302, url);
    } catch (error) {
      console.error("Error serving audio:", error);
      res.status(500).json({ error: "Failed to serve audio file" });
    }
  });

  // Admin: Audio diagnostics for a lesson — shows which MP3s are referenced vs uploaded
  app.get("/api/admin/lessons/:id/audio-diagnostics", requireAdmin, async (req, res) => {
    try {
      const lesson = await storage.getLessonById(req.params.id);
      if (!lesson) return res.status(404).json({ error: "Lesson not found" });

      // Extract MP3 filenames referenced in HTML
      const htmlRefs = [...new Set((lesson.htmlContent || "").match(/[\w-]+\.mp3/g) || [])];

      // Extract uploaded filenames from audioMaterials
      const uploaded = (lesson.audioMaterials || []).map((m: string) => m.split("::")[0]);

      // Compute missing
      const missing = htmlRefs.filter(f => !uploaded.includes(f));

      res.json({
        lessonId: lesson.id,
        title: lesson.title,
        htmlRefs,
        uploaded,
        missing,
        summary: `${uploaded.length}/${htmlRefs.length} audio files uploaded (${missing.length} missing)`,
      });
    } catch (error) {
      console.error("Error running audio diagnostics:", error);
      res.status(500).json({ error: "Failed to run audio diagnostics" });
    }
  });

  // Admin: Audio health check - weekly maintenance endpoint
  app.get("/api/admin/audio-health", requireAdmin, async (req, res) => {
    try {
      const allCourses = await storage.getAllCourses();
      const allLessons: any[] = [];
      for (const course of allCourses) {
        const courseLessons = await storage.getLessonsByCourseId(course.id);
        allLessons.push(...courseLessons.map(l => ({ ...l, courseName: course.title })));
      }
      const htmlLessons = allLessons.filter((l: any) => l.htmlContent && l.htmlContent.trim() !== "");

      const report: any[] = [];

      for (const lesson of htmlLessons) {
        const html = lesson.htmlContent as string;
        const audioMaterials = (lesson as any).audioMaterials as string[] | null;

        // Extract MP3 references from HTML
        const mp3Regex = /['"]([\w\-]+\.mp3)['"]/g;
        const htmlAudioRefs: string[] = [];
        let match;
        while ((match = mp3Regex.exec(html)) !== null) {
          if (!htmlAudioRefs.includes(match[1])) htmlAudioRefs.push(match[1]);
        }

        // Check AUDIO_BASE_URL pattern
        const baseUrlMatch = html.match(/var\s+AUDIO_BASE_URL\s*=\s*['"]([^'"]*)['"]\s*;/);
        const hasBaseUrl = !!baseUrlMatch;
        const baseUrlValue = baseUrlMatch ? baseUrlMatch[1] : null;

        // Check speech fallback
        const hasSpeechFallback = /speakText|speechSynthesis/.test(html);

        // Get uploaded files
        const uploadedFiles = (audioMaterials || []).map(entry => entry.split("::")[0]);
        const uploadedCount = uploadedFiles.length;

        // Find mismatches
        const missingUploads = htmlAudioRefs.filter(f => !uploadedFiles.includes(f));
        const extraUploads = uploadedFiles.filter(f => !htmlAudioRefs.includes(f));

        // Determine status
        let status: "ok" | "warning" | "error" = "ok";
        const issues: string[] = [];

        if (htmlAudioRefs.length > 0 && uploadedCount === 0) {
          status = "error";
          issues.push("HTML references audio files but none are uploaded");
        }
        if (missingUploads.length > 0) {
          status = status === "error" ? "error" : "warning";
          issues.push(`${missingUploads.length} audio files referenced in HTML but not uploaded`);
        }
        if (htmlAudioRefs.length > 0 && !hasBaseUrl) {
          status = "error";
          issues.push("HTML references MP3 files but has no AUDIO_BASE_URL variable");
        }
        if (uploadedCount > 0 && htmlAudioRefs.length === 0 && !hasBaseUrl) {
          status = "warning";
          issues.push("Audio files uploaded but HTML has no audio player code");
        }
        if (htmlAudioRefs.length > 0 && !hasSpeechFallback) {
          status = status === "error" ? "error" : "warning";
          issues.push("No Web Speech API fallback — audio will be silent if MP3s fail");
        }

        report.push({
          lessonId: lesson.id,
          title: lesson.title,
          courseId: lesson.courseId,
          courseName: (lesson as any).courseName,
          status,
          htmlAudioRefs: htmlAudioRefs.length,
          uploadedAudio: uploadedCount,
          missingUploads: missingUploads.length > 0 ? missingUploads : undefined,
          extraUploads: extraUploads.length > 0 ? extraUploads : undefined,
          hasBaseUrl,
          baseUrlValue,
          hasSpeechFallback,
          issues: issues.length > 0 ? issues : undefined,
        });
      }

      const summary = {
        totalHtmlLessons: htmlLessons.length,
        withAudioUploaded: report.filter(r => r.uploadedAudio > 0).length,
        withoutAudioUploaded: report.filter(r => r.uploadedAudio === 0).length,
        errors: report.filter(r => r.status === "error").length,
        warnings: report.filter(r => r.status === "warning").length,
        ok: report.filter(r => r.status === "ok").length,
        checkedAt: new Date().toISOString(),
      };

      res.json({ summary, lessons: report });
    } catch (error) {
      console.error("Error running audio health check:", error);
      res.status(500).json({ error: "Failed to run audio health check" });
    }
  });

  // Admin: Get all enrollments
  app.get("/api/admin/enrollments", requireAdmin, async (req, res) => {
    try {
      const enrollments = await storage.getAllEnrollments();
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });

  // Admin: Get all user stats (student progress)
  app.get("/api/admin/user-stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAllUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Admin: Get all lesson progress
  app.get("/api/admin/lesson-progress", requireAdmin, async (req, res) => {
    try {
      const progress = await storage.getAllLessonProgress();
      res.json(progress);
    } catch (error) {
      console.error("Error fetching lesson progress:", error);
      res.status(500).json({ error: "Failed to fetch lesson progress" });
    }
  });

  // Admin: Get all subscriptions
  app.get("/api/admin/subscriptions", requireAdmin, async (req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Admin: Get subscription tier distribution from users table (source of truth)
  app.get("/api/admin/subscription-stats", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const tierCounts: Record<string, number> = { free: 0, flex: 0, basic: 0, premium: 0 };
      for (const user of allUsers) {
        const tier = user.subscriptionTier || 'free';
        tierCounts[tier] = (tierCounts[tier] || 0) + 1;
      }
      res.json(tierCounts);
    } catch (error) {
      console.error("Error fetching subscription stats:", error);
      res.status(500).json({ error: "Failed to fetch subscription stats" });
    }
  });

  // Admin: Get all payments
  app.get("/api/admin/payments", requireAdmin, async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Admin: Create conversation lab
  app.post("/api/admin/labs", requireAdmin, async (req, res) => {
    try {
      const lab = await storage.createConversationLab(req.body);
      res.status(201).json(lab);
    } catch (error) {
      console.error("Error creating lab:", error);
      res.status(500).json({ error: "Failed to create lab" });
    }
  });

  // Admin: Update conversation lab
  app.patch("/api/admin/labs/:id", requireAdmin, async (req, res) => {
    try {
      const lab = await storage.updateConversationLab(req.params.id, req.body);
      if (!lab) {
        return res.status(404).json({ error: "Lab not found" });
      }
      res.json(lab);
    } catch (error) {
      console.error("Error updating lab:", error);
      res.status(500).json({ error: "Failed to update lab" });
    }
  });

  // Admin: Delete conversation lab
  app.delete("/api/admin/labs/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteConversationLab(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting lab:", error);
      res.status(500).json({ error: "Failed to delete lab" });
    }
  });

  // Admin: Get all lab bookings
  app.get("/api/admin/lab-bookings", requireAdmin, async (req, res) => {
    try {
      const bookings = await storage.getAllLabBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching lab bookings:", error);
      res.status(500).json({ error: "Failed to fetch lab bookings" });
    }
  });

  // Admin: Create instructor
  app.post("/api/admin/instructors", requireAdmin, validateRequest(createInstructorSchema), async (req, res) => {
    try {
      const instructor = await storage.createInstructor(req.body);
      res.status(201).json(instructor);
    } catch (error) {
      console.error("Error creating instructor:", error);
      res.status(500).json({ error: "Failed to create instructor" });
    }
  });

  // Admin: Update instructor
  app.patch("/api/admin/instructors/:id", requireAdmin, validateRequest(updateInstructorSchema), async (req, res) => {
    try {
      const instructor = await storage.updateInstructor(req.params.id, req.body);
      if (!instructor) {
        return res.status(404).json({ error: "Instructor not found" });
      }
      res.json(instructor);
    } catch (error) {
      console.error("Error updating instructor:", error);
      res.status(500).json({ error: "Failed to update instructor" });
    }
  });

  // Admin: Delete instructor
  app.delete("/api/admin/instructors/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteInstructor(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting instructor:", error);
      res.status(500).json({ error: "Failed to delete instructor" });
    }
  });

  // ============== ADMIN TEAM ROUTES ==============

  // Admin: Get all admin users
  app.get("/api/admin/team/admins", requireAdmin, async (req, res) => {
    try {
      const admins = await storage.getAdminUsers();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  // Admin: Toggle user admin status
  app.patch("/api/admin/team/users/:id/admin", requireAdmin, async (req, res) => {
    try {
      const { isAdmin } = req.body;
      const userId = req.params.id;
      const currentUserId = (req.user as any)?.id;
      
      // Prevent self-demotion
      if (userId === currentUserId && !isAdmin) {
        return res.status(400).json({ error: "No puedes quitarte permisos de admin a ti mismo" });
      }
      
      const user = await storage.updateUserAdminStatus(userId, isAdmin);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user admin status:", error);
      res.status(500).json({ error: "Failed to update user admin status" });
    }
  });

  // Admin: Get all admin invitations
  app.get("/api/admin/team/invitations", requireAdmin, async (req, res) => {
    try {
      const invitations = await storage.getAdminInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching admin invitations:", error);
      res.status(500).json({ error: "Failed to fetch admin invitations" });
    }
  });

  // Admin: Create admin invitation
  app.post("/api/admin/team/invitations", requireAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, department } = req.body;
      const invitedBy = (req.user as any)?.id;
      
      if (!email) {
        return res.status(400).json({ error: "El email es requerido" });
      }
      
      const invitation = await storage.createAdminInvitation({
        email: email.toLowerCase(),
        firstName,
        lastName,
        department,
        invitedBy,
      });
      res.status(201).json(invitation);
    } catch (error: any) {
      console.error("Error creating admin invitation:", error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: "Este email ya tiene una invitación de admin" });
      }
      res.status(500).json({ error: "Failed to create admin invitation" });
    }
  });

  // Admin: Delete admin invitation
  app.delete("/api/admin/team/invitations/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAdminInvitation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting admin invitation:", error);
      res.status(500).json({ error: "Failed to delete admin invitation" });
    }
  });

  // ============== STAFF INVITATIONS (Magic Link) ==============

  // Get all staff invitations (sanitized - no token hash exposed)
  app.get("/api/admin/staff-invitations", requireAdmin, async (req, res) => {
    try {
      const invitations = await storage.getStaffInvitations();
      // Sanitize response - remove tokenHash for security
      const sanitized = invitations.map(({ tokenHash, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching staff invitations:", error);
      res.status(500).json({ error: "Failed to fetch staff invitations" });
    }
  });

  // Staff invitation validation schema
  const staffInvitationSchema = z.object({
    email: z.string().email("El email no es válido"),
    role: z.enum(["admin", "instructor"], { errorMap: () => ({ message: "El rol debe ser 'admin' o 'instructor'" }) }),
    firstName: z.string().min(1, "El nombre es requerido").optional(),
    lastName: z.string().optional(),
    department: z.string().optional(),
  });

  // Create staff invitation and send email
  app.post("/api/admin/staff-invitations", requireAdmin, async (req, res) => {
    try {
      const validation = staffInvitationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      
      const { email, role, firstName, lastName, department } = validation.data;
      const invitedBy = (req.user as any)?.id;
      
      // Check if there's already a pending invitation for this email
      const existingInvitation = await storage.getStaffInvitationByEmail(email);
      if (existingInvitation) {
        return res.status(400).json({ error: "Ya existe una invitación pendiente para este email" });
      }
      
      // Generate secure token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      
      // Set expiration to 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Create invitation
      const invitation = await storage.createStaffInvitation({
        email: email.toLowerCase(),
        role,
        firstName,
        lastName,
        department,
        invitedBy,
        tokenHash,
        expiresAt,
      });
      
      // Get inviter's name
      const inviter = await storage.getUser(invitedBy);
      const inviterName = inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'Un administrador' : 'Un administrador';
      
      // Build invitation URL
      const baseUrl = process.env.APP_URL || "https://cogniboost.co";
      const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

      // Send email
      const { sendEmail } = await import("./resendClient");
      await sendEmail(email, 'staff_invitation', {
        firstName: firstName || '',
        role,
        invitedByName: inviterName,
        invitationUrl,
      });
      
      res.status(201).json({ 
        ...invitation,
        tokenHash: undefined, // Don't expose token hash in response
      });
    } catch (error) {
      console.error("Error creating staff invitation:", error);
      res.status(500).json({ error: "Failed to create staff invitation" });
    }
  });

  // Revoke staff invitation
  app.delete("/api/admin/staff-invitations/:id", requireAdmin, async (req, res) => {
    try {
      const revokedBy = (req.user as any)?.id;
      await storage.revokeStaffInvitation(req.params.id, revokedBy);
      res.status(204).send();
    } catch (error) {
      console.error("Error revoking staff invitation:", error);
      res.status(500).json({ error: "Failed to revoke staff invitation" });
    }
  });

  // Resend staff invitation email
  app.post("/api/admin/staff-invitations/:id/resend", requireAdmin, async (req, res) => {
    try {
      const invitedBy = (req.user as any)?.id;
      
      // Get the invitation
      const invitations = await storage.getStaffInvitations();
      const invitation = invitations.find(inv => inv.id === req.params.id);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitación no encontrada" });
      }
      
      if (invitation.usedAt) {
        return res.status(400).json({ error: "Esta invitación ya fue utilizada" });
      }
      
      if (invitation.isRevoked) {
        return res.status(400).json({ error: "Esta invitación fue revocada" });
      }
      
      // Generate new token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      
      // Set new expiration to 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Update invitation with new token
      await storage.updateStaffInvitation(invitation.id, {
        tokenHash,
        expiresAt,
      });
      
      // Get inviter's name
      const inviter = await storage.getUser(invitedBy);
      const inviterName = inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || 'Un administrador' : 'Un administrador';
      
      // Build invitation URL
      const baseUrl = process.env.APP_URL || "https://cogniboost.co";
      const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

      // Send email
      const { sendEmail } = await import("./resendClient");
      await sendEmail(invitation.email, 'staff_invitation', {
        firstName: invitation.firstName || '',
        role: invitation.role,
        invitedByName: inviterName,
        invitationUrl,
      });
      
      res.json({ success: true, message: "Invitación reenviada" });
    } catch (error) {
      console.error("Error resending staff invitation:", error);
      res.status(500).json({ error: "Failed to resend staff invitation" });
    }
  });

  // Accept staff invitation (requires authentication)
  app.post("/api/accept-invitation", requireAuth, async (req, res) => {
    try {
      const { token } = req.body;
      const userId = (req.user as any)?.id;
      
      if (!token) {
        return res.status(400).json({ error: "Token es requerido" });
      }
      
      // Hash the token to find the invitation
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      
      // Find the invitation
      const invitation = await storage.getStaffInvitationByTokenHash(tokenHash);
      
      if (!invitation) {
        return res.status(404).json({ error: "Invitación no encontrada o inválida" });
      }
      
      // Check if already used
      if (invitation.usedAt) {
        return res.status(400).json({ error: "Esta invitación ya fue utilizada" });
      }
      
      // Check if revoked
      if (invitation.isRevoked) {
        return res.status(400).json({ error: "Esta invitación fue revocada" });
      }
      
      // Check expiration
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ error: "Esta invitación ha expirado" });
      }
      
      // Get current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Check if user's email matches the invitation email
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(403).json({ 
          error: "Esta invitación fue enviada a un email diferente. Por favor inicia sesión con la cuenta correcta." 
        });
      }
      
      // Update user role to the invited role
      // For admin role, also set isAdmin flag which is used for authorization
      const updateData: any = { role: invitation.role };
      if (invitation.role === 'admin') {
        updateData.isAdmin = true;
      }
      await storage.updateUser(userId, updateData);
      
      // Mark invitation as used
      await storage.updateStaffInvitation(invitation.id, {
        usedAt: new Date(),
        usedByUserId: userId,
      });
      
      res.json({ 
        success: true, 
        message: `¡Felicidades! Ahora eres ${invitation.role === 'admin' ? 'Administrador' : 'Instructor'} en CogniBoost.`,
        role: invitation.role
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ error: "Error al aceptar la invitación" });
    }
  });

  // ============== LIVE SESSIONS API ROUTES (New Breakout Rooms Model) ==============

  // Get all live sessions with their rooms (filters by user level for authenticated students)
  app.get("/api/live-sessions", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      let userLevel: string | null = null;
      let isAdmin = false;
      
      // For authenticated users, filter rooms by their English level
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          isAdmin = user.isAdmin || false;
          userLevel = user.placementLevel || user.englishLevel || 'A1';
        }
      }
      
      const sessions = await storage.getLiveSessions();
      const sessionsWithRooms = await Promise.all(
        sessions.map(async (session) => {
          let rooms = await storage.getSessionRooms(session.id);
          
          // For non-admin authenticated users, filter rooms by their level
          if (userId && !isAdmin && userLevel) {
            rooms = rooms.filter(room => room.level === userLevel);
          }
          
          return { ...session, rooms };
        })
      );
      
      // Filter out sessions with no matching rooms for authenticated non-admin users
      const filteredSessions = userId && !isAdmin 
        ? sessionsWithRooms.filter(session => session.rooms.length > 0)
        : sessionsWithRooms;
      
      res.json(filteredSessions);
    } catch (error) {
      console.error("Error fetching live sessions:", error);
      res.status(500).json({ error: "Failed to fetch live sessions" });
    }
  });

  // Get live session by ID with rooms (filters by user level for authenticated students)
  app.get("/api/live-sessions/:id", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      let userLevel: string | null = null;
      let isAdmin = false;
      
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          isAdmin = user.isAdmin || false;
          userLevel = user.placementLevel || user.englishLevel || 'A1';
        }
      }
      
      const session = await storage.getLiveSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      let rooms = await storage.getSessionRooms(req.params.id);
      
      // For non-admin authenticated users, filter rooms by their level
      if (userId && !isAdmin && userLevel) {
        rooms = rooms.filter(room => room.level === userLevel);
      }
      
      res.json({ ...session, rooms });
    } catch (error) {
      console.error("Error fetching live session:", error);
      res.status(500).json({ error: "Failed to fetch live session" });
    }
  });

  // Get rooms for a session (filters by user level for authenticated students)
  app.get("/api/live-sessions/:id/rooms", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      let userLevel: string | null = null;
      let isAdmin = false;
      
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          isAdmin = user.isAdmin || false;
          userLevel = user.placementLevel || user.englishLevel || 'A1';
        }
      }
      
      let rooms = await storage.getSessionRooms(req.params.id);
      
      // For non-admin authenticated users, filter rooms by their level
      if (userId && !isAdmin && userLevel) {
        rooms = rooms.filter(room => room.level === userLevel);
      }
      
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching session rooms:", error);
      res.status(500).json({ error: "Failed to fetch session rooms" });
    }
  });

  // Helper function to send booking confirmation emails
  async function sendBookingConfirmationEmails(
    studentEmail: string,
    studentName: string,
    studentPhone: string | undefined,
    room: any,
    session: any,
    bookingType: 'class' | 'demo' = 'class'
  ) {
    // Validate required data
    if (!studentEmail || !session?.scheduledAt) {
      console.log("Missing required data for booking confirmation email");
      return;
    }

    const sessionDate = new Date(session.scheduledAt);
    const dateStr = sessionDate.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    const timeStr = sessionDate.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit"
    });

    // Get meeting link from room or session
    const meetingUrl = room?.roomUrl || session?.meetingUrl || "";

    // Choose template based on booking type
    const studentTemplate = bookingType === 'demo' ? 'demo_booking_confirmation' : 'class_booking_confirmation';
    const adminTemplate = bookingType === 'demo' ? 'demo_booking_notification' : 'class_booking_notification';

    // Send confirmation to student
    await sendEmail(studentEmail, studentTemplate, {
      firstName: studentName?.split(" ")[0] || "Estudiante",
      sessionTitle: session.title || (bookingType === 'demo' ? "Demo Personalizado" : "Clase de Práctica"),
      sessionDate: dateStr,
      sessionTime: timeStr,
      roomTopic: room?.topic || "Conversación General",
      roomLevel: room?.level || "Todos los niveles",
      sessionDuration: String(bookingType === 'demo' ? 15 : (session.duration || 45)),
      meetingUrl: meetingUrl
    });

    // Send notification to academy
    const academyEmail = "cognimight@gmail.com";
    await sendEmail(academyEmail, adminTemplate, {
      studentName: studentName || "No proporcionado",
      studentEmail,
      studentPhone: studentPhone || "No proporcionado",
      sessionTitle: session.title || (bookingType === 'demo' ? "Demo Personalizado" : "Clase de Práctica"),
      sessionDate: dateStr,
      sessionTime: timeStr,
      roomTopic: room?.topic || "Conversación General",
      roomLevel: room?.level || "Todos los niveles",
      meetingUrl: meetingUrl
    });
  }

  // Book a room (authenticated user)
  app.post("/api/room-bookings", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { roomId } = req.body;
      if (!roomId) {
        return res.status(400).json({ error: "Room ID is required" });
      }
      
      // Get user to check subscription tier and level
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const subscriptionTier = user.subscriptionTier || 'free';
      
      // Server-side tier access check: Only free users cannot book labs
      if (subscriptionTier === 'free') {
        return res.status(403).json({
          error: "Upgrade required",
          message: "Tu plan actual no incluye acceso a Conversation Labs. Actualiza a Flex, Básico o Premium.",
          code: "TIER_ACCESS_DENIED"
        });
      }

      // Server-side monthly limit check for Flex tier (1 lab per month)
      if (subscriptionTier === 'flex') {
        const MONTHLY_LIMIT = 1;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyBookings = await storage.getRoomBookingsByUserIdSince(userId, startOfMonth);
        const activeMonthlyBookings = monthlyBookings.filter(b => !b.cancelledAt);
        if (activeMonthlyBookings.length >= MONTHLY_LIMIT) {
          return res.status(403).json({
            error: "Monthly limit reached",
            message: `Has alcanzado el límite de ${MONTHLY_LIMIT} lab por mes. Actualiza a Standard o Premium para más labs.`,
            code: "MONTHLY_LIMIT_EXCEEDED"
          });
        }
      }

      // Server-side weekly limit check for Basic tier (2 labs per week = 8 per month)
      if (subscriptionTier === 'basic') {
        const WEEKLY_LIMIT = 2;
        const startOfWeek = new Date();
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklyBookings = await storage.getRoomBookingsByUserIdSince(userId, startOfWeek);
        const activeWeeklyBookings = weeklyBookings.filter(b => !b.cancelledAt);
        if (activeWeeklyBookings.length >= WEEKLY_LIMIT) {
          return res.status(403).json({
            error: "Weekly limit reached",
            message: `Has alcanzado el límite de ${WEEKLY_LIMIT} labs por semana. Actualiza a Premium para labs ilimitados.`,
            code: "WEEKLY_LIMIT_EXCEEDED"
          });
        }
      }

      // Premium tier: unlimited labs, no check needed
      
      // Server-side level check: User can only book rooms matching their level
      const room = await storage.getSessionRoomById(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      
      const userLevel = user.placementLevel || user.englishLevel || 'A1';
      if (room.level !== userLevel) {
        return res.status(403).json({ 
          error: "Level mismatch", 
          message: `Solo puedes reservar labs de tu nivel (${userLevel}). Esta sala es nivel ${room.level}.`,
          code: "LEVEL_MISMATCH"
        });
      }
      
      const booking = await storage.createRoomBooking({ userId, roomId });

      // Get session details for email (room already fetched above)
      if (room) {
        const session = await storage.getLiveSessionById(room.sessionId);
        const user = await storage.getUser(userId);
        if (session && user) {
          try {
            await sendBookingConfirmationEmails(
              user.email || "",
              `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Estudiante",
              undefined,
              room,
              session
            );
          } catch (emailError) {
            console.error("Error sending booking confirmation emails:", emailError);
            // Don't fail the booking if email fails
          }
        }
      }

      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating room booking:", error);
      res.status(500).json({ error: "Failed to book room" });
    }
  });

  // Book a room (guest - uses lead info)
  app.post("/api/room-bookings/guest", async (req, res) => {
    try {
      const { roomId, email, name, phone, bookingType = 'class' } = req.body;
      if (!roomId) {
        return res.status(400).json({ error: "Room ID is required" });
      }
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Create a guest booking using prefixed email as the userId to differentiate from auth users
      const guestUserId = `guest:${email}`;
      const booking = await storage.createRoomBooking({ userId: guestUserId, roomId });

      // Update lead status and source for tracking in admin dashboard
      try {
        const existingLead = await storage.getLeadByEmail(email.toLowerCase());
        if (existingLead) {
          // Update lead with booking info
          await storage.updateLead(existingLead.id, {
            status: 'engaged',
            source: bookingType === 'demo' ? 'demo_booking' : 'class_booking'
          });
        } else {
          // Create a new lead if they didn't exist (should rarely happen since form creates lead first)
          const nameParts = (name || "").trim().split(/\s+/);
          const firstName = nameParts[0] || "Sin nombre";
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
          await storage.createLead({
            email: email.toLowerCase(),
            firstName,
            lastName,
            phone: phone || null,
            source: bookingType === 'demo' ? 'demo_booking' : 'class_booking',
            status: 'engaged'
          });
        }
      } catch (leadError) {
        console.error("Error updating lead for booking:", leadError);
        // Don't fail the booking if lead update fails
      }

      // Get room and session details for email
      const room = await storage.getSessionRoomById(roomId);
      if (room) {
        const session = await storage.getLiveSessionById(room.sessionId);
        if (session) {
          try {
            await sendBookingConfirmationEmails(
              email,
              name || "Estudiante",
              phone,
              room,
              session,
              bookingType as 'class' | 'demo'
            );
          } catch (emailError) {
            console.error("Error sending booking confirmation emails:", emailError);
            // Don't fail the booking if email fails
          }
        }
      }

      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating guest room booking:", error);
      res.status(500).json({ error: "Failed to book room" });
    }
  });

  // Get user's room bookings
  app.get("/api/room-bookings", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const bookings = await storage.getRoomBookingsByUserId(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching room bookings:", error);
      res.status(500).json({ error: "Failed to fetch room bookings" });
    }
  });

  // Validation schema for live session with groups
  const labGroupSchema = z.object({
    topic: z.string().min(1),
    level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  });

  const createLiveSessionSchema = z.object({
    title: z.string().min(1, "Título requerido"),
    description: z.string().optional(),
    instructorId: z.string().min(1, "Instructor requerido"),
    scheduledAt: z.string().min(1, "Fecha requerida"),
    duration: z.number().min(1).default(60),
    meetingUrl: z.string().optional(),
    isPremium: z.boolean().default(false),
    groups: z.array(labGroupSchema).min(1, "Al menos un grupo es requerido"),
    // Recurring session fields
    isRecurring: z.boolean().default(false),
    recurrenceWeeks: z.number().min(1).max(12).optional(), // How many weeks to repeat (1-12)
  });

  // Admin: Get all live sessions with rooms
  app.get("/api/admin/live-sessions", requireAdmin, async (req, res) => {
    try {
      const sessions = await storage.getLiveSessions();
      const sessionsWithRooms = await Promise.all(
        sessions.map(async (session) => {
          const rooms = await storage.getSessionRooms(session.id);
          return { ...session, rooms };
        })
      );
      res.json(sessionsWithRooms);
    } catch (error) {
      console.error("Error fetching live sessions:", error);
      res.status(500).json({ error: "Failed to fetch live sessions" });
    }
  });

  // Admin: Create live session with groups (supports recurring sessions)
  app.post("/api/admin/live-sessions", requireAdmin, async (req, res) => {
    try {
      const validation = createLiveSessionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validation.error.errors });
      }
      
      const { groups, isRecurring, recurrenceWeeks, ...sessionData } = validation.data;
      
      if (isRecurring && recurrenceWeeks && recurrenceWeeks > 1) {
        // Create recurring sessions
        const sessions = await storage.createRecurringSessions({
          ...sessionData,
          scheduledAt: new Date(sessionData.scheduledAt),
        }, recurrenceWeeks);
        
        // Create rooms for each session in the series
        const sessionsWithRooms = await Promise.all(
          sessions.map(async (session) => {
            for (const group of groups) {
              await storage.createSessionRoom({
                sessionId: session.id,
                topic: group.topic,
                level: group.level,
                maxParticipants: 6,
              });
            }
            const rooms = await storage.getSessionRooms(session.id);
            return { ...session, rooms };
          })
        );
        
        res.status(201).json({ 
          message: `Se crearon ${sessions.length} sesiones semanales`,
          sessions: sessionsWithRooms,
          seriesId: sessions[0]?.seriesId 
        });
      } else {
        // Create single session
        const session = await storage.createLiveSession({
          ...sessionData,
          scheduledAt: new Date(sessionData.scheduledAt),
        });
        
        // Create session rooms for each group
        for (const group of groups) {
          await storage.createSessionRoom({
            sessionId: session.id,
            topic: group.topic,
            level: group.level,
            maxParticipants: 6, // Default max per room
          });
        }
        
        // Return session with rooms
        const rooms = await storage.getSessionRooms(session.id);
        res.status(201).json({ ...session, rooms });
      }
    } catch (error) {
      console.error("Error creating live session:", error);
      res.status(500).json({ error: "Failed to create live session" });
    }
  });

  // Admin: Update live session with groups
  const updateLiveSessionSchema = createLiveSessionSchema.partial().extend({
    groups: z.array(labGroupSchema).optional(),
  });

  app.patch("/api/admin/live-sessions/:id", requireAdmin, async (req, res) => {
    try {
      const validation = updateLiveSessionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validation.error.errors });
      }
      
      const { groups, scheduledAt, ...restSessionData } = validation.data;
      
      // Update the session data
      const updateData: Record<string, any> = { ...restSessionData };
      if (scheduledAt) {
        updateData.scheduledAt = new Date(scheduledAt);
      }
      
      const session = await storage.updateLiveSession(req.params.id, updateData);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // If groups are provided, recreate the rooms
      if (groups && groups.length > 0) {
        // Delete existing rooms
        const existingRooms = await storage.getSessionRooms(req.params.id);
        for (const room of existingRooms) {
          await storage.deleteSessionRoom(room.id);
        }
        
        // Create new rooms
        for (const group of groups) {
          await storage.createSessionRoom({
            sessionId: session.id,
            topic: group.topic,
            level: group.level,
            maxParticipants: 6,
          });
        }
      }
      
      // Return session with updated rooms
      const rooms = await storage.getSessionRooms(session.id);
      res.json({ ...session, rooms });
    } catch (error) {
      console.error("Error updating live session:", error);
      res.status(500).json({ error: "Failed to update live session" });
    }
  });

  // Admin: Delete live session and its rooms
  app.delete("/api/admin/live-sessions/:id", requireAdmin, async (req, res) => {
    try {
      // Delete associated rooms first
      const rooms = await storage.getSessionRooms(req.params.id);
      for (const room of rooms) {
        await storage.deleteSessionRoom(room.id);
      }
      
      await storage.deleteLiveSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting live session:", error);
      res.status(500).json({ error: "Failed to delete live session" });
    }
  });

  // Admin: Get all sessions in a series
  app.get("/api/admin/live-sessions/series/:seriesId", requireAdmin, async (req, res) => {
    try {
      const sessions = await storage.getLiveSessionsBySeriesId(req.params.seriesId);
      const sessionsWithRooms = await Promise.all(
        sessions.map(async (session) => {
          const rooms = await storage.getSessionRooms(session.id);
          return { ...session, rooms };
        })
      );
      res.json(sessionsWithRooms);
    } catch (error) {
      console.error("Error fetching series sessions:", error);
      res.status(500).json({ error: "Failed to fetch series sessions" });
    }
  });

  // Admin: Delete all future sessions in a series (without bookings)
  app.delete("/api/admin/live-sessions/series/:seriesId", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteSeriesSessions(req.params.seriesId);
      res.json({ message: `Se eliminaron ${deleted} sesiones futuras de la serie`, deleted });
    } catch (error) {
      console.error("Error deleting series sessions:", error);
      res.status(500).json({ error: "Failed to delete series sessions" });
    }
  });

  // Admin: Update all future sessions in a series
  const updateSeriesSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    instructorId: z.string().optional(),
    duration: z.number().min(1).optional(),
    meetingUrl: z.string().optional(),
    isPremium: z.boolean().optional(),
  });

  app.patch("/api/admin/live-sessions/series/:seriesId", requireAdmin, async (req, res) => {
    try {
      const validation = updateSeriesSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Datos inválidos", details: validation.error.errors });
      }
      
      const { title, description, instructorId, duration, meetingUrl, isPremium } = validation.data;
      const updates: Record<string, any> = {};
      
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (instructorId !== undefined) updates.instructorId = instructorId;
      if (duration !== undefined) updates.duration = duration;
      if (meetingUrl !== undefined) updates.meetingUrl = meetingUrl;
      if (isPremium !== undefined) updates.isPremium = isPremium;
      
      const updated = await storage.updateSeriesSessions(req.params.seriesId, updates);
      res.json({ message: `Se actualizaron ${updated} sesiones de la serie`, updated });
    } catch (error) {
      console.error("Error updating series sessions:", error);
      res.status(500).json({ error: "Failed to update series sessions" });
    }
  });

  // Admin: Create session room
  app.post("/api/admin/session-rooms", requireAdmin, async (req, res) => {
    try {
      const room = await storage.createSessionRoom(req.body);
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating session room:", error);
      res.status(500).json({ error: "Failed to create session room" });
    }
  });

  // Admin: Update session room
  app.patch("/api/admin/session-rooms/:id", requireAdmin, async (req, res) => {
    try {
      const room = await storage.updateSessionRoom(req.params.id, req.body);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      console.error("Error updating session room:", error);
      res.status(500).json({ error: "Failed to update session room" });
    }
  });

  // Admin: Delete session room
  app.delete("/api/admin/session-rooms/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSessionRoom(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting session room:", error);
      res.status(500).json({ error: "Failed to delete session room" });
    }
  });

  // ========== QUIZ ROUTES ==========

  // Admin: Get quizzes by lesson ID
  app.get("/api/admin/lessons/:lessonId/quizzes", requireAdmin, async (req, res) => {
    try {
      const quizzes = await storage.getQuizzesByLessonId(req.params.lessonId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ error: "Failed to fetch quizzes" });
    }
  });

  // Admin: Get video quiz by module ID with questions
  app.get("/api/admin/modules/:moduleId/quiz", requireAdmin, async (req, res) => {
    try {
      const quiz = await storage.getQuizByModuleId(req.params.moduleId);
      if (!quiz) {
        return res.status(404).json({ error: "No quiz found for this module" });
      }
      const questions = await storage.getQuizQuestions(quiz.id);
      res.json({ ...quiz, questions });
    } catch (error) {
      console.error("Error fetching module quiz:", error);
      res.status(500).json({ error: "Failed to fetch module quiz" });
    }
  });

  // Admin: Get quiz by ID with questions
  app.get("/api/admin/quizzes/:id", requireAdmin, async (req, res) => {
    try {
      const quiz = await storage.getQuizById(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      const questions = await storage.getQuizQuestions(quiz.id);
      res.json({ ...quiz, questions });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  });

  // Admin: Create quiz
  app.post("/api/admin/quizzes", requireAdmin, async (req, res) => {
    try {
      const quiz = await storage.createQuiz(req.body);
      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({ error: "Failed to create quiz" });
    }
  });

  // Admin: Update quiz
  app.patch("/api/admin/quizzes/:id", requireAdmin, async (req, res) => {
    try {
      const quiz = await storage.updateQuiz(req.params.id, req.body);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      res.json(quiz);
    } catch (error) {
      console.error("Error updating quiz:", error);
      res.status(500).json({ error: "Failed to update quiz" });
    }
  });

  // Admin: Delete quiz
  app.delete("/api/admin/quizzes/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteQuiz(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ error: "Failed to delete quiz" });
    }
  });

  // Admin: Create quiz question
  app.post("/api/admin/quiz-questions", requireAdmin, async (req, res) => {
    try {
      const question = await storage.createQuizQuestion(req.body);
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  // Admin: Update quiz question
  app.patch("/api/admin/quiz-questions/:id", requireAdmin, async (req, res) => {
    try {
      const question = await storage.updateQuizQuestion(req.params.id, req.body);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Admin: Delete quiz question
  app.delete("/api/admin/quiz-questions/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteQuizQuestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Admin: Generate quiz questions with AI
  app.post("/api/admin/quizzes/:quizId/generate", requireAdmin, async (req, res) => {
    try {
      const { lessonTitle, lessonDescription, courseLevel, numberOfQuestions = 5 } = req.body;
      const quizId = req.params.quizId;

      const quiz = await storage.getQuizById(quizId);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      // Fetch lesson content to make questions strictly relevant to the material
      let lessonContent = "";
      if (quiz.lessonId) {
        const lesson = await storage.getLessonById(quiz.lessonId);
        if (lesson?.htmlContent) {
          // Strip HTML tags to get plain text, limit to ~3000 chars to fit in context
          lessonContent = lesson.htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 3000);
        }
      }

      const lessonContextSection = lessonContent
        ? `\n\nLesson Content (use ONLY this material to create questions):\n${lessonContent}`
        : "";

      const prompt = `Generate ${numberOfQuestions} multiple choice quiz questions IN ENGLISH for an English learning course.

Lesson Title: ${lessonTitle}
Lesson Description: ${lessonDescription || "N/A"}
Level: ${courseLevel} (CEFR level)${lessonContextSection}

CRITICAL RULES:
- ALL questions, options, and explanations must be written entirely in ENGLISH
- Questions must ONLY test concepts, vocabulary, or grammar that appear in the lesson content above
- Do NOT generate questions about topics not covered in the lesson material
- If lesson content is provided, base every question directly on that specific material
- Each question must have exactly 4 options, with one correct answer

Return a JSON array with this exact format:
[
  {
    "question": "What is the correct meaning of 'schedule' as used in the lesson?",
    "options": ["A plan of events", "A type of food", "A musical instrument", "A piece of furniture"],
    "correctOptionIndex": 0,
    "explanation": "In the lesson, 'schedule' refers to a plan that lists events and the times at which they will take place."
  }
]

Important:
- Everything must be in ENGLISH (questions, options, explanations)
- Test vocabulary, grammar, reading comprehension, or concepts from the lesson
- Each question must have exactly 4 options
- correctOptionIndex is 0-based (0 for first option, 1 for second, etc.)
- Include a brief explanation in English for the correct answer
- Questions should match the ${courseLevel} CEFR difficulty level`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert English teacher creating quiz questions for students learning English. All output must be in English. Generate questions that are strictly based on the lesson content provided. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      let generatedQuestions;
      try {
        const parsed = JSON.parse(content);
        generatedQuestions = parsed.questions || parsed;
      } catch {
        throw new Error("Invalid JSON response from AI");
      }

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error("AI returned no questions. Try regenerating, or check the lesson content.");
      }

      const validQuestions = generatedQuestions.filter((q: any) =>
        q &&
        typeof q.question === "string" && q.question.trim().length > 0 &&
        Array.isArray(q.options) && q.options.length === 4 &&
        q.options.every((o: any) => typeof o === "string" && o.trim().length > 0) &&
        Number.isInteger(q.correctOptionIndex) &&
        q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3
      );

      if (validQuestions.length === 0) {
        throw new Error("AI returned malformed questions (missing options or invalid correctOptionIndex). Try regenerating.");
      }

      // Get existing question count for orderIndex
      const existingQuestions = await storage.getQuizQuestions(quizId);
      let orderIndex = existingQuestions.length;

      // Create questions in database
      const createdQuestions = [];
      for (const q of validQuestions) {
        const question = await storage.createQuizQuestion({
          quizId,
          question: q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          orderIndex: orderIndex++
        });
        createdQuestions.push(question);
      }

      res.json({ success: true, questions: createdQuestions });
    } catch (error: any) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ error: error?.message || "Failed to generate quiz questions" });
    }
  });

  // Student: Get quiz for a lesson
  app.get("/api/lessons/:lessonId/quiz", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { lessonId } = req.params;
      
      // Enforce subscription tier access
      const access = await isLessonAccessible(userId, lessonId);
      if (!access.accessible) {
        return res.status(403).json({ error: access.reason || "Access denied" });
      }
      
      const quizzes = await storage.getQuizzesByLessonId(lessonId);
      const publishedQuiz = quizzes.find(q => q.isPublished);
      if (!publishedQuiz) {
        return res.status(404).json({ error: "No quiz available" });
      }
      const questions = await storage.getQuizQuestions(publishedQuiz.id);
      // Don't send correctOptionIndex to student
      const safeQuestions = questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        orderIndex: q.orderIndex
      }));
      res.json({ ...publishedQuiz, questions: safeQuestions });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ error: "Failed to fetch quiz" });
    }
  });

  // Student: Submit quiz attempt
  app.post("/api/quizzes/:quizId/attempt", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { answers } = req.body;
      const quizId = req.params.quizId;

      const quiz = await storage.getQuizById(quizId);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }
      
      // Enforce subscription tier access for lesson-associated quizzes
      if (quiz.lessonId) {
        const access = await isLessonAccessible(userId, quiz.lessonId);
        if (!access.accessible) {
          return res.status(403).json({ error: access.reason || "Access denied" });
        }
      }

      const questions = await storage.getQuizQuestions(quizId);

      if (questions.length === 0) {
        return res.status(400).json({ error: "Quiz has no questions yet. Please contact support." });
      }

      // Calculate score
      let correctCount = 0;
      const results = questions.map((q, index) => {
        const userAnswer = parseInt(answers[index]);
        const isCorrect = userAnswer === q.correctOptionIndex;
        if (isCorrect) correctCount++;
        return {
          questionId: q.id,
          question: q.question,
          userAnswer,
          correctAnswer: q.correctOptionIndex,
          isCorrect,
          explanation: q.explanation
        };
      });

      const score = Math.round((correctCount / questions.length) * 100);
      const isPassed = score >= (quiz.passingScore || 70);

      // Save attempt
      const attempt = await storage.createQuizAttempt({
        userId,
        quizId,
        score,
        answers: answers.map(String),
        isPassed
      });

      // If quiz passed, mark lesson as completed and quizPassed
      if (isPassed && quiz.lessonId) {
        await storage.markQuizPassed(userId, quiz.lessonId);
        await storage.markLessonComplete(userId, quiz.lessonId);
      }

      res.json({
        attempt,
        results,
        score,
        isPassed,
        passingScore: quiz.passingScore
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Failed to submit quiz" });
    }
  });

  // Student: Get quiz attempts
  app.get("/api/quiz-attempts", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const attempts = await storage.getQuizAttemptsByUserId(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ error: "Failed to fetch attempts" });
    }
  });

  // Admin: Get all students
  app.get("/api/admin/students", requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      let students;
      if (status && ['active', 'hold', 'inactive'].includes(status as string)) {
        students = await storage.getUsersByStatus(status as 'active' | 'hold' | 'inactive');
      } else {
        students = await storage.getAllUsers();
      }
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  // Admin: Get student metrics (KPIs)
  app.get("/api/admin/students/metrics", requireAdmin, async (req, res) => {
    try {
      const metrics = await storage.getStudentMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching student metrics:", error);
      res.status(500).json({ error: "Failed to fetch student metrics" });
    }
  });

  // Admin: Update student status
  // Admin: update a student's CEFR level fields. Sets placementLevel
  // + englishLevel together (used by manual classification when the
  // placement quiz wasn't completed).
  app.patch("/api/admin/students/:id/level", requireAdmin, async (req: any, res) => {
    try {
      const { level } = req.body || {};
      if (!['A1','A2','B1','B2','C1','C2'].includes(level)) {
        return res.status(400).json({ error: 'valid level required' });
      }
      const { db } = await import("./db");
      const { users } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db.update(users)
        .set({ placementLevel: level, englishLevel: level, updatedAt: new Date() })
        .where(eq(users.id, req.params.id))
        .returning({ id: users.id, placementLevel: users.placementLevel, englishLevel: users.englishLevel });
      if (!updated) return res.status(404).json({ error: 'Student not found' });
      res.json(updated);
    } catch (e: any) {
      console.error('[admin/students/level]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  app.patch("/api/admin/students/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !['active', 'hold', 'inactive'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const updated = await storage.updateUser(req.params.id, { status });
      if (!updated) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating student status:", error);
      res.status(500).json({ error: "Failed to update student status" });
    }
  });

  // Admin: Lock student access
  app.post("/api/admin/students/:id/lock", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const updated = await storage.lockUser(req.params.id, reason);
      if (!updated) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error locking student:", error);
      res.status(500).json({ error: "Failed to lock student" });
    }
  });

  // Admin: Unlock student access
  app.post("/api/admin/students/:id/unlock", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.unlockUser(req.params.id);
      if (!updated) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error unlocking student:", error);
      res.status(500).json({ error: "Failed to unlock student" });
    }
  });

  // Admin: Soft delete student (moves to "eliminados" list)
  app.delete("/api/admin/students/:id", requireAdmin, async (req, res) => {
    try {
      const adminUser = req.user as any;
      const student = await storage.getUser(req.params.id);
      
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      
      // Prevent deleting admins
      if (student.isAdmin) {
        return res.status(403).json({ error: "No se puede eliminar a un administrador" });
      }
      
      // Soft delete: set deletedAt timestamp and deletedBy
      const updated = await storage.softDeleteUser(req.params.id, adminUser?.id);
      
      res.json({ 
        message: "Estudiante eliminado exitosamente",
        student: updated 
      });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Admin: Get deleted students
  app.get("/api/admin/students/deleted", requireAdmin, async (req, res) => {
    try {
      const deletedStudents = await storage.getDeletedStudents();
      res.json(deletedStudents);
    } catch (error) {
      console.error("Error fetching deleted students:", error);
      res.status(500).json({ error: "Failed to fetch deleted students" });
    }
  });

  // Admin: Export students as CSV
  // Admin: Get detailed student progress
  app.get("/api/admin/students/:id/progress", requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Student not found" });
      }

      const [lessonProgressData, quizAttempts, enrollments, userStatsData] = await Promise.all([
        storage.getLessonProgressByUserId(userId),
        storage.getQuizAttemptsByUserId(userId),
        storage.getEnrollmentsByUserId(userId),
        storage.getUserStats(userId),
      ]);

      // For each enrollment, get the course details and lesson completion
      const courseProgress = await Promise.all(
        enrollments.map(async (enrollment) => {
          const course = await storage.getCourseById(enrollment.courseId);
          const courseLessons = await storage.getLessonsByCourseId(enrollment.courseId);
          const completedLessons = lessonProgressData.filter(
            lp => courseLessons.some(l => l.id === lp.lessonId) && lp.isCompleted
          );
          return {
            courseId: enrollment.courseId,
            courseTitle: course?.title || "Unknown",
            courseLevel: course?.level || "N/A",
            enrolledAt: enrollment.enrolledAt,
            completedAt: enrollment.completedAt,
            totalLessons: courseLessons.length,
            completedLessons: completedLessons.length,
            progressPercent: courseLessons.length > 0
              ? Math.round((completedLessons.length / courseLessons.length) * 100)
              : 0,
          };
        })
      );

      // Get quiz details for each attempt
      const quizDetails = await Promise.all(
        quizAttempts.map(async (attempt) => {
          const quiz = await storage.getQuizById(attempt.quizId);
          return {
            ...attempt,
            quizTitle: quiz?.title || "Unknown Quiz",
            quizType: quiz?.type || "unknown",
          };
        })
      );

      // Enrich lesson progress with lesson titles
      const lessonProgressWithTitles = await Promise.all(
        lessonProgressData.map(async (lp) => {
          const lesson = await storage.getLessonById(lp.lessonId);
          return {
            ...lp,
            lessonTitle: lesson?.title || lp.lessonId.substring(0, 8),
          };
        })
      );

      res.json({
        student: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          englishLevel: user.placementLevel || user.englishLevel,
          createdAt: user.createdAt,
          subscriptionTier: user.subscriptionTier,
        },
        stats: userStatsData,
        courseProgress,
        quizAttempts: quizDetails,
        lessonProgress: lessonProgressWithTitles,
      });
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ error: "Failed to fetch student progress" });
    }
  });

  app.get("/api/admin/students/export", requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      let students;
      
      if (status === 'deleted') {
        students = await storage.getDeletedStudents();
      } else if (status && ['active', 'hold', 'inactive'].includes(status as string)) {
        students = await storage.getStudentsByStatus(status as string);
      } else {
        students = await storage.getAllStudents();
      }
      
      const headers = [
        'ID',
        'Email',
        'First Name',
        'Last Name',
        'Status',
        'Subscription Tier',
        'Is Locked',
        'Added Manually',
        'Onboarding Completed',
        'English Level',
        'Placement Level',
        'Stripe Customer ID',
        'Created At',
        'Updated At',
        'Deleted At'
      ];
      
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const rows = students.map(student => [
        escapeCSV(student.id),
        escapeCSV(student.email),
        escapeCSV(student.firstName),
        escapeCSV(student.lastName),
        escapeCSV(student.status),
        escapeCSV(student.subscriptionTier),
        escapeCSV(student.isLocked ? 'Yes' : 'No'),
        escapeCSV(student.addedManually ? 'Yes' : 'No'),
        escapeCSV(student.onboardingCompleted ? 'Yes' : 'No'),
        escapeCSV(student.englishLevel),
        escapeCSV(student.placementLevel),
        escapeCSV(student.stripeCustomerId),
        escapeCSV(student.createdAt ? new Date(student.createdAt).toISOString() : ''),
        escapeCSV(student.updatedAt ? new Date(student.updatedAt).toISOString() : ''),
        escapeCSV(student.deletedAt ? new Date(student.deletedAt).toISOString() : '')
      ].join(','));
      
      const csv = [headers.join(','), ...rows].join('\n');
      const statusLabel = status || 'todos';
      const timestamp = new Date().toISOString().split('T')[0];
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="students_${statusLabel}_${timestamp}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting students:", error);
      res.status(500).json({ error: "Failed to export students" });
    }
  });

  // Admin: Add student manually (superadmin only)
  const addManualStudentSchema = z.object({
    email: z.string().email("Invalid email"),
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().min(1, "Last name required"),
    birthDate: z.string().min(1, "Birth date required"),
    plan: z.enum(["flex", "standard", "premium"]),
    skipOnboarding: z.boolean().default(false),
  });

  app.post("/api/admin/students/manual", requireAdmin, async (req, res) => {
    try {
      const validation = addManualStudentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
      }

      const { email, firstName, lastName, birthDate, plan, skipOnboarding } = validation.data;

      // Check if email already exists
      const allUsers = await storage.getAllUsers();
      const existingUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: "Ya existe un usuario con este correo electrónico" });
      }

      // Verify age (16+)
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 16) {
        return res.status(400).json({ error: "El estudiante debe tener al menos 16 años" });
      }

      // Generate invitation token
      const crypto = await import('crypto');
      const invitationToken = crypto.randomBytes(32).toString('hex');

      // Plan name mapping
      const planNames: Record<string, string> = {
        flex: "Flex - $14.99/mes",
        standard: "Estándar - $49.99/mes",
        premium: "Premium - $99.99/mes",
      };

      // Create user in database
      const userId = crypto.randomUUID();
      const newUser = await storage.createManualStudent({
        id: userId,
        email,
        firstName,
        lastName,
        birthDate: birth,
        addedManually: true,
        skipOnboarding,
        assignedPlan: plan,
        invitationToken,
        invitationSentAt: new Date(),
        invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        onboardingCompleted: skipOnboarding,
        subscriptionTier: plan, // Set subscription tier based on assigned plan
        status: 'active',
      });

      // Try to create Stripe customer and invoice
      try {
        const stripe = await getUncachableStripeClient();
        const customer = await stripe.customers.create({
          email,
          name: `${firstName} ${lastName}`,
          metadata: { 
            userId: newUser.id,
            addedManually: 'true',
            plan,
          },
        });

        // Update user with Stripe customer ID
        await storage.updateUser(newUser.id, { stripeCustomerId: customer.id });

        // Create invoice for the plan
        const priceMap: Record<string, number> = {
          flex: 1499,
          standard: 4999,
          premium: 9999,
        };

        await stripe.invoiceItems.create({
          customer: customer.id,
          amount: priceMap[plan],
          currency: 'usd',
          description: `Suscripción CogniBoost - ${planNames[plan]}`,
        });

        const invoice = await stripe.invoices.create({
          customer: customer.id,
          collection_method: 'send_invoice',
          days_until_due: 7,
        });

        await stripe.invoices.sendInvoice(invoice.id);
      } catch (stripeError) {
        console.error("Stripe error (non-blocking):", stripeError);
        // Continue even if Stripe fails - user is created
      }

      // Send invitation email
      try {
        const { sendEmail } = await import("./resendClient");
        const baseUrl = process.env.APP_URL || 'https://cogniboost.co';
        const activationUrl = `${baseUrl}/activate?token=${invitationToken}`;

        await sendEmail(email, 'student_invitation', {
          firstName,
          planName: planNames[plan],
          activationUrl,
        });
      } catch (emailError) {
        console.error("Email error (non-blocking):", emailError);
        // Continue even if email fails - user is created
      }

      res.json({ 
        success: true, 
        user: newUser,
        message: "Estudiante agregado exitosamente. Se ha enviado una invitación por correo."
      });
    } catch (error) {
      console.error("Error adding manual student:", error);
      res.status(500).json({ error: "Failed to add student" });
    }
  });

  // ============== ADMIN ONBOARDING & EMAIL ROUTES ==============

  // Admin: Get onboarding stats
  app.get("/api/admin/onboarding/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getOnboardingStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching onboarding stats:", error);
      res.status(500).json({ error: "Failed to fetch onboarding stats" });
    }
  });

  // Admin: Send onboarding reminder emails to users who haven't completed onboarding
  app.post("/api/admin/onboarding/send-reminders", requireAdmin, async (req, res) => {
    try {
      const result = await storage.sendOnboardingReminders();
      res.json(result);
    } catch (error) {
      console.error("Error sending onboarding reminders:", error);
      res.status(500).json({ error: "Failed to send onboarding reminders" });
    }
  });

  // Admin: Send custom email to a specific student with validation
  const validEmailTemplates = ['welcome', 'onboarding_reminder', 'course_enrolled', 'lesson_completed', 'subscription_activated'] as const;
  const sendEmailSchema = z.object({
    template: z.enum(validEmailTemplates).default('welcome'),
  });

  app.post("/api/admin/students/:id/send-email", requireAdmin, async (req, res) => {
    try {
      const validation = sendEmailSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid template", details: validation.error.errors });
      }
      
      const { template } = validation.data;
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Student not found" });
      }
      if (!user.email) {
        return res.status(400).json({ error: "Student has no email address" });
      }
      
      // Import sendEmail dynamically to avoid circular dependencies
      const { sendEmail } = await import("./resendClient");
      
      const result = await sendEmail(user.email, template as EmailTemplate, {
        firstName: user.firstName || 'estudiante',
        onboardingUrl: `${process.env.APP_URL || 'https://cogniboost.co'}/onboarding`,
        dashboardUrl: `${process.env.APP_URL || 'https://cogniboost.co'}/dashboard`,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error sending email to student:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // ============== LEADS ROUTES ==============
  
  // Create a new lead (captures contact info before quiz)
  app.post("/api/leads", async (req, res) => {
    try {
      const leadSchema = z.object({
        email: z.string().email("Email inválido"),
        firstName: z.string().min(1, "Nombre requerido"),
        lastName: z.string().optional(),
        phone: z.string().optional(),
      });
      
      const validation = leadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
      
      const { email, firstName, lastName, phone } = validation.data;
      
      // Create the lead
      const lead = await storage.createLead({
        email: email.toLowerCase(),
        firstName,
        lastName: lastName || null,
        phone: phone || null,
      });
      
      res.json({ 
        leadId: lead.id,
        message: "Lead creado exitosamente" 
      });
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Error al crear lead" });
    }
  });

  // ============== ADMIN LEADS ROUTES ==============

  // Admin: Get all leads
  app.get("/api/admin/leads", requireAdmin, async (req, res) => {
    try {
      const { status } = req.query;
      let leadsList;
      if (status && typeof status === 'string') {
        leadsList = await storage.getLeadsByStatus(status);
      } else {
        leadsList = await storage.getAllLeads();
      }
      res.json(leadsList);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Admin: Get lead analytics
  app.get("/api/admin/leads/analytics", requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getLeadAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching lead analytics:", error);
      res.status(500).json({ error: "Failed to fetch lead analytics" });
    }
  });

  // Admin: Export all leads as CSV
  app.get("/api/admin/leads/export", requireAdmin, async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      
      const headers = [
        'ID',
        'Email',
        'First Name',
        'Last Name',
        'Phone',
        'Placement Level',
        'Placement Confidence',
        'Quiz Attempt ID',
        'Status',
        'Score',
        'Source',
        'Result Email Sent',
        'Day 1 Email Sent',
        'Day 3 Email Sent',
        'Day 7 Email Sent',
        'Converted to User',
        'Quiz Completed At',
        'Created At',
        'Updated At'
      ];
      
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const rows = leads.map(lead => [
        escapeCSV(lead.id),
        escapeCSV(lead.email),
        escapeCSV(lead.firstName),
        escapeCSV(lead.lastName),
        escapeCSV(lead.phone),
        escapeCSV(lead.placementLevel),
        escapeCSV(lead.placementConfidence),
        escapeCSV(lead.quizAttemptId),
        escapeCSV(lead.status),
        escapeCSV(lead.score),
        escapeCSV(lead.source),
        escapeCSV(lead.resultEmailSent ? 'Yes' : 'No'),
        escapeCSV(lead.day1EmailSent ? 'Yes' : 'No'),
        escapeCSV(lead.day3EmailSent ? 'Yes' : 'No'),
        escapeCSV(lead.day7EmailSent ? 'Yes' : 'No'),
        escapeCSV(lead.convertedToUser ? 'Yes' : 'No'),
        escapeCSV(lead.quizCompletedAt ? new Date(lead.quizCompletedAt).toISOString() : ''),
        escapeCSV(lead.createdAt ? new Date(lead.createdAt).toISOString() : ''),
        escapeCSV(lead.updatedAt ? new Date(lead.updatedAt).toISOString() : '')
      ].join(','));
      
      const csv = [headers.join(','), ...rows].join('\n');
      const timestamp = new Date().toISOString().split('T')[0];
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="leads_export_${timestamp}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting leads:", error);
      res.status(500).json({ error: "Failed to export leads" });
    }
  });

  // Admin: Run automated email sequences (manually trigger or for cron job)
  app.post("/api/admin/leads/run-sequences", requireAdmin, async (req, res) => {
    try {
      const { sendEmail } = await import("./resendClient");
      const results = { day1: 0, day3: 0, day7: 0, errors: [] as string[] };

      // Day 1: Course recommendations
      const day1Leads = await storage.getLeadsPendingDay1Email();
      for (const lead of day1Leads) {
        try {
          await sendEmail(lead.email, 'lead_day1_followup', {
            firstName: lead.firstName,
            level: lead.placementLevel || 'B1',
            email: lead.email,
          });
          await storage.markLeadEmailSent(lead.id, 'day1');
          results.day1++;
        } catch (e) {
          results.errors.push(`Day1 error for ${lead.email}: ${e}`);
        }
      }

      // Day 3: Lab invite
      const day3Leads = await storage.getLeadsPendingDay3Email();
      for (const lead of day3Leads) {
        try {
          await sendEmail(lead.email, 'lead_day3_lab_invite', {
            firstName: lead.firstName,
            level: lead.placementLevel || 'B1',
            email: lead.email,
          });
          await storage.markLeadEmailSent(lead.id, 'day3');
          results.day3++;
        } catch (e) {
          results.errors.push(`Day3 error for ${lead.email}: ${e}`);
        }
      }

      // Day 7: Special offer
      const day7Leads = await storage.getLeadsPendingDay7Email();
      for (const lead of day7Leads) {
        try {
          await sendEmail(lead.email, 'lead_day7_offer', {
            firstName: lead.firstName,
            level: lead.placementLevel || 'B1',
            email: lead.email,
          });
          await storage.markLeadEmailSent(lead.id, 'day7');
          results.day7++;
        } catch (e) {
          results.errors.push(`Day7 error for ${lead.email}: ${e}`);
        }
      }

      res.json({
        success: true,
        message: `Email sequences enviadas: ${results.day1} día 1, ${results.day3} día 3, ${results.day7} día 7`,
        details: results
      });
    } catch (error) {
      console.error("Error running email sequences:", error);
      res.status(500).json({ error: "Failed to run email sequences" });
    }
  });

  // Admin: Run ALL automated email sequences (user onboarding + lead nurture)
  app.post("/api/admin/email-sequences/run", requireAdmin, async (req, res) => {
    try {
      const { runAllEmailSequences } = await import("./emailSequences");
      const result = await runAllEmailSequences();
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error running all email sequences:", error);
      res.status(500).json({ error: "Failed to run email sequences" });
    }
  });

  // Admin: Update lead status
  app.patch("/api/admin/leads/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !['new', 'engaged', 'nurture', 'qualified', 'converted', 'inactive'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const updated = await storage.updateLead(req.params.id, { status });
      if (!updated) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating lead status:", error);
      res.status(500).json({ error: "Failed to update lead status" });
    }
  });

  // Admin: Send manual email to lead
  app.post("/api/admin/leads/:id/send-email", requireAdmin, async (req, res) => {
    try {
      const { template } = req.body;
      const validTemplates = ['lead_day1_followup', 'lead_day3_lab_invite', 'lead_day7_offer'];
      if (!template || !validTemplates.includes(template)) {
        return res.status(400).json({ error: "Invalid template" });
      }
      
      const lead = await storage.getLeadById(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      const { sendEmail } = await import("./resendClient");
      await sendEmail(lead.email, template as any, {
        firstName: lead.firstName,
        level: lead.placementLevel || 'B1',
        email: lead.email,
      });
      
      // Mark appropriate email as sent
      if (template === 'lead_day1_followup') {
        await storage.markLeadEmailSent(lead.id, 'day1');
      } else if (template === 'lead_day3_lab_invite') {
        await storage.markLeadEmailSent(lead.id, 'day3');
      } else if (template === 'lead_day7_offer') {
        await storage.markLeadEmailSent(lead.id, 'day7');
      }
      
      res.json({ success: true, message: "Email enviado" });
    } catch (error) {
      console.error("Error sending email to lead:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // ============== PLACEMENT QUIZ ROUTES ==============

  const MAX_PLACEMENT_ATTEMPTS_PER_DAY = 3;

  // Helper to hash IP for rate limiting
  function hashIP(ip: string): string {
    return createHash('sha256').update(ip + 'cogniboost-salt').digest('hex').slice(0, 32);
  }

  // Start a new placement quiz (supports leads and authenticated users)
  app.post("/api/placement/start", async (req, res) => {
    try {
      // Get user ID if authenticated, otherwise use leadId
      const userId = req.isAuthenticated() ? (req.user as any)?.id : null;
      const { leadId } = req.body;
      
      // Require either authenticated user or leadId for quiz
      if (!userId && !leadId) {
        return res.status(400).json({ error: "Se requiere completar el formulario de contacto primero" });
      }
      
      // Validate leadId exists if provided
      if (leadId && !userId) {
        const lead = await storage.getLeadById(leadId);
        if (!lead) {
          return res.status(400).json({ error: "Lead no encontrado. Por favor, completa el formulario de contacto nuevamente." });
        }
      }
      
      // Get IP for rate limiting
      const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown';
      const ipHash = hashIP(clientIP);
      
      // Check rate limiting - max 3 attempts per day based on leadId or userId
      let attemptsToday: number;
      if (userId) {
        attemptsToday = await storage.getPlacementQuizAttemptsToday(userId);
      } else {
        // For leads, use the leadId as anonymousId for rate limiting
        attemptsToday = await storage.getPlacementQuizAttemptsTodayByAnonymousId(leadId, ipHash);
      }
      
      if (attemptsToday >= MAX_PLACEMENT_ATTEMPTS_PER_DAY) {
        return res.status(429).json({ 
          error: "Límite de intentos alcanzado", 
          message: "Has alcanzado el límite de 3 intentos por día. Intenta mañana."
        });
      }
      
      // Select static questions for this quiz (20 questions total)
      const TOTAL_QUESTIONS = 20;
      const selectedQuestions = selectQuizQuestions(TOTAL_QUESTIONS);
      const questionIds = selectedQuestions.map(q => q.id);
      
      // Create new quiz attempt - use leadId as anonymousId to link them
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      const attempt = await storage.createPlacementQuizAttempt({
        userId: userId || undefined,
        anonymousId: userId ? undefined : leadId, // Use leadId as anonymousId
        status: "in_progress",
        currentStep: "1",
        currentDifficulty: "B1",
        answers: [],
        totalQuestions: String(TOTAL_QUESTIONS),
        correctAnswers: "0",
        ipHash,
        expiresAt,
        questionIds, // Store selected question IDs
      });
      
      // Get the first static question
      const firstQuestion = selectedQuestions[0];
      
      res.json({
        attemptId: attempt.id,
        leadId,
        currentStep: 1,
        totalQuestions: TOTAL_QUESTIONS,
        question: {
          text: firstQuestion.text,
          options: firstQuestion.options,
          type: "multiple_choice",
          difficulty: firstQuestion.difficulty,
        },
        expiresAt: attempt.expiresAt,
      });
    } catch (error) {
      console.error("Error starting placement quiz:", error);
      res.status(500).json({ error: "Failed to start placement quiz" });
    }
  });

  // Submit an answer and get next question (NO AUTH REQUIRED - supports anonymous users)
  app.post("/api/placement/answer", async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any)?.id : null;
    const { attemptId, answer, anonymousId } = req.body;
    
    if (!attemptId || answer === undefined) {
      return res.status(400).json({ error: "Missing attemptId or answer" });
    }
    
    try {
      const attempt = await storage.getPlacementQuizAttemptById(attemptId);
      if (!attempt) {
        return res.status(404).json({ error: "Quiz attempt not found" });
      }
      
      // Verify ownership - either by userId or anonymousId
      const isOwner = (userId && attempt.userId === userId) || 
                      (anonymousId && attempt.anonymousId === anonymousId);
      if (!isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      if (attempt.status !== "in_progress") {
        return res.status(400).json({ error: "Quiz already completed or expired" });
      }
      if (attempt.expiresAt && new Date(attempt.expiresAt) < new Date()) {
        await storage.updatePlacementQuizAttempt(attemptId, { status: "expired" });
        return res.status(400).json({ error: "Quiz expired" });
      }
      
      const currentStep = parseInt(attempt.currentStep);
      const totalQuestions = parseInt(attempt.totalQuestions);
      const currentAnswers = (attempt.answers as any[]) || [];
      const questionIds = (attempt.questionIds as string[]) || [];
      
      // Get the current question from static bank
      const currentQuestionId = questionIds[currentStep - 1];
      const currentQuestion = placementQuestions.find(q => q.id === currentQuestionId);
      
      if (!currentQuestion) {
        return res.status(500).json({ error: "Question not found" });
      }
      
      // Simple correct answer check (no AI needed)
      const isCorrect = answer === currentQuestion.correctAnswer;
      
      // Update answers array
      const newAnswers = [...currentAnswers, {
        step: currentStep,
        questionId: currentQuestionId,
        answer,
        isCorrect,
        difficulty: currentQuestion.difficulty,
      }];
      
      const correctCount = newAnswers.filter(a => a.isCorrect).length;
      
      // Check if quiz is complete
      if (currentStep >= totalQuestions) {
        // Calculate final level based on correct answers
        const result = calculatePlacementLevel(newAnswers);
        const { level, confidence } = result;
        
        await storage.completePlacementQuiz(attemptId, level, confidence);
        
        // Level and confidence descriptions for email
        const levelDescriptions: Record<string, { name: string; explanation: string }> = {
          A1: { name: "Principiante", explanation: "Puedes entender y usar expresiones básicas del día a día y frases sencillas." },
          A2: { name: "Elemental", explanation: "Puedes comunicarte en tareas simples y rutinarias que requieren intercambio de información." },
          B1: { name: "Intermedio", explanation: "Puedes desenvolverte en la mayoría de situaciones de viaje y expresar experiencias y opiniones." },
          B2: { name: "Intermedio Alto", explanation: "Puedes interactuar con fluidez y espontaneidad con hablantes nativos sin esfuerzo." },
          C1: { name: "Avanzado", explanation: "Puedes expresarte de forma fluida y espontánea para fines sociales, académicos y profesionales." },
          C2: { name: "Proficiente", explanation: "Puedes entender prácticamente todo y expresarte con precisión en situaciones complejas." },
        };
        const confidenceLabels: Record<string, string> = {
          high: "Alta",
          medium: "Media", 
          low: "Baja",
        };
        
        // Send email with placement quiz results
        // For authenticated users, send to their account email
        // For leads (anonymousId is the leadId), send to the lead's email
        if (userId) {
          try {
            const user = await storage.getUser(userId);
            if (user?.email) {
              await sendEmail(user.email, "placement_quiz_result", {
                firstName: user.firstName || "estudiante",
                level,
                levelDescription: levelDescriptions[level]?.name || "Intermedio",
                levelExplanation: levelDescriptions[level]?.explanation || "",
                correctAnswers: String(correctCount),
                totalQuestions: String(totalQuestions),
                confidence: confidenceLabels[confidence] || "Media",
                onboardingUrl: "https://cogniboost.co/onboarding",
              });
              console.log(`Placement quiz result email sent to ${user.email}`);
            }
          } catch (emailError) {
            console.error("Failed to send placement quiz result email:", emailError);
          }
        } else if (attempt.anonymousId) {
          // anonymousId is the leadId - send email to lead
          try {
            const lead = await storage.getLeadById(attempt.anonymousId);
            if (lead?.email) {
              // Update lead with quiz results
              await storage.updateLeadWithQuizResult(lead.id, level, confidence, attemptId);
              
              await sendEmail(lead.email, "placement_quiz_result", {
                firstName: lead.firstName || "estudiante",
                level,
                levelDescription: levelDescriptions[level]?.name || "Intermedio",
                levelExplanation: levelDescriptions[level]?.explanation || "",
                correctAnswers: String(correctCount),
                totalQuestions: String(totalQuestions),
                confidence: confidenceLabels[confidence] || "Media",
                onboardingUrl: "https://cogniboost.co/onboarding",
              });
              
              // Mark email as sent
              await storage.updateLead(lead.id, { resultEmailSent: true });
              console.log(`Placement quiz result email sent to lead ${lead.email}`);
            }
          } catch (emailError) {
            console.error("Failed to send placement quiz result email to lead:", emailError);
          }
        }
        
        return res.json({
          completed: true,
          computedLevel: level,
          confidence,
          correctAnswers: correctCount,
          totalQuestions,
        });
      }
      
      // Get next question from static bank
      const nextQuestionId = questionIds[currentStep]; // currentStep is 0-indexed for next
      const nextQuestion = placementQuestions.find(q => q.id === nextQuestionId);
      
      if (!nextQuestion) {
        return res.status(500).json({ error: "Next question not found" });
      }
      
      // Update attempt
      await storage.updatePlacementQuizAttempt(attemptId, {
        currentStep: String(currentStep + 1),
        currentDifficulty: nextQuestion.difficulty,
        answers: newAnswers,
        correctAnswers: String(correctCount),
      });
      
      res.json({
        completed: false,
        currentStep: currentStep + 1,
        totalQuestions,
        question: {
          text: nextQuestion.text,
          options: nextQuestion.options,
          type: "multiple_choice",
          difficulty: nextQuestion.difficulty,
        },
      });
    } catch (error) {
      console.error("Error processing placement answer:", error);
      res.status(500).json({ error: "Failed to process answer" });
    }
  });

  // Get user's placement quiz history
  app.get("/api/placement/history", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const userId = (req.user as any)?.id;
      const attempts = await storage.getPlacementQuizAttemptsByUserId(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching placement history:", error);
      res.status(500).json({ error: "Failed to fetch placement history" });
    }
  });

  // Get current attempt status (for resuming) - supports anonymous users via query param
  app.get("/api/placement/current", async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any)?.id : null;
    const anonymousId = req.query.anonymousId as string | undefined;
    
    if (!userId && !anonymousId) {
      return res.json({ hasActiveQuiz: false });
    }
    
    try {
      let currentAttempt;
      if (userId) {
        const attempts = await storage.getPlacementQuizAttemptsByUserId(userId);
        currentAttempt = attempts.find(a => a.status === "in_progress");
      } else if (anonymousId) {
        currentAttempt = await storage.getActiveQuizByAnonymousId(anonymousId);
      }
      
      if (!currentAttempt) {
        return res.json({ hasActiveQuiz: false });
      }
      
      // Check if expired
      if (currentAttempt.expiresAt && new Date(currentAttempt.expiresAt) < new Date()) {
        await storage.updatePlacementQuizAttempt(currentAttempt.id, { status: "expired" });
        return res.json({ hasActiveQuiz: false });
      }
      
      const currentStep = parseInt(currentAttempt.currentStep);
      const questionIds = (currentAttempt.questionIds as string[]) || [];
      const currentQuestionId = questionIds[currentStep - 1];
      const currentQuestion = placementQuestions.find(q => q.id === currentQuestionId);
      
      if (!currentQuestion) {
        return res.json({ hasActiveQuiz: false });
      }
      
      res.json({
        hasActiveQuiz: true,
        attemptId: currentAttempt.id,
        currentStep,
        totalQuestions: parseInt(currentAttempt.totalQuestions),
        question: {
          text: currentQuestion.text,
          options: currentQuestion.options,
          type: "multiple_choice",
          difficulty: currentQuestion.difficulty,
        },
        expiresAt: currentAttempt.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching current placement quiz:", error);
      res.status(500).json({ error: "Failed to fetch current quiz" });
    }
  });

  // Claim anonymous quiz attempt after user registers/logs in
  app.post("/api/placement/claim", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const userId = (req.user as any)?.id;
    const { anonymousId } = req.body;
    
    if (!anonymousId) {
      return res.status(400).json({ error: "Missing anonymousId" });
    }
    
    try {
      // Check if user already has placement results
      const user = await storage.getUser(userId);
      if (user?.placementLevel) {
        return res.json({ 
          claimed: false, 
          message: "User already has placement results",
          existingLevel: user.placementLevel 
        });
      }
      
      // Try to claim the anonymous attempt
      const claimed = await storage.claimAnonymousQuizAttempt(anonymousId, userId);
      
      if (!claimed) {
        return res.json({ claimed: false, message: "No completed quiz found for this anonymous ID" });
      }
      
      // Send email with placement quiz results now that user is registered
      if (user?.email && claimed.computedLevel && claimed.confidence) {
        try {
          const levelDescriptions: Record<string, { name: string; explanation: string }> = {
            A1: { name: "Principiante", explanation: "Puedes entender y usar expresiones básicas del día a día y frases sencillas." },
            A2: { name: "Elemental", explanation: "Puedes comunicarte en tareas simples y rutinarias que requieren intercambio de información." },
            B1: { name: "Intermedio", explanation: "Puedes desenvolverte en la mayoría de situaciones de viaje y expresar experiencias y opiniones." },
            B2: { name: "Intermedio Alto", explanation: "Puedes interactuar con fluidez y espontaneidad con hablantes nativos sin esfuerzo." },
            C1: { name: "Avanzado", explanation: "Puedes expresarte de forma fluida y espontánea para fines sociales, académicos y profesionales." },
            C2: { name: "Proficiente", explanation: "Puedes entender prácticamente todo y expresarte con precisión en situaciones complejas." },
          };
          const confidenceLabels: Record<string, string> = {
            high: "Alta",
            medium: "Media", 
            low: "Baja",
          };
          
          await sendEmail(user.email, "placement_quiz_result", {
            firstName: user.firstName || "estudiante",
            level: claimed.computedLevel,
            levelDescription: levelDescriptions[claimed.computedLevel]?.name || "Intermedio",
            levelExplanation: levelDescriptions[claimed.computedLevel]?.explanation || "",
            correctAnswers: claimed.correctAnswers,
            totalQuestions: claimed.totalQuestions,
            confidence: confidenceLabels[claimed.confidence] || "Media",
            onboardingUrl: "https://cogniboost.co/onboarding",
          });
          console.log(`Placement quiz result email sent to ${user.email} after claim`);
        } catch (emailError) {
          console.error("Failed to send placement quiz result email after claim:", emailError);
        }
      }
      
      res.json({ 
        claimed: true, 
        computedLevel: claimed.computedLevel,
        confidence: claimed.confidence 
      });
    } catch (error) {
      console.error("Error claiming placement quiz:", error);
      res.status(500).json({ error: "Failed to claim quiz results" });
    }
  });

  // Get anonymous placement quiz result (for showing results before signup)
  app.get("/api/placement/result", async (req, res) => {
    const anonymousId = req.query.anonymousId as string | undefined;
    
    if (!anonymousId) {
      return res.status(400).json({ error: "Missing anonymousId" });
    }
    
    try {
      const attempts = await storage.getPlacementQuizAttemptsByAnonymousId(anonymousId);
      const completedAttempt = attempts.find(a => a.status === "completed");
      
      if (!completedAttempt) {
        return res.json({ hasResult: false });
      }
      
      res.json({
        hasResult: true,
        computedLevel: completedAttempt.computedLevel,
        confidence: completedAttempt.confidence,
        correctAnswers: parseInt(completedAttempt.correctAnswers),
        totalQuestions: parseInt(completedAttempt.totalQuestions),
      });
    } catch (error) {
      console.error("Error fetching placement result:", error);
      res.status(500).json({ error: "Failed to fetch placement result" });
    }
  });

  // Admin: Get detailed engagement analytics
  app.get("/api/admin/analytics/engagement", requireAdmin, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const daysNumber = parseInt(days as string);

      // Get date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNumber);

      // Get all users
      const allUsers = await storage.getAllUsers();
      const studentUsers = allUsers.filter(u => !u.isAdmin);

      // Active users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeUsers7Days = studentUsers.filter(u =>
        u.lastActiveAt && new Date(u.lastActiveAt) > sevenDaysAgo
      ).length;

      // Active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers30Days = studentUsers.filter(u =>
        u.lastActiveAt && new Date(u.lastActiveAt) > thirtyDaysAgo
      ).length;

      // Get all enrollments
      const allEnrollments = await storage.getAllEnrollments();

      // Enrollments over time (grouped by date)
      const enrollmentsByDate: Record<string, number> = {};
      allEnrollments.forEach(enrollment => {
        const date = new Date(enrollment.enrolledAt!).toISOString().split('T')[0];
        enrollmentsByDate[date] = (enrollmentsByDate[date] || 0) + 1;
      });

      // Convert to array format for charting
      const enrollmentTrend = Object.entries(enrollmentsByDate)
        .filter(([date]) => new Date(date) >= startDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, enrollments: count }));

      // Course completion rates
      const allCourses = await storage.getAllCourses();
      const courseCompletionRates = [];

      for (const course of allCourses) {
        const courseEnrollments = allEnrollments.filter(e => e.courseId === course.id);
        if (courseEnrollments.length > 0) {
          // Get lessons for this course
          const lessons = await storage.getLessonsByCourseId(course.id);
          const totalLessons = lessons.length;

          if (totalLessons > 0) {
            let totalCompleted = 0;

            for (const enrollment of courseEnrollments) {
              // Get progress for this enrollment
              const progress = await storage.getLessonProgressByUserId(enrollment.userId);
              const completedLessons = progress.filter((p: any) => p.isCompleted).length;
              if (completedLessons === totalLessons) {
                totalCompleted++;
              }
            }

            const completionRate = (totalCompleted / courseEnrollments.length) * 100;
            courseCompletionRates.push({
              courseTitle: course.title,
              enrollments: courseEnrollments.length,
              completions: totalCompleted,
              completionRate: Math.round(completionRate),
            });
          }
        }
      }

      // Revenue metrics (already exists but including for completeness)
      const allPayments = await storage.getPayments();
      const completedPayments = allPayments.filter((p: any) => p.status === "completed");
      const totalRevenue = completedPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

      // Calculate MRR (Monthly Recurring Revenue from active subscriptions)
      const PLAN_PRICES: Record<string, number> = {
        free: 0,
        flex: 14.99,
        standard: 49.99,
        premium: 99.99,
      };

      const allSubscriptions = await storage.getAllSubscriptions();
      const activeSubscriptions = allSubscriptions.filter(s => !s.cancelAtPeriodEnd);
      const mrr = activeSubscriptions.reduce((sum, sub) => {
        return sum + (PLAN_PRICES[sub.tier] || 0);
      }, 0);

      // ARPU (Average Revenue Per User)
      const arpu = studentUsers.length > 0 ? totalRevenue / studentUsers.length : 0;

      res.json({
        overview: {
          totalStudents: studentUsers.length,
          activeUsers7Days,
          activeUsers30Days,
          dau: activeUsers7Days, // Daily Active Users approximation
          wau: activeUsers30Days, // Weekly Active Users approximation
        },
        enrollmentTrend,
        coursePerformance: courseCompletionRates.sort((a, b) => b.enrollments - a.enrollments).slice(0, 10), // Top 10 courses
        revenue: {
          totalRevenue: totalRevenue.toFixed(2),
          mrr: mrr.toFixed(2),
          arpu: arpu.toFixed(2),
          activeSubscriptions: activeSubscriptions.length,
        },
      });
    } catch (error) {
      console.error("Error fetching engagement analytics:", error);
      res.status(500).json({ error: "Failed to fetch engagement analytics" });
    }
  });

  // ============== SUBMISSION API (Phase 1, Master Plan v2.0 §4) ==============
  //
  // AI-graded writing submissions. Students POST their work, the API persists
  // it immediately with status='pending_ai' and returns the row, then grading
  // runs in the background (setImmediate) using the Anthropic Claude grader.
  // Frontend polls GET /api/submissions/:id until status flips to 'ai_graded'.
  //
  // Teacher-review-first per Coral's Q6 lock — until override rate drops
  // <10% for 2 consecutive weeks we keep teachers in the loop before
  // students see finalized grades.

  app.post("/api/submissions", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { lessonId, assignmentType, content, writingPrompt, assignment } = req.body ?? {};

      if (typeof content !== "string" || content.trim().length < 10) {
        return res.status(400).json({ error: "content must be a string of at least 10 characters" });
      }
      const validTypes = ["writing", "reading_quiz", "listening_quiz", "speaking_recording", "project"];
      if (!validTypes.includes(assignmentType)) {
        return res.status(400).json({ error: `assignmentType must be one of: ${validTypes.join(", ")}` });
      }
      // v1 = writing only; other types come in Phase 2.
      if (assignmentType !== "writing") {
        return res.status(501).json({ error: `assignmentType '${assignmentType}' grader not yet implemented — Phase 2` });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Determine target level for grading. Priority: currentLevel (set by
      // self-paced curriculum) -> englishLevel (onboarding) -> placementLevel
      // (quiz result) -> default B1.
      const targetLevel =
        ((user as any).currentLevel ||
          user.englishLevel ||
          user.placementLevel ||
          "B1") as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [submission] = await db
        .insert(submissions)
        .values({
          studentId: userId,
          lessonId: lessonId ?? null,
          assignmentType: assignmentType as any,
          content,
          status: "pending_ai",
        })
        .returning();

      // Return 201 immediately so the client doesn't wait the ~60-120s for
      // adaptive grading. Frontend polls GET /api/submissions/:id.
      res.status(201).json(submission);

      // Background grading. setImmediate keeps it in this request's event
      // loop tick but doesn't block the response. No queue/Redis needed for
      // v1 per the revised plan — synchronous-in-process is fine until we
      // hit >100 concurrent submissions.
      setImmediate(async () => {
        try {
          const { gradeWriting } = await import("./grading/writingPrompt");
          const { grade } = await gradeWriting({
            targetLevel,
            currentWeek: (user as any).currentWeek ?? undefined,
            assignment:
              typeof assignment === "string" && assignment.length > 0
                ? assignment
                : `${targetLevel} writing assignment`,
            writingPrompt:
              typeof writingPrompt === "string" && writingPrompt.length > 0
                ? writingPrompt
                : "Write about the given topic in your own words.",
            studentText: content,
          });

          await db
            .update(submissions)
            .set({
              aiGrade: grade as any,
              aiScore: String(grade.overall_score),
              finalScore: String(grade.overall_score),
              status: "ai_graded",
            })
            .where(eq(submissions.id, submission.id));

          console.log(`[grading] submission=${submission.id} graded score=${grade.overall_score}`);
        } catch (err: any) {
          console.error(`[grading] submission=${submission.id} failed:`, err);
          // Persist the error inside ai_grade so teachers can see what
          // happened. Status stays at pending_ai so a manual retry (or a
          // future cron retry job) can re-process the submission.
          await db
            .update(submissions)
            .set({
              aiGrade: { error: err?.message ?? "Unknown grading error" } as any,
            })
            .where(eq(submissions.id, submission.id))
            .catch((e) => console.error("[grading] also failed to persist error:", e));
        }
      });
    } catch (error) {
      console.error("Error creating submission:", error);
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  // Student's own submissions list (paginated by recency).
  app.get("/api/submissions/me", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(submissions)
        .where(eq(submissions.studentId, userId))
        .orderBy(desc(submissions.submittedAt))
        .limit(100);

      res.json(rows);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // ─── Progress Timeline (longitudinal CEFR progression) ─────────────────
  // Returns the student's writing + speaking submissions over time so the
  // dashboard can plot a real progress chart (replaces sample-data radar).
  // Each entry exposes: score, CEFR estimate, per-dimension scores, and
  // the final (teacher-reviewed if available, else AI) score.
  //
  // Query params:
  //   ?skill=writing | speaking | all   (default: all)
  //   ?limit=N                          (default: 50, max: 200)
  //
  // Optional :studentId in the URL allows admins/teachers to view another
  // student's trajectory; students can only view their own.
  const progressTimelineHandler = async (req: any, res: any) => {
    try {
      const callerId = (req.user as any)?.id;
      if (!callerId) return res.status(401).json({ error: "Unauthorized" });

      // If :studentId is in the path, this is the teacher-view variant.
      // Otherwise it's the self-view (defaults to caller).
      const targetStudentId = req.params.studentId || callerId;

      if (targetStudentId !== callerId) {
        const caller = await storage.getUser(callerId);
        if (!caller?.isAdmin) {
          return res.status(403).json({ error: "Forbidden — teacher access required" });
        }
      }

      // Validate skill filter
      const skillParam = (req.query.skill as string) || "all";
      const allowedSkills = ["writing", "speaking", "all"];
      if (!allowedSkills.includes(skillParam)) {
        return res.status(400).json({ error: `Invalid skill — must be one of ${allowedSkills.join(", ")}` });
      }

      // Validate limit
      const rawLimit = parseInt(req.query.limit as string, 10);
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq, and, or, asc, inArray } = await import("drizzle-orm");

      // Map UI-friendly skill → schema assignment_type values
      const assignmentTypes: string[] = [];
      if (skillParam === "writing" || skillParam === "all") {
        assignmentTypes.push("writing", "project");
      }
      if (skillParam === "speaking" || skillParam === "all") {
        assignmentTypes.push("speaking_recording");
      }

      const rows = await db
        .select({
          id: submissions.id,
          submittedAt: submissions.submittedAt,
          assignmentType: submissions.assignmentType,
          aiGrade: submissions.aiGrade,
          aiScore: submissions.aiScore,
          teacherScore: submissions.teacherScore,
          finalScore: submissions.finalScore,
          status: submissions.status,
          moduleId: submissions.moduleId,
          lessonId: submissions.lessonId,
        })
        .from(submissions)
        .where(and(
          eq(submissions.studentId, targetStudentId),
          inArray(submissions.assignmentType, assignmentTypes as any),
        ))
        .orderBy(asc(submissions.submittedAt))
        .limit(limit);

      // Project the rows into the timeline shape, extracting CEFR estimate
      // and dimensions out of the jsonb aiGrade blob. We're tolerant of
      // missing fields — early submissions might predate the v2 rubric.
      const timeline = rows
        .filter(r => r.aiGrade) // skip ungraded
        .map((r) => {
          const grade: any = r.aiGrade || {};
          // Writing uses estimated_cefr_for_this_writing; speaking uses
          // estimated_cefr_for_this_speaking. Fall back to level_assessment.
          const estimatedCefr =
            grade.estimated_cefr_for_this_writing ||
            grade.estimated_cefr_for_this_speaking ||
            grade.level_assessment ||
            null;

          const score =
            r.finalScore != null
              ? Number(r.finalScore)
              : r.teacherScore != null
              ? Number(r.teacherScore)
              : r.aiScore != null
              ? Number(r.aiScore)
              : grade.overall_score ?? null;

          // Normalize skill label for the frontend
          const skill =
            r.assignmentType === "speaking_recording"
              ? "speaking"
              : "writing"; // covers both "writing" and "project"

          return {
            submissionId: r.id,
            date: r.submittedAt,
            skill,
            assignmentType: r.assignmentType,
            score,
            estimatedCefr,
            dimensions: grade.dimensions || null,
            wordsPerMinute: grade.words_per_minute ?? null, // speaking only
            status: r.status,
            teacherReviewed: r.teacherScore != null,
            moduleId: r.moduleId,
            lessonId: r.lessonId,
          };
        });

      // Summary stats — give the frontend headline numbers at no extra cost.
      const summary = (() => {
        if (timeline.length === 0) {
          return {
            totalSubmissions: 0,
            firstSubmissionScore: null,
            latestSubmissionScore: null,
            scoreDelta: null,
            firstCefr: null,
            latestCefr: null,
            cefrMoved: false,
          };
        }
        const first = timeline[0];
        const latest = timeline[timeline.length - 1];
        const firstScore = first.score;
        const latestScore = latest.score;
        return {
          totalSubmissions: timeline.length,
          firstSubmissionScore: firstScore,
          latestSubmissionScore: latestScore,
          scoreDelta:
            firstScore != null && latestScore != null
              ? Math.round((latestScore - firstScore) * 10) / 10
              : null,
          firstCefr: first.estimatedCefr,
          latestCefr: latest.estimatedCefr,
          cefrMoved:
            !!first.estimatedCefr &&
            !!latest.estimatedCefr &&
            first.estimatedCefr !== latest.estimatedCefr,
        };
      })();

      res.json({ timeline, summary });
    } catch (error) {
      console.error("Error building progress timeline:", error);
      res.status(500).json({ error: "Failed to build progress timeline" });
    }
  };

  // Self-view — student sees their own trajectory
  app.get("/api/student/progress-timeline", progressTimelineHandler);
  // Teacher view — admin/teacher sees another student's trajectory
  app.get("/api/student/:studentId/progress-timeline", progressTimelineHandler);

  // ─── Action Plan (recurring improvement priorities) ────────────────────
  // Aggregates the `improvement_priorities` arrays from a student's graded
  // writing + speaking submissions. The grader emits exactly 3 actionable
  // priorities per submission; we cluster near-duplicates and surface the
  // most recurring focus areas as a personalised "Work Plan".
  //
  // Clustering is intentionally simple for Phase 1: normalise → token-set
  // Jaccard similarity ≥ 0.5 → merge. No new tables. Pure aggregation over
  // existing aiGrade jsonb data.
  //
  // Query params:
  //   ?limit=N     (submissions to scan, default 30, max 100)
  //   ?top=N       (clusters to return, default 5, max 10)
  //
  // Optional :studentId in path lets admins view another student's plan.
  const actionPlanHandler = async (req: any, res: any) => {
    try {
      const callerId = (req.user as any)?.id;
      if (!callerId) return res.status(401).json({ error: "Unauthorized" });

      const targetStudentId = req.params.studentId || callerId;
      if (targetStudentId !== callerId) {
        const caller = await storage.getUser(callerId);
        if (!caller?.isAdmin) {
          return res.status(403).json({ error: "Forbidden — teacher access required" });
        }
      }

      const rawLimit = parseInt(req.query.limit as string, 10);
      const submissionLimit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30;
      const rawTop = parseInt(req.query.top as string, 10);
      const topN = Number.isFinite(rawTop) ? Math.min(Math.max(rawTop, 1), 10) : 5;

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq, and, inArray, desc } = await import("drizzle-orm");

      const rows = await db
        .select({
          id: submissions.id,
          submittedAt: submissions.submittedAt,
          assignmentType: submissions.assignmentType,
          aiGrade: submissions.aiGrade,
        })
        .from(submissions)
        .where(and(
          eq(submissions.studentId, targetStudentId),
          inArray(submissions.assignmentType, ["writing", "project", "speaking_recording"] as any),
        ))
        .orderBy(desc(submissions.submittedAt))
        .limit(submissionLimit);

      type Occurrence = {
        text: string;
        submissionId: string;
        date: Date | null;
        source: "writing" | "speaking";
      };

      // 1. Flatten priorities out of every graded submission
      const occurrences: Occurrence[] = [];
      for (const r of rows) {
        const grade: any = r.aiGrade || {};
        const priorities: unknown = grade.improvement_priorities;
        if (!Array.isArray(priorities)) continue;
        const source: "writing" | "speaking" =
          r.assignmentType === "speaking_recording" ? "speaking" : "writing";
        for (const p of priorities) {
          if (typeof p === "string" && p.trim().length > 0) {
            occurrences.push({
              text: p.trim(),
              submissionId: r.id,
              date: r.submittedAt,
              source,
            });
          }
        }
      }

      // 2. Build a normalised token set per occurrence for Jaccard clustering
      const STOPWORDS = new Set([
        "the","a","an","of","to","in","on","at","for","with","and","or","but",
        "is","are","was","were","be","been","being","have","has","had","do",
        "does","did","will","would","should","could","may","might","this","that",
        "these","those","your","you","it","its","as","by","from","up","out",
        "into","than","then","more","most","some","such","no","not","only","own",
        "same","so","very","s","t","can","just","also","practice","try","use",
        "using","focus","work","working","make","sure","review","study","learn",
      ]);
      const tokenize = (text: string): Set<string> => {
        const cleaned = text.toLowerCase().replace(/[^a-záéíóúñü\s]/g, " ");
        const words = cleaned.split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w));
        return new Set(words);
      };
      const jaccard = (a: Set<string>, b: Set<string>): number => {
        if (a.size === 0 && b.size === 0) return 0;
        let inter = 0;
        for (const x of a) if (b.has(x)) inter++;
        const union = a.size + b.size - inter;
        return union === 0 ? 0 : inter / union;
      };

      // 3. Greedy clustering — each occurrence joins the first cluster whose
      //    centroid passes the similarity threshold; otherwise starts its own.
      type Cluster = {
        representativeText: string;
        tokens: Set<string>;
        occurrences: Occurrence[];
      };
      const SIM_THRESHOLD = 0.5;
      const clusters: Cluster[] = [];
      for (const occ of occurrences) {
        const tokens = tokenize(occ.text);
        if (tokens.size === 0) continue;
        let matched = false;
        for (const c of clusters) {
          if (jaccard(tokens, c.tokens) >= SIM_THRESHOLD) {
            c.occurrences.push(occ);
            // expand cluster token set (helps loose families converge)
            for (const t of tokens) c.tokens.add(t);
            // prefer the longest representative — usually more specific
            if (occ.text.length > c.representativeText.length) {
              c.representativeText = occ.text;
            }
            matched = true;
            break;
          }
        }
        if (!matched) {
          clusters.push({
            representativeText: occ.text,
            tokens,
            occurrences: [occ],
          });
        }
      }

      // 4. Project clusters into the response shape, ranked by count then recency
      const projected = clusters.map((c) => {
        const dates = c.occurrences
          .map(o => o.date ? new Date(o.date).getTime() : 0)
          .filter(t => t > 0);
        const lastSeen = dates.length ? new Date(Math.max(...dates)) : null;
        const firstSeen = dates.length ? new Date(Math.min(...dates)) : null;
        const sources = new Set(c.occurrences.map(o => o.source));
        return {
          focus: c.representativeText,
          occurrences: c.occurrences.length,
          lastSeenAt: lastSeen,
          firstSeenAt: firstSeen,
          sourceMix: sources.size === 2 ? "both" : Array.from(sources)[0] || "writing",
          submissionIds: Array.from(new Set(c.occurrences.map(o => o.submissionId))),
        };
      })
      .sort((a, b) => {
        if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
        const ad = a.lastSeenAt ? a.lastSeenAt.getTime() : 0;
        const bd = b.lastSeenAt ? b.lastSeenAt.getTime() : 0;
        return bd - ad;
      })
      .slice(0, topN);

      res.json({
        plan: projected,
        meta: {
          submissionsAnalyzed: rows.length,
          gradedSubmissionsWithPriorities: occurrences.length / 3, // rough
          totalPriorityOccurrences: occurrences.length,
          clusterCount: clusters.length,
        },
      });
    } catch (error) {
      console.error("Error building action plan:", error);
      res.status(500).json({ error: "Failed to build action plan" });
    }
  };

  app.get("/api/student/action-plan", actionPlanHandler);
  app.get("/api/student/:studentId/action-plan", actionPlanHandler);

  // ─── Today's Mission (Phase 1.0 ESL Roadmap) ─────────────────────────
  // GET /api/student/today-mission
  // Returns the student's curated 30-min mission for today. If one already
  // exists for today, returns it as-is (don't re-curate mid-day). If not,
  // generates a fresh one based on:
  //   - Action Plan (top recurring focus areas)
  //   - Daily Challenge state (already done today?)
  //   - Upcoming lab in next 48h (prep for it)
  //   - Days since last writing/speaking submission
  // and persists it to daily_missions.
  app.get("/api/student/today-mission", async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { db } = await import("./db");
      const { dailyMissions, submissions, dailyChallengeAttempts, labRegistrations, labSessionsV2 } = await import("@shared/schema");
      const { eq, and, gte, desc, sql } = await import("drizzle-orm");

      // Compute "today" in the server's local time. YYYY-MM-DD.
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const today = `${yyyy}-${mm}-${dd}`;

      // 1. If a mission already exists for today, return it
      const existing = await db
        .select()
        .from(dailyMissions)
        .where(and(eq(dailyMissions.userId, userId), eq(dailyMissions.missionDate, today)))
        .limit(1);
      if (existing.length > 0) {
        return res.json({ mission: existing[0] });
      }

      // 2. Curate a new mission. Gather context:
      const user = await storage.getUser(userId);
      const level = (user as any)?.currentLevel || (user as any)?.placementLevel || "A1";

      // a. Has the student done today's Daily Challenge?
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const dcToday = await db
        .select({ id: dailyChallengeAttempts.id })
        .from(dailyChallengeAttempts)
        .where(and(
          eq(dailyChallengeAttempts.studentId, userId),
          gte(dailyChallengeAttempts.attemptedAt, startOfToday),
        ))
        .limit(1);
      const dailyChallengeDone = dcToday.length > 0;

      // b. Top action plan focus area (reuse the action-plan handler logic, light version)
      const recentSubs = await db
        .select({ aiGrade: submissions.aiGrade, assignmentType: submissions.assignmentType })
        .from(submissions)
        .where(eq(submissions.studentId, userId))
        .orderBy(desc(submissions.submittedAt))
        .limit(20);
      const priorities: string[] = [];
      for (const s of recentSubs) {
        const grade: any = s.aiGrade || {};
        if (Array.isArray(grade.improvement_priorities)) {
          priorities.push(...grade.improvement_priorities.slice(0, 1));
        }
      }
      const topFocus = priorities[0] || null;

      // c. Days since last writing/speaking submission
      const lastSub = recentSubs[0];
      const daysSinceLastSub = lastSub
        ? Math.floor((now.getTime() - new Date((lastSub as any).submittedAt || now).getTime()) / 86_400_000)
        : 999;

      // d. Upcoming lab in next 48h
      const in48h = new Date(now.getTime() + 48 * 3600 * 1000);
      const upcomingLab = await db
        .select({
          id: labSessionsV2.id,
          title: labSessionsV2.title,
          scheduledAt: labSessionsV2.scheduledAt,
        })
        .from(labRegistrations)
        .innerJoin(labSessionsV2, eq(labRegistrations.labSessionId, labSessionsV2.id))
        .where(and(
          eq(labRegistrations.userId, userId),
          gte(labSessionsV2.scheduledAt, now),
          sql`${labSessionsV2.scheduledAt} <= ${in48h}`,
        ))
        .orderBy(labSessionsV2.scheduledAt)
        .limit(1);
      const nextLab = upcomingLab[0] || null;

      // 3. Compose the mission (30 min total, varied formats)
      type Activity = {
        id: string;
        type: "daily_challenge" | "listening" | "speaking" | "writing" | "reading" | "vocab" | "scenario" | "coral_memo";
        title: string;
        subtitle: string;
        durationMinutes: number;
        route: string;
        iconKey: string;
        completed: boolean;
      };

      const activities: Activity[] = [];
      let remainingMin = 30;

      // Activity 1: Daily Challenge warm-up if not done (5 min)
      if (!dailyChallengeDone) {
        activities.push({
          id: "dc-warmup",
          type: "daily_challenge",
          title: "Daily Challenge warm-up",
          subtitle: `10 questions at your ${level} level`,
          durationMinutes: 5,
          route: "/dashboard/daily-challenge",
          iconKey: "zap",
          completed: false,
        });
        remainingMin -= 5;
      }

      // Activity 2: Speaking or Writing project if 3+ days since last
      if (daysSinceLastSub >= 3) {
        activities.push({
          id: "speaking-project",
          type: "speaking",
          title: "Speaking practice",
          subtitle: `Record a ${level} speaking project`,
          durationMinutes: 15,
          route: "/dashboard/courses",
          iconKey: "mic",
          completed: false,
        });
        remainingMin -= 15;
      } else {
        // Recent activity — give them a listening exercise (placeholder route until Phase 2 lands)
        activities.push({
          id: "listening-ex",
          type: "listening",
          title: "Listening practice",
          subtitle: "Comprehension exercise with native speakers",
          durationMinutes: 10,
          route: "/dashboard/courses",
          iconKey: "headphones",
          completed: false,
        });
        remainingMin -= 10;
      }

      // Activity 3: Vocabulary SRS (always — keeps cards fresh)
      if (remainingMin >= 8) {
        activities.push({
          id: "vocab-review",
          type: "vocab",
          title: "Review vocabulary",
          subtitle: topFocus ? `Focus area: ${topFocus.slice(0, 60)}...` : "8 cards from your SRS deck",
          durationMinutes: 8,
          route: "/dashboard/vocabulary",
          iconKey: "book",
          completed: false,
        });
        remainingMin -= 8;
      }

      // Activity 4: Lab prep if class in next 48h
      if (nextLab && remainingMin >= 5) {
        activities.push({
          id: "lab-prep",
          type: "vocab",
          title: `Prep for "${nextLab.title}"`,
          subtitle: "Vocabulary preview for your live class",
          durationMinutes: 5,
          route: `/dashboard/labs/${nextLab.id}/room`,
          iconKey: "video",
          completed: false,
        });
        remainingMin -= 5;
      } else if (remainingMin >= 5) {
        // Otherwise, light reading
        activities.push({
          id: "reading-light",
          type: "reading",
          title: "Quick reading",
          subtitle: "Short passage with comprehension questions",
          durationMinutes: Math.min(remainingMin, 7),
          route: "/dashboard/courses",
          iconKey: "book-open",
          completed: false,
        });
      }

      // Compose title + rationale
      let title = "Today's mission";
      let rationale: string | null = null;
      if (nextLab) {
        const labDay = new Date(nextLab.scheduledAt);
        const dayName = labDay.toLocaleDateString("en-US", { weekday: "long" });
        title = `Prep for ${dayName}'s class`;
        rationale = `Your Conversation Lab "${nextLab.title}" is coming up — these activities get you ready.`;
      } else if (topFocus) {
        title = `Work on your focus area`;
        rationale = `Based on your recent feedback: ${topFocus.slice(0, 100)}...`;
      } else if (daysSinceLastSub >= 5) {
        title = `Get back in the rhythm`;
        rationale = `It's been a few days — let's restart with these activities.`;
      } else {
        title = `Today's 30-min mission`;
        rationale = `A varied mix to keep your English moving forward.`;
      }

      const totalMin = activities.reduce((s, a) => s + a.durationMinutes, 0);

      // 4. Persist
      const [inserted] = await db
        .insert(dailyMissions)
        .values({
          userId,
          missionDate: today,
          title,
          rationale,
          activities: activities as any,
          totalMinutes: totalMin,
          status: "not_started",
        })
        .returning();

      res.json({ mission: inserted });
    } catch (err: any) {
      console.error("[today-mission] Error:", err?.message);
      res.status(500).json({ error: err?.message || "Failed to load today's mission" });
    }
  });

  // POST /api/student/mission/:id/start — mark in_progress + record start time
  app.post("/api/student/mission/:id/start", async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { db } = await import("./db");
      const { dailyMissions } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [updated] = await db
        .update(dailyMissions)
        .set({ status: "in_progress", startedAt: new Date() })
        .where(and(eq(dailyMissions.id, req.params.id), eq(dailyMissions.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Mission not found" });
      res.json({ mission: updated });
    } catch (err: any) {
      console.error("[mission/start] Error:", err?.message);
      res.status(500).json({ error: err?.message || "Failed" });
    }
  });

  // POST /api/student/mission/:id/complete — mark completed + record end time
  app.post("/api/student/mission/:id/complete", async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { db } = await import("./db");
      const { dailyMissions } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [updated] = await db
        .update(dailyMissions)
        .set({ status: "completed", completedAt: new Date() })
        .where(and(eq(dailyMissions.id, req.params.id), eq(dailyMissions.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: "Mission not found" });
      res.json({ mission: updated });
    } catch (err: any) {
      console.error("[mission/complete] Error:", err?.message);
      res.status(500).json({ error: err?.message || "Failed" });
    }
  });

  // Teacher-facing grading queue — submissions awaiting review.
  app.get("/api/submissions/queue", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden — teacher access required" });

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq, desc, or, and, ne, sql } = await import("drizzle-orm");

      // ai_graded submissions await teacher signoff; pending_ai may be
      // still grading (useful for ops visibility) or failed (ai_grade.error).
      // Reading quizzes are auto-graded multiple-choice with no teacher
      // review needed, so they're excluded from the queue.
      const rows = await db
        .select()
        .from(submissions)
        .where(and(
          or(eq(submissions.status, "ai_graded"), eq(submissions.status, "pending_ai")),
          sql`(${submissions.assignmentType} IS NULL OR ${submissions.assignmentType} != 'reading_quiz')`,
        ))
        .orderBy(desc(submissions.submittedAt))
        .limit(50);

      res.json(rows);
    } catch (error) {
      console.error("Error fetching submission queue:", error);
      res.status(500).json({ error: "Failed to fetch submission queue" });
    }
  });

  // Single submission. Students can read their own; teachers can read any.
  app.get("/api/submissions/:id", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [submission] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, req.params.id));

      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const user = await storage.getUser(userId);
      const isOwner = submission.studentId === userId;
      const isTeacher = !!user?.isAdmin;
      if (!isOwner && !isTeacher) return res.status(403).json({ error: "Forbidden" });

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // Teacher override — replaces the AI score with the teacher's adjustment
  // and persists feedback. Default UX path per Coral's Q6 lock until override
  // rate <10% for 2 consecutive weeks.
  app.post("/api/submissions/:id/teacher-review", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden — teacher access required" });

      const { teacherScore, teacherFeedback } = req.body ?? {};
      if (teacherScore !== undefined) {
        if (typeof teacherScore !== "number" || teacherScore < 0 || teacherScore > 100) {
          return res.status(400).json({ error: "teacherScore must be a number 0-100" });
        }
      }
      if (teacherFeedback !== undefined && typeof teacherFeedback !== "string") {
        return res.status(400).json({ error: "teacherFeedback must be a string" });
      }

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const updateFields: Record<string, any> = {
        teacherReviewedAt: new Date(),
        status: "teacher_reviewed",
      };
      if (teacherScore !== undefined) {
        updateFields.teacherScore = String(teacherScore);
        updateFields.finalScore = String(teacherScore);
      }
      if (teacherFeedback !== undefined) {
        updateFields.teacherFeedback = teacherFeedback;
      }

      const updated = await db
        .update(submissions)
        .set(updateFields)
        .where(eq(submissions.id, req.params.id))
        .returning();

      if (updated.length === 0) return res.status(404).json({ error: "Submission not found" });
      res.json(updated[0]);
    } catch (error) {
      console.error("Error applying teacher review:", error);
      res.status(500).json({ error: "Failed to apply teacher review" });
    }
  });

  // Mark a teacher-reviewed submission as "returned to student" — final
  // status. From here the student sees it as a finalized grade in their
  // dashboard.
  app.post("/api/submissions/:id/return", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden — teacher access required" });

      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const updated = await db
        .update(submissions)
        .set({ status: "returned" })
        .where(eq(submissions.id, req.params.id))
        .returning();

      if (updated.length === 0) return res.status(404).json({ error: "Submission not found" });
      res.json(updated[0]);
    } catch (error) {
      console.error("Error returning submission:", error);
      res.status(500).json({ error: "Failed to return submission" });
    }
  });

  // ============== TEACHER LESSON LIBRARY (Phase 1.5, Master Plan v2.0 §7.4) ==============
  //
  // Read endpoints over the full lessons catalog, designed for the teacher
  // dashboard Lesson Library. The existing /api/admin/lessons/:id returns a
  // single lesson; this adds a flat catalog endpoint that joins course
  // metadata so the Library can render with level/skill filters in one fetch.
  //
  // Also adds a teacher-facing PATCH for the new `teacherLessonPlan` JSON
  // field — Coral can author the 17-section plan inline. Wires into the same
  // `isAdmin` gate as the rest of the teacher surface for v1; can split into
  // a separate teacher role later.

  app.get("/api/teacher/lessons", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden — teacher access required" });

      const { db } = await import("./db");
      const { lessons, courses, courseModules } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      // Single query joining lessons → modules → courses so the Library can
      // group by course/level/module without a per-row roundtrip. Tradeoff:
      // returns the full lesson HTML field — fine at current catalog size
      // (~160 lessons projected) but we'll paginate when it grows.
      const rows = await db
        .select({
          id: lessons.id,
          courseId: lessons.courseId,
          moduleId: lessons.moduleId,
          title: lessons.title,
          description: lessons.description,
          duration: lessons.duration,
          orderIndex: lessons.orderIndex,
          videoUrl: lessons.videoUrl,
          isPublished: lessons.isPublished,
          teacherLessonPlan: lessons.teacherLessonPlan,
          createdAt: lessons.createdAt,
          courseTitle: courses.title,
          courseLevel: courses.level,
          courseTopic: courses.topic,
          moduleTitle: courseModules.title,
          moduleOrderIndex: courseModules.orderIndex,
        })
        .from(lessons)
        .leftJoin(courses, eq(lessons.courseId, courses.id))
        .leftJoin(courseModules, eq(lessons.moduleId, courseModules.id))
        .orderBy(courses.level, courses.title, courseModules.orderIndex, lessons.orderIndex);

      res.json(rows);
    } catch (error) {
      console.error("Error fetching teacher lessons:", error);
      res.status(500).json({ error: "Failed to fetch teacher lessons" });
    }
  });

  // Teacher PATCH for the 17-section lesson plan. Accepts a partial doc and
  // merges with whatever's already stored (deep-merge on top-level keys
  // only — sub-objects are fully replaced). Phase 2's One-Click Generator
  // will write to this same endpoint.
  app.patch("/api/teacher/lessons/:id/plan", async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden — teacher access required" });

      const incoming = req.body ?? {};
      if (typeof incoming !== "object" || Array.isArray(incoming)) {
        return res.status(400).json({ error: "Request body must be an object" });
      }

      const { db } = await import("./db");
      const { lessons } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [existing] = await db
        .select({ teacherLessonPlan: lessons.teacherLessonPlan })
        .from(lessons)
        .where(eq(lessons.id, req.params.id));

      if (!existing) return res.status(404).json({ error: "Lesson not found" });

      const merged = {
        ...((existing.teacherLessonPlan as Record<string, unknown>) ?? {}),
        ...incoming,
      };

      const [updated] = await db
        .update(lessons)
        .set({ teacherLessonPlan: merged as any })
        .where(eq(lessons.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating lesson plan:", error);
      res.status(500).json({ error: "Failed to update lesson plan" });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // SPEAKING PROJECTS — student-facing audio/video recording assessments
  // ════════════════════════════════════════════════════════════════════

  // Multer config for speaking submissions: accepts audio + video formats
  // produced by MediaRecorder (most common: webm with opus codec).
  const uploadSpeaking = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 75 * 1024 * 1024 }, // 75MB cap — generous for a ~5-min C1 video
    fileFilter: (_req, file, cb) => {
      const ok =
        file.mimetype.startsWith('audio/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype === 'application/octet-stream'; // Safari sometimes mislabels webm
      if (ok) cb(null, true);
      else cb(new Error('Only audio or video files are allowed'));
    },
  });

  // GET the Speaking Project for a given module (or null if module has none).
  app.get('/api/speaking-projects/by-module/:moduleId', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { moduleId } = req.params;
      const { speakingProjects } = await import('@shared/schema');
      const [proj] = await db.select().from(speakingProjects).where(eq(speakingProjects.moduleId, moduleId));
      if (!proj) return res.status(404).json({ error: 'No speaking project for this module' });
      // Hide drafts from students; admins/teachers see everything.
      const role = (req.user as any)?.role;
      const isStaff = role === 'admin' || role === 'teacher';
      if (!proj.isPublished && !isStaff) {
        return res.status(404).json({ error: 'Speaking project not published yet' });
      }
      res.json(proj);
    } catch (err: any) {
      console.error('[speaking-projects/by-module] Error:', err?.message, err?.stack);
      res.status(500).json({
        error: 'Failed to fetch speaking project',
        debug: { message: err?.message, code: err?.code, name: err?.name },
      });
    }
  });

  // POST a speaking submission. Multipart: audio file + metadata fields.
  // Returns the submission ID immediately; grading runs in the background.
  app.post(
    '/api/speaking-submissions',
    requireAuth,
    uploadSpeaking.single('recording'),
    async (req: any, res) => {
      try {
        const { db } = await import("./db");
        const { eq } = await import("drizzle-orm");
        const studentId = req.user?.id;
        if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
        if (!req.file) return res.status(400).json({ error: 'No recording file' });

        const { speakingProjectId, moduleId, isVideo, clientDurationSeconds } = req.body;
        if (!speakingProjectId || !moduleId) {
          return res.status(400).json({ error: 'speakingProjectId and moduleId are required' });
        }

        const { speakingProjects } = await import('@shared/schema');
        const [proj] = await db.select().from(speakingProjects).where(eq(speakingProjects.id, speakingProjectId));
        if (!proj) return res.status(404).json({ error: 'Speaking project not found' });
        if (!proj.isPublished) {
          const role = (req.user as any)?.role;
          if (role !== 'admin' && role !== 'teacher') {
            return res.status(403).json({ error: 'Speaking project not published yet' });
          }
        }

        const { createSpeakingSubmission, processSpeakingSubmission } = await import('./grading/speakingGrader');
        const created = await createSpeakingSubmission({
          studentId,
          speakingProjectId,
          moduleId,
          audioBuffer: req.file.buffer,
          audioFilename: req.file.originalname || `recording-${Date.now()}.webm`,
          audioContentType: req.file.mimetype,
          isVideo: String(isVideo) === 'true',
          clientDurationSeconds: clientDurationSeconds ? Number(clientDurationSeconds) : undefined,
        });

        // Respond immediately; kick off the slow grader in the background.
        res.status(202).json({
          submissionId: created.submissionId,
          status: 'pending_ai',
          message: 'Your recording was uploaded and is being graded. Check back in ~1 minute.',
        });

        // Fire-and-forget — errors are persisted to the row, not thrown here.
        processSpeakingSubmission(created.submissionId).catch((err) => {
          console.error('[speaking-submit] background processing failed:', err);
        });
      } catch (err: any) {
        console.error('[speaking-submissions POST] Error:', err?.message, err?.stack);
        res.status(500).json({
          error: 'Failed to upload recording',
          debug: { message: err?.message, code: err?.code, name: err?.name },
        });
      }
    }
  );

  // Admin PATCH for Speaking Projects — edit prompt, vocab, grammar, expressions,
  // duration, published flag. Required for the admin course-lessons UI.
  const isStaffUser = (req: any) => {
    const role = (req.user as any)?.role;
    return role === 'admin' || role === 'teacher' || (req.user as any)?.isAdmin === true;
  };
  /* ===================================================================
   * READING COMPREHENSION (Phase 1.8)
   * ===================================================================
   *   Student:
   *     GET    /api/reading-projects/by-module/:moduleId — fetch project (without correctAnswers)
   *     POST   /api/reading-submissions — submit answers, auto-grade, return score
   *     GET    /api/reading-submissions/:id — view past attempt
   *
   *   Admin (idempotent create on moduleId):
   *     GET    /api/admin/reading-projects/by-course/:courseId
   *     POST   /api/admin/reading-projects
   *     PATCH  /api/admin/reading-projects/:id
   */

  app.get("/api/reading-projects/by-module/:moduleId", requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { readingProjects } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [proj] = await db.select().from(readingProjects).where(eq(readingProjects.moduleId, req.params.moduleId)).limit(1);
      if (!proj) return res.status(404).json({ error: "Reading project not found for this module" });
      if (!proj.isPublished) {
        const u = await storage.getUser((req.user as any)?.id);
        if (!u?.isAdmin) return res.status(403).json({ error: "Not published yet" });
      }
      // Strip correctAnswer + explanation from each question (student view)
      const safeQuestions = (proj.questions || []).map((q: any) => {
        const { correctAnswer, explanation, ...rest } = q;
        return rest;
      });
      res.json({ ...proj, questions: safeQuestions });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  // Submit answers + auto-grade. Stored on the submissions table with
  // assignmentType='reading_quiz' so it shows up in the student's
  // submissions feed and admin queue.
  app.post("/api/reading-submissions", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { readingProjectId, moduleId, answers } = req.body as {
        readingProjectId: string; moduleId: string; answers: Record<string, string>;
      };
      if (!readingProjectId || !answers) return res.status(400).json({ error: "readingProjectId and answers required" });

      const { db } = await import("./db");
      const { readingProjects, submissions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [proj] = await db.select().from(readingProjects).where(eq(readingProjects.id, readingProjectId)).limit(1);
      if (!proj) return res.status(404).json({ error: "Reading project not found" });

      let totalPoints = 0;
      let earnedPoints = 0;
      const detail: any[] = [];
      for (const q of (proj.questions || []) as any[]) {
        totalPoints += 1;
        const userAns = String(answers[q.id] || "").trim().toLowerCase();
        const correct = String(q.correctAnswer || "").trim().toLowerCase();
        const right = !!userAns && userAns === correct;
        if (right) earnedPoints += 1;
        detail.push({ qid: q.id, given: userAns, correct, right, explanation: q.explanation });
      }
      const scorePct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 0;
      const passed = scorePct >= (proj.passingScore || 70);

      const [sub] = await db.insert(submissions).values({
        studentId: userId,
        assignmentType: "reading_quiz",
        moduleId,
        content: JSON.stringify({ answers }),
        aiGrade: { score: scorePct, total: totalPoints, earned: earnedPoints, detail, passed } as any,
        aiScore: String(scorePct),
        status: "ai_graded",
      } as any).returning({ id: submissions.id });

      res.json({ submissionId: sub.id, score: scorePct, totalPoints, earnedPoints, passed, detail });
    } catch (e: any) {
      console.error("[reading-submissions POST]", e);
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.get("/api/reading-submissions/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { db } = await import("./db");
      const { submissions } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const [s] = await db.select().from(submissions)
        .where(and(eq(submissions.id, req.params.id), eq(submissions.studentId, userId)))
        .limit(1);
      if (!s) return res.status(404).json({ error: "Not found" });
      res.json(s);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  /* ---- Admin CRUD ---- */
  app.get("/api/admin/reading-projects/by-course/:courseId", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { readingProjects, courseModules } = await import("@shared/schema");
      const { eq, inArray } = await import("drizzle-orm");
      const mods = await db.select({ id: courseModules.id }).from(courseModules).where(eq(courseModules.courseId, req.params.courseId));
      if (mods.length === 0) return res.json([]);
      const rows = await db.select().from(readingProjects).where(inArray(readingProjects.moduleId, mods.map(m => m.id)));
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e?.message || "Failed" }); }
  });

  app.post("/api/admin/reading-projects", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { readingProjects } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Defensive migration: ensure the table exists at request time in
      // case the startup migration didn't run (Railway hot-deploy edge
      // case). Safe no-op if the table already exists.
      try {
        const { pool } = await import("./db");
        await (pool as any).query(`DO $$ BEGIN CREATE TYPE reading_question_type AS ENUM ('multiple_choice','true_false','fill_in'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
        await (pool as any).query(`CREATE TABLE IF NOT EXISTS reading_projects (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          module_id varchar NOT NULL,
          level course_level NOT NULL,
          title text NOT NULL,
          passage text NOT NULL,
          word_count integer,
          questions jsonb NOT NULL DEFAULT '[]',
          passing_score integer NOT NULL DEFAULT 70,
          estimated_read_minutes integer,
          is_published boolean NOT NULL DEFAULT false,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )`);
        await (pool as any).query(`CREATE UNIQUE INDEX IF NOT EXISTS reading_projects_module_idx ON reading_projects(module_id)`);
      } catch (migErr: any) {
        console.warn('[reading-projects POST] defensive migration warning:', migErr?.message);
      }

      // Idempotent on moduleId
      const existing = await db.select().from(readingProjects).where(eq(readingProjects.moduleId, req.body.moduleId)).limit(1);
      if (existing[0]) return res.json(existing[0]);
      const [created] = await db.insert(readingProjects).values(req.body).returning();
      res.json(created);
    } catch (e: any) {
      console.error("[admin/reading-projects POST]", e);
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.patch("/api/admin/reading-projects/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { readingProjects } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const allowed = ["title","passage","wordCount","questions","passingScore","estimatedReadMinutes","isPublished"];
      const patch: any = { updatedAt: new Date() };
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
      const [updated] = await db.update(readingProjects).set(patch).where(eq(readingProjects.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e?.message || "Failed" }); }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 2.0 — HABLA Method Lab Lesson Plan endpoints
  // ════════════════════════════════════════════════════════════════
  // HABLA = Hook · Activate · Build · Live · Anchor (5 phases × ~12 min)
  // Grounded in Krashen, Swain, Ausubel, Deci & Ryan, Willis & Willis.
  // Per (level × module × interest) → 4 variant plans (same interest,
  // rotating grammar/vocab). Each plan is self-contained: a brand-new
  // student and a 1-month veteran can both join and learn meaningfully.
  // ════════════════════════════════════════════════════════════════

  // In-memory bulk job state. Expires when the process restarts.
  // For a single-instance Railway service this is fine.
  const BULK_JOBS = new Map<string, any>();

  // Shared helper used by both single-combo and bulk generation paths.
  // Generates 4 HABLA plans for (level, moduleId, interestTopicId) and
  // upserts them. Throws on failure so the caller can track per-combo errors.
  async function generateHablaPlansFor(
    level: string, moduleId: string, interestTopicId: string,
  ): Promise<{ generated: number }> {
    const { pool } = await import("./db");
    await ensureLabLessonPlansTable();

    const moduleRes = await (pool as any).query(
      `SELECT id, title, description FROM course_modules WHERE id = $1`,
      [moduleId]
    );
    if (!moduleRes.rows[0]) throw new Error('Module not found');
    const mod = moduleRes.rows[0];

    const lessonsRes = await (pool as any).query(
      `SELECT title, html_content, teacher_lesson_plan FROM lessons
       WHERE module_id = $1 AND is_published = true ORDER BY order_index`,
      [moduleId]
    );
    const lessons = lessonsRes.rows;
    const moduleVocab = new Set<string>();
    const moduleGrammar = new Set<string>();
    for (const lsn of lessons) {
      if (lsn.html_content) {
        const m = String(lsn.html_content).match(/(?:const|var|let)\s+wordAudioFiles\s*=\s*\{([\s\S]*?)\}\s*;/);
        if (m) {
          const entryRe = /["'](\w[\w'\-\s]*?)["']\s*:\s*["'][^"']+["']/g;
          let em: RegExpExecArray | null;
          while ((em = entryRe.exec(m[1])) !== null) moduleVocab.add(em[1].trim());
        }
      }
      const tlp = lsn.teacher_lesson_plan;
      if (tlp && typeof tlp === 'object') {
        if (Array.isArray(tlp.vocabularyTarget)) tlp.vocabularyTarget.forEach((w: any) => typeof w === 'string' && moduleVocab.add(w));
        if (Array.isArray(tlp.targetExpressions)) tlp.targetExpressions.forEach((w: any) => typeof w === 'string' && moduleVocab.add(w));
        if (tlp.grammarFocus) moduleGrammar.add(String(tlp.grammarFocus));
      }
    }

    const itRes = await (pool as any).query(
      `SELECT name FROM lab_interest_topics WHERE id = $1`,
      [interestTopicId]
    );
    const interest = itRes.rows[0] || { name: 'General' };

    const { getAnthropicClient, ANTHROPIC_MODELS, parseJsonFromResponse, extractTextContent } =
      await import("./anthropicClient");
    const client = getAnthropicClient();

    const prompt = `You are designing 4 Conversation Lab lesson plans for CogniBoost ESL platform, following the HABLA Method.

CONTEXT:
- Level: ${level}
- Module: "${mod.title}" — ${mod.description || ''}
- Module vocabulary already studied: ${Array.from(moduleVocab).slice(0, 30).join(', ')}
- Module grammar already studied: ${Array.from(moduleGrammar).join(', ') || 'see lesson content'}
- Student interest topic: ${interest.name}
- Duration per session: 60 minutes
- All 4 sessions share the same interest (${interest.name}) but rotate grammar focus.
- Sessions are DROP-IN: a brand-new student and a 1-month veteran can both attend any session and gain meaningful learning. No prerequisites between sessions.

PEDAGOGICAL FRAMEWORK — HABLA Method (5 phases):
1. HOOK (5 min): Personal, interest-driven warm-up. NEVER starts with grammar. Lowers affective filter (Krashen).
2. ACTIVATE (10 min): Activate prior knowledge. Teacher draws out what student already knows about the topic. Vocab surfaces naturally (Ausubel).
3. BUILD (10 min): Targeted comprehensible input i+1 (Krashen). Show 2-3 authentic mini-examples where the target grammar appears naturally in the interest context. Student DISCOVERS the pattern.
4. LIVE (25 min): Pushed output via task-based learning (Swain, Willis & Willis TBLT). Student MUST use the grammar + vocab to complete a real task (debate, role-play, storytelling, compare-contrast).
5. ANCHOR (10 min): 3 highlights + 1 takeaway phrase. Words for spaced retrieval in their SRS deck.

LANGUAGE POLICY:
- ENGLISH ONLY in every field. No Spanish words, no Spanish bridging, no "tú", "tu vocabulario", "abuela", etc.
- The titles, scripts, examples, prompts — all in English.
- Treat this as if you were writing for a US/UK English-as-a-foreign-language course.

CRITICAL RULES:
- HOOK must connect emotionally to ${interest.name} — never start cold.
- LIVE task must be something a real adult would actually enjoy.
- All 4 variants share interest ${interest.name} but DIFFERENT grammar (variant 1 present, 2 past, 3 comparison/conditional, 4 future or modal) so the student can take any one.
- Vocabulary MUST come from the module's vocab list above when possible.

Use the save_habla_plans tool to return exactly 4 plans.`;

    // Use Anthropic tool_use for guaranteed structured JSON output.
    // Eliminates parse-error class entirely.
    const msg = await client.messages.create({
      model: ANTHROPIC_MODELS.grading,
      max_tokens: 8000,
      tools: [{
        name: 'save_habla_plans',
        description: 'Save the 4 HABLA Method Conversation Lab plans for this (level × module × interest) combination.',
        input_schema: {
          type: 'object',
          properties: {
            plans: {
              type: 'array',
              minItems: 4,
              maxItems: 4,
              items: {
                type: 'object',
                properties: {
                  variantNumber: { type: 'number', enum: [1, 2, 3, 4] },
                  title: { type: 'string' },
                  grammarFocus: { type: 'string' },
                  pedagogicalObjective: { type: 'string' },
                  previewBlurb: { type: 'string' },
                  vocabulary: { type: 'array', items: { type: 'string' } },
                  expressions: { type: 'array', items: { type: 'string' } },
                  plan: {
                    type: 'object',
                    properties: {
                      hook: { type: 'object', properties: {
                        durationMinutes: { type: 'number' },
                        prompt: { type: 'string' },
                        teacherScript: { type: 'string' },
                        variants: { type: 'array', items: { type: 'string' } },
                      }, required: ['durationMinutes', 'prompt', 'teacherScript'] },
                      activate: { type: 'object', properties: {
                        durationMinutes: { type: 'number' },
                        objective: { type: 'string' },
                        teacherScript: { type: 'string' },
                        vocabToSurface: { type: 'array', items: { type: 'string' } },
                      }, required: ['durationMinutes', 'objective'] },
                      build: { type: 'object', properties: {
                        durationMinutes: { type: 'number' },
                        focusGrammar: { type: 'string' },
                        examples: { type: 'array', items: { type: 'string' } },
                        discoveryQuestion: { type: 'string' },
                      }, required: ['durationMinutes', 'focusGrammar', 'examples'] },
                      live: { type: 'object', properties: {
                        durationMinutes: { type: 'number' },
                        task: { type: 'string' },
                        taskRubric: { type: 'array', items: { type: 'string' } },
                        outputTargets: { type: 'array', items: { type: 'string' } },
                      }, required: ['durationMinutes', 'task'] },
                      anchor: { type: 'object', properties: {
                        durationMinutes: { type: 'number' },
                        takeawayPhrase: { type: 'string' },
                        vocabForSrs: { type: 'array', items: { type: 'string' } },
                      }, required: ['durationMinutes', 'takeawayPhrase'] },
                    },
                    required: ['hook', 'activate', 'build', 'live', 'anchor'],
                  },
                },
                required: ['variantNumber', 'title', 'grammarFocus', 'pedagogicalObjective', 'plan'],
              },
            },
          },
          required: ['plans'],
        },
      }],
      tool_choice: { type: 'tool', name: 'save_habla_plans' },
      messages: [{ role: 'user', content: prompt }],
    });

    let plans: any[] = [];
    const toolUseBlock = msg.content.find((b: any) => b.type === 'tool_use');
    if (toolUseBlock && (toolUseBlock as any).input?.plans) {
      plans = (toolUseBlock as any).input.plans;
    } else {
      // Fallback: try to find JSON in any text block
      const textBlock = msg.content.find((b: any) => b.type === 'text');
      const text = (textBlock as any)?.text || '';
      try {
        const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsedAny = JSON.parse(cleaned);
        plans = Array.isArray(parsedAny) ? parsedAny : parsedAny.plans || [];
      } catch {
        throw new Error('Claude did not return structured plans');
      }
    }
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new Error('Claude returned no plans');
    }

    let saved = 0;
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (!p?.title || !p?.plan) continue;
      try {
        const r = await (pool as any).query(
          `INSERT INTO lab_lesson_plans (
              level, module_id, interest_topic_id, variant_number, title,
              grammar_focus, pedagogical_objective, duration_minutes, plan,
              vocabulary, expressions, preview_blurb, generated_by, is_published
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ai',false)
           ON CONFLICT (level, module_id, interest_topic_id, variant_number)
           DO UPDATE SET
              title = EXCLUDED.title, grammar_focus = EXCLUDED.grammar_focus,
              pedagogical_objective = EXCLUDED.pedagogical_objective,
              plan = EXCLUDED.plan, vocabulary = EXCLUDED.vocabulary,
              expressions = EXCLUDED.expressions, preview_blurb = EXCLUDED.preview_blurb,
              generated_by = 'ai', updated_at = now()`,
          [
            level, moduleId, interestTopicId,
            p.variantNumber || (i + 1),
            p.title, p.grammarFocus || '', p.pedagogicalObjective || '',
            60, JSON.stringify(p.plan),
            p.vocabulary || [], p.expressions || [],
            p.previewBlurb || null,
          ]
        );
        if (r.rowCount > 0) saved += 1;
      } catch (insertErr: any) {
        console.error('[habla] insert error:', insertErr?.message);
      }
    }
    return { generated: saved };
  }

  async function ensureLabLessonPlansTable() {
    try {
      const { pool } = await import("./db");
      await (pool as any).query(`CREATE TABLE IF NOT EXISTS lab_lesson_plans (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        level course_level NOT NULL,
        module_id varchar NOT NULL,
        interest_topic_id varchar NOT NULL,
        variant_number integer NOT NULL,
        title text NOT NULL,
        grammar_focus text NOT NULL,
        pedagogical_objective text NOT NULL,
        duration_minutes integer NOT NULL DEFAULT 60,
        plan jsonb NOT NULL,
        vocabulary text[] DEFAULT '{}',
        expressions text[] DEFAULT '{}',
        preview_blurb text,
        is_published boolean NOT NULL DEFAULT false,
        generated_by text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )`);
      await (pool as any).query(`CREATE UNIQUE INDEX IF NOT EXISTS lab_lesson_plans_combo_idx ON lab_lesson_plans(level, module_id, interest_topic_id, variant_number)`);
    } catch (err: any) {
      console.warn('[habla] defensive migration warning:', err?.message);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Phase 2.1 — Daily Challenge / Expression Showdown
  // ════════════════════════════════════════════════════════════════
  // Per-level gamified mini-quiz. Question type varies by CEFR level
  // (A1 basic vocab → C1 register & nuance). Distractors are real
  // hispanohablante errors. Wrong answers feed the SRS deck.
  // ════════════════════════════════════════════════════════════════

  async function ensureDailyChallengeTables() {
    try {
      const { pool } = await import("./db");
      await (pool as any).query(`CREATE TABLE IF NOT EXISTS daily_challenge_questions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        level course_level NOT NULL,
        question_type text NOT NULL,
        prompt text NOT NULL,
        context text,
        correct_answer text NOT NULL,
        distractor_a text NOT NULL,
        distractor_b text NOT NULL,
        distractor_c text NOT NULL,
        explanation text NOT NULL,
        category text,
        source_module_id varchar,
        interest_topic_id varchar,
        difficulty integer NOT NULL DEFAULT 3,
        is_published boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now()
      )`);
      await (pool as any).query(`CREATE TABLE IF NOT EXISTS daily_challenge_attempts (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id varchar NOT NULL,
        question_id varchar NOT NULL,
        selected_answer text NOT NULL,
        is_correct boolean NOT NULL,
        response_time_ms integer,
        attempted_at timestamp DEFAULT now()
      )`);
      await (pool as any).query(`CREATE TABLE IF NOT EXISTS daily_challenge_streaks (
        student_id varchar PRIMARY KEY,
        current_streak integer NOT NULL DEFAULT 0,
        longest_streak integer NOT NULL DEFAULT 0,
        total_correct integer NOT NULL DEFAULT 0,
        total_attempts integer NOT NULL DEFAULT 0,
        total_xp integer NOT NULL DEFAULT 0,
        last_played_date text,
        questions_today integer NOT NULL DEFAULT 0,
        updated_at timestamp DEFAULT now()
      )`);
    } catch (e: any) {
      console.warn('[daily-challenge] defensive migration:', e?.message);
    }
  }

  // GET /api/daily-challenge/today — fetch up to N unanswered questions
  // at student's level. Adapts the question type to their CEFR level.
  app.get('/api/daily-challenge/today', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureDailyChallengeTables();
      const { pool } = await import("./db");
      const student = await storage.getUser(studentId);
      const level = student?.placementLevel || 'A1';
      const limit = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 20);

      // Pick questions the student hasn't answered yet (or rotated)
      const { rows } = await (pool as any).query(
        `SELECT q.* FROM daily_challenge_questions q
         WHERE q.level = $1 AND q.is_published = true
           AND q.id NOT IN (
             SELECT question_id FROM daily_challenge_attempts WHERE student_id = $2
           )
         ORDER BY RANDOM()
         LIMIT $3`,
        [level, studentId, limit]
      );

      // If they've exhausted unseen ones, allow repeats but prefer ones they got wrong
      let final = rows;
      if (final.length < limit) {
        const rem = limit - final.length;
        const { rows: extras } = await (pool as any).query(
          `SELECT q.*, COALESCE(SUM(CASE WHEN a.is_correct = false THEN 1 ELSE 0 END), 0) AS wrong_count
           FROM daily_challenge_questions q
           LEFT JOIN daily_challenge_attempts a ON a.question_id = q.id AND a.student_id = $1
           WHERE q.level = $2 AND q.is_published = true
             AND q.id NOT IN (${final.map((_: any, i: number) => `$${i + 3}`).join(',') || 'NULL'})
           GROUP BY q.id
           ORDER BY wrong_count DESC, RANDOM()
           LIMIT $${final.length + 3}`,
          [studentId, level, ...final.map((r: any) => r.id), rem]
        );
        final = [...final, ...extras];
      }

      // Shuffle option positions per-question so correct isn't always same letter
      const formatted = final.map((q: any) => {
        const opts = [
          { letter: 'A', text: q.correct_answer, correct: true },
          { letter: 'B', text: q.distractor_a, correct: false },
          { letter: 'C', text: q.distractor_b, correct: false },
          { letter: 'D', text: q.distractor_c, correct: false },
        ];
        // Fisher-Yates shuffle
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        // Reassign letters in shuffled order
        return {
          id: q.id,
          level: q.level,
          questionType: q.question_type,
          prompt: q.prompt,
          context: q.context,
          category: q.category,
          difficulty: q.difficulty,
          options: opts.map((o, idx) => ({
            letter: ['A', 'B', 'C', 'D'][idx],
            text: o.text,
            correct: o.correct,
          })),
        };
      });

      res.json({ level, questions: formatted });
    } catch (e: any) {
      console.error('[daily-challenge/today]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // POST /api/daily-challenge/answer — submit an answer; updates
  // streak, XP, and (on wrong) adds the correct expression to SRS.
  app.post('/api/daily-challenge/answer', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      const { questionId, selectedAnswer, responseTimeMs } = req.body || {};
      if (!questionId || !selectedAnswer) {
        return res.status(400).json({ error: 'questionId + selectedAnswer required' });
      }
      await ensureDailyChallengeTables();
      const { pool } = await import("./db");

      const { rows: qRows } = await (pool as any).query(
        `SELECT * FROM daily_challenge_questions WHERE id = $1`,
        [questionId]
      );
      const q = qRows[0];
      if (!q) return res.status(404).json({ error: 'Question not found' });

      const isCorrect = String(selectedAnswer).trim() === String(q.correct_answer).trim();
      const xpEarned = isCorrect ? 20 : 0;

      // Log attempt
      await (pool as any).query(
        `INSERT INTO daily_challenge_attempts (student_id, question_id, selected_answer, is_correct, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [studentId, questionId, selectedAnswer, isCorrect, responseTimeMs || null]
      );

      // Update streak + xp
      const today = new Date().toISOString().slice(0, 10);
      const { rows: streakRows } = await (pool as any).query(
        `SELECT * FROM daily_challenge_streaks WHERE student_id = $1`,
        [studentId]
      );
      const s = streakRows[0];
      if (!s) {
        await (pool as any).query(
          `INSERT INTO daily_challenge_streaks
             (student_id, current_streak, longest_streak, total_correct, total_attempts, total_xp, last_played_date, questions_today)
           VALUES ($1, 1, 1, $2, 1, $3, $4, 1)`,
          [studentId, isCorrect ? 1 : 0, xpEarned, today]
        );
      } else {
        const wasYesterday = (() => {
          if (!s.last_played_date) return false;
          const last = new Date(s.last_played_date + 'T00:00:00Z');
          const todayD = new Date(today + 'T00:00:00Z');
          const diff = Math.round((+todayD - +last) / (24 * 60 * 60 * 1000));
          return diff === 1;
        })();
        const sameDay = s.last_played_date === today;
        const newStreak = sameDay
          ? s.current_streak
          : wasYesterday
            ? s.current_streak + 1
            : 1;
        const newLongest = Math.max(s.longest_streak, newStreak);
        const newQuestionsToday = sameDay ? s.questions_today + 1 : 1;
        await (pool as any).query(
          `UPDATE daily_challenge_streaks SET
             current_streak = $1, longest_streak = $2,
             total_correct = total_correct + $3,
             total_attempts = total_attempts + 1,
             total_xp = total_xp + $4,
             last_played_date = $5,
             questions_today = $6,
             updated_at = now()
           WHERE student_id = $7`,
          [newStreak, newLongest, isCorrect ? 1 : 0, xpEarned, today, newQuestionsToday, studentId]
        );
      }

      // If wrong, add the correct expression to the student's SRS deck
      if (!isCorrect) {
        try {
          await ensureVocabSrsTable();
          await (pool as any).query(
            `INSERT INTO vocab_srs_cards (student_id, term, is_expression, source_type, level, translation)
             VALUES ($1, $2, $3, 'daily_challenge', $4, $5)
             ON CONFLICT (student_id, lower(term)) DO NOTHING`,
            [studentId, q.correct_answer, q.correct_answer.includes(' '), q.level, q.prompt]
          );
        } catch {}
      }

      res.json({
        correct: isCorrect,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        xpEarned,
      });
    } catch (e: any) {
      console.error('[daily-challenge/answer]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // GET /api/daily-challenge/stats — student's progress + streak
  app.get('/api/daily-challenge/stats', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureDailyChallengeTables();
      const { pool } = await import("./db");
      const { rows } = await (pool as any).query(
        `SELECT * FROM daily_challenge_streaks WHERE student_id = $1`,
        [studentId]
      );
      const s = rows[0];
      if (!s) {
        return res.json({
          currentStreak: 0, longestStreak: 0, totalCorrect: 0,
          totalAttempts: 0, totalXp: 0, questionsToday: 0,
          accuracyPct: 0,
        });
      }
      const today = new Date().toISOString().slice(0, 10);
      const questionsToday = s.last_played_date === today ? s.questions_today : 0;
      res.json({
        currentStreak: s.current_streak,
        longestStreak: s.longest_streak,
        totalCorrect: s.total_correct,
        totalAttempts: s.total_attempts,
        totalXp: s.total_xp,
        questionsToday,
        accuracyPct: s.total_attempts > 0 ? Math.round((s.total_correct / s.total_attempts) * 100) : 0,
      });
    } catch (e: any) {
      console.error('[daily-challenge/stats]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // POST /api/admin/daily-challenge/seed — admin: generate questions for
  // a level using Claude. Reads expressions from writing/speaking/lab
  // sources at that level and asks Claude to craft questions with
  // hispanohablante-typical distractors.
  // Manual-insert endpoint for Daily Challenge questions — used when
  // I (Claude-in-chat) generate questions inline without using the
  // Anthropic API. Accepts an array of fully-formed questions.
  app.post('/api/admin/daily-challenge/manual-insert', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      await ensureDailyChallengeTables();
      const { pool } = await import("./db");
      const { questions } = req.body || {};
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: 'questions[] required' });
      }
      let saved = 0;
      const errors: string[] = [];
      for (const q of questions) {
        const required = ['level', 'questionType', 'prompt', 'correctAnswer', 'distractorA', 'distractorB', 'distractorC', 'explanation'];
        const missing = required.filter((k) => !q[k]);
        if (missing.length) {
          errors.push(`Missing ${missing.join(',')} in '${q.prompt || '?'}'`);
          continue;
        }
        try {
          await (pool as any).query(
            `INSERT INTO daily_challenge_questions
              (level, question_type, prompt, context, correct_answer,
               distractor_a, distractor_b, distractor_c, explanation,
               category, difficulty, is_published)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true)`,
            [
              q.level, q.questionType, q.prompt, q.context || null,
              q.correctAnswer, q.distractorA, q.distractorB, q.distractorC,
              q.explanation, q.category || 'basic', q.difficulty || 2,
            ]
          );
          saved += 1;
        } catch (insErr: any) {
          errors.push(`${q.prompt}: ${insErr?.message}`);
        }
      }
      res.json({ saved, requested: questions.length, errors });
    } catch (e: any) {
      console.error('[daily-challenge/manual-insert]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  app.post('/api/admin/daily-challenge/seed', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { level, count = 30 } = req.body || {};
      if (!['A1', 'A2', 'B1', 'B2', 'C1'].includes(level)) {
        return res.status(400).json({ error: 'valid level required' });
      }
      await ensureDailyChallengeTables();
      const { pool } = await import("./db");

      // Determine question type by level
      const typeByLevel: Record<string, { type: string; brief: string; promptLang: string }> = {
        A1: { type: 'translate', brief: 'basic Spanish→English vocabulary (verbs, objects, daily phrases)', promptLang: 'Spanish' },
        A2: { type: 'natural_phrase', brief: 'pick the natural English for everyday situations (greetings, food, directions)', promptLang: 'Spanish' },
        B1: { type: 'synonym', brief: 'same meaning, different words — synonyms + simple idioms', promptLang: 'English' },
        B2: { type: 'idiom', brief: 'express it like a native — phrasal verbs, idioms, slang', promptLang: 'English' },
        C1: { type: 'register', brief: 'register & nuance — formal vs casual, cultural sense', promptLang: 'English' },
      };
      const cfg = typeByLevel[level];

      const { getAnthropicClient, ANTHROPIC_MODELS } = await import("./anthropicClient");
      const client = getAnthropicClient();
      const msg = await client.messages.create({
        model: ANTHROPIC_MODELS.grading,
        max_tokens: 8000,
        tools: [{
          name: 'save_questions',
          description: `Save ${count} Daily Challenge questions for CEFR level ${level}.`,
          input_schema: {
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                minItems: count, maxItems: count,
                items: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string', description: `Question text in ${cfg.promptLang}` },
                    context: { type: 'string', description: 'Optional situational context (max 1 sentence)' },
                    correctAnswer: { type: 'string' },
                    distractorA: { type: 'string', description: 'Common hispanohablante error 1' },
                    distractorB: { type: 'string', description: 'Common hispanohablante error 2' },
                    distractorC: { type: 'string', description: 'Common hispanohablante error 3' },
                    explanation: { type: 'string', description: 'Why correct is right + why distractors are wrong (max 2 sentences)' },
                    category: { type: 'string', enum: ['phrasal_verb', 'idiom', 'slang', 'collocation', 'register', 'basic'] },
                    difficulty: { type: 'number', minimum: 1, maximum: 5 },
                  },
                  required: ['prompt', 'correctAnswer', 'distractorA', 'distractorB', 'distractorC', 'explanation', 'category', 'difficulty'],
                },
              },
            },
            required: ['questions'],
          },
        }],
        tool_choice: { type: 'tool', name: 'save_questions' },
        messages: [{
          role: 'user',
          content: `You are designing a Daily Challenge mini-quiz for CogniBoost ESL platform.

LEVEL: ${level}
QUESTION TYPE: ${cfg.brief}
PROMPT LANGUAGE: ${cfg.promptLang}

Generate ${count} unique questions following the schema. Critical rules:
- Distractors must be REAL errors hispanohablantes (Latin American Spanish speakers learning English) commonly make: false friends, literal Spanish→English translations, wrong prepositions, wrong word order.
- Each distractor should sound plausible to a learner but be definitively wrong.
- ${level === 'A1' || level === 'A2'
  ? `Prompt in Spanish (e.g. "¿Cómo se dice 'Yo tengo'?"). Options in English.`
  : `Prompt in English (e.g. "How can you say 'I'm going to study' in other words?"). Options in English.`}
- Explanations max 2 sentences, friendly tone, no academic jargon.
- Difficulty 1-5 within the level (1=easy for the level, 5=challenging for the level).
- Vary categories across the set (phrasal_verbs, idioms, slang, collocations, register).
- ${level === 'B2' || level === 'C1' ? 'Include true slang and current usage native speakers actually use.' : 'Keep examples relevant to daily life and common situations.'}`,
        }],
      });

      const toolUse = msg.content.find((b: any) => b.type === 'tool_use');
      const questions = (toolUse as any)?.input?.questions || [];
      if (questions.length === 0) return res.status(500).json({ error: 'Claude returned no questions' });

      let saved = 0;
      for (const q of questions) {
        try {
          await (pool as any).query(
            `INSERT INTO daily_challenge_questions
               (level, question_type, prompt, context, correct_answer, distractor_a, distractor_b, distractor_c,
                explanation, category, difficulty, is_published)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
            [
              level, cfg.type, q.prompt, q.context || null,
              q.correctAnswer, q.distractorA, q.distractorB, q.distractorC,
              q.explanation, q.category || 'basic', q.difficulty || 3,
            ]
          );
          saved += 1;
        } catch (insErr: any) {
          console.warn('[daily-challenge/seed] insert error:', insErr?.message);
        }
      }
      res.json({ generated: saved, requested: questions.length });
    } catch (e: any) {
      console.error('[daily-challenge/seed]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // (live-now moved to top of file before /api/labs/:id route — see line ~463)

  // GET /api/admin/lab-plans/all — return ALL plans across all levels.
  // Used by the Library page to render Level → Interest → Module groups
  // in a single shot instead of N+1 queries.
  app.get('/api/admin/lab-plans/all', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      await ensureLabLessonPlansTable();
      const { pool } = await import("./db");
      const { rows } = await (pool as any).query(
        `SELECT lp.*, cm.title as module_title, cm.course_id, cm.order_index as module_order_index,
                it.name as interest_name, it.icon as interest_icon
         FROM lab_lesson_plans lp
         LEFT JOIN course_modules cm ON cm.id = lp.module_id
         LEFT JOIN lab_interest_topics it ON it.id = lp.interest_topic_id
         ORDER BY lp.level, lp.interest_topic_id, cm.order_index, lp.variant_number`
      );
      res.json(rows.map((r: any) => ({
        id: r.id,
        level: r.level,
        moduleId: r.module_id,
        moduleTitle: r.module_title,
        moduleOrderIndex: r.module_order_index,
        courseId: r.course_id,
        interestTopicId: r.interest_topic_id,
        interestName: r.interest_name,
        interestIcon: r.interest_icon,
        variantNumber: r.variant_number,
        title: r.title,
        grammarFocus: r.grammar_focus,
        pedagogicalObjective: r.pedagogical_objective,
        durationMinutes: r.duration_minutes,
        plan: r.plan,
        vocabulary: r.vocabulary || [],
        expressions: r.expressions || [],
        previewBlurb: r.preview_blurb,
        isPublished: r.is_published,
      })));
    } catch (e: any) {
      console.error('[lab-plans/all]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // GET /api/admin/lab-plans/by-module/:moduleId?interest=<id> — list plans
  app.get('/api/admin/lab-plans/by-module/:moduleId', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      await ensureLabLessonPlansTable();
      const { pool } = await import("./db");
      const interestTopicId = req.query.interest as string | undefined;
      const params: any[] = [req.params.moduleId];
      let sql = `SELECT * FROM lab_lesson_plans WHERE module_id = $1`;
      if (interestTopicId) {
        params.push(interestTopicId);
        sql += ` AND interest_topic_id = $${params.length}`;
      }
      sql += ` ORDER BY interest_topic_id, variant_number`;
      const { rows } = await (pool as any).query(sql, params);
      res.json(rows);
    } catch (e: any) {
      console.error('[lab-plans GET]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // POST /api/admin/lab-plans/generate — Generate 4 HABLA plans for
  // (level + module + interest). Thin handler — real work in
  // generateHablaPlansFor() so the bulk path can reuse it.
  app.post('/api/admin/lab-plans/generate', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { level, moduleId, interestTopicId } = req.body || {};
      if (!level || !moduleId || !interestTopicId) {
        return res.status(400).json({ error: 'level, moduleId, interestTopicId required' });
      }
      const result = await generateHablaPlansFor(level, moduleId, interestTopicId);
      // Return the freshly inserted plans
      const { pool } = await import("./db");
      const { rows } = await (pool as any).query(
        `SELECT * FROM lab_lesson_plans WHERE level = $1 AND module_id = $2 AND interest_topic_id = $3 ORDER BY variant_number`,
        [level, moduleId, interestTopicId]
      );
      res.json({ generated: result.generated, plans: rows });
    } catch (e: any) {
      console.error('[habla/generate]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // Old inline handler (kept as comment for reference, dead code path)
  if (false) { /*

      // 1. Gather module context: title, lessons, teacher_lesson_plan vocab/grammar
      const moduleRes = await (pool as any).query(
        `SELECT id, title, description FROM course_modules WHERE id = $1`,
        [moduleId]
      );
      if (!moduleRes.rows[0]) return res.status(404).json({ error: 'Module not found' });
      const mod = moduleRes.rows[0];

      const lessonsRes = await (pool as any).query(
        `SELECT title, html_content, teacher_lesson_plan FROM lessons
         WHERE module_id = $1 AND is_published = true ORDER BY order_index`,
        [moduleId]
      );
      const lessons = lessonsRes.rows;

      // Collect vocab from lessons (wordAudioFiles + teacherLessonPlan)
      const moduleVocab = new Set<string>();
      const moduleGrammar = new Set<string>();
      for (const lsn of lessons) {
        if (lsn.html_content) {
          const m = String(lsn.html_content).match(/(?:const|var|let)\s+wordAudioFiles\s*=\s*\{([\s\S]*?)\}\s*;/);
          if (m) {
            const entryRe = /["'](\w[\w'\-\s]*?)["']\s*:\s*["'][^"']+["']/g;
            let em: RegExpExecArray | null;
            while ((em = entryRe.exec(m[1])) !== null) moduleVocab.add(em[1].trim());
          }
        }
        const tlp = lsn.teacher_lesson_plan;
        if (tlp && typeof tlp === 'object') {
          if (Array.isArray(tlp.vocabularyTarget)) tlp.vocabularyTarget.forEach((w: any) => typeof w === 'string' && moduleVocab.add(w));
          if (Array.isArray(tlp.targetExpressions)) tlp.targetExpressions.forEach((w: any) => typeof w === 'string' && moduleVocab.add(w));
          if (tlp.grammarFocus) moduleGrammar.add(String(tlp.grammarFocus));
        }
      }

      // Interest topic name
      const itRes = await (pool as any).query(
        `SELECT name FROM lab_interest_topics WHERE id = $1`,
        [interestTopicId]
      );
      const interest = itRes.rows[0] || { name: 'General' };

      // 2. Ask Claude to produce 4 HABLA variants
      const { getAnthropicClient, ANTHROPIC_MODELS, parseJsonFromResponse, extractTextContent } =
        await import("./anthropicClient");
      const client = getAnthropicClient();

      const prompt = `You are designing 4 Conversation Lab lesson plans for CogniBoost ESL platform, following the HABLA Method.

CONTEXT:
- Level: ${level}
- Module: "${mod.title}" — ${mod.description || ''}
- Module vocabulary already studied: ${Array.from(moduleVocab).slice(0, 30).join(', ')}
- Module grammar already studied: ${Array.from(moduleGrammar).join(', ') || 'see lesson content'}
- Student interest topic: ${interest.name}
- Duration per session: 60 minutes
- All 4 sessions share the same interest (${interest.name}) but rotate grammar focus.
- Sessions are DROP-IN: a brand-new student and a 1-month veteran can both attend any session and gain meaningful learning. No prerequisites between sessions.

PEDAGOGICAL FRAMEWORK — HABLA Method (5 phases):
1. HOOK (5 min): Personal, interest-driven warm-up. NEVER starts with grammar. Lowers affective filter (Krashen).
2. ACTIVATE (10 min): Activate prior knowledge. Teacher draws out what student already knows about the topic. Vocab surfaces naturally (Ausubel — meaningful learning).
3. BUILD (10 min): Targeted comprehensible input i+1 (Krashen). Show 2-3 authentic mini-examples where the target grammar appears naturally in the interest context. Student DISCOVERS the pattern.
4. LIVE (25 min): Pushed output via task-based learning (Swain, Willis & Willis TBLT). Student MUST use the grammar + vocab to complete a real task (debate, role-play, storytelling, compare-contrast).
5. ANCHOR (10 min): 3 highlights + 1 takeaway phrase. Words for spaced retrieval in their SRS deck.

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON array of EXACTLY 4 objects, each with this shape:
{
  "variantNumber": 1,
  "title": "Spanish-friendly evocative title (max 60 chars)",
  "grammarFocus": "specific grammar e.g. 'Past Simple — regular + irregular verbs'",
  "pedagogicalObjective": "By the end, student will… (one sentence, output-focused)",
  "previewBlurb": "1-paragraph teaser for the pre-class email (~40 words, exciting, no grammar jargon)",
  "vocabulary": ["6-8 module words relevant to this variant"],
  "expressions": ["3-5 expressions/phrases blending interest + grammar"],
  "plan": {
    "hook": {
      "durationMinutes": 5,
      "prompt": "the EXACT teacher opening question, personal and topic-anchored",
      "teacherScript": "1-2 sentence script the teacher reads to set tone",
      "variants": ["alt question 1", "alt question 2"]
    },
    "activate": {
      "durationMinutes": 10,
      "objective": "what the student should surface from prior knowledge",
      "teacherScript": "how to guide the elicitation in 1-2 sentences",
      "vocabToSurface": ["3-5 module words that should come out organically"]
    },
    "build": {
      "durationMinutes": 10,
      "focusGrammar": "the grammar lens for this session",
      "examples": ["mini-example 1 in the interest context", "mini-example 2", "mini-example 3"],
      "discoveryQuestion": "the question teacher asks after examples to make student notice the pattern"
    },
    "live": {
      "durationMinutes": 25,
      "task": "describe the real task the student must complete (emotionally engaging, requires the grammar+vocab)",
      "taskRubric": ["3-5 specific behaviors that prove successful task completion"],
      "outputTargets": ["how many sentences/turns/words the student must produce"]
    },
    "anchor": {
      "durationMinutes": 10,
      "takeawayPhrase": "one memorable phrase for the student to use this week",
      "vocabForSrs": ["3-5 words to send to their spaced repetition deck"]
    }
  }
}

CRITICAL RULES:
- All teacher scripts in English (the language being taught) with occasional Spanish bridging when natural.
- The HOOK must connect emotionally to ${interest.name} — never start cold.
- The LIVE task must be something a real adult in Latin America would actually enjoy doing.
- All 4 variants share interest ${interest.name} but DIFFERENT grammar (e.g. variant 1 = present, 2 = past, 3 = comparison, 4 = future/conditional) so the student can take any one.
- Vocabulary MUST be drawn from the module's actual vocab list (above).
- Output ONLY the JSON array. No markdown, no commentary.`;

      console.log(`[habla/generate] Asking Claude for 4 plans: ${level} / ${mod.title} / ${interest.name}`);
      // Sonnet for speed (Vercel proxy timeout ~30s; Opus took >30s).
      // 95% of Opus quality for structured plan generation.
      const msg = await client.messages.create({
        model: ANTHROPIC_MODELS.grading,
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = extractTextContent(msg);
      let plans: any[] = [];
      try {
        plans = parseJsonFromResponse<any[]>(text);
      } catch {
        const arr = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arr) {
          try { plans = JSON.parse(arr[0]); } catch {
            console.error('[habla/generate] unparseable:', text.slice(0, 500));
            return res.status(500).json({ error: 'Could not parse Claude response', sample: text.slice(0, 300) });
          }
        }
      }

      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(500).json({ error: 'Claude returned no plans', sample: text.slice(0, 300) });
      }

      // 3. Upsert into DB
      let saved = 0;
      const inserted: any[] = [];
      for (const p of plans) {
        if (!p?.title || !p?.plan) continue;
        try {
          const r = await (pool as any).query(
            `INSERT INTO lab_lesson_plans (
                level, module_id, interest_topic_id, variant_number, title,
                grammar_focus, pedagogical_objective, duration_minutes, plan,
                vocabulary, expressions, preview_blurb, generated_by, is_published
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'ai',false)
             ON CONFLICT (level, module_id, interest_topic_id, variant_number)
             DO UPDATE SET
                title = EXCLUDED.title,
                grammar_focus = EXCLUDED.grammar_focus,
                pedagogical_objective = EXCLUDED.pedagogical_objective,
                plan = EXCLUDED.plan,
                vocabulary = EXCLUDED.vocabulary,
                expressions = EXCLUDED.expressions,
                preview_blurb = EXCLUDED.preview_blurb,
                generated_by = 'ai',
                updated_at = now()
             RETURNING *`,
            [
              level, moduleId, interestTopicId,
              p.variantNumber || (saved + 1),
              p.title, p.grammarFocus || '', p.pedagogicalObjective || '',
              p.plan?.hook?.durationMinutes && p.plan?.live?.durationMinutes ? 60 : 60,
              JSON.stringify(p.plan),
              p.vocabulary || [],
              p.expressions || [],
              p.previewBlurb || null,
            ]
          );
          if (r.rows[0]) {
            saved += 1;
            inserted.push(r.rows[0]);
          }
        } catch (insertErr: any) {
          console.error('[habla/generate] insert error:', insertErr?.message);
        }
      }

      res.json({ generated: saved, plans: inserted });
    } catch (e: any) {
      console.error('[habla/generate]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  */ }
  // ^ end dead-code block

  // POST /api/admin/lab-plans/manual-insert — accept a fully-formed
  // HABLA plan JSON and upsert it WITHOUT calling Claude. Used when
  // I (Claude-in-chat) generate plans manually in conversation and
  // need to save them to DB. Avoids the Anthropic API entirely.
  app.post('/api/admin/lab-plans/manual-insert', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      await ensureLabLessonPlansTable();
      const { pool } = await import("./db");
      const { plans } = req.body || {};
      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ error: 'plans[] required' });
      }
      let saved = 0;
      const errors: string[] = [];
      for (const p of plans) {
        const required = ['level', 'moduleId', 'interestTopicId', 'variantNumber', 'title', 'grammarFocus', 'pedagogicalObjective', 'plan'];
        const missing = required.filter((k) => !p[k]);
        if (missing.length) {
          errors.push(`Missing ${missing.join(',')} in plan ${p.title || '?'}`);
          continue;
        }
        try {
          await (pool as any).query(
            `INSERT INTO lab_lesson_plans (
                level, module_id, interest_topic_id, variant_number, title,
                grammar_focus, pedagogical_objective, duration_minutes, plan,
                vocabulary, expressions, preview_blurb, generated_by, is_published
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual_chat',$13)
             ON CONFLICT (level, module_id, interest_topic_id, variant_number)
             DO UPDATE SET
                title = EXCLUDED.title, grammar_focus = EXCLUDED.grammar_focus,
                pedagogical_objective = EXCLUDED.pedagogical_objective,
                plan = EXCLUDED.plan, vocabulary = EXCLUDED.vocabulary,
                expressions = EXCLUDED.expressions, preview_blurb = EXCLUDED.preview_blurb,
                generated_by = 'manual_chat', updated_at = now()`,
            [
              p.level, p.moduleId, p.interestTopicId, p.variantNumber,
              p.title, p.grammarFocus, p.pedagogicalObjective,
              p.durationMinutes || 60, JSON.stringify(p.plan),
              p.vocabulary || [], p.expressions || [],
              p.previewBlurb || null, !!p.isPublished,
            ]
          );
          saved += 1;
        } catch (insErr: any) {
          errors.push(`${p.title}: ${insErr?.message}`);
        }
      }
      res.json({ saved, requested: plans.length, errors });
    } catch (e: any) {
      console.error('[lab-plans/manual-insert]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // PATCH /api/admin/lab-plans/:id — edit a generated plan
  app.patch('/api/admin/lab-plans/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      await ensureLabLessonPlansTable();
      const { pool } = await import("./db");
      const allowed = ['title', 'grammarFocus', 'pedagogicalObjective', 'plan', 'vocabulary',
                       'expressions', 'previewBlurb', 'isPublished', 'durationMinutes'];
      const sqlCols: Record<string, string> = {
        title: 'title', grammarFocus: 'grammar_focus', pedagogicalObjective: 'pedagogical_objective',
        plan: 'plan', vocabulary: 'vocabulary', expressions: 'expressions',
        previewBlurb: 'preview_blurb', isPublished: 'is_published', durationMinutes: 'duration_minutes',
      };
      const sets: string[] = [];
      const params: any[] = [];
      for (const k of allowed) {
        if (k in req.body) {
          params.push(k === 'plan' ? JSON.stringify(req.body[k]) : req.body[k]);
          sets.push(`${sqlCols[k]} = $${params.length}`);
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: 'no fields to update' });
      sets.push(`updated_at = now()`);
      sets.push(`generated_by = COALESCE(generated_by, 'manual')`);
      params.push(req.params.id);
      const { rows } = await (pool as any).query(
        `UPDATE lab_lesson_plans SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      res.json(rows[0]);
    } catch (e: any) {
      console.error('[lab-plans PATCH]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // ----------------------------------------------------------------
  // POST /api/admin/lab-plans/generate-bulk — Pre-generate ALL HABLA
  // plans for a level (every module × every interest = ~72 combos
  // per level → ~288 plans). Runs in background; returns a jobId.
  // Poll status via GET /generate-bulk/:jobId/status.
  // ----------------------------------------------------------------
  app.post('/api/admin/lab-plans/generate-bulk', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { level } = req.body || {};
      if (!level || !['A1', 'A2', 'B1', 'B2', 'C1'].includes(level)) {
        return res.status(400).json({ error: 'valid level required' });
      }
      await ensureLabLessonPlansTable();
      const { pool } = await import("./db");

      // Find all modules for this level via course → modules
      const modulesRes = await (pool as any).query(
        `SELECT cm.id, cm.title FROM course_modules cm
         JOIN courses c ON c.id = cm.course_id
         WHERE c.level = $1
         ORDER BY cm.order_index`,
        [level]
      );
      const modules = modulesRes.rows;
      const interestsRes = await (pool as any).query(
        `SELECT id, name FROM lab_interest_topics WHERE is_active = true ORDER BY display_order`
      );
      const interests = interestsRes.rows;
      const combos = modules.flatMap((m: any) =>
        interests.map((it: any) => ({ moduleId: m.id, moduleTitle: m.title, interestId: it.id, interestName: it.name }))
      );

      if (combos.length === 0) {
        return res.status(400).json({ error: `No modules or interests for level ${level}` });
      }

      // Initialize job state
      const jobId = `bulk-${level}-${Date.now()}`;
      BULK_JOBS.set(jobId, {
        jobId, level, total: combos.length, generated: 0, errors: 0,
        startedAt: new Date().toISOString(),
        finishedAt: null, currentCombo: null, errorList: [],
      });

      // Fire-and-forget background work — 3 concurrent calls
      const CONCURRENCY = 3;
      (async () => {
        const job = BULK_JOBS.get(jobId)!;
        let index = 0;
        const workers = Array.from({ length: CONCURRENCY }, async () => {
          while (true) {
            const i = index++;
            if (i >= combos.length) return;
            const c = combos[i];
            const label = `${c.moduleTitle} × ${c.interestName}`;
            job.currentCombo = label;
            try {
              await generateHablaPlansFor(level, c.moduleId, c.interestId);
              job.generated += 1;
            } catch (err: any) {
              job.errors += 1;
              job.errorList.push({ combo: label, error: err?.message || 'unknown' });
              console.error(`[habla-bulk] failed ${label}:`, err?.message);
            }
          }
        });
        await Promise.all(workers);
        job.finishedAt = new Date().toISOString();
        job.currentCombo = null;
      })().catch(err => console.error('[habla-bulk] fatal:', err));

      res.json({ jobId, total: combos.length, level });
    } catch (e: any) {
      console.error('[lab-plans bulk]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  app.get('/api/admin/lab-plans/generate-bulk/:jobId/status', requireAuth, async (req: any, res) => {
    const user = await storage.getUser((req.user as any)?.id);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    const job = BULK_JOBS.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found (may have expired)' });
    res.json(job);
  });

  // ============================================================
  // Phase 1.9 — Vocabulary SRS (spaced repetition flashcards)
  // ============================================================
  // Per Coral's spec: cards include words AND expressions/idioms/slang.
  // Sources: writing_projects.targetVocabulary + targetExpressions,
  // speaking_projects.targetVocabulary + targetExpressions, plus
  // global vocabulary table. SM-2-lite algorithm.
  //
  // Defensive migration runs on every endpoint in case startup
  // migration didn't fire (Railway hot-deploy edge case).
  // ============================================================

  async function ensureVocabSrsTable() {
    try {
      const { pool } = await import("./db");
      await (pool as any).query(`CREATE TABLE IF NOT EXISTS vocab_srs_cards (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id varchar NOT NULL,
        term text NOT NULL,
        translation text,
        example_en text,
        example_es text,
        part_of_speech text,
        is_expression boolean NOT NULL DEFAULT false,
        vocabulary_id varchar,
        source_type text NOT NULL,
        source_id varchar,
        source_module_id varchar,
        level course_level,
        interval_days integer NOT NULL DEFAULT 0,
        ease_factor real NOT NULL DEFAULT 2.5,
        review_count integer NOT NULL DEFAULT 0,
        correct_streak integer NOT NULL DEFAULT 0,
        total_correct integer NOT NULL DEFAULT 0,
        total_incorrect integer NOT NULL DEFAULT 0,
        mastery_level text NOT NULL DEFAULT 'new',
        next_review_due timestamp DEFAULT now(),
        last_reviewed_at timestamp,
        created_at timestamp DEFAULT now()
      )`);
      // Case-insensitive uniqueness so "Hello" + "hello" don't double-up
      await (pool as any).query(`CREATE UNIQUE INDEX IF NOT EXISTS vocab_srs_cards_student_term_idx ON vocab_srs_cards(student_id, lower(term))`);
      await (pool as any).query(`CREATE INDEX IF NOT EXISTS vocab_srs_cards_due_idx ON vocab_srs_cards(student_id, next_review_due)`);
    } catch (migErr: any) {
      console.warn('[vocab-srs] defensive migration warning:', migErr?.message);
    }
  }

  // GET /api/vocab/queue — today's due cards + new cards (up to limit)
  app.get('/api/vocab/queue', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureVocabSrsTable();
      const { pool } = await import("./db");
      const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
      const { rows } = await (pool as any).query(
        `SELECT * FROM vocab_srs_cards
         WHERE student_id = $1
           AND mastery_level != 'mastered'
           AND (next_review_due IS NULL OR next_review_due <= now())
         ORDER BY
           CASE mastery_level WHEN 'new' THEN 0 WHEN 'learning' THEN 1 WHEN 'familiar' THEN 2 ELSE 3 END,
           next_review_due ASC NULLS FIRST
         LIMIT $2`,
        [studentId, limit]
      );
      res.json(rows.map((r: any) => ({
        id: r.id,
        term: r.term,
        translation: r.translation,
        exampleEn: r.example_en,
        exampleEs: r.example_es,
        partOfSpeech: r.part_of_speech,
        isExpression: r.is_expression,
        masteryLevel: r.mastery_level,
        reviewCount: r.review_count,
        level: r.level,
        sourceType: r.source_type,
      })));
    } catch (e: any) {
      console.error('[vocab/queue]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // POST /api/vocab/review — body { cardId, rating: 'again'|'hard'|'good'|'easy' }
  // SM-2-lite: updates interval, ease, mastery, nextReviewDue.
  app.post('/api/vocab/review', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      const { cardId, rating } = req.body || {};
      if (!cardId || !['again', 'hard', 'good', 'easy'].includes(rating)) {
        return res.status(400).json({ error: 'cardId + valid rating required' });
      }
      await ensureVocabSrsTable();
      const { pool } = await import("./db");
      const { rows } = await (pool as any).query(
        `SELECT * FROM vocab_srs_cards WHERE id = $1 AND student_id = $2`,
        [cardId, studentId]
      );
      const card = rows[0];
      if (!card) return res.status(404).json({ error: 'Card not found' });

      let interval = card.interval_days || 0;
      let ease = card.ease_factor || 2.5;
      let streak = card.correct_streak || 0;
      let masteryLevel = card.mastery_level || 'new';
      let totalCorrect = card.total_correct || 0;
      let totalIncorrect = card.total_incorrect || 0;
      const reviewCount = (card.review_count || 0) + 1;

      if (rating === 'again') {
        // Wrong — reset interval, drop ease, drop mastery one notch
        interval = 0;
        ease = Math.max(1.3, ease - 0.2);
        streak = 0;
        totalIncorrect += 1;
        if (masteryLevel === 'mastered') masteryLevel = 'familiar';
        else if (masteryLevel === 'familiar') masteryLevel = 'learning';
        else masteryLevel = 'learning';
      } else if (rating === 'hard') {
        ease = Math.max(1.3, ease - 0.15);
        streak += 1;
        totalCorrect += 1;
        if (interval === 0) interval = 1;
        else interval = Math.max(1, Math.round(interval * 1.2));
      } else if (rating === 'good') {
        streak += 1;
        totalCorrect += 1;
        if (interval === 0) interval = 1;
        else if (interval < 6) interval = 3;
        else interval = Math.round(interval * ease);
      } else if (rating === 'easy') {
        ease = ease + 0.15;
        streak += 1;
        totalCorrect += 1;
        if (interval === 0) interval = 4;
        else interval = Math.round(interval * ease * 1.3);
      }

      // Mastery progression
      if (rating !== 'again') {
        if (masteryLevel === 'new') masteryLevel = 'learning';
        if (masteryLevel === 'learning' && streak >= 3) masteryLevel = 'familiar';
        if (masteryLevel === 'familiar' && streak >= 6) masteryLevel = 'mastered';
      }

      // For "again" with mastery already reset, schedule short (1 min)
      const nextReviewMs = rating === 'again'
        ? Date.now() + 60 * 1000
        : Date.now() + interval * 24 * 60 * 60 * 1000;
      const nextReview = new Date(nextReviewMs);

      await (pool as any).query(
        `UPDATE vocab_srs_cards SET
          interval_days = $1, ease_factor = $2, correct_streak = $3,
          mastery_level = $4, review_count = $5, total_correct = $6,
          total_incorrect = $7, next_review_due = $8, last_reviewed_at = now()
         WHERE id = $9`,
        [interval, ease, streak, masteryLevel, reviewCount, totalCorrect, totalIncorrect, nextReview, cardId]
      );

      res.json({ ok: true, masteryLevel, nextReviewDue: nextReview.toISOString(), intervalDays: interval });
    } catch (e: any) {
      console.error('[vocab/review]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // GET /api/vocab/stats — counts + streak
  app.get('/api/vocab/stats', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureVocabSrsTable();
      const { pool } = await import("./db");
      const { rows } = await (pool as any).query(
        `SELECT mastery_level, COUNT(*)::int AS c FROM vocab_srs_cards
         WHERE student_id = $1 GROUP BY mastery_level`,
        [studentId]
      );
      const byMastery: Record<string, number> = { new: 0, learning: 0, familiar: 0, mastered: 0 };
      for (const r of rows) byMastery[r.mastery_level] = r.c;
      const total = Object.values(byMastery).reduce((a, b) => a + b, 0);

      const dueRes = await (pool as any).query(
        `SELECT COUNT(*)::int AS c FROM vocab_srs_cards
         WHERE student_id = $1 AND mastery_level != 'mastered'
           AND (next_review_due IS NULL OR next_review_due <= now())`,
        [studentId]
      );
      const due = dueRes.rows[0]?.c || 0;

      const reviewedTodayRes = await (pool as any).query(
        `SELECT COUNT(*)::int AS c FROM vocab_srs_cards
         WHERE student_id = $1 AND last_reviewed_at >= date_trunc('day', now())`,
        [studentId]
      );
      const reviewedToday = reviewedTodayRes.rows[0]?.c || 0;

      res.json({ total, ...byMastery, dueNow: due, reviewedToday });
    } catch (e: any) {
      console.error('[vocab/stats]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // POST /api/vocab/sync — pull cards from student's exposed projects.
  // Idempotent on (studentId, lower(term)). Adds:
  //   - writing_projects.targetVocabulary (single words, isExpression=false)
  //   - writing_projects.targetExpressions (multi-word, isExpression=true)
  //   - speaking_projects.targetVocabulary
  //   - speaking_projects.targetExpressions
  //   - lab_session_briefs.expressions (Conversation Labs)
  // Only includes projects whose level matches student's placement level
  // or lower (so we don't drown an A2 student in C1 vocab).
  app.post('/api/vocab/sync', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureVocabSrsTable();
      const { pool } = await import("./db");
      const student = await storage.getUser(studentId);
      const studentLevel = student?.placementLevel || 'A1';

      // Level filter: include current level + all below
      const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];
      const cutoff = LEVEL_ORDER.indexOf(studentLevel);
      const allowedLevels = LEVEL_ORDER.slice(0, cutoff + 1);

      const inserts: any[] = [];

      // Writing projects
      try {
        const wp = await (pool as any).query(
          `SELECT id, module_id, level, target_vocabulary, target_expressions
           FROM writing_projects
           WHERE level = ANY($1::course_level[])`,
          [allowedLevels]
        );
        for (const p of wp.rows) {
          for (const w of (p.target_vocabulary || [])) {
            inserts.push({ term: w, isExpr: false, src: 'writing_project', srcId: p.id, modId: p.module_id, level: p.level });
          }
          for (const e of (p.target_expressions || [])) {
            inserts.push({ term: e, isExpr: true, src: 'writing_project', srcId: p.id, modId: p.module_id, level: p.level });
          }
        }
      } catch {}

      // Speaking projects
      try {
        const sp = await (pool as any).query(
          `SELECT id, module_id, level, target_vocabulary, target_expressions
           FROM speaking_projects
           WHERE level = ANY($1::course_level[])`,
          [allowedLevels]
        );
        for (const p of sp.rows) {
          for (const w of (p.target_vocabulary || [])) {
            inserts.push({ term: w, isExpr: false, src: 'speaking_project', srcId: p.id, modId: p.module_id, level: p.level });
          }
          for (const e of (p.target_expressions || [])) {
            inserts.push({ term: e, isExpr: true, src: 'speaking_project', srcId: p.id, modId: p.module_id, level: p.level });
          }
        }
      } catch {}

      // Conversation Lab sessions (vocabulary + expressions arrays)
      try {
        const labs = await (pool as any).query(
          `SELECT id, level, vocabulary, expressions FROM lab_sessions
           WHERE level = ANY($1::course_level[])`,
          [allowedLevels]
        );
        for (const l of labs.rows) {
          for (const w of (l.vocabulary || [])) {
            inserts.push({ term: w, isExpr: false, src: 'lab', srcId: l.id, modId: null, level: l.level });
          }
          for (const e of (l.expressions || [])) {
            inserts.push({ term: e, isExpr: true, src: 'lab', srcId: l.id, modId: null, level: l.level });
          }
        }
      } catch {}

      // Lessons — parse vocabulary from htmlContent + teacherLessonPlan.
      // Pulls from BOTH:
      //   (a) lessons.html_content — extracts wordAudioFiles {"word": "file.mp3"}
      //       block (same pattern lesson-factory/generate_audio.py parses)
      //   (b) lessons.teacher_lesson_plan.vocabularyTarget — explicit list
      //       Coral adds via the lesson-plan UI
      //   (c) lessons.teacher_lesson_plan.targetExpressions if present
      // Levels filter: only lessons in courses whose level is allowed.
      try {
        const lessonsRows = await (pool as any).query(
          `SELECT l.id, l.module_id, l.html_content, l.teacher_lesson_plan, c.level
           FROM lessons l
           JOIN courses c ON c.id = l.course_id
           WHERE c.level = ANY($1::course_level[])
             AND l.is_published = true`,
          [allowedLevels]
        );

        for (const lsn of lessonsRows.rows) {
          // (a) wordAudioFiles parsing — same regex as lesson-factory
          if (lsn.html_content && typeof lsn.html_content === 'string') {
            const blockMatch = lsn.html_content.match(/(?:const|var|let)\s+wordAudioFiles\s*=\s*\{([\s\S]*?)\}\s*;/);
            if (blockMatch) {
              const block = blockMatch[1];
              const entryRe = /["'](\w[\w'\-\s]*?)["']\s*:\s*["'][^"']+["']/g;
              let m: RegExpExecArray | null;
              while ((m = entryRe.exec(block)) !== null) {
                const word = m[1].trim();
                if (word && word.length > 1 && word.length < 60) {
                  inserts.push({ term: word, isExpr: word.includes(' '), src: 'lesson', srcId: lsn.id, modId: lsn.module_id, level: lsn.level });
                }
              }
            }
          }

          // (b) + (c) teacherLessonPlan structured fields
          const plan = lsn.teacher_lesson_plan;
          if (plan && typeof plan === 'object') {
            const vocab = Array.isArray(plan.vocabularyTarget) ? plan.vocabularyTarget : [];
            for (const w of vocab) {
              if (typeof w === 'string' && w.trim()) {
                inserts.push({ term: w.trim(), isExpr: w.includes(' '), src: 'lesson', srcId: lsn.id, modId: lsn.module_id, level: lsn.level });
              }
            }
            const exprs = Array.isArray(plan.targetExpressions) ? plan.targetExpressions : [];
            for (const e of exprs) {
              if (typeof e === 'string' && e.trim()) {
                inserts.push({ term: e.trim(), isExpr: true, src: 'lesson', srcId: lsn.id, modId: lsn.module_id, level: lsn.level });
              }
            }
          }
        }
      } catch (lsnErr: any) {
        console.warn('[vocab/sync] lessons scan warning:', lsnErr?.message);
      }

      // Dedupe in-memory by lower(term)
      const seen = new Set<string>();
      const uniqueInserts = inserts.filter(i => {
        const k = String(i.term).trim().toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      let added = 0;
      for (const i of uniqueInserts) {
        try {
          const r = await (pool as any).query(
            `INSERT INTO vocab_srs_cards (student_id, term, is_expression, source_type, source_id, source_module_id, level)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (student_id, lower(term)) DO NOTHING
             RETURNING id`,
            [studentId, String(i.term).trim(), i.isExpr, i.src, i.srcId, i.modId, i.level]
          );
          if (r.rowCount > 0) added += 1;
        } catch {}
      }

      res.json({ added, scanned: uniqueInserts.length });
    } catch (e: any) {
      console.error('[vocab/sync]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // GET /api/vocab/cards — browse library (paginated). Filter by mastery.
  app.get('/api/vocab/cards', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureVocabSrsTable();
      const { pool } = await import("./db");
      const mastery = req.query.mastery as string | undefined;
      const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
      const offset = parseInt(String(req.query.offset || '0'), 10) || 0;

      const params: any[] = [studentId];
      let sql = `SELECT id, term, translation, example_en, is_expression, mastery_level, source_type, level,
                        next_review_due, total_correct, total_incorrect
                 FROM vocab_srs_cards WHERE student_id = $1`;
      if (mastery && ['new', 'learning', 'familiar', 'mastered'].includes(mastery)) {
        params.push(mastery);
        sql += ` AND mastery_level = $${params.length}`;
      }
      params.push(limit, offset);
      sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const { rows } = await (pool as any).query(sql, params);
      res.json(rows.map((r: any) => ({
        id: r.id,
        term: r.term,
        translation: r.translation,
        exampleEn: r.example_en,
        isExpression: r.is_expression,
        masteryLevel: r.mastery_level,
        sourceType: r.source_type,
        level: r.level,
        nextReviewDue: r.next_review_due,
        totalCorrect: r.total_correct,
        totalIncorrect: r.total_incorrect,
      })));
    } catch (e: any) {
      console.error('[vocab/cards]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // ----------------------------------------------------------------
  // POST /api/vocab/enrich — populate translation + example + IPA
  // for cards that don't have them yet. Batches to Claude in groups
  // of 30 so cost stays low. Returns how many were enriched.
  // ----------------------------------------------------------------
  app.post('/api/vocab/enrich', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureVocabSrsTable();
      const { pool } = await import("./db");
      const { rows: bareCards } = await (pool as any).query(
        `SELECT id, term, is_expression, level FROM vocab_srs_cards
         WHERE student_id = $1
           AND (translation IS NULL OR translation = '' OR example_en IS NULL OR example_en = '')
         LIMIT 60`,
        [studentId]
      );
      if (bareCards.length === 0) return res.json({ enriched: 0, remaining: 0 });

      const { getAnthropicClient, ANTHROPIC_MODELS, parseJsonFromResponse, extractTextContent } =
        await import("./anthropicClient");
      const client = getAnthropicClient();
      const model = ANTHROPIC_MODELS.grading;

      const items = bareCards.map((c: any) => ({ id: c.id, term: c.term, isExpr: c.is_expression, level: c.level }));
      const prompt = `You are a CEFR-aligned ESL lexicographer. For each item in the JSON array below, produce a Spanish-Latin-America translation and a short, level-appropriate English example sentence (8–14 words). If it is an expression/idiom, give its meaning rather than a literal translation.

Return ONLY a valid JSON array (no commentary, no markdown fences) with this exact shape per item:
[{"id":"<id>","translation":"<es>","exampleEn":"<en sentence>","exampleEs":"<es translation of that sentence>","partOfSpeech":"<noun|verb|adj|adv|expression|phrase|idiom>","phonetic":"<IPA without slashes>"}]

Items:
${JSON.stringify(items)}`;

      console.log(`[vocab/enrich] requesting Claude for ${items.length} terms`);
      const msg = await client.messages.create({
        model,
        // 8000 tokens is enough for the full 60-item response (~150 chars/item).
        // Previous 4000 caused truncation → JSON parse failures visible to users.
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = extractTextContent(msg);
      let parsed: any[] = [];
      try {
        parsed = parseJsonFromResponse<any[]>(text);
      } catch (parseErr: any) {
        // Try to extract a JSON array from anywhere in the response
        const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          try { parsed = JSON.parse(arrayMatch[0]); } catch {
            console.error('[vocab/enrich] Claude returned unparseable text:', text.slice(0, 500));
            // Don't show a scary error to the user — just return 0 enriched so
            // they can try again. The next call will retry with fresh Claude output.
            return res.json({ enriched: 0, remaining: bareCards.length, retry: true });
          }
        } else {
          console.error('[vocab/enrich] No JSON array in response:', text.slice(0, 500));
          return res.json({ enriched: 0, remaining: bareCards.length, retry: true });
        }
      }
      console.log(`[vocab/enrich] Claude returned ${parsed.length} items`);

      // Build a lookup of (lower-term → card.id) so we can match Claude
      // responses even when it forgets to echo the original ID.
      const termToId = new Map<string, string>();
      for (const c of bareCards) termToId.set(String(c.term).trim().toLowerCase(), c.id);

      let enriched = 0;
      for (const p of parsed) {
        // Resolve which card this Claude response is for
        let cardId: string | null = p?.id || null;
        if (!cardId && p?.term) {
          cardId = termToId.get(String(p.term).trim().toLowerCase()) || null;
        }
        // Fallback: if neither id nor term matches, but Claude returned a
        // 'word' field instead
        if (!cardId && p?.word) {
          cardId = termToId.get(String(p.word).trim().toLowerCase()) || null;
        }
        if (!cardId) continue;
        try {
          const r = await (pool as any).query(
            `UPDATE vocab_srs_cards SET translation = $1, example_en = $2, example_es = $3,
                                         part_of_speech = $4
             WHERE id = $5 AND student_id = $6
               AND (translation IS NULL OR translation = '')`,
            [p.translation || null, p.exampleEn || null, p.exampleEs || null, p.partOfSpeech || null, cardId, studentId]
          );
          if (r.rowCount > 0) enriched += 1;
        } catch {}
      }
      console.log(`[vocab/enrich] enriched ${enriched}/${parsed.length} cards`);

      // How many still bare
      const { rows: remRows } = await (pool as any).query(
        `SELECT COUNT(*)::int AS c FROM vocab_srs_cards
         WHERE student_id = $1 AND (translation IS NULL OR translation = '')`,
        [studentId]
      );
      res.json({ enriched, remaining: remRows[0]?.c || 0 });
    } catch (e: any) {
      console.error('[vocab/enrich]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // ----------------------------------------------------------------
  // GET /api/vocab/word-info?word=...&level=... — on-demand word info
  // for Reading-passage clickable words. Returns translation +
  // definition + partOfSpeech + phonetic + inMyVocab flag.
  // Cached in a global `word_info_cache` table so the same word is
  // only ever asked of Claude once across all students.
  // ----------------------------------------------------------------
  app.get('/api/vocab/word-info', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      const word = String(req.query.word || '').trim();
      const level = (String(req.query.level || '').trim() || null) as any;
      if (!word) return res.status(400).json({ error: 'word required' });
      if (word.length > 60) return res.status(400).json({ error: 'word too long' });

      const { pool } = await import("./db");

      // Defensive migration: shared word info cache (one row per
      // lowercased word, regardless of level — the same word means
      // the same thing in Spanish across levels).
      try {
        await (pool as any).query(`CREATE TABLE IF NOT EXISTS word_info_cache (
          word_lower text PRIMARY KEY,
          translation text,
          definition text,
          part_of_speech text,
          phonetic text,
          level text,
          created_at timestamp DEFAULT now()
        )`);
      } catch {}

      const key = word.toLowerCase();

      // 1. Check shared cache
      const cached = await (pool as any).query(
        `SELECT translation, definition, part_of_speech, phonetic FROM word_info_cache WHERE word_lower = $1`,
        [key]
      );
      let translation: string | null = null;
      let definition: string | null = null;
      let partOfSpeech: string | null = null;
      let phonetic: string | null = null;

      if (cached.rows[0]) {
        translation = cached.rows[0].translation;
        definition = cached.rows[0].definition;
        partOfSpeech = cached.rows[0].part_of_speech;
        phonetic = cached.rows[0].phonetic;
      } else {
        // 2. Call Claude
        try {
          const { getAnthropicClient, ANTHROPIC_MODELS, parseJsonFromResponse, extractTextContent } =
            await import("./anthropicClient");
          const client = getAnthropicClient();
          const prompt = `For the English word "${word}" at CEFR level ${level || 'A2'}, return ONLY a JSON object (no commentary, no markdown fences):
{"translation":"<spanish-latam translation, lowercase>","definition":"<short english definition, 5-12 words>","partOfSpeech":"<noun|verb|adj|adv|prep|conj|pronoun|article|interjection>","phonetic":"<IPA without slashes>"}`;
          const msg = await client.messages.create({
            model: ANTHROPIC_MODELS.grading,
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }],
          });
          const text = extractTextContent(msg);
          let parsed: any = null;
          try { parsed = parseJsonFromResponse<any>(text); } catch {
            const m = text.match(/\{[\s\S]*\}/);
            if (m) try { parsed = JSON.parse(m[0]); } catch {}
          }
          if (parsed) {
            translation = parsed.translation || null;
            definition = parsed.definition || null;
            partOfSpeech = parsed.partOfSpeech || null;
            phonetic = parsed.phonetic || null;
            // Save to cache (best-effort)
            try {
              await (pool as any).query(
                `INSERT INTO word_info_cache (word_lower, translation, definition, part_of_speech, phonetic, level)
                 VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (word_lower) DO NOTHING`,
                [key, translation, definition, partOfSpeech, phonetic, level]
              );
            } catch {}
          }
        } catch (claudeErr: any) {
          console.error('[vocab/word-info] Claude failed:', claudeErr?.message);
        }
      }

      // 3. Check if it's already in this student's vocabulary
      let inMyVocab = false;
      try {
        await ensureVocabSrsTable();
        const exists = await (pool as any).query(
          `SELECT 1 FROM vocab_srs_cards WHERE student_id = $1 AND lower(term) = $2 LIMIT 1`,
          [studentId, key]
        );
        inMyVocab = exists.rows.length > 0;
      } catch {}

      res.json({
        term: word,
        translation: translation || "—",
        definition: definition || "",
        partOfSpeech: partOfSpeech || undefined,
        phonetic: phonetic || undefined,
        inMyVocab,
      });
    } catch (e: any) {
      console.error('[vocab/word-info]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // ----------------------------------------------------------------
  // POST /api/vocab/add — manually add a word to the student's SRS.
  // Idempotent on (studentId, lower(term)). Used by the Reading
  // passage clickable-word "Add to my vocabulary" button.
  // ----------------------------------------------------------------
  app.post('/api/vocab/add', requireAuth, async (req: any, res) => {
    try {
      const studentId = (req.user as any)?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      const { term, translation, exampleEn, partOfSpeech, level, moduleId, sourceType } = req.body || {};
      if (!term || typeof term !== 'string') return res.status(400).json({ error: 'term required' });
      const cleaned = term.trim();
      if (cleaned.length < 1 || cleaned.length > 200) return res.status(400).json({ error: 'term length' });

      await ensureVocabSrsTable();
      const { pool } = await import("./db");
      const isExpr = cleaned.includes(' ');

      const r = await (pool as any).query(
        `INSERT INTO vocab_srs_cards (
            student_id, term, translation, example_en, part_of_speech,
            is_expression, source_type, source_module_id, level
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (student_id, lower(term)) DO NOTHING
         RETURNING id`,
        [studentId, cleaned, translation || null, exampleEn || null, partOfSpeech || null,
         isExpr, sourceType || 'manual', moduleId || null, level || null]
      );

      const added = r.rowCount > 0;
      res.json({ added, alreadyExists: !added });
    } catch (e: any) {
      console.error('[vocab/add]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // ----------------------------------------------------------------
  // GET /api/vocab/audio?term=... — ElevenLabs TTS in Coral's
  // cloned voice with PERSISTENT GCS cache ("generate once, store
  // forever"). First click on a word ever: ElevenLabs API call →
  // upload to GCS → 302 redirect to public URL. Every future click
  // (any student, any time, even after Railway redeploys): 302
  // straight to GCS, zero ElevenLabs cost.
  //
  // Mirrors the lesson-factory pattern of pre-generated MP3s on GCS.
  // ----------------------------------------------------------------
  app.get('/api/vocab/audio', requireAuth, async (req: any, res) => {
    try {
      const term = String(req.query.term || '').trim();
      if (!term) return res.status(400).json({ error: 'term required' });
      if (term.length > 200) return res.status(400).json({ error: 'term too long' });

      const apiKey = process.env.ELEVENLABS_API_KEY;
      const voiceId = process.env.ELEVENLABS_VOICE_ID;
      if (!apiKey || !voiceId) {
        return res.status(503).json({ error: 'TTS not configured (ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID required)' });
      }

      const { vocabAudioExists, gcsVocabAudioUrl, saveVocabAudio } = await import('./gcsDirectUpload');

      // Fast path: already in GCS — redirect, no work needed
      try {
        if (await vocabAudioExists(voiceId, term)) {
          res.setHeader('X-Cache', 'HIT');
          return res.redirect(302, gcsVocabAudioUrl(voiceId, term));
        }
      } catch (existsErr: any) {
        console.warn('[vocab/audio] existence check failed, falling through to generate:', existsErr?.message);
      }

      // Slow path: generate via ElevenLabs Turbo (3-5x faster than
      // multilingual_v2 — sub-second for short vocab terms), upload to
      // GCS, then stream back. Voice cloning quality is identical with
      // turbo for short utterances; only the latency drops.
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: term,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.20,
            use_speaker_boost: true,
          },
        }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        console.error('[vocab/audio] ElevenLabs error:', r.status, errText.slice(0, 200));
        return res.status(502).json({ error: `TTS upstream ${r.status}` });
      }
      const arr = await r.arrayBuffer();
      const buf = Buffer.from(arr);

      // Save to GCS (deterministic path) — fire-and-forget upload while we
      // also stream the same buffer back to the user, so they hear it now
      // and future requests get it from GCS.
      try {
        await saveVocabAudio(voiceId, term, buf);
      } catch (saveErr: any) {
        console.error('[vocab/audio] GCS save failed (still serving inline):', saveErr?.message);
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Cache', 'MISS');
      res.send(buf);
    } catch (e: any) {
      console.error('[vocab/audio]', e);
      res.status(500).json({ error: e?.message || 'Failed' });
    }
  });

  // ─── Holiday / class-cancellation announcement ─────────────────────────
  // POST /api/admin/announce-class-change
  // Body: {
  //   subject: string,
  //   htmlBody: string,            // supports {{firstName}} placeholder
  //   audience: "today"|"this_week"|"all_active",
  //   dryRun?: boolean             // default true — preview recipients only
  // }
  // Returns { recipients: [{email, firstName, source}], sent, failed, dryRun }.
  // Sends ONE personalised email per recipient (never multi-TO — privacy).
  app.post('/api/admin/announce-class-change', requireAuth, async (req: any, res) => {
    try {
      const caller = await storage.getUser((req.user as any)?.id);
      if (!caller?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

      const { subject, htmlBody, audience = 'today', audienceConfig, template, dryRun = true } = req.body;
      if (!subject || !htmlBody) {
        return res.status(400).json({ error: 'subject and htmlBody are required' });
      }
      const ALLOWED_AUDIENCES = ['today', 'this_week', 'all_active', 'by_level', 'by_lab'];
      if (!ALLOWED_AUDIENCES.includes(audience)) {
        return res.status(400).json({ error: `audience must be one of ${ALLOWED_AUDIENCES.join(' | ')}` });
      }

      const { db } = await import('./db');
      const { users } = await import('@shared/models/auth');
      const { liveSessions, sessionRooms, roomBookings, conversationLabs, labBookings } = await import('@shared/schema');
      const { and, eq, gte, lte, inArray, isNull } = await import('drizzle-orm');

      // Compute date window in the server's local time (Railway is UTC, but
      // for "today" we want the day boundaries of the operator's date).
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      const endOfWeek = new Date(startOfToday);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      type Recipient = { userId: string; email: string; firstName: string | null; source: string };
      const recipientMap = new Map<string, Recipient>();

      if (audience === 'today' || audience === 'this_week') {
        const windowEnd = audience === 'today' ? endOfToday : endOfWeek;

        // NEW system: roomBookings → sessionRooms → liveSessions
        const newSysRows = await db
          .select({
            userId: roomBookings.userId,
            email: users.email,
            firstName: users.firstName,
            scheduledAt: liveSessions.scheduledAt,
          })
          .from(roomBookings)
          .innerJoin(sessionRooms, eq(roomBookings.roomId, sessionRooms.id))
          .innerJoin(liveSessions, eq(sessionRooms.sessionId, liveSessions.id))
          .innerJoin(users, eq(roomBookings.userId, users.id))
          .where(and(
            isNull(roomBookings.cancelledAt),
            gte(liveSessions.scheduledAt, startOfToday),
            lte(liveSessions.scheduledAt, windowEnd),
          ));
        for (const r of newSysRows) {
          if (r.email) {
            recipientMap.set(r.userId, {
              userId: r.userId,
              email: r.email,
              firstName: r.firstName,
              source: 'live_session',
            });
          }
        }

        // LEGACY system: labBookings → conversationLabs
        const legacyRows = await db
          .select({
            userId: labBookings.userId,
            email: users.email,
            firstName: users.firstName,
            scheduledAt: conversationLabs.scheduledAt,
          })
          .from(labBookings)
          .innerJoin(conversationLabs, eq(labBookings.labId, conversationLabs.id))
          .innerJoin(users, eq(labBookings.userId, users.id))
          .where(and(
            isNull(labBookings.cancelledAt),
            gte(conversationLabs.scheduledAt, startOfToday),
            lte(conversationLabs.scheduledAt, windowEnd),
          ));
        for (const r of legacyRows) {
          if (r.email && !recipientMap.has(r.userId)) {
            recipientMap.set(r.userId, {
              userId: r.userId,
              email: r.email,
              firstName: r.firstName,
              source: 'conversation_lab',
            });
          }
        }
      } else if (audience === 'all_active') {
        // every active non-admin non-deleted student with an email
        const allRows = await db
          .select({
            userId: users.id,
            email: users.email,
            firstName: users.firstName,
            subscriptionTier: users.subscriptionTier,
            isAdmin: users.isAdmin,
            deletedAt: users.deletedAt,
          })
          .from(users)
          .where(eq(users.status, 'active' as any));
        for (const r of allRows) {
          if (!r.email || r.isAdmin || r.deletedAt) continue;
          recipientMap.set(r.userId, {
            userId: r.userId,
            email: r.email,
            firstName: r.firstName,
            source: `active_${r.subscriptionTier || 'free'}`,
          });
        }
      } else if (audience === 'by_level') {
        // audienceConfig: { levels: ['A1', 'A2', ...] }
        const levels: string[] = Array.isArray(audienceConfig?.levels) ? audienceConfig.levels : [];
        if (levels.length === 0) {
          return res.status(400).json({ error: 'by_level requires audienceConfig.levels = ["A1", "A2", ...]' });
        }
        const rows = await db
          .select({
            userId: users.id,
            email: users.email,
            firstName: users.firstName,
            currentLevel: users.currentLevel,
            placementLevel: users.placementLevel,
            isAdmin: users.isAdmin,
            deletedAt: users.deletedAt,
          })
          .from(users)
          .where(eq(users.status, 'active' as any));
        for (const r of rows) {
          if (!r.email || r.isAdmin || r.deletedAt) continue;
          const userLevel = r.currentLevel || r.placementLevel;
          if (!userLevel || !levels.includes(userLevel)) continue;
          recipientMap.set(r.userId, {
            userId: r.userId,
            email: r.email,
            firstName: r.firstName,
            source: `level_${userLevel}`,
          });
        }
      } else if (audience === 'by_lab') {
        // audienceConfig: { labId: '...' } — students registered for a specific lab
        const labId: string | undefined = audienceConfig?.labId;
        if (!labId) {
          return res.status(400).json({ error: 'by_lab requires audienceConfig.labId' });
        }
        // Try new system first (labRegistrations → labSessionsV2)
        const { labRegistrations } = await import('@shared/schema');
        const newSysRows = await db
          .select({
            userId: labRegistrations.userId,
            email: users.email,
            firstName: users.firstName,
          })
          .from(labRegistrations)
          .innerJoin(users, eq(labRegistrations.userId, users.id))
          .where(eq(labRegistrations.labSessionId, labId));
        for (const r of newSysRows) {
          if (r.email) {
            recipientMap.set(r.userId, {
              userId: r.userId,
              email: r.email,
              firstName: r.firstName,
              source: `lab_${labId.slice(0, 8)}`,
            });
          }
        }
      }

      const recipients = Array.from(recipientMap.values());

      // Dry-run: show Coral exactly who would receive it before any send
      if (dryRun) {
        return res.json({
          dryRun: true,
          recipients,
          recipientCount: recipients.length,
          audience,
          sent: 0,
          failed: 0,
          window: { from: startOfToday, to: audience === 'today' ? endOfToday : endOfWeek },
        });
      }

      // Real send — loop and personalise per recipient (never multi-TO)
      const { sendCustomEmail } = await import('./resendClient');
      let sent = 0;
      let failed = 0;
      const failures: Array<{ email: string; error: string }> = [];
      for (const r of recipients) {
        const name = r.firstName || (r.email.includes('@') ? r.email.split('@')[0] : 'estudiante');
        const personalised = htmlBody.replace(/\{\{firstName\}\}/g, name);
        const result = await sendCustomEmail(r.email, subject, personalised, {
          replyTo: 'clozano@cognimight.com',
        });
        if ((result as any)?.success) sent++;
        else {
          failed++;
          failures.push({ email: r.email, error: String((result as any)?.error?.message || 'unknown') });
        }
      }
      console.log(`[announce-class-change] audience=${audience} sent=${sent} failed=${failed}`);

      // Log the send to the announcements history table so it shows in /admin/announcements > Historial
      try {
        const { announcements } = await import('@shared/schema');
        await db.insert(announcements).values({
          subject,
          htmlBody,
          audienceType: audience,
          audienceConfig: audienceConfig || null,
          template: template || null,
          recipientCount: recipients.length,
          sentCount: sent,
          failedCount: failed,
          failureDetails: failures.length > 0 ? failures : null,
          sentByUserId: callerId,
        });
      } catch (logErr) {
        console.error('[announce-class-change] history log failed (non-fatal):', logErr);
      }

      res.json({
        dryRun: false,
        audience,
        recipientCount: recipients.length,
        sent,
        failed,
        failures: failures.slice(0, 10),
      });
    } catch (err: any) {
      console.error('[announce-class-change] Error:', err?.message);
      res.status(500).json({ error: err?.message || 'Failed' });
    }
  });

  // GET /api/admin/announcements — paginated history of past sends.
  // Returns most-recent-first. ?limit=N (default 50, max 200).
  app.get('/api/admin/announcements', requireAuth, async (req: any, res) => {
    try {
      const caller = await storage.getUser((req.user as any)?.id);
      if (!caller?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

      const rawLimit = parseInt(req.query.limit as string, 10);
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

      const { db } = await import('./db');
      const { announcements } = await import('@shared/schema');
      const { desc } = await import('drizzle-orm');

      const rows = await db
        .select()
        .from(announcements)
        .orderBy(desc(announcements.sentAt))
        .limit(limit);

      res.json({ announcements: rows, count: rows.length });
    } catch (err: any) {
      console.error('[GET /admin/announcements] Error:', err?.message);
      res.status(500).json({ error: err?.message || 'Failed' });
    }
  });

  // GET /api/admin/labs/list-for-announcement — minimal list of upcoming labs
  // for the audience picker dropdown. Returns id, title, level, scheduledAt,
  // registrationCount.
  app.get('/api/admin/labs/list-for-announcement', requireAuth, async (req: any, res) => {
    try {
      const caller = await storage.getUser((req.user as any)?.id);
      if (!caller?.isAdmin) return res.status(403).json({ error: 'Forbidden' });

      const { db } = await import('./db');
      const { labSessionsV2, labRegistrations } = await import('@shared/schema');
      const { gte, desc, sql } = await import('drizzle-orm');

      const now = new Date();
      const upcoming = await db
        .select({
          id: labSessionsV2.id,
          title: labSessionsV2.title,
          level: labSessionsV2.level,
          scheduledAt: labSessionsV2.scheduledAt,
          registrationCount: sql<number>`(SELECT COUNT(*) FROM ${labRegistrations} WHERE ${labRegistrations.labSessionId} = ${labSessionsV2.id})`.as('registration_count'),
        })
        .from(labSessionsV2)
        .where(gte(labSessionsV2.scheduledAt, now))
        .orderBy(labSessionsV2.scheduledAt)
        .limit(50);

      res.json({ labs: upcoming });
    } catch (err: any) {
      console.error('[GET /admin/labs/list-for-announcement] Error:', err?.message);
      res.status(500).json({ error: err?.message || 'Failed' });
    }
  });

  // Send a custom email — used for admin announcements (e.g., level-cohort
  // exam invitations, mid-cohort communications). Body: { to, subject,
  // html, cc?, replyTo? }. `to` may be a single email or an array.
  app.post('/api/admin/send-email', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { to, subject, html, cc, replyTo } = req.body;
      if (!to || !subject || !html) return res.status(400).json({ error: 'to, subject, html are required' });
      const { sendCustomEmail } = await import('./resendClient');
      const result = await sendCustomEmail(to, subject, html, { cc, replyTo });
      res.json(result);
    } catch (err: any) {
      console.error('[admin/send-email] Error:', err?.message);
      res.status(500).json({ error: err?.message || 'Failed' });
    }
  });

  // POST a new Speaking Project. Idempotent on (moduleId, level): if a
  // project already exists for that module, returns it instead of
  // creating a duplicate.
  app.post('/api/admin/speaking-projects', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { db } = await import("./db");
      const { speakingProjects } = await import('@shared/schema');
      const { eq, and } = await import("drizzle-orm");

      const existing = await db.select().from(speakingProjects).where(
        and(eq(speakingProjects.moduleId, req.body.moduleId), eq(speakingProjects.level, req.body.level))
      ).limit(1);
      if (existing[0]) return res.json(existing[0]);

      const [created] = await db.insert(speakingProjects).values(req.body).returning();
      res.json(created);
    } catch (err: any) {
      console.error('[admin/speaking-projects POST] Error:', err?.message);
      res.status(500).json({ error: err?.message || 'Failed' });
    }
  });

  // POST a new Writing Project — idempotent on (moduleId, level).
  app.post('/api/admin/writing-projects', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { db } = await import("./db");
      const { writingProjects } = await import('@shared/schema');
      const { eq, and } = await import("drizzle-orm");

      const existing = await db.select().from(writingProjects).where(
        and(eq(writingProjects.moduleId, req.body.moduleId), eq(writingProjects.level, req.body.level))
      ).limit(1);
      if (existing[0]) return res.json(existing[0]);

      const [created] = await db.insert(writingProjects).values(req.body).returning();
      res.json(created);
    } catch (err: any) {
      console.error('[admin/writing-projects POST] Error:', err?.message);
      res.status(500).json({ error: err?.message || 'Failed' });
    }
  });

  app.patch('/api/admin/speaking-projects/:id', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { id } = req.params;
      const { speakingProjects } = await import('@shared/schema');
      const allowedFields = ['title','prompt','targetVocabulary','targetGrammar','targetExpressions','targetDurationSeconds','isPublished'] as const;
      const updates: Record<string, any> = { updatedAt: new Date() };
      for (const k of allowedFields) {
        if (k in req.body) updates[k] = req.body[k];
      }
      const [updated] = await db.update(speakingProjects).set(updates).where(eq(speakingProjects.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'Speaking project not found' });
      res.json(updated);
    } catch (err: any) {
      console.error('[admin/speaking-projects PATCH] Error:', err?.message, err?.stack);
      res.status(500).json({ error: 'Failed to update speaking project', debug: { message: err?.message } });
    }
  });

  // Admin GET — list ALL projects for a course (admin sees drafts + published).
  // Used by the admin course-lessons page to render the Speaking/Writing
  // project sections per module.
  app.get('/api/admin/speaking-projects/by-course/:courseId', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { courseId } = req.params;
      const { speakingProjects, courseModules } = await import('@shared/schema');
      const rows = await db
        .select({ project: speakingProjects, moduleOrderIndex: courseModules.orderIndex })
        .from(speakingProjects)
        .innerJoin(courseModules, eq(speakingProjects.moduleId, courseModules.id))
        .where(eq(courseModules.courseId, courseId));
      res.json(rows.map(r => ({ ...r.project, moduleOrderIndex: r.moduleOrderIndex })));
    } catch (err: any) {
      console.error('[admin/speaking-projects/by-course] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch speaking projects', debug: { message: err?.message } });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // WRITING PROJECTS — student-facing text writing assessments per module
  // (mirrors Speaking Projects shape)
  // ════════════════════════════════════════════════════════════════════

  app.patch('/api/admin/writing-projects/:id', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { id } = req.params;
      const { writingProjects } = await import('@shared/schema');
      const allowedFields = ['title','prompt','targetVocabulary','targetGrammar','targetExpressions','targetWordCountMin','targetWordCountMax','isPublished'] as const;
      const updates: Record<string, any> = { updatedAt: new Date() };
      for (const k of allowedFields) {
        if (k in req.body) updates[k] = req.body[k];
      }
      const [updated] = await db.update(writingProjects).set(updates).where(eq(writingProjects.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'Writing project not found' });
      res.json(updated);
    } catch (err: any) {
      console.error('[admin/writing-projects PATCH] Error:', err?.message, err?.stack);
      res.status(500).json({ error: 'Failed to update writing project', debug: { message: err?.message } });
    }
  });

  app.get('/api/admin/writing-projects/by-course/:courseId', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { courseId } = req.params;
      const { writingProjects, courseModules } = await import('@shared/schema');
      const rows = await db
        .select({ project: writingProjects, moduleOrderIndex: courseModules.orderIndex })
        .from(writingProjects)
        .innerJoin(courseModules, eq(writingProjects.moduleId, courseModules.id))
        .where(eq(courseModules.courseId, courseId));
      res.json(rows.map(r => ({ ...r.project, moduleOrderIndex: r.moduleOrderIndex })));
    } catch (err: any) {
      console.error('[admin/writing-projects/by-course] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch writing projects', debug: { message: err?.message } });
    }
  });

  app.get('/api/writing-projects/by-module/:moduleId', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { moduleId } = req.params;
      const { writingProjects } = await import('@shared/schema');
      const [proj] = await db.select().from(writingProjects).where(eq(writingProjects.moduleId, moduleId));
      if (!proj) return res.status(404).json({ error: 'No writing project for this module' });
      const role = (req.user as any)?.role;
      const isStaff = role === 'admin' || role === 'teacher';
      if (!proj.isPublished && !isStaff) {
        return res.status(404).json({ error: 'Writing project not published yet' });
      }
      res.json(proj);
    } catch (err: any) {
      console.error('[writing-projects/by-module] Error:', err?.message, err?.stack);
      res.status(500).json({
        error: 'Failed to fetch writing project',
        debug: { message: err?.message, code: err?.code, name: err?.name },
      });
    }
  });

  app.post('/api/writing-submissions', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const studentId = req.user?.id;
      if (!studentId) return res.status(401).json({ error: 'Unauthorized' });
      const { writingProjectId, moduleId, content } = req.body;
      if (!writingProjectId || !moduleId || !content) {
        return res.status(400).json({ error: 'writingProjectId, moduleId and content are required' });
      }
      const trimmedContent = String(content).trim();
      if (trimmedContent.length === 0) {
        return res.status(400).json({ error: 'Content cannot be empty' });
      }

      const { writingProjects } = await import('@shared/schema');
      const [proj] = await db.select().from(writingProjects).where(eq(writingProjects.id, writingProjectId));
      if (!proj) return res.status(404).json({ error: 'Writing project not found' });
      if (!proj.isPublished) {
        const role = (req.user as any)?.role;
        if (role !== 'admin' && role !== 'teacher') {
          return res.status(403).json({ error: 'Writing project not published yet' });
        }
      }

      const { createWritingSubmission, processWritingSubmission } = await import('./grading/writingGrader');
      const created = await createWritingSubmission({
        studentId,
        writingProjectId,
        moduleId,
        content: trimmedContent,
      });

      res.status(202).json({
        submissionId: created.submissionId,
        status: 'pending_ai',
        message: 'Your writing was submitted and is being graded. Check back in ~30 seconds.',
      });

      processWritingSubmission(created.submissionId).catch((err) => {
        console.error('[writing-submit] background processing failed:', err);
      });
    } catch (err: any) {
      console.error('Error creating writing submission:', err);
      res.status(500).json({ error: 'Failed to submit writing' });
    }
  });

  app.get('/api/writing-submissions/:id', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { id } = req.params;
      const { submissions } = await import('@shared/schema');
      const [sub] = await db.select().from(submissions).where(eq(submissions.id, id));
      if (!sub) return res.status(404).json({ error: 'Submission not found' });
      const userId = req.user?.id;
      const role = (req.user as any)?.role;
      const isStaff = role === 'admin' || role === 'teacher';
      if (sub.studentId !== userId && !isStaff) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      res.json({
        id: sub.id,
        status: sub.status,
        moduleId: sub.moduleId,
        writingProjectId: sub.writingProjectId,
        content: sub.content,
        aiGrade: sub.aiGrade,
        aiScore: sub.aiScore,
        teacherScore: sub.teacherScore,
        teacherFeedback: sub.teacherFeedback,
        finalScore: sub.finalScore,
        submittedAt: sub.submittedAt,
        teacherReviewedAt: sub.teacherReviewedAt,
      });
    } catch (err: any) {
      console.error('Error fetching writing submission:', err);
      res.status(500).json({ error: 'Failed to fetch submission' });
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // CLASS LABS — interest-driven Conversation Labs (Phase 1.6)
  // ════════════════════════════════════════════════════════════════════

  // List all active interest topics — used by student browse + admin pickers.
  app.get('/api/lab-interest-topics', requireAuth, async (_req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { labInterestTopics } = await import('@shared/schema');
      const rows = await db.select().from(labInterestTopics).where(eq(labInterestTopics.isActive, true));
      rows.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      res.json(rows);
    } catch (err: any) {
      console.error('[lab-interest-topics] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch interest topics', debug: { message: err?.message } });
    }
  });

  // List active lab sessions for the student's level — includes both
  // sessions that haven't started yet AND sessions that started but
  // haven't ended yet (live). A session is "active" while
  // scheduled_at + duration > now AND status != 'cancelled'.
  // Each row gets bookedCount + a computed liveStatus field:
  //   'live'         — started, still within duration window
  //   'starting_soon'— within 15 min of scheduled start
  //   'upcoming'     — more than 15 min away
  app.get('/api/lab-sessions/upcoming', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq, and, count, ne, sql } = await import("drizzle-orm");
      const { labSessionsV2, labRegistrations } = await import('@shared/schema');
      const levelFilter = (req.query.level as string) || (req.user as any)?.currentLevel || 'A1';
      const now = new Date();

      // We want sessions where scheduled_at + duration_minutes > now,
      // i.e. the session has not yet ended. Compute via SQL.
      const sessions = await db
        .select()
        .from(labSessionsV2)
        .where(and(
          eq(labSessionsV2.level, levelFilter as any),
          ne(labSessionsV2.status, 'cancelled'),
          sql`${labSessionsV2.scheduledAt} + (${labSessionsV2.durationMinutes} * INTERVAL '1 minute') > NOW()`,
        ));
      sessions.sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0));

      const out: any[] = [];
      for (const s of sessions) {
        const [{ n }] = await db
          .select({ n: count() })
          .from(labRegistrations)
          .where(and(
            eq(labRegistrations.labSessionId, s.id),
            eq(labRegistrations.cancelled, false),
          ));
        const sStart = s.scheduledAt instanceof Date ? s.scheduledAt : new Date(s.scheduledAt as any);
        const sEnd = new Date(sStart.getTime() + s.durationMinutes * 60_000);
        let liveStatus: 'live' | 'starting_soon' | 'upcoming';
        if (sStart <= now && sEnd > now) liveStatus = 'live';
        else if (sStart.getTime() - now.getTime() <= 15 * 60_000) liveStatus = 'starting_soon';
        else liveStatus = 'upcoming';
        out.push({ ...s, bookedCount: Number(n), liveStatus });
      }
      res.json(out);
    } catch (err: any) {
      console.error('[lab-sessions/upcoming] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch upcoming labs', debug: { message: err?.message } });
    }
  });

  // GET single lab session by ID. Needed for the lab-room page so it can
  // resolve a session that's CURRENTLY LIVE but not in the user's
  // "upcoming" feed (which is upcoming-only by date) and not in their
  // bookings (student hadn't pre-booked). Without this, students hitting
  // LIVE NOW for an unbooked live session got "session doesn't exist".
  // Also lets admins/teachers enter any session by ID.
  app.get('/api/lab-sessions/:id', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { labSessionsV2 } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const rows = await db
        .select()
        .from(labSessionsV2)
        .where(eq(labSessionsV2.id, req.params.id))
        .limit(1);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Lab session not found' });
      }
      const row = rows[0] as any;
      // Normalize to the same shape /api/lab-sessions/upcoming returns
      res.json({
        id: row.id,
        title: row.title,
        description: row.description,
        level: row.level,
        scheduledAt: row.scheduledAt,
        durationMinutes: row.durationMinutes,
        interestTopicId: row.interestTopicId,
        meetingUrl: row.meetingUrl,
        grammarFocus: row.grammarFocus,
        vocabulary: row.vocabulary,
        expressions: row.expressions,
        status: row.status,
      });
    } catch (err: any) {
      console.error('[GET /lab-sessions/:id] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch lab session' });
    }
  });

  // Get current user's upcoming registrations.
  app.get('/api/lab-bookings/mine', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq, and, gte } = await import("drizzle-orm");
      const { labRegistrations, labSessionsV2 } = await import('@shared/schema');
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const rows = await db
        .select({ reg: labRegistrations, session: labSessionsV2 })
        .from(labRegistrations)
        .innerJoin(labSessionsV2, eq(labRegistrations.labSessionId, labSessionsV2.id))
        .where(and(
          eq(labRegistrations.studentId, userId),
          eq(labRegistrations.cancelled, false),
          gte(labSessionsV2.scheduledAt, new Date()),
        ));
      rows.sort((a, b) => (a.session.scheduledAt?.getTime() ?? 0) - (b.session.scheduledAt?.getTime() ?? 0));
      res.json(rows.map(r => ({ ...r.session, registrationId: r.reg.id, registeredAt: r.reg.registeredAt })));
    } catch (err: any) {
      console.error('[lab-bookings/mine] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch my bookings', debug: { message: err?.message } });
    }
  });

  // Book a spot in a session — enforces subscription-tier limits:
  //   free:    no access (must upgrade)
  //   flex:    1 booking per calendar month
  //   basic:   2 bookings per ISO week (Mon-Sun)
  //   premium: unlimited
  app.post('/api/lab-bookings', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq, and, count, gte } = await import("drizzle-orm");
      const { labSessionsV2, labRegistrations } = await import('@shared/schema');
      const {
        canAccessLabs,
        canBookMoreLabs,
        getStartOfCurrentWeek,
        getStartOfCurrentMonth,
        getTierLimits,
      } = await import('@shared/tier-access');
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { labSessionId } = req.body;
      if (!labSessionId) return res.status(400).json({ error: 'labSessionId required' });

      // Look up user's current subscription tier
      const tier = (req.user as any)?.subscriptionTier as 'free' | 'flex' | 'basic' | 'premium' | undefined;
      if (!canAccessLabs(tier)) {
        return res.status(403).json({
          error: 'Conversation Labs require a paid plan',
          message: 'Tu plan actual no incluye acceso a los Labs. Considera upgradear a Flex, Básico o Premium.',
          currentTier: tier ?? 'free',
        });
      }

      // Validate the target session
      const [session] = await db.select().from(labSessionsV2).where(eq(labSessionsV2.id, labSessionId));
      if (!session) return res.status(404).json({ error: 'Lab session not found' });
      if (session.status !== 'scheduled') return res.status(400).json({ error: 'Session not open for booking' });
      if (session.scheduledAt && session.scheduledAt < new Date()) return res.status(400).json({ error: 'Session already started' });

      // LEVEL ENFORCEMENT (Coral's requirement): student can only join
      // labs at their CEFR level — no A1 student in a B2 session.
      // Admins/teachers are exempt so they can observe any session.
      const studentRow = await storage.getUser(userId);
      const isStaff = studentRow?.isAdmin || (req.user as any)?.role === 'teacher';
      if (!isStaff) {
        const studentLevel = studentRow?.placementLevel || studentRow?.englishLevel;
        if (!studentLevel) {
          return res.status(403).json({
            error: 'Placement level required',
            message: 'You need to set your CEFR level before booking a Lab.',
          });
        }
        // HYBRID policy: student can book Labs at their level OR
        // ONE level above (Challenge) OR ONE level below (Refresh).
        // Higher gaps (e.g. A1 → C1) are blocked to prevent frustration.
        const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const studentIdx = LEVELS.indexOf(studentLevel);
        const sessionIdx = LEVELS.indexOf(session.level);
        const diff = sessionIdx - studentIdx;
        if (studentIdx < 0 || sessionIdx < 0 || Math.abs(diff) > 1) {
          return res.status(403).json({
            error: 'Level out of range',
            message: `This Lab is at ${session.level}. Your current level is ${studentLevel}. You can book Labs from one level above or below yours (Challenge or Refresh) — but not further.`,
            yourLevel: studentLevel,
            sessionLevel: session.level,
          });
        }
      }

      // Already registered for this exact session?
      const [existing] = await db
        .select()
        .from(labRegistrations)
        .where(and(
          eq(labRegistrations.labSessionId, labSessionId),
          eq(labRegistrations.studentId, userId),
          eq(labRegistrations.cancelled, false),
        ));
      if (existing) return res.status(409).json({ error: 'Already registered for this lab' });

      // Capacity check
      const [{ n: bookedNow }] = await db
        .select({ n: count() })
        .from(labRegistrations)
        .where(and(
          eq(labRegistrations.labSessionId, labSessionId),
          eq(labRegistrations.cancelled, false),
        ));
      if (Number(bookedNow) >= session.maxParticipants) {
        return res.status(409).json({ error: 'Lab is full' });
      }

      // Tier-quota check — count student's non-cancelled registrations
      // for sessions starting in the current week or month.
      const limits = getTierLimits(tier);
      const weekStart = getStartOfCurrentWeek();
      const monthStart = getStartOfCurrentMonth();

      let weeklyUsed = 0;
      let monthlyUsed = 0;
      if (limits.weeklyLabLimit !== null || limits.monthlyLabLimit !== null) {
        // Join registrations to sessions filtered by scheduled_at window
        if (limits.weeklyLabLimit !== null) {
          const weekly = await db
            .select({ n: count() })
            .from(labRegistrations)
            .innerJoin(labSessionsV2, eq(labRegistrations.labSessionId, labSessionsV2.id))
            .where(and(
              eq(labRegistrations.studentId, userId),
              eq(labRegistrations.cancelled, false),
              gte(labSessionsV2.scheduledAt, weekStart),
            ));
          weeklyUsed = Number(weekly[0]?.n ?? 0);
        }
        if (limits.monthlyLabLimit !== null) {
          const monthly = await db
            .select({ n: count() })
            .from(labRegistrations)
            .innerJoin(labSessionsV2, eq(labRegistrations.labSessionId, labSessionsV2.id))
            .where(and(
              eq(labRegistrations.studentId, userId),
              eq(labRegistrations.cancelled, false),
              gte(labSessionsV2.scheduledAt, monthStart),
            ));
          monthlyUsed = Number(monthly[0]?.n ?? 0);
        }
      }

      if (!canBookMoreLabs(tier, weeklyUsed, monthlyUsed)) {
        const tierLabel = tier === 'basic' ? 'Básico' : tier === 'flex' ? 'Flex' : tier ?? 'Free';
        const reason =
          limits.weeklyLabLimit !== null
            ? `Ya tienes ${weeklyUsed}/${limits.weeklyLabLimit} Labs reservados esta semana (plan ${tierLabel}).`
            : `Ya tienes ${monthlyUsed}/${limits.monthlyLabLimit} Lab reservado este mes (plan ${tierLabel}).`;
        return res.status(403).json({
          error: 'Tier limit reached',
          message: `${reason} Upgradear a Premium para reservas ilimitadas.`,
          currentTier: tier,
          weeklyUsed,
          weeklyLimit: limits.weeklyLabLimit,
          monthlyUsed,
          monthlyLimit: limits.monthlyLabLimit,
        });
      }

      const [reg] = await db.insert(labRegistrations).values({
        labSessionId,
        studentId: userId,
      }).returning();
      res.status(201).json(reg);

      // Fire-and-forget: send booking emails to teacher + student.
      // Both emails are async so they don't block the booking response.
      (async () => {
        try {
          const { sendCustomEmail } = await import('./resendClient');
          const studentName = `${studentRow?.firstName || ''} ${studentRow?.lastName || ''}`.trim() || studentRow?.email || 'A student';
          const when = new Date(session.scheduledAt!).toLocaleString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago',
          });
          // Email to teacher (Coral)
          await sendCustomEmail(
            'clozano@cognimight.com',
            `📝 ${studentName} booked your ${session.level} Lab · ${when}`,
            `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111827;">
              <div style="padding:18px 22px;background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);color:white;border-radius:10px 10px 0 0;">
                <h2 style="margin:0;font-size:18px;">📝 New booking</h2>
              </div>
              <div style="padding:22px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;background:white;">
                <p style="margin:0 0 14px;font-size:15px;"><strong>${studentName}</strong> just booked your Conversation Lab.</p>
                <div style="background:#f9fafb;padding:14px;border-radius:8px;margin:12px 0;">
                  <p style="margin:0 0 6px;"><strong>Class:</strong> ${session.title}</p>
                  <p style="margin:0 0 6px;"><strong>Level:</strong> ${session.level}</p>
                  <p style="margin:0 0 6px;"><strong>When:</strong> ${when} CT</p>
                  <p style="margin:0;"><strong>Duration:</strong> ${session.durationMinutes} min</p>
                </div>
                <a href="https://cogniboost.co/admin/labs" style="display:inline-block;background:#06b6d4;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px;">Open admin panel →</a>
                <p style="font-size:12px;color:#6b7280;margin-top:18px;">CogniBoost · Teacher notifications</p>
              </div>
            </div>`,
          );
          // Email to student (confirmation)
          if (studentRow?.email) {
            await sendCustomEmail(
              studentRow.email,
              `✅ Your ${session.level} Conversation Lab is booked — ${when} CT`,
              `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
                <div style="padding:20px 24px;background:linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#06b6d4 100%);color:white;border-radius:12px 12px 0 0;">
                  <div style="font-size:20px;font-weight:800;">COGNI<span style="color:#06b6d4;">BOOST</span></div>
                  <div style="font-size:13px;opacity:0.85;margin-top:4px;">Booking confirmed ✓</div>
                </div>
                <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:white;">
                  <h1 style="font-size:20px;margin:0 0 12px;">Hi ${studentRow.firstName || 'there'} 👋 — you're in!</h1>
                  <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Your spot is reserved. See you at the Lab.</p>
                  <div style="background:#ecfeff;border:2px solid #06b6d4;border-radius:10px;padding:16px;margin:16px 0;">
                    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0e7490;font-weight:700;">Your class</p>
                    <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#0c4a6e;">${session.title}</p>
                    <p style="margin:0;font-size:14px;color:#0c4a6e;">🗓️ ${when} CT · ${session.durationMinutes} min</p>
                  </div>
                  <p style="font-size:14px;margin:14px 0;">A few minutes before class, click <strong>JOIN MY CLASS</strong> below. You'll also see a red <strong style="color:#dc2626;">LIVE NOW</strong> banner on your dashboard when class starts.</p>
                  <div style="text-align:center;margin:18px 0;">
                    <a href="${session.meetingUrl}" style="display:inline-block;background:#06b6d4;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">🎙️ JOIN MY CLASS</a>
                  </div>
                  <p style="font-size:13px;color:#6b7280;margin-top:18px;">See you soon!<br/><strong style="color:#111827;">Coral Lozano, M.Ed.</strong></p>
                </div>
              </div>`,
            );
          }
        } catch (emailErr: any) {
          console.warn('[lab-bookings POST] email send failed (non-fatal):', emailErr?.message);
        }
      })();
    } catch (err: any) {
      console.error('[lab-bookings POST] Error:', err?.message);
      res.status(500).json({ error: 'Failed to book lab', debug: { message: err?.message } });
    }
  });

  // ─── Health / monitoring status (admin-only) ──────────────────────────
  // Used by Coral to verify Sentry + critical services are wired up
  // without having to read Railway logs.
  app.get('/api/admin/health/monitoring', requireAuth, async (req: any, res) => {
    try {
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      res.json({
        sentry: {
          configured: !!process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
        },
        anthropic: {
          configured: !!process.env.ANTHROPIC_API_KEY,
        },
        openai: {
          configured: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        },
        gcs: {
          configured: !!(process.env.GCS_BUCKET_NAME && process.env.GCS_SERVICE_ACCOUNT),
          bucket: process.env.GCS_BUCKET_NAME || null,
        },
        resend: {
          configured: !!process.env.RESEND_API_KEY,
        },
        stripe: {
          configured: !!process.env.STRIPE_SECRET_KEY,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // POST a test Sentry event — admin-only. Fires a captured exception so
  // Coral can verify alerts work after configuring SENTRY_DSN.
  app.post('/api/admin/health/sentry-test', requireAuth, async (req: any, res) => {
    try {
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      if (!process.env.SENTRY_DSN) {
        return res.status(412).json({ error: 'SENTRY_DSN not set — add it to Railway variables first.' });
      }
      const { captureMessage, captureError } = await import('./monitoring');
      captureMessage(`[SENTRY-TEST] Manual verification from admin ${req.user?.email || req.user?.id} at ${new Date().toISOString()}`, 'info');
      captureError(new Error('[SENTRY-TEST] This is a manual test exception — safe to ignore'));
      res.json({ ok: true, message: 'Test event + error sent. Check your Sentry project — should appear within ~30s.' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ─── ADMIN endpoints for Lab management ────────────────────────────────

  app.get('/api/admin/lab-sessions', requireAuth, async (req: any, res) => {
    try {
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { db } = await import("./db");
      const { eq, and, count } = await import("drizzle-orm");
      const { labSessionsV2, labRegistrations } = await import('@shared/schema');
      const rows = await db.select().from(labSessionsV2);
      rows.sort((a, b) => (b.scheduledAt?.getTime() ?? 0) - (a.scheduledAt?.getTime() ?? 0)); // newest first
      const out: any[] = [];
      for (const s of rows) {
        const [{ n }] = await db
          .select({ n: count() })
          .from(labRegistrations)
          .where(and(eq(labRegistrations.labSessionId, s.id), eq(labRegistrations.cancelled, false)));
        out.push({ ...s, bookedCount: Number(n) });
      }
      res.json(out);
    } catch (err: any) {
      console.error('[admin/lab-sessions GET] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch lab sessions', debug: { message: err?.message } });
    }
  });

  app.post('/api/admin/lab-sessions', requireAuth, async (req: any, res) => {
    try {
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { db } = await import("./db");
      const { labSessionsV2 } = await import('@shared/schema');
      const {
        interestTopicId, level, title, description, grammarFocus,
        vocabulary, expressions, moduleReference,
        scheduledAt, durationMinutes, meetingUrl, maxParticipants,
        isRecurring, recurrencePattern, seriesId, recurrenceEndDate,
      } = req.body;
      if (!interestTopicId || !level || !title || !scheduledAt) {
        return res.status(400).json({ error: 'interestTopicId, level, title and scheduledAt are required' });
      }
      const [created] = await db.insert(labSessionsV2).values({
        interestTopicId,
        level,
        title,
        description: description || null,
        grammarFocus: grammarFocus || null,
        vocabulary: Array.isArray(vocabulary) ? vocabulary : [],
        expressions: Array.isArray(expressions) ? expressions : [],
        moduleReference: moduleReference || null,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes ?? 60,
        meetingUrl: meetingUrl || null,
        maxParticipants: maxParticipants ?? 8,
        status: 'scheduled',
        isRecurring: !!isRecurring,
        recurrencePattern: recurrencePattern || null,
        seriesId: seriesId || null,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      }).returning();
      res.status(201).json(created);
    } catch (err: any) {
      console.error('[admin/lab-sessions POST] Error:', err?.message);
      res.status(500).json({ error: 'Failed to create lab session', debug: { message: err?.message } });
    }
  });

  app.patch('/api/admin/lab-sessions/:id', requireAuth, async (req: any, res) => {
    try {
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { labSessionsV2 } = await import('@shared/schema');
      const { id } = req.params;
      const allowedFields = ['interestTopicId','level','title','description','grammarFocus','vocabulary','expressions','moduleReference','scheduledAt','durationMinutes','meetingUrl','maxParticipants','status'] as const;
      const updates: Record<string, any> = { updatedAt: new Date() };
      for (const k of allowedFields) {
        if (k in req.body) {
          updates[k] = k === 'scheduledAt' && req.body[k] ? new Date(req.body[k]) : req.body[k];
        }
      }
      const [updated] = await db.update(labSessionsV2).set(updates).where(eq(labSessionsV2.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'Lab session not found' });
      res.json(updated);
    } catch (err: any) {
      console.error('[admin/lab-sessions PATCH] Error:', err?.message);
      res.status(500).json({ error: 'Failed to update lab session', debug: { message: err?.message } });
    }
  });

  app.delete('/api/admin/lab-sessions/:id', requireAuth, async (req: any, res) => {
    try {
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { labSessionsV2 } = await import('@shared/schema');
      const { id } = req.params;
      const [cancelled] = await db.update(labSessionsV2)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(labSessionsV2.id, id))
        .returning();
      if (!cancelled) return res.status(404).json({ error: 'Lab session not found' });
      res.json({ ok: true, session: cancelled });
    } catch (err: any) {
      console.error('[admin/lab-sessions DELETE] Error:', err?.message);
      res.status(500).json({ error: 'Failed to cancel lab session', debug: { message: err?.message } });
    }
  });

  app.get('/api/admin/lab-sessions/:id/registrations', requireAuth, async (req: any, res) => {
    try {
      if (!isStaffUser(req)) return res.status(403).json({ error: 'Forbidden — staff only' });
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      const { labRegistrations, users } = await import('@shared/schema');
      const { id } = req.params;
      const rows = await db
        .select({ reg: labRegistrations, user: users })
        .from(labRegistrations)
        .innerJoin(users, eq(labRegistrations.studentId, users.id))
        .where(and(eq(labRegistrations.labSessionId, id), eq(labRegistrations.cancelled, false)));
      res.json(rows.map(r => ({
        registrationId: r.reg.id,
        registeredAt: r.reg.registeredAt,
        attended: r.reg.attended,
        speakingTimeMinutes: r.reg.speakingTimeMinutes,
        teacherFeedback: r.reg.teacherFeedback,
        teacherRating: r.reg.teacherRating,
        student: {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          email: r.user.email,
          subscriptionTier: (r.user as any).subscriptionTier,
        },
      })));
    } catch (err: any) {
      console.error('[admin/lab-sessions registrations] Error:', err?.message);
      res.status(500).json({ error: 'Failed to fetch registrations', debug: { message: err?.message } });
    }
  });

  // Cancel a booking.
  app.delete('/api/lab-bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq, and } = await import("drizzle-orm");
      const { labRegistrations } = await import('@shared/schema');
      const userId = req.user?.id;
      const { id } = req.params;
      const [reg] = await db.select().from(labRegistrations).where(eq(labRegistrations.id, id));
      if (!reg) return res.status(404).json({ error: 'Booking not found' });
      if (reg.studentId !== userId) return res.status(403).json({ error: 'Forbidden' });
      await db.update(labRegistrations).set({ cancelled: true, cancelledAt: new Date() }).where(eq(labRegistrations.id, id));
      res.json({ ok: true });

      // Fire-and-forget: notify teacher (Coral) of the cancellation
      (async () => {
        try {
          const { labSessionsV2 } = await import('@shared/schema');
          const [session] = await db.select().from(labSessionsV2).where(eq(labSessionsV2.id, reg.labSessionId));
          const studentRow = await storage.getUser(userId);
          if (!session) return;
          const studentName = `${studentRow?.firstName || ''} ${studentRow?.lastName || ''}`.trim() || studentRow?.email || 'A student';
          const when = new Date(session.scheduledAt!).toLocaleString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago',
          });
          const { sendCustomEmail } = await import('./resendClient');
          await sendCustomEmail(
            'clozano@cognimight.com',
            `↩️ ${studentName} cancelled their ${session.level} Lab · ${when}`,
            `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#111827;">
              <div style="padding:18px 22px;background:linear-gradient(135deg,#f59e0b 0%,#dc2626 100%);color:white;border-radius:10px 10px 0 0;">
                <h2 style="margin:0;font-size:18px;">↩️ Booking cancelled</h2>
              </div>
              <div style="padding:22px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;background:white;">
                <p style="margin:0 0 14px;font-size:15px;"><strong>${studentName}</strong> cancelled their spot in:</p>
                <div style="background:#f9fafb;padding:14px;border-radius:8px;">
                  <p style="margin:0 0 6px;"><strong>Class:</strong> ${session.title}</p>
                  <p style="margin:0;"><strong>When:</strong> ${when} CT</p>
                </div>
                <p style="font-size:12px;color:#6b7280;margin-top:18px;">CogniBoost · Teacher notifications</p>
              </div>
            </div>`,
          );
        } catch (emailErr: any) {
          console.warn('[lab-bookings DELETE] email send failed (non-fatal):', emailErr?.message);
        }
      })();
    } catch (err: any) {
      console.error('[lab-bookings DELETE] Error:', err?.message);
      res.status(500).json({ error: 'Failed to cancel booking', debug: { message: err?.message } });
    }
  });

  // GET the current state of a speaking submission (used for client polling).
  app.get('/api/speaking-submissions/:id', requireAuth, async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { id } = req.params;
      const { submissions } = await import('@shared/schema');
      const [sub] = await db.select().from(submissions).where(eq(submissions.id, id));
      if (!sub) return res.status(404).json({ error: 'Submission not found' });
      // Authorize: must be the student who submitted it, or staff.
      const userId = req.user?.id;
      const role = (req.user as any)?.role;
      const isStaff = role === 'admin' || role === 'teacher';
      if (sub.studentId !== userId && !isStaff) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      res.json({
        id: sub.id,
        status: sub.status,
        moduleId: sub.moduleId,
        speakingProjectId: sub.speakingProjectId,
        audioUrl: sub.audioUrl,
        videoUrl: sub.videoUrl,
        transcript: sub.transcript,
        durationSeconds: sub.durationSeconds,
        aiGrade: sub.aiGrade,
        aiScore: sub.aiScore,
        teacherScore: sub.teacherScore,
        teacherFeedback: sub.teacherFeedback,
        finalScore: sub.finalScore,
        submittedAt: sub.submittedAt,
        teacherReviewedAt: sub.teacherReviewedAt,
      });
    } catch (err: any) {
      console.error('Error fetching speaking submission:', err);
      res.status(500).json({ error: 'Failed to fetch submission' });
    }
  });

  /* ===================================================================
   * FINAL EXAMS + CERTIFICATES (Phase 1.7)
   * ===================================================================
   * Endpoints in this section:
   *   GET    /api/final-exams/:level/eligibility    — can the user take it?
   *   GET    /api/final-exams/:level                — exam config + questions (no correct answers)
   *   POST   /api/final-exams/:level/start          — create a new attempt
   *   GET    /api/final-exam-attempts/mine          — list my attempts
   *   GET    /api/final-exam-attempts/:id           — single attempt
   *   POST   /api/final-exam-attempts/:id/submit-quiz  — auto-grade quiz answers
   *   POST   /api/final-exam-attempts/:id/finalize  — compute weighted score, issue cert if passed
   *   GET    /api/certificates/mine                 — my certificates
   *   GET    /api/verify/:code                      — PUBLIC certificate verification
   *
   *   Admin:
   *   GET    /api/admin/final-exams                 — all exams
   *   PATCH  /api/admin/final-exams/:id             — edit exam config
   *   GET    /api/admin/final-exams/:examId/questions
   *   POST   /api/admin/final-exam-questions
   *   PATCH  /api/admin/final-exam-questions/:id
   *   DELETE /api/admin/final-exam-questions/:id
   */

  // Helper: short URL-safe code for certificate verification
  function makeVerificationCode(): string {
    // 12-char base36, e.g. "k9x4qp2lm7nz"
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
  }

  // Eligibility: user must have 100% lesson completion across the level's
  // course before they can sit the Final Exam.
  app.get("/api/final-exams/:level/eligibility", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const level = req.params.level;
      const { db } = await import("./db");
      const { courses, lessons, lessonProgress, finalExams, finalExamAttempts } = await import("@shared/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      // Find the course at this level
      const courseRows = await db.select().from(courses).where(eq(courses.level, level)).limit(1);
      const course = courseRows[0];
      if (!course) return res.json({ eligible: false, reason: "No course found for this level" });

      // Count total lessons + completed lessons
      const allLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, course.id));
      const totalLessons = allLessons.length;
      if (totalLessons === 0) return res.json({ eligible: false, reason: "Course has no lessons yet" });

      const completed = await db
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.isCompleted, true)));
      const lessonIdSet = new Set(allLessons.map(l => l.id));
      const completedInCourse = completed.filter(c => lessonIdSet.has(c.lessonId)).length;
      const completionPct = Math.round((completedInCourse / totalLessons) * 100);

      const exam = (await db.select().from(finalExams).where(eq(finalExams.level, level)).limit(1))[0];
      if (!exam) return res.json({ eligible: false, reason: "Exam not configured", completionPct, totalLessons, completedInCourse });
      if (!exam.isPublished) return res.json({ eligible: false, reason: "Exam not yet published", completionPct, totalLessons, completedInCourse, exam });

      // Has the user already passed? Block re-takes after pass.
      const priorPass = await db
        .select()
        .from(finalExamAttempts)
        .where(and(eq(finalExamAttempts.userId, userId), eq(finalExamAttempts.examId, exam.id), eq(finalExamAttempts.passed, true)))
        .limit(1);
      if (priorPass.length > 0) {
        return res.json({ eligible: false, reason: "Already passed", alreadyPassed: true, attemptId: priorPass[0].id, completionPct, exam });
      }

      const eligible = completedInCourse === totalLessons;
      res.json({
        eligible,
        reason: eligible ? null : `Complete all lessons first (${completedInCourse}/${totalLessons})`,
        completionPct,
        totalLessons,
        completedInCourse,
        exam,
      });
    } catch (e: any) {
      console.error("Eligibility check failed:", e);
      res.status(500).json({ error: e?.message || "Eligibility check failed" });
    }
  });

  // Exam config + question bank for student. correctAnswer is stripped.
  app.get("/api/final-exams/:level", requireAuth, async (req: any, res) => {
    try {
      const level = req.params.level;
      const { db } = await import("./db");
      const { finalExams, finalExamQuestions } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");

      const exam = (await db.select().from(finalExams).where(eq(finalExams.level, level)).limit(1))[0];
      if (!exam) return res.status(404).json({ error: "Exam not found" });
      const questions = await db
        .select()
        .from(finalExamQuestions)
        .where(eq(finalExamQuestions.examId, exam.id))
        .orderBy(asc(finalExamQuestions.orderIndex));

      // Strip correctAnswer + explanation so the student can't peek in DevTools
      const safe = questions.map(({ correctAnswer, explanation, ...rest }) => rest);
      res.json({ ...exam, questions: safe });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to load exam" });
    }
  });

  app.post("/api/final-exams/:level/start", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const level = req.params.level;
      const { db } = await import("./db");
      const { finalExams, finalExamAttempts } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const exam = (await db.select().from(finalExams).where(eq(finalExams.level, level)).limit(1))[0];
      if (!exam) return res.status(404).json({ error: "Exam not found" });

      // Resume an in-progress attempt if one already exists; otherwise create
      const inProgress = await db
        .select()
        .from(finalExamAttempts)
        .where(and(eq(finalExamAttempts.userId, userId), eq(finalExamAttempts.examId, exam.id), eq(finalExamAttempts.status, "in_progress")))
        .limit(1);
      if (inProgress[0]) return res.json(inProgress[0]);

      const [created] = await db
        .insert(finalExamAttempts)
        .values({ userId, examId: exam.id, status: "in_progress" })
        .returning();
      res.json(created);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to start attempt" });
    }
  });

  app.get("/api/final-exam-attempts/mine", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { db } = await import("./db");
      const { finalExamAttempts } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(finalExamAttempts)
        .where(eq(finalExamAttempts.userId, userId))
        .orderBy(desc(finalExamAttempts.startedAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.get("/api/final-exam-attempts/:id", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { db } = await import("./db");
      const { finalExamAttempts } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      // Fetch the row WITHOUT ownership filter first, then enforce access:
      // owner OR admin/teacher. Previously this filtered by userId in the
      // WHERE clause, which made it impossible for admins to view any
      // student's attempt — they always got 404 (Coral hit this trying to
      // review Nadellys's exam, May 23).
      const [row] = await db
        .select()
        .from(finalExamAttempts)
        .where(eq(finalExamAttempts.id, req.params.id))
        .limit(1);
      if (!row) return res.status(404).json({ error: "Not found" });

      const isOwner = row.userId === userId;
      let isAdmin = false;
      if (!isOwner) {
        const caller = await storage.getUser(userId);
        isAdmin = !!caller?.isAdmin;
      }
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json(row);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  // Admin/teacher: list a specific student's exam attempts.
  // Usage:  GET /api/admin/final-exam-attempts?studentId=<uuid>
  //     or  GET /api/admin/final-exam-attempts?studentEmail=<email>
  app.get("/api/admin/final-exam-attempts", requireAuth, async (req: any, res) => {
    try {
      const callerId = (req.user as any)?.id;
      const caller = await storage.getUser(callerId);
      if (!caller?.isAdmin) {
        return res.status(403).json({ error: "Forbidden — teacher access required" });
      }

      const { studentId, studentEmail } = req.query as { studentId?: string; studentEmail?: string };
      if (!studentId && !studentEmail) {
        return res.status(400).json({ error: "Provide studentId or studentEmail" });
      }

      const { db } = await import("./db");
      const { finalExamAttempts, users, finalExams } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      // Resolve student
      let targetUserId = studentId || "";
      if (!targetUserId && studentEmail) {
        const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, studentEmail)).limit(1);
        if (!u) return res.status(404).json({ error: `No student found with email ${studentEmail}` });
        targetUserId = u.id;
      }

      // Pull attempts + join the exam title/level so the admin UI doesn't
      // need a follow-up call per attempt.
      const rows = await db
        .select({
          id: finalExamAttempts.id,
          userId: finalExamAttempts.userId,
          examId: finalExamAttempts.examId,
          status: finalExamAttempts.status,
          startedAt: finalExamAttempts.startedAt,
          completedAt: finalExamAttempts.completedAt,
          quizScore: finalExamAttempts.quizScore,
          writingScore: finalExamAttempts.writingScore,
          speakingScore: finalExamAttempts.speakingScore,
          totalScore: finalExamAttempts.finalScore,
          isPassed: finalExamAttempts.passed,
          writingSubmissionId: finalExamAttempts.writingSubmissionId,
          speakingSubmissionId: finalExamAttempts.speakingSubmissionId,
          examLevel: finalExams.level,
          examTitle: finalExams.title,
        })
        .from(finalExamAttempts)
        .leftJoin(finalExams, eq(finalExamAttempts.examId, finalExams.id))
        .where(eq(finalExamAttempts.userId, targetUserId))
        .orderBy(desc(finalExamAttempts.startedAt));

      res.json({ studentId: targetUserId, attempts: rows });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  // Writing section — student types a response to the exam's writingPrompt.
  // We reuse the writing rubric grader (gradeWriting) directly with the
  // exam's prompt + level. The submission row is stored without a
  // writingProjectId (the link to the curriculum is via the attempt + exam).
  app.post("/api/final-exam-attempts/:id/submit-writing", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const attemptId = req.params.id;
      const { text } = req.body as { text: string };
      if (!text || typeof text !== "string" || text.trim().length < 20) {
        return res.status(400).json({ error: "Writing text is too short" });
      }

      const { db } = await import("./db");
      const { finalExamAttempts, finalExams, submissions } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [attempt] = await db.select().from(finalExamAttempts)
        .where(and(eq(finalExamAttempts.id, attemptId), eq(finalExamAttempts.userId, userId)))
        .limit(1);
      if (!attempt) return res.status(404).json({ error: "Attempt not found" });
      const [exam] = await db.select().from(finalExams).where(eq(finalExams.id, attempt.examId)).limit(1);
      if (!exam) return res.status(404).json({ error: "Exam not found" });

      // Insert submission row (assignmentType='writing', no writingProjectId)
      const [sub] = await db.insert(submissions).values({
        studentId: userId,
        assignmentType: "writing",
        content: text,
        status: "pending_ai",
      } as any).returning({ id: submissions.id });

      // Link to attempt
      const [updated] = await db
        .update(finalExamAttempts)
        .set({ writingSubmissionId: sub.id, status: "writing_done" })
        .where(eq(finalExamAttempts.id, attemptId))
        .returning();

      res.status(202).json({ submissionId: sub.id, attempt: updated });

      // Fire async grading using the exam's prompt + level
      (async () => {
        try {
          const { gradeWriting } = await import("./grading/writingPrompt");
          const { grade } = await gradeWriting({
            targetLevel: exam.level as any,
            assignment: exam.title,
            writingPrompt: exam.writingPrompt || "Write at level.",
            studentText: text,
          });
          await db.update(submissions).set({
            aiGrade: grade as any,
            aiScore: String(grade.overall_score),
            status: "ai_graded",
          }).where(eq(submissions.id, sub.id));
          console.log(`[exam-writing] Submission ${sub.id} graded ${grade.overall_score}/100`);
        } catch (err: any) {
          console.error("[exam-writing] Grading failed:", err?.message);
          await db.update(submissions).set({
            aiGrade: { error: true, message: "Grading failed.", errorDetail: String(err?.message).slice(0,500) } as any,
            status: "pending_ai",
          }).where(eq(submissions.id, sub.id)).catch(() => {});
        }
      })();
    } catch (e: any) {
      console.error("submit-writing exam error:", e);
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  // Speaking section — student uploads an audio (or video) recording. We
  // reuse the GCS upload + Whisper transcription + Claude speaking grader
  // pipeline already used by Speaking Projects.
  app.post(
    "/api/final-exam-attempts/:id/submit-speaking",
    requireAuth,
    uploadSpeaking.single("recording"),
    async (req: any, res) => {
      try {
        const userId = (req.user as any)?.id;
        const attemptId = req.params.id;
        if (!req.file) return res.status(400).json({ error: "No recording file" });

        const { db } = await import("./db");
        const { finalExamAttempts, finalExams, submissions } = await import("@shared/schema");
        const { eq, and } = await import("drizzle-orm");

        const [attempt] = await db.select().from(finalExamAttempts)
          .where(and(eq(finalExamAttempts.id, attemptId), eq(finalExamAttempts.userId, userId)))
          .limit(1);
        if (!attempt) return res.status(404).json({ error: "Attempt not found" });
        const [exam] = await db.select().from(finalExams).where(eq(finalExams.id, attempt.examId)).limit(1);
        if (!exam) return res.status(404).json({ error: "Exam not found" });

        const isVideo = String(req.body?.isVideo) === "true";
        const clientDurationSeconds = req.body?.clientDurationSeconds ? Number(req.body.clientDurationSeconds) : null;

        // Upload audio to GCS (same flow as speakingGrader.createSpeakingSubmission)
        const { uploadToGcs } = await import("./gcsDirectUpload");
        const uploaded = await uploadToGcs(
          req.file.buffer,
          req.file.originalname || `exam-recording-${Date.now()}.webm`,
          req.file.mimetype,
        );

        // Insert submission row
        const [sub] = await db.insert(submissions).values({
          studentId: userId,
          assignmentType: "speaking_recording",
          content: "",
          audioUrl: isVideo ? null : uploaded.url,
          videoUrl: isVideo ? uploaded.url : null,
          durationSeconds: clientDurationSeconds,
          status: "pending_ai",
        } as any).returning({ id: submissions.id });

        // Link to attempt
        const [updated] = await db
          .update(finalExamAttempts)
          .set({ speakingSubmissionId: sub.id, status: "speaking_done" })
          .where(eq(finalExamAttempts.id, attemptId))
          .returning();

        res.status(202).json({ submissionId: sub.id, attempt: updated, audioUrl: uploaded.url });

        // Fire async grading: Whisper → Claude speaking grader
        (async () => {
          try {
            const { transcribeFromBuffer } = await import("./grading/whisperClient");
            const { gradeSpeaking } = await import("./grading/speakingPrompt");

            // Re-fetch audio from GCS for transcription (already uploaded)
            // Simpler: reuse the buffer we already have in memory
            const transcription = await transcribeFromBuffer(req.file.buffer, req.file.originalname || "exam.webm");
            const { grade } = await gradeSpeaking({
              targetLevel: exam.level as any,
              speakingPrompt: exam.speakingPrompt || "Speak at level.",
              targetVocabulary: [],
              targetGrammar: [],
              targetExpressions: [],
              targetDurationSeconds: exam.speakingMinSeconds || 60,
              transcript: transcription.transcript,
              actualDurationSeconds: transcription.durationSeconds || (clientDurationSeconds || 0),
              whisperConfidence: transcription.avgConfidence,
            });
            await db.update(submissions).set({
              content: transcription.transcript,
              transcript: transcription.transcript,
              aiGrade: grade as any,
              aiScore: String(grade.overall_score),
              durationSeconds: Math.round(transcription.durationSeconds) || clientDurationSeconds,
              status: "ai_graded",
            } as any).where(eq(submissions.id, sub.id));
            console.log(`[exam-speaking] Submission ${sub.id} graded ${grade.overall_score}/100`);
          } catch (err: any) {
            console.error("[exam-speaking] Grading failed:", err?.message);
            await db.update(submissions).set({
              aiGrade: { error: true, message: "Grading failed.", errorDetail: String(err?.message).slice(0,500) } as any,
              status: "pending_ai",
            }).where(eq(submissions.id, sub.id)).catch(() => {});
          }
        })();
      } catch (e: any) {
        console.error("submit-speaking exam error:", e);
        res.status(500).json({ error: e?.message || "Failed" });
      }
    }
  );

  app.post("/api/final-exam-attempts/:id/submit-quiz", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const attemptId = req.params.id;
      const { answers } = req.body as { answers: Record<string, string> };
      if (!answers || typeof answers !== "object") return res.status(400).json({ error: "answers required" });

      const { db } = await import("./db");
      const { finalExamAttempts, finalExamQuestions } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [attempt] = await db.select().from(finalExamAttempts)
        .where(and(eq(finalExamAttempts.id, attemptId), eq(finalExamAttempts.userId, userId)))
        .limit(1);
      if (!attempt) return res.status(404).json({ error: "Attempt not found" });

      const questions = await db.select().from(finalExamQuestions).where(eq(finalExamQuestions.examId, attempt.examId));
      let totalPoints = 0;
      let earnedPoints = 0;
      for (const q of questions) {
        totalPoints += q.points;
        const userAns = (answers[q.id] || "").toString().trim().toLowerCase();
        const correct = (q.correctAnswer || "").toString().trim().toLowerCase();
        if (userAns && userAns === correct) earnedPoints += q.points;
      }
      const quizScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10000) / 100 : 0;

      const [updated] = await db
        .update(finalExamAttempts)
        .set({ quizAnswers: answers, quizScore: String(quizScore) as any, status: "quiz_done" })
        .where(eq(finalExamAttempts.id, attemptId))
        .returning();

      res.json({ ...updated, totalPoints, earnedPoints });
    } catch (e: any) {
      console.error("submit-quiz error:", e);
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  // Finalize: combine quiz/writing/speaking scores using exam weights.
  // Writing + Speaking scores are pulled from their respective submission
  // rows (if linked). Pass threshold = exam.passingScore. On pass we
  // issue a Certificate row with a fresh verification code.
  app.post("/api/final-exam-attempts/:id/finalize", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const attemptId = req.params.id;
      const { db } = await import("./db");
      const { finalExamAttempts, finalExams, submissions, certificates } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      const [attempt] = await db.select().from(finalExamAttempts)
        .where(and(eq(finalExamAttempts.id, attemptId), eq(finalExamAttempts.userId, userId)))
        .limit(1);
      if (!attempt) return res.status(404).json({ error: "Attempt not found" });
      const [exam] = await db.select().from(finalExams).where(eq(finalExams.id, attempt.examId)).limit(1);
      if (!exam) return res.status(404).json({ error: "Exam not found" });

      const quiz = Number(attempt.quizScore || 0);

      // Pull writing + speaking scores from submissions if linked.
      // If a submission is linked but still grading (aiScore is null and
      // there's no error envelope), return 425 so the frontend can wait
      // and retry — otherwise the student would get a 0 for that
      // section and unfairly fail.
      let writing = Number(attempt.writingScore || 0);
      let speaking = Number(attempt.speakingScore || 0);
      const stillGrading: string[] = [];
      if (attempt.writingSubmissionId) {
        const [w] = await db.select().from(submissions).where(eq(submissions.id, attempt.writingSubmissionId)).limit(1);
        if (w?.aiScore) writing = Number(w.aiScore);
        else if (w && !(w.aiGrade as any)?.error && exam.writingWeight > 0) stillGrading.push("writing");
      }
      if (attempt.speakingSubmissionId) {
        const [s] = await db.select().from(submissions).where(eq(submissions.id, attempt.speakingSubmissionId)).limit(1);
        if (s?.aiScore) speaking = Number(s.aiScore);
        else if (s && !(s.aiGrade as any)?.error && exam.speakingWeight > 0) stillGrading.push("speaking");
      }
      if (stillGrading.length > 0) {
        return res.status(425).json({
          error: "still_grading",
          message: `${stillGrading.join(" and ")} ${stillGrading.length === 1 ? "is" : "are"} still being graded by AI. Please wait ~20 seconds and try again.`,
          stillGrading,
        });
      }

      const total = exam.quizWeight + exam.writingWeight + exam.speakingWeight;
      const final = total > 0 ? (quiz * exam.quizWeight + writing * exam.writingWeight + speaking * exam.speakingWeight) / total : 0;
      const passed = final >= exam.passingScore;

      const [updated] = await db
        .update(finalExamAttempts)
        .set({
          quizScore: String(quiz) as any,
          writingScore: String(writing) as any,
          speakingScore: String(speaking) as any,
          finalScore: String(Math.round(final * 100) / 100) as any,
          passed,
          status: passed ? "passed" : "failed",
          completedAt: new Date(),
        })
        .where(eq(finalExamAttempts.id, attemptId))
        .returning();

      let certificate = null;
      let unlockedLevel: string | null = null;
      if (passed) {
        const userRow = await storage.getUser(userId);
        const studentName = [userRow?.firstName, userRow?.lastName].filter(Boolean).join(" ") || userRow?.email || "Student";
        const code = makeVerificationCode();
        const [cert] = await db
          .insert(certificates)
          .values({
            userId,
            examAttemptId: attemptId,
            level: exam.level,
            studentName,
            finalScore: String(Math.round(final * 100) / 100) as any,
            verificationCode: code,
          })
          .returning();
        certificate = cert;

        // Level-up: bump user_stats.currentLevel to the next CEFR level.
        // The catalog reads from user_stats.currentLevel (with placement
        // quiz fallback) to decide what's unlocked, so this unlocks the
        // next course automatically.
        const ladder = ["A1", "A2", "B1", "B2", "C1"];
        const idx = ladder.indexOf(exam.level);
        const nextLevel = idx >= 0 && idx < ladder.length - 1 ? ladder[idx + 1] : null;
        if (nextLevel) {
          try {
            const existingStats = await storage.getUserStats(userId);
            await storage.upsertUserStats({
              userId,
              currentLevel: nextLevel as any,
              totalHoursStudied: existingStats?.totalHoursStudied ?? "0",
              coursesCompleted: (existingStats?.coursesCompleted ?? 0) + 1,
              labsAttended: existingStats?.labsAttended ?? 0,
              xpPoints: (existingStats?.xpPoints ?? 0) + 200, // 200 XP bonus for passing
              speakingMinutes: existingStats?.speakingMinutes ?? 0,
              vocabularyWords: existingStats?.vocabularyWords ?? 0,
            } as any);
            unlockedLevel = nextLevel;
            console.log(`[finalize] Level up! ${userId} unlocked ${nextLevel}`);
          } catch (e: any) {
            console.error("[finalize] level-up failed:", e?.message);
          }
        }
      }

      res.json({ attempt: updated, certificate, unlockedLevel });
    } catch (e: any) {
      console.error("finalize error:", e);
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.get("/api/certificates/mine", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id;
      const { db } = await import("./db");
      const { certificates } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const rows = await db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  // PUBLIC — anyone with the code can verify authenticity
  app.get("/api/verify/:code", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { certificates } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [cert] = await db.select().from(certificates).where(eq(certificates.verificationCode, req.params.code)).limit(1);
      if (!cert) return res.status(404).json({ valid: false, error: "Certificate not found" });
      if (cert.revoked) return res.json({ valid: false, revoked: true, reason: cert.revokedReason || "Revoked" });
      res.json({
        valid: true,
        level: cert.level,
        studentName: cert.studentName,
        finalScore: cert.finalScore,
        issuedAt: cert.issuedAt,
        signatureName: cert.signatureName,
        verificationCode: cert.verificationCode,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Verification failed" });
    }
  });

  /* --- Admin endpoints for the question bank ----------------------- */

  app.get("/api/admin/final-exams", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { finalExams } = await import("@shared/schema");
      const { asc } = await import("drizzle-orm");
      const rows = await db.select().from(finalExams).orderBy(asc(finalExams.level));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  // Create (or replace by level) a Final Exam shell. Idempotent on
  // `level` — if an exam already exists for the level, return it.
  app.post("/api/admin/final-exams", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { finalExams } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const existing = await db.select().from(finalExams).where(eq(finalExams.level, req.body.level)).limit(1);
      if (existing.length > 0) return res.json(existing[0]);

      const [created] = await db.insert(finalExams).values(req.body).returning();
      res.json(created);
    } catch (e: any) {
      console.error("create exam error:", e);
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.patch("/api/admin/final-exams/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { finalExams } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const allowed = ["title", "description", "passingScore", "quizWeight", "writingWeight", "speakingWeight",
        "writingPrompt", "writingMinWords", "writingMaxWords", "speakingPrompt", "speakingMinSeconds",
        "speakingMaxSeconds", "durationMinutes", "isPublished"];
      const patch: any = {};
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
      patch.updatedAt = new Date();
      const [updated] = await db.update(finalExams).set(patch).where(eq(finalExams.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.get("/api/admin/final-exams/:examId/questions", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { finalExamQuestions } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");
      const rows = await db.select().from(finalExamQuestions)
        .where(eq(finalExamQuestions.examId, req.params.examId))
        .orderBy(asc(finalExamQuestions.orderIndex));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.post("/api/admin/final-exam-questions", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { finalExamQuestions } = await import("@shared/schema");
      const [created] = await db.insert(finalExamQuestions).values(req.body).returning();
      res.json(created);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.patch("/api/admin/final-exam-questions/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { finalExamQuestions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const allowed = ["moduleId", "questionType", "questionText", "options", "correctAnswer", "explanation", "cefrDescriptor", "points", "orderIndex"];
      const patch: any = {};
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
      const [updated] = await db.update(finalExamQuestions).set(patch).where(eq(finalExamQuestions.id, req.params.id)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  app.delete("/api/admin/final-exam-questions/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser((req.user as any)?.id);
      if (!user?.isAdmin) return res.status(403).json({ error: "Forbidden" });
      const { db } = await import("./db");
      const { finalExamQuestions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(finalExamQuestions).where(eq(finalExamQuestions.id, req.params.id));
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed" });
    }
  });

  return httpServer;
}

// ============== PLACEMENT QUIZ HELPER FUNCTIONS ==============

interface PlacementQuestion {
  text: string;
  options: string[];
  type: "multiple_choice" | "open_response";
  difficulty: string;
}

async function generatePlacementQuestion(
  difficulty: string,
  questionNumber: number,
  previousAnswers: any[]
): Promise<PlacementQuestion> {
  const prompt = `You are an English proficiency assessment expert. Generate a question to evaluate a student's English level.

Current difficulty level: ${difficulty} (CEFR scale: A1=beginner, A2=elementary, B1=intermediate, B2=upper-intermediate, C1=advanced, C2=proficient)
Question number: ${questionNumber} of 8

Previous topics covered: ${previousAnswers.map(a => a.question?.substring(0, 50)).join(", ") || "none"}

Generate a multiple choice question appropriate for ${difficulty} level. The question should test grammar, vocabulary, or reading comprehension.

Respond in JSON format:
{
  "text": "The question text in English",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "skill": "grammar|vocabulary|reading"
}

Important: Make the question challenging but fair for the ${difficulty} level. Vary the skills tested.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");
    
    const parsed = JSON.parse(content);
    
    return {
      text: parsed.text,
      options: parsed.options,
      type: "multiple_choice",
      difficulty,
    };
  } catch (error) {
    console.error("Error generating placement question:", error);
    // Fallback question
    return {
      text: `What is the correct form of the verb in this sentence? "She ___ to the store yesterday."`,
      options: ["go", "goes", "went", "going"],
      type: "multiple_choice",
      difficulty,
    };
  }
}

async function evaluatePlacementAnswer(
  difficulty: string,
  question: string,
  answer: number | string
): Promise<{ isCorrect: boolean; feedback: string; question: string }> {
  const prompt = `You are evaluating a student's answer to an English proficiency question.

Question: ${question}
Student's answer index: ${answer} (0-based index)
Difficulty level: ${difficulty}

Evaluate if the answer is correct. Respond in JSON:
{
  "isCorrect": true/false,
  "feedback": "Brief feedback in Spanish about the answer"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from OpenAI");
    
    const parsed = JSON.parse(content);
    
    return {
      isCorrect: parsed.isCorrect,
      feedback: parsed.feedback,
      question,
    };
  } catch (error) {
    console.error("Error evaluating placement answer:", error);
    // Default to correct for graceful degradation
    return {
      isCorrect: true,
      feedback: "Respuesta registrada.",
      question,
    };
  }
}

function calculateNextDifficulty(
  currentDifficulty: string,
  wasCorrect: boolean,
  totalCorrect: number,
  questionNumber: number
): string {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const currentIndex = levels.indexOf(currentDifficulty);
  
  // Adaptive algorithm: adjust based on performance
  const correctRate = totalCorrect / questionNumber;
  
  if (wasCorrect && correctRate > 0.7 && currentIndex < levels.length - 1) {
    return levels[currentIndex + 1];
  } else if (!wasCorrect && correctRate < 0.4 && currentIndex > 0) {
    return levels[currentIndex - 1];
  }
  
  return currentDifficulty;
}

function calculateFinalLevel(answers: any[]): { level: string; confidence: string } {
  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
  
  // Weight answers by difficulty level
  const weightedScores: Record<string, number> = {};
  const levelCounts: Record<string, number> = {};
  
  for (const answer of answers) {
    const level = answer.difficulty;
    if (!weightedScores[level]) {
      weightedScores[level] = 0;
      levelCounts[level] = 0;
    }
    levelCounts[level]++;
    if (answer.isCorrect) {
      weightedScores[level]++;
    }
  }
  
  // Find the highest level where the student got >= 50% correct
  let finalLevel = "A1";
  let highestPassedIndex = -1;
  
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (levelCounts[level] && weightedScores[level] / levelCounts[level] >= 0.5) {
      highestPassedIndex = i;
      finalLevel = level;
    }
  }
  
  // Calculate confidence based on consistency
  const totalCorrect = answers.filter(a => a.isCorrect).length;
  const correctRate = totalCorrect / answers.length;
  
  let confidence: string;
  if (correctRate >= 0.75) {
    confidence = "high";
  } else if (correctRate >= 0.5) {
    confidence = "medium";
  } else {
    confidence = "low";
  }
  
  return { level: finalLevel, confidence };
}
