import type { Express } from "express";
import { createServer, type Server } from "http";
import { createHash } from "crypto";
import multer from "multer";
import OpenAI from "openai";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import { sendEmail, type EmailTemplate } from "./resendClient";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { selectQuizQuestions, placementQuestions, calculatePlacementLevel, type PlacementQuestion as StaticPlacementQuestion } from "@shared/placementQuestions";

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
  
  // Register object storage routes
  registerObjectStorageRoutes(app);

  // API Routes

  // Get all courses
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  // Get course by ID
  app.get("/api/courses/:id", async (req, res) => {
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

  // Get lessons for a course
  app.get("/api/courses/:courseId/lessons", async (req, res) => {
    try {
      const lessons = await storage.getLessonsByCourseId(req.params.courseId);
      res.json(lessons);
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

  // Get user stats
  app.get("/api/user-stats", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const stats = await storage.getUserStats(userId);
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

      const { customerId, subscriptionId } = req.body;
      
      if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
      }

      // Update user with Stripe customer ID
      await storage.updateUser(userId, { 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || undefined,
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

  // Mark a lesson as completed
  app.post("/api/lessons/:lessonId/complete", async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { lessonId } = req.params;
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
      const { watchedSeconds } = req.body;
      const result = await storage.updateLessonProgress(userId, lessonId, watchedSeconds);
      res.json(result);
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      res.status(500).json({ error: "Failed to update lesson progress" });
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
  app.post("/api/admin/courses", requireAdmin, async (req, res) => {
    try {
      const course = await storage.createCourse(req.body);
      res.status(201).json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course" });
    }
  });

  // Admin: Update course
  app.patch("/api/admin/courses/:id", requireAdmin, async (req, res) => {
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
  app.post("/api/admin/lessons", requireAdmin, async (req, res) => {
    try {
      const lesson = await storage.createLesson(req.body);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      res.status(500).json({ error: "Failed to create lesson" });
    }
  });

  // Admin: Update lesson
  app.patch("/api/admin/lessons/:id", requireAdmin, async (req, res) => {
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
  app.post("/api/admin/instructors", requireAdmin, async (req, res) => {
    try {
      const instructor = await storage.createInstructor(req.body);
      res.status(201).json(instructor);
    } catch (error) {
      console.error("Error creating instructor:", error);
      res.status(500).json({ error: "Failed to create instructor" });
    }
  });

  // Admin: Update instructor
  app.patch("/api/admin/instructors/:id", requireAdmin, async (req, res) => {
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

  // ============== LIVE SESSIONS API ROUTES (New Breakout Rooms Model) ==============

  // Get all live sessions with their rooms (public - for student calendar)
  app.get("/api/live-sessions", async (req, res) => {
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

  // Get live session by ID with rooms
  app.get("/api/live-sessions/:id", async (req, res) => {
    try {
      const session = await storage.getLiveSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const rooms = await storage.getSessionRooms(req.params.id);
      res.json({ ...session, rooms });
    } catch (error) {
      console.error("Error fetching live session:", error);
      res.status(500).json({ error: "Failed to fetch live session" });
    }
  });

  // Get rooms for a session
  app.get("/api/live-sessions/:id/rooms", async (req, res) => {
    try {
      const rooms = await storage.getSessionRooms(req.params.id);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching session rooms:", error);
      res.status(500).json({ error: "Failed to fetch session rooms" });
    }
  });

  // Book a room (student action)
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
      const booking = await storage.createRoomBooking({ userId, roomId });
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating room booking:", error);
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

  // Admin: Create live session
  app.post("/api/admin/live-sessions", requireAdmin, async (req, res) => {
    try {
      const session = await storage.createLiveSession(req.body);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating live session:", error);
      res.status(500).json({ error: "Failed to create live session" });
    }
  });

  // Admin: Update live session
  app.patch("/api/admin/live-sessions/:id", requireAdmin, async (req, res) => {
    try {
      const session = await storage.updateLiveSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error updating live session:", error);
      res.status(500).json({ error: "Failed to update live session" });
    }
  });

  // Admin: Delete live session
  app.delete("/api/admin/live-sessions/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteLiveSession(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting live session:", error);
      res.status(500).json({ error: "Failed to delete live session" });
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
      const quizzes = await storage.getQuizzesByLessonId(req.params.lessonId);
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
