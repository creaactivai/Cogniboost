import type { Express } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import multer from "multer";
import OpenAI from "openai";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { registerOAuthRoutes } from "./auth/oauthRoutes";
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
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Register OAuth routes (Google + Apple)
  registerOAuthRoutes(app);

  // Register object storage routes
  registerObjectStorageRoutes(app);

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
      const userId = (req.user as any)?.claims?.sub;
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
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'https://cogniboost.co';
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      
      const lessons = await storage.getLessonsByCourseId(courseId);
      const FREE_LESSON_LIMIT = 3; // First 3 lessons of Module 1 are free
      
      // Check user's subscription tier - default to free for unauthenticated users
      let subscriptionTier = 'free';
      if (userId) {
        const user = await storage.getUser(userId);
        subscriptionTier = user?.subscriptionTier || 'free';
      }
      
      // Sort by order index and gate content for premium lessons
      const sortedLessons = lessons.sort((a, b) => a.orderIndex - b.orderIndex);
      
      // If user has paid subscription, return full content
      if (subscriptionTier !== 'free') {
        return res.json(sortedLessons.map(l => ({ ...l, isLockedBySubscription: false })));
      }
      
      // Get modules for this course to identify Module 1
      const modules = await storage.getModulesByCourseId(courseId);
      const module1 = modules.find(m => m.orderIndex === 1);
      const module1Id = module1?.id;
      
      // Get lessons in Module 1 for counting position
      const module1Lessons = sortedLessons.filter(l => l.moduleId === module1Id);
      
      // For free/unauthenticated users, redact premium lesson content
      const gatedLessons = sortedLessons.map((lesson) => {
        // Check if locked by subscription for free users:
        // - Only first 3 lessons of Module 1 are accessible
        // - Lessons not in Module 1 are always locked
        let isLocked = false;
        if (lesson.moduleId !== module1Id) {
          isLocked = true;
        } else {
          const positionInModule1 = module1Lessons.findIndex(l => l.id === lesson.id);
          isLocked = positionInModule1 >= FREE_LESSON_LIMIT;
        }
        
        if (isLocked) {
          // Redact premium content
          return {
            ...lesson,
            vimeoId: null, // Hide video content
            pdfMaterials: [], // Hide materials
            content: null, // Hide lesson content
            isLockedBySubscription: true, // Flag for frontend
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { courseId } = req.body;
      if (!courseId) {
        return res.status(400).json({ error: "Course ID is required" });
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
      const userId = (req.user as any)?.claims?.sub;
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

  // Book a lab
  app.post("/api/lab-bookings", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { labId } = req.body;
      if (!labId) {
        return res.status(400).json({ error: "Lab ID is required" });
      }
      const booking = await storage.createLabBooking({ userId, labId });
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating lab booking:", error);
      res.status(500).json({ error: "Failed to create lab booking" });
    }
  });

  // Get user stats (basic stats for all users, detailed stats for premium)
  app.get("/api/user-stats", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Check subscription tier - detailed stats are premium
      const user = await storage.getUser(userId);
      const subscriptionTier = user?.subscriptionTier || 'free';
      const stats = await storage.getUserStats(userId);
      
      if (subscriptionTier === 'free') {
        // Return limited basic stats for free users
        return res.json({
          totalHoursStudied: "0",
          coursesCompleted: 0,
          labsAttended: 0,
          currentLevel: stats?.currentLevel || "A1",
          xpPoints: 0,
          speakingMinutes: 0,
          vocabularyWords: 0,
          premiumFeature: true,
          message: "Actualiza tu plan para ver estadísticas detalladas"
        });
      }
      
      res.json(stats || {
        totalHoursStudied: "0",
        coursesCompleted: 0,
        labsAttended: 0,
        currentLevel: "A1",
        xpPoints: 0,
        speakingMinutes: 0,
        vocabularyWords: 0,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // Get user subscription
  app.get("/api/subscription", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const subscription = await storage.getSubscriptionByUserId(userId);
      res.json(subscription || { tier: "free" });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Select free plan - marks user as having explicitly chosen free tier
  app.post("/api/subscription/select-free", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
      const { priceId, planName } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : "http://localhost:5000";
      
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
      if (userId) {
        const user = await storage.getUser(userId);
        
        if (user) {
          let customerId = user.stripeCustomerId;
          
          if (!customerId) {
            const customer = await stripe.customers.create({
              email: user.email || undefined,
              name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || undefined,
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
        }
      } else {
        // Guest checkout - Stripe will collect email and create customer automatically for subscriptions
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
      const userId = (req.user as any)?.claims?.sub;
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

      res.json({ success: true });
    } catch (error) {
      console.error("Error linking customer:", error);
      res.status(500).json({ error: "Failed to link customer" });
    }
  });

  // Create customer portal session for subscription management
  app.post("/api/stripe/create-portal-session", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
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
        return_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000"}/dashboard/settings`,
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
      const userId = (req.user as any)?.claims?.sub;
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
    // Get modules for this course to identify Module 1
    const modules = await storage.getModulesByCourseId(lesson.courseId);
    const module1 = modules.find(m => m.orderIndex === 1);
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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

  // Auth middleware - check if user is authenticated
  const requireAuth = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - Login required" });
    }
    next();
  };

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
      const userId = (req as any).user?.claims?.sub;
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
    const userId = req.user?.claims?.sub;
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
      const { count } = req.body;
      if (!count || count < 1) {
        return res.status(400).json({ error: "Count must be at least 1" });
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

      const objectStorageService = new ObjectStorageService();
      
      // Get presigned URL for upload
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload the file buffer directly to the presigned URL
      const response = await fetch(uploadURL, {
        method: 'PUT',
        body: req.file.buffer,
        headers: {
          'Content-Type': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload to storage');
      }

      // Get the normalized path for serving the file
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      const fileUrl = objectPath;

      res.json({ url: fileUrl, name: req.file.originalname });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      res.status(500).json({ error: "Failed to upload PDF" });
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
      const currentUserId = (req.user as any)?.claims?.sub;
      
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
      const invitedBy = (req.user as any)?.claims?.sub;
      
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
      const invitedBy = (req.user as any)?.claims?.sub;
      
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
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : "https://cogniboost.co";
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
      const revokedBy = (req.user as any)?.claims?.sub;
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
      const invitedBy = (req.user as any)?.claims?.sub;
      
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
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : "https://cogniboost.co";
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
      const userId = (req.user as any)?.claims?.sub;
      
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      
      // Server-side tier access check: Free and Flex users cannot book labs
      if (subscriptionTier === 'free' || subscriptionTier === 'flex') {
        return res.status(403).json({ 
          error: "Upgrade required", 
          message: "Tu plan actual no incluye acceso a Conversation Labs. Actualiza a Básico o Premium.",
          code: "TIER_ACCESS_DENIED"
        });
      }
      
      // Server-side weekly limit check for Basic tier (2 labs per week)
      if (subscriptionTier === 'basic') {
        const WEEKLY_LIMIT = 2;
        const startOfWeek = new Date();
        const dayOfWeek = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const weeklyBookings = await storage.getRoomBookingsByUserIdSince(userId, startOfWeek);
        if (weeklyBookings.length >= WEEKLY_LIMIT) {
          return res.status(403).json({ 
            error: "Weekly limit reached", 
            message: `Has alcanzado el límite de ${WEEKLY_LIMIT} labs por semana. Actualiza a Premium para labs ilimitados.`,
            code: "WEEKLY_LIMIT_EXCEEDED"
          });
        }
      }
      
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
      const userId = (req.user as any)?.claims?.sub;
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

      const prompt = `Generate ${numberOfQuestions} multiple choice quiz questions in Spanish for an English learning lesson.

Lesson Title: ${lessonTitle}
Lesson Description: ${lessonDescription || "N/A"}
Level: ${courseLevel} (CEFR level)

Generate questions that test the student's understanding of English concepts taught in this lesson.
Each question should have exactly 4 options, with one correct answer.

Return a JSON array with this exact format:
[
  {
    "question": "¿Cuál es la traducción correcta de 'hello'?",
    "options": ["Hola", "Adiós", "Gracias", "Por favor"],
    "correctOptionIndex": 0,
    "explanation": "La palabra 'hello' significa 'hola' en español, utilizada como saludo."
  }
]

Important:
- Questions must be in Spanish
- Test English vocabulary, grammar, or concepts relevant to the lesson
- Each question must have exactly 4 options
- correctOptionIndex is 0-based (0 for first option, 1 for second, etc.)
- Include a brief explanation in Spanish for the correct answer`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert English teacher creating quiz questions for Spanish-speaking students learning English. Always respond with valid JSON only."
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

      // Get existing question count for orderIndex
      const existingQuestions = await storage.getQuizQuestions(quizId);
      let orderIndex = existingQuestions.length;

      // Create questions in database
      const createdQuestions = [];
      for (const q of generatedQuestions) {
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
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ error: "Failed to generate quiz questions" });
    }
  });

  // Student: Get quiz for a lesson
  app.get("/api/lessons/:lessonId/quiz", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
      const userId = (req.user as any)?.claims?.sub;
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
        const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'https://cogniboost.co';
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
        onboardingUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://cogniboost.co'}/onboarding`,
        dashboardUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://cogniboost.co'}/dashboard`,
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
      const userId = req.isAuthenticated() ? (req.user as any)?.claims?.sub : null;
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
    const userId = req.isAuthenticated() ? (req.user as any)?.claims?.sub : null;
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
      const userId = (req.user as any)?.claims?.sub;
      const attempts = await storage.getPlacementQuizAttemptsByUserId(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching placement history:", error);
      res.status(500).json({ error: "Failed to fetch placement history" });
    }
  });

  // Get current attempt status (for resuming) - supports anonymous users via query param
  app.get("/api/placement/current", async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any)?.claims?.sub : null;
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
    
    const userId = (req.user as any)?.claims?.sub;
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
        u.lastActive && new Date(u.lastActive) > sevenDaysAgo
      ).length;

      // Active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeUsers30Days = studentUsers.filter(u =>
        u.lastActive && new Date(u.lastActive) > thirtyDaysAgo
      ).length;

      // Get all enrollments
      const allEnrollments = await storage.getAllEnrollments();

      // Enrollments over time (grouped by date)
      const enrollmentsByDate: Record<string, number> = {};
      allEnrollments.forEach(enrollment => {
        const date = new Date(enrollment.enrolledAt).toISOString().split('T')[0];
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
          const lessons = await storage.getLessonsByCourse(course.id);
          const totalLessons = lessons.length;

          if (totalLessons > 0) {
            let totalCompleted = 0;

            for (const enrollment of courseEnrollments) {
              // Get progress for this enrollment
              const progress = await storage.getLessonProgress(enrollment.userId, course.id);
              const completedLessons = progress.filter(p => p.isCompleted).length;
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
      const allPayments = await storage.getAllPayments();
      const completedPayments = allPayments.filter(p => p.status === "completed");
      const totalRevenue = completedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

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
