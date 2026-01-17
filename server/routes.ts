import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { storage } from "./storage";

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

  return httpServer;
}
