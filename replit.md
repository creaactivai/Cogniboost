# CogniBoost / CogniMight 2.0

## Overview
CogniBoost (cogniboost.co) is an English learning platform designed for Latin American adults. It features pre-recorded courses (A1-C2 levels), live Conversation Practice Labs with peer-to-peer learning, and progress tracking.

## Target Audience
Spanish-speaking Latin American professionals learning English.

## Current State
- Full Spanish UI translation complete
- Landing page with hero, methodology, testimonials, pricing, FAQ sections
- Dashboard with course catalog, conversation labs, progress tracking, settings
- Database schema with PostgreSQL
- Replit Auth integration
- Object Storage integration

## User Preferences

### Language
- **Interface language**: Spanish (ES-LATAM)
- All user-facing content must be in Spanish
- English values are used internally for database consistency

### Design System (neotribe.vc-inspired)
- Primary color: Cyan #33CBFB
- Accent color: Coral #FD335A
- **Zero border-radius** throughout (sharp edges)
- Fonts: Impact/Arial Black for display headings, JetBrains Mono for body text

## Project Architecture

### Topic Translation Pattern
Topics are stored in English for database consistency but displayed in Spanish:

```typescript
// English keys for data/filtering
const courseTopicsEs: Record<string, string> = {
  "Business English": "Inglés de Negocios",
  "Travel & Tourism": "Viajes y Turismo",
  "Technology": "Tecnología",
  // ...
};

const getTopicLabel = (topic: string) => courseTopicsEs[topic] || topic;
```

This pattern is used in:
- `client/src/components/dashboard/course-catalog.tsx`
- `client/src/components/dashboard/conversation-labs.tsx`

### Key Files
- Landing page components: `client/src/components/landing/`
- Dashboard components: `client/src/components/dashboard/`
- Admin dashboard pages: `client/src/pages/admin/`
- Admin components: `client/src/components/admin/`
- Database schema: `shared/schema.ts`
- API routes: `server/routes.ts`

### Admin LMS Dashboard
The Admin Dashboard provides platform management for the owner:
- **Panel General** (`/admin`) - Overview with student counts, revenue, course stats
- **Cursos** (`/admin/courses`) - Course and lesson CRUD management
- **Estudiantes** (`/admin/students`) - Student management with status tabs, lock/unlock, metrics
- **Finanzas** (`/admin/financials`) - Revenue, MRR, ARR, ARPU, LTV, subscriptions, payment history
- **Laboratorios** (`/admin/labs`) - Conversation lab scheduling
- **Instructores** (`/admin/instructors`) - Instructor profiles and management
- **Onboarding y Emails** (`/admin/onboarding`) - Onboarding stats, email automation, send reminders

Admin API routes are under `/api/admin/*` namespace and are protected by `requireAdmin` middleware that checks if the user has `isAdmin: true` in the users table.

### Student Status Management
Users have a status field with three values:
- **active**: Paying/using the platform normally
- **hold**: Pending payment, limited access
- **inactive**: Churned or locked by admin

Admin can lock/unlock students with optional reason. Locking sets status to inactive.

API Endpoints:
- `GET /api/admin/students` - List all students (optionally filter by `?status=active|hold|inactive`)
- `GET /api/admin/students/metrics` - Get student KPIs (total, active, hold, inactive, churn rate)
- `PATCH /api/admin/students/:id/status` - Update student status
- `POST /api/admin/students/:id/lock` - Lock student access (with optional reason)
- `POST /api/admin/students/:id/unlock` - Unlock student access

### Subscription Tiers
- Free: Basic access
- Standard: $29/month
- Premium: $79/month

## Recent Changes
- 2026-01-18: Added automatic onboarding redirect - new users with onboardingCompleted=false are redirected from / and /dashboard to /onboarding
- 2026-01-18: Customer onboarding wizard (/onboarding) with 4-step flow: level, goals, availability, interests
- 2026-01-18: Resend email integration with templates: welcome, onboarding_reminder, course_enrolled, lesson_completed, subscription_activated
- 2026-01-18: Auto welcome email on new user signup, onboarding reminder system for incomplete profiles
- 2026-01-18: Admin onboarding page (/admin/onboarding) with stats and send reminder functionality
- 2026-01-18: Added Zod validation for onboarding API endpoint and email template whitelist for admin emails
- 2026-01-18: Admin student management with status tabs (active/hold/inactive) and lock/unlock functionality
- 2026-01-18: Student metrics KPIs: total, active, hold, inactive counts, churn rate, new/churned this month
- 2026-01-18: Enhanced financials dashboard with MRR, ARR, ARPU, LTV calculations
- 2026-01-18: Stripe integration via Replit connector for payment processing
- 2026-01-18: Linear progression system with unlock logic - students must complete lessons sequentially
- 2026-01-18: Lock icons and "Lección bloqueada" toast for locked lessons
- 2026-01-18: "Marcar como Completada" button for lessons without quizzes
- 2026-01-18: Quiz pass automatically marks quizPassed and isCompleted in lessonProgress
- 2026-01-18: Admin "isOpen" toggle bypasses prerequisites for individual lessons
- 2026-01-18: Quiz system complete with AI generation (OpenAI gpt-4o-mini)
- 2026-01-18: Student quiz-taking interface in course-viewer.tsx with timer, results, retry
- 2026-01-18: Admin quiz management at /admin/courses/:courseId/lessons/:lessonId/quiz
- 2026-01-18: AI-powered placement quiz system (/placement-quiz) with adaptive difficulty (8 questions, B1 starting level)
- 2026-01-18: Placement quiz uses OpenAI gpt-4o-mini for question generation and answer evaluation
- 2026-01-18: Rate limiting: max 3 placement attempts per day per user, 30-minute time limit
- 2026-01-18: Added "Examen de Nivel" button to landing page hero section
- 2026-01-18: Onboarding wizard auto-prefills level from placement quiz results with "Recomendado" badge
- 2026-01-17: Implemented new Live Sessions breakout rooms model (live_sessions, session_rooms, room_bookings)
- 2026-01-17: Added API routes for students to view sessions and book rooms by topic
- 2026-01-17: Complete Admin LMS Dashboard with 6 pages (Overview, Courses, Students, Financials, Labs, Instructors)
- 2026-01-17: Added admin API routes for CRUD operations and analytics (/api/admin/*)
- 2026-01-17: Extended database schema with admin fields (isPremium, tier, instructor details)
- 2026-01-17: Complete Spanish translation of all UI components
- 2026-01-17: Implemented bilingual topic filtering (English keys, Spanish labels)
- 2026-01-17: Fixed language selector in settings (Inglés, Español, Portugués)

### Linear Progression System
Students must complete lessons in sequential order within each course:
- **First lesson**: Always unlocked
- **Subsequent lessons**: Require previous lesson to be completed AND quiz passed (if previous lesson has a quiz)
- **Open lessons** (isOpen=true): Bypass all prerequisites; admin can toggle this for individual lessons
- **Preview lessons** (isPreview=true): Always unlocked for marketing purposes

Unlock logic in `server/storage.ts`:
1. Skip open lessons when searching for the previous sequential lesson
2. If no previous sequential lesson exists (all previous are open), current lesson is unlocked
3. Otherwise, check if previous lesson is completed AND (no quiz OR quiz passed)

UI Components:
- Lock icon displayed on locked lessons
- "Lección bloqueada" toast when clicking locked lesson
- "Marcar como Completada" button for lessons without quizzes
- CheckCircle icon for completed lessons

API Endpoints:
- `GET /api/courses/:id/progress` - Returns lesson progress with unlock status
- `POST /api/lessons/:id/complete` - Marks lesson as completed
- Quiz pass automatically marks both `quizPassed` and `isCompleted` in lessonProgress

### Conversation Labs (Breakout Rooms Model)
The new model supports multiple topic rooms within each live session:
- **Live Sessions** - Main container (date, time, instructor, meeting URL)
- **Session Rooms** - Breakout rooms by topic within each session (topic, level, max participants)
- **Room Bookings** - Students book specific rooms

API Endpoints:
- `GET /api/live-sessions` - List all upcoming sessions
- `GET /api/live-sessions/:id` - Get session with rooms
- `POST /api/room-bookings` - Book a room (authenticated)
- Admin CRUD: `/api/admin/live-sessions/*`, `/api/admin/session-rooms/*`

## Development Notes
- Frontend runs on port 5000
- Backend Express server with Vite for development
- PostgreSQL database with Drizzle ORM
- Replit Auth for authentication
- Object Storage for file uploads
