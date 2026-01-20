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

### Key Features
- **Course Module System**: Courses are organized into modules for structured learning. The `course_modules` table stores modules (id, courseId, title, description, orderIndex). Lessons have a `moduleId` field linking to their module. Modules are auto-created when creating a course based on the specified `modulesCount`. Legacy courses without modules display lessons in a flat list, with an "Unassigned Lessons" section for lessons lacking a moduleId.
- **Custom Course Categories**: Admins can create custom course categories via input with datalist suggestions. Categories are stored in `course_categories` table (id, name, displayName). New categories are auto-created when typing a name that doesn't exist.
- **Multilingual Content**: Topics stored in English for consistency, displayed in Spanish via a translation pattern.
- **Admin LMS Dashboard**: Comprehensive platform management including student, course, financial, lab, instructor, onboarding, and lead management. Admin API routes are protected by `requireAdmin` middleware.
- **Student Status Management**: Users have `active`, `hold`, and `inactive` statuses, manageable by admins.
- **Linear Course Progression**: Students must complete lessons sequentially within their module. Lessons can be marked `open` to bypass prerequisites or `preview` for marketing.
- **AI-Powered Quiz System**: Quizzes are generated and evaluated using OpenAI's gpt-4o-mini. Includes a placement quiz with adaptive difficulty.
- **Lead Automation System**: Manages leads through a lifecycle (new, engaged, nurture, qualified, converted, inactive) with automated email sequences and lead scoring based on engagement.
- **Conversation Labs (Breakout Rooms)**: Supports live sessions with multiple topic-specific breakout rooms that students can book.
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