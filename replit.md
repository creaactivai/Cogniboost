# CogniBoost 2.0

## Overview
CogniBoost (cogniboost.co) is a professional development platform for Spanish-speaking Latin American adults, focusing on career advancement. It offers pre-recorded courses, cohort-based learning, live practice, and progress tracking. The platform's vision is to empower users to build careers rather than just collect certificates.

## User Preferences
- **Interface language**: Spanish (ES-LATAM)
- All user-facing content must be in Spanish
- English values are used internally for database consistency

## System Architecture

### Brand Identity
**Color Palette:**
- Primary: Purple #667EEA (CTAs, links, primary actions)
- Navy: #1A1A40 (Dark backgrounds, text)
- Turquoise: #4FD1C5 (Success states, highlights)
- Orange: #F6AD55 (Urgency, ratings, warnings)

**Typography:**
- Primary font: Inter (body text, UI elements)
- Secondary font: Lora (optional decorative headings)
- Typography scale: H1 48px/1.2, H2 36px/1.3, Body 16px/1.6

**Design Elements:**
- 4px border-radius (rounded) throughout
- Light mode default (white background)
- 60-30-10 color distribution rule
- Landing page uses scroll animations and hover-elevate effects

### Technical Implementation
- **Frontend**: React-based UI on port 5000
- **Backend**: Express server with Vite for development
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth integration
- **Storage**: Object Storage for file uploads

### Database Schema Management
- Schema defined in `shared/schema.ts`
- Use `npm run db:push` to sync schema changes to the database
- Drizzle Kit configured in `drizzle.config.ts`
- Never change primary key ID column types (serial ↔ varchar)

### Route Protection
- **ProtectedRoute**: Wraps authenticated routes with loading spinner and auth check
- **AdminRoute**: Wraps admin routes with admin role verification
- Uses wouter `<Redirect>` for client-side navigation (avoids full page reloads)
- OAuth login redirects use `window.location.href` (required for OAuth flow)

### Key Features
- **Subscription Tiers**: Four tiers with server-side enforcement:
  - Free: First 3 lessons of Module 1 only
  - Flex ($14.99/month): All prerecorded courses, no labs access
  - Basic ($49.99/month): Full course access with 2 labs/week limit
  - Premium ($99.99/month): Unlimited access to all features including unlimited Conversation Labs
- **Level-Based Course Access**: Users can access courses at their English level and below. A1 user sees only A1 courses; B1 user sees A1, A2, and B1 courses. Server-side enforcement with safe defaults (deny if course level invalid, default to A1 for user level).
- **Recurring Lab Sessions**: Labs can be created as recurring weekly sessions with series management (create, update, delete), 2-12 week duration, and automatic session generation.
- **Course Module System**: Courses are organized into modules for structured learning. The `course_modules` table stores modules (id, courseId, title, description, orderIndex). Lessons have a `moduleId` field linking to their module. Modules are auto-created when creating a course based on the specified `modulesCount`. Legacy courses without modules display lessons in a flat list, with an "Unassigned Lessons" section for lessons lacking a moduleId.
- **Custom Course Categories**: Admins can create custom course categories via input with datalist suggestions. Categories are stored in `course_categories` table (id, name, displayName). New categories are auto-created when typing a name that doesn't exist.
- **Multilingual Content**: Topics stored in English for consistency, displayed in Spanish via a translation pattern.
- **Admin LMS Dashboard**: Comprehensive platform management including student, course, financial, lab, instructor, onboarding, and lead management. Admin API routes are protected by `requireAdmin` middleware. Lab management includes status tabs (All, Live, Upcoming, Past) with counts and dropdown menus for single/series operations.
- **Student Status Management**: Users have `active`, `hold`, and `inactive` statuses, manageable by admins. Soft delete is supported via `deletedAt`/`deletedBy` fields. Deleted students are excluded from normal queries and shown in a separate "Eliminados" tab with CSV export support. Deletion requires double confirmation (first dialog + typing "ELIMINAR").
- **Linear Course Progression**: Students must complete lessons sequentially within their module. Lessons can be marked `open` to bypass prerequisites or `preview` for marketing.
- **AI-Powered Quiz System**: Quizzes are generated and evaluated using OpenAI's gpt-4o-mini. Includes a placement quiz with adaptive difficulty.
- **Lead Automation System**: Manages leads through a lifecycle (new, engaged, nurture, qualified, converted, inactive) with automated email sequences and lead scoring based on engagement.
- **Conversation Labs (Breakout Rooms)**: Supports live sessions with multiple topic-specific breakout rooms that students can book. Labs are filtered by student's English level (A1-C2) with server-side tier enforcement for booking limits.
- **Email Verification**: Self-registered users receive a verification email with a 24-hour expiring token. Dashboard shows a banner prompting unverified users to verify their email, with option to resend. Manually-added students skip verification.

### Core Files & Directories
- `client/src/components/landing/`: Landing page components
- `client/src/components/dashboard/`: Dashboard components
- `client/src/pages/admin/`: Admin dashboard pages
- `client/src/components/admin/`: Admin components
- `shared/schema.ts`: Database schema
- `server/routes.ts`: API routes

## External Dependencies
- **Replit Auth**: User authentication.
- **Object Storage**: File storage and management.
- **PostgreSQL**: Primary database.
- **Stripe**: Payment processing for subscriptions (Flex, Estándar, Premium tiers) with checkout sessions, customer portal, and webhook handling.
- **OpenAI (gpt-4o-mini)**: AI engine for quiz generation and evaluation.
- **Resend**: Email delivery service for transactional and marketing emails.