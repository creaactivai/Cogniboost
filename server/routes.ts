import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import OpenAI from "openai";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { storage } from "./storage";

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

  return httpServer;
}
