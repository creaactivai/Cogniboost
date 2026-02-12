import { z } from "zod";

// Course validation schemas
export const createCourseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional().or(z.literal("")),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"], { errorMap: () => ({ message: "Invalid level" }) }),
  topic: z.string().min(1, "Topic is required").max(100, "Topic too long"),
  duration: z.string().optional(),
  modulesCount: z.number().int().min(1, "Must have at least 1 module").max(50, "Too many modules").default(1),
  lessonsCount: z.number().int().min(0, "Invalid lesson count").default(0),
  instructorId: z.string().uuid("Invalid instructor ID").optional().or(z.literal("")),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  isFree: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export const updateCourseSchema = createCourseSchema.partial();

// Module validation schemas
export const createModuleSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  orderIndex: z.number().int().min(1, "Order index must be at least 1"),
});

export const updateModuleSchema = createModuleSchema.partial().omit({ courseId: true });

// Lesson validation schemas
export const createLessonSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  moduleId: z.string().uuid("Invalid module ID").optional().or(z.literal("")),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  videoUrl: z.string().url("Invalid video URL").optional().or(z.literal("")),
  vimeoId: z.string().optional(),
  htmlContent: z.string().optional(),
  duration: z.number().int().min(0, "Duration must be non-negative").default(0),
  orderIndex: z.number().int().min(1, "Order index must be at least 1"),
  pdfMaterials: z.array(z.string().url("Invalid PDF URL")).optional(),
  isPreview: z.boolean().default(false),
  isOpen: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export const updateLessonSchema = createLessonSchema.partial().omit({ courseId: true });

// Instructor validation schemas
export const createInstructorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  bio: z.string().max(1000, "Bio too long").optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
  specializations: z.array(z.string().max(50, "Specialization too long")).optional(),
  languages: z.array(z.string().max(30, "Language name too long")).optional(),
  rating: z.string().regex(/^\d(\.\d{1,2})?$/, "Invalid rating").optional(),
  totalLabs: z.number().int().min(0, "Invalid lab count").default(0),
  isActive: z.boolean().default(true),
});

export const updateInstructorSchema = createInstructorSchema.partial();

// Student validation schemas (for manual student creation)
export const createStudentSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required").max(50, "First name too long"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name too long"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  plan: z.enum(["flex", "standard", "premium"], { errorMap: () => ({ message: "Invalid plan" }) }),
  skipOnboarding: z.boolean().default(false),
});

// Enrollment validation schemas
export const createEnrollmentSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  courseId: z.string().uuid("Invalid course ID"),
});

// Validation middleware helper
export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return res.status(400).json({ error: "Invalid request data" });
    }
  };
}
