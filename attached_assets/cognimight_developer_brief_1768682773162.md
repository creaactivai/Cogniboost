# COGNIMIGHT PLATFORM - COMPREHENSIVE DEVELOPMENT BRIEF
## AI Developer Agent Instructions

---

## PROJECT OVERVIEW

**Project Name:** CogniMight 2.0 - English Learning Platform for Latin America
**Target Audience:** Adults (25-45 years old) in Latin America seeking English fluency
**Core Methodology:** Pre-recorded courses + Live "Conversation Practice Labs" (peer-to-peer learning)
**Business Model:** Freemium with paid subscriptions and individual course purchases

---

## BRAND & DESIGN GUIDELINES

### Design Inspiration Source
Reference website for brand aesthetics: https://www.neotribe.vc/

### Brand Design Principles (Inspired by Professional VC/Tech Aesthetics)
- **Modern & Sophisticated:** Clean, minimalist design with strategic use of white space
- **Professional Yet Approachable:** Balance between corporate credibility and educational warmth
- **Tech-Forward:** Contemporary web design patterns that signal innovation
- **Trust-Building:** Design elements that convey professionalism and educational quality

### Color Palette
**Primary Colors:**
- Deep Teal: #0F4C75 (trust, learning, growth)
- Ocean Blue: #1B6DA8 (professional, calm)
- White: #FFFFFF (clean, spacious)

**Secondary Colors:**
- Warm Coral: #FF6B6B (energy, Latin warmth, CTAs)
- Vibrant Orange: #FFB347 (action, engagement, highlights)
- Emerald Green: #10B981 (success, progress)

**Neutral Palette:**
- Dark Text: #1A1A2E (primary text)
- Medium Gray: #495057 (secondary text)
- Light Gray: #F8F9FA (backgrounds, cards)
- Border Gray: #DEE2E6

### Typography
**Primary Font (Headings):** 
- Font: Inter, SF Pro Display, or similar geometric sans-serif
- Weights: 700 (Bold), 600 (Semibold)
- Use: All headlines, navigation, CTAs

**Secondary Font (Body):**
- Font: Inter, System UI, or similar clean sans-serif  
- Weights: 400 (Regular), 500 (Medium)
- Use: Body text, descriptions, UI elements

**Font Sizes:**
- Hero Headline: 56-72px
- H1: 48px
- H2: 36px
- H3: 28px
- H4: 24px
- Body Large: 18px
- Body Regular: 16px
- Body Small: 14px
- Caption: 12px

### Visual Style
- **Photography:** High-quality images of diverse Latin American adults in learning/professional contexts
- **Illustrations:** Modern, geometric style with gradient accents (avoid childish/cartoon styles)
- **Icons:** Line icons with 2px stroke, rounded corners
- **Shadows:** Subtle, soft shadows (0 4px 6px rgba(0,0,0,0.1))
- **Border Radius:** 8-12px for cards, 6-8px for buttons, 4px for inputs
- **Animations:** Smooth, purposeful (300-400ms transitions), avoid excessive motion

---

## PLATFORM ARCHITECTURE

### Technology Stack Requirements

#### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** Zustand or Redux Toolkit
- **Video Player:** Video.js or Plyr (custom-skinned)
- **Real-time:** WebRTC for live classes (Agora.io or Daily.co SDK)
- **Forms:** React Hook Form + Zod validation
- **API Client:** Axios with interceptors
- **Authentication:** Next-Auth.js or Auth0

#### Backend
- **Framework:** Node.js + Express.js or NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL (primary) + Redis (cache/sessions)
- **ORM:** Prisma or TypeORM
- **File Storage:** AWS S3 or Cloudflare R2
- **Video Hosting:** Vimeo, Wistia, or Cloudflare Stream
- **Email:** SendGrid or Resend
- **Search:** Elasticsearch (for course catalog)

#### Infrastructure
- **Hosting:** Vercel (frontend) + Railway/AWS (backend)
- **CDN:** Cloudflare
- **Monitoring:** Sentry (errors) + Mixpanel/PostHog (analytics)
- **CI/CD:** GitHub Actions

#### Payment Processing
- **Primary:** Stripe (cards, subscriptions)
- **LATAM:** MercadoPago integration (PIX, Boleto, local cards)
- **Support:** Multi-currency (USD, MXN, BRL, ARS, COP)

---

## CORE FEATURES & MODULES

### 1. LANDING PAGE (High-Conversion Focus)

#### Hero Section
**Goal:** Capture attention, explain unique value proposition within 5 seconds

**Elements:**
- Headline: "Master English Through Real Conversations" (60px, bold)
- Subheadline: "Pre-recorded courses + live practice labs designed for Latin American adults" (20px)
- Dual CTA buttons:
  - Primary: "Start Free Trial" (coral background, prominent)
  - Secondary: "See How It Works" (outline button, triggers demo video)
- Hero Image/Video: Professional Latin American adult confidently speaking English in work setting
- Social Proof Bar: "Join 5,000+ professionals improving their English"

**Layout:** Full-screen hero with asymmetric layout (60% content, 40% visual on desktop)

#### Trust Indicators Section
- Mini testimonials (3 cards with photos, names, job titles)
- Logos of partner companies (if any)
- Stats: "10,000+ lessons completed" "95% satisfaction rate" "Available across Latin America"

#### Methodology Explanation Section
**Title:** "How CogniMight Works: Learn → Practice → Master"

**3-Step Visual Process:**
1. **Learn at Your Pace**
   - Icon: Video play symbol
   - Text: "Study with pre-recorded courses (A1-C2 levels) covering grammar, vocabulary, and real-world scenarios"
   - Visual: Screenshot of course interface

2. **Practice Live Conversations** (HIGHLIGHT THIS)
   - Icon: People talking symbol
   - Text: "Join Conversation Practice Labs: small-group sessions where you discuss topics you care about with peers at your level"
   - Visual: Screenshot of live class with breakout rooms
   - Badge: "NEW: Our Revolutionary Method"

3. **Track Your Progress**
   - Icon: Chart/growth symbol
   - Text: "Monitor your improvement, earn certificates, and advance through levels"
   - Visual: Dashboard screenshot

**Design:** Horizontal timeline on desktop, vertical on mobile, with animated progress line

#### Conversation Labs Deep Dive Section
**Title:** "Conversation Practice Labs: Real Fluency Through Peer Learning"

**Description Paragraph:**
"Traditional classes give you 5 minutes of speaking time. Our labs give you 30+ minutes. After a quick intro where instructors teach key phrases and vocabulary, you join breakout rooms with 3-4 peers who share your interests. Discuss business, travel, tech, culture—topics that matter to YOU. Our facilitators rotate through rooms, providing feedback and keeping conversations flowing naturally."

**Visual Grid (4 benefits):**
- More Talk Time: "7x more speaking practice than traditional classes"
- Lower Stress: "Practice with peers, not under teacher spotlight"
- Your Interests: "Choose topics from 20+ categories"
- Real Conversations: "Natural dialogue, not artificial exercises"

**CTA:** "Try Your First Lab Free"

#### Pricing Section (Clear & Simple)
**Title:** "Flexible Plans for Every Learning Style"

**3-Tier Comparison Table:**

| Feature | Free | Standard ($29/mo) | Premium ($79/mo) |
|---------|------|-------------------|------------------|
| Pre-recorded courses | 5 intro lessons | Full library (100+) | Full library |
| Conversation Labs | 1 trial class | 4 classes/month | 8 classes/month |
| 1-on-1 Sessions | ❌ | ❌ | 2 sessions/month |
| Certificates | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

**Design:** Card-based layout with "Popular" badge on Standard tier

#### Social Proof Section
- Video testimonials (2-3 clips, 30 seconds each)
- Written testimonials with photos (6 cards in grid)
- Before/After stories ("From A2 to B2 in 6 months")

#### FAQ Section (8-10 common questions)
- "How is this different from Duolingo/Babbel?"
- "What if I'm too shy to speak in groups?"
- "Are classes recorded?"
- "Can I change my subscription level?"
- "Do you offer certificates?"
- etc.

#### Final CTA Section
**Design:** Full-width banner with gradient background
**Text:** "Ready to Transform Your English?"
**Buttons:** "Start Free Trial" + "Book a Demo Call"

---

### 2. STUDENT DASHBOARD

#### Layout
**Sidebar Navigation:**
- My Courses
- Conversation Labs
- Progress & Certificates
- Account Settings
- Help & Support

**Main Content Area:**

##### Home/Overview Page
- Welcome message with next suggested action
- Progress at a glance (course completion %, hours practiced, level badge)
- Upcoming scheduled labs (cards with time, topic, join button)
- Continue learning: Resume where you left off (last 3 courses)
- Recommended courses based on level and interests

##### My Courses Page
**Filters:**
- All / In Progress / Completed
- Level (A1, A2, B1, B2, C1, C2)
- Topic (Business, Travel, Tech, etc.)

**Course Card Design:**
- Thumbnail image
- Title + level badge
- Progress bar (% completed)
- Duration estimate
- "Continue" or "Start" button

**Course Detail View:**
- Course overview video
- Syllabus/modules accordion
- Instructor bio
- Student reviews
- "Enroll" or "Start Learning" button

##### Video Player Interface
**Requirements:**
- Custom-branded player (hide external branding)
- Speed controls (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- Subtitle toggle (English, Spanish, Portuguese)
- Keyboard shortcuts (space to pause, arrows to skip)
- Progress saving (resume where left off)
- Next video auto-advance option
- Lesson notes sidebar (collapsible)
- Interactive exercises embedded between video segments

##### Conversation Labs Page
**Upcoming Labs Tab:**
- Calendar view option
- List view with filters (date, topic, level)
- Lab card shows:
  - Topic + description
  - Date & time (with timezone)
  - Instructor name & photo
  - Spots remaining (e.g., "3/12 spots filled")
  - "Reserve Spot" button

**My Booked Labs:**
- Countdown timer to next lab
- Join button (appears 5 min before start)
- Pre-class materials (vocab list, discussion prompts)
- Option to cancel/reschedule (24hr minimum notice)

**Past Labs:**
- Lab history
- Feedback left/received
- Recording access (if available, 30 days)

##### Lab Booking Flow
1. Select lab from calendar
2. Confirm level and topic preference
3. Choose interest sub-topic for breakout room assignment
4. Add to calendar (Google/Outlook integration)
5. Receive confirmation email with prep materials

##### Progress & Certificates Page
**Stats Dashboard:**
- Total hours studied
- Courses completed
- Labs attended
- Current level with visual badge
- Progress toward next level (XP bar)
- Speaking time logged
- Vocabulary words learned

**Certificates Section:**
- Grid of earned certificates (downloadable PDFs)
- Share to LinkedIn feature
- Certificate preview modal

**Skills Breakdown:**
- Radar chart: Reading, Writing, Listening, Speaking, Vocabulary, Grammar
- Weak areas highlighted with recommendations

##### Account Settings Page
- Profile information (name, email, photo)
- Password change
- Timezone selection
- Language preference (Spanish/Portuguese UI)
- Notification preferences (email, push)
- Subscription management
  - Current plan
  - Billing history
  - Update payment method
  - Cancel subscription
- Privacy settings

---

### 3. CONVERSATION LAB LIVE SESSION INTERFACE

#### Pre-Session Lobby (5 min before start)
- Welcome message
- Tech check: Camera, microphone, internet speed test
- Icebreaker question displayed
- Participant list (names, avatars)
- Chat available
- Materials panel: Today's topic, key phrases, vocabulary list

#### Main Session View (During Class)

**Layout:**
- Top bar: Timer, topic title, instructor controls
- Main video area: Grid view of participants (responsive 2x2, 3x3, etc.)
- Right sidebar (collapsible):
  - Chat
  - Vocabulary reference
  - Notes (personal)
  - Raised hands queue

**Instructor Controls:**
- Create/close breakout rooms
- Move participants between rooms
- Broadcast message to all rooms
- End session

**Student Controls:**
- Mic on/off
- Camera on/off
- Raise hand
- Emoji reactions (👍 👎 🤔 😊)
- Leave/Report issue

#### Breakout Room Experience
**Transition:**
- "You're being moved to Room 3: Tech & Innovation" (notification)
- Smooth transition with countdown (3, 2, 1...)

**Breakout Interface:**
- Show room name and topic
- Display discussion prompts (rotate every 3 minutes)
- Timer showing time remaining in breakout
- "Request Instructor" button (flags room for priority rotation)

**Discussion Prompts Examples:**
- "What tech innovation has most changed your industry?"
- "Describe a time when technology solved a problem for you"
- "What's your prediction for AI in the next 5 years?"

#### Post-Session
- Thank you message
- Feedback form (5 stars + comments):
  - Overall experience
  - Peer engagement quality
  - Topic relevance
  - Would you attend again?
- Quick wins: "You spoke for 28 minutes!" "New words used: 12"
- Next lab recommendation
- Share achievement on social media

---

### 4. INSTRUCTOR DASHBOARD

#### Overview/Home
- Upcoming labs schedule (calendar + list)
- Student count (total enrolled, active this month)
- Ratings & reviews summary
- Earnings overview (if commission-based)
- Quick actions: Create lab, message students, view reports

#### Lab Management
**Create New Lab:**
- Title and description
- Topic selection (dropdown of predefined topics)
- Date & time picker (with timezone handling)
- Level selection (A1-C2, can select multiple)
- Max participants (recommended: 12)
- Duration (30, 45, 60, 90 min options)
- Pre-class materials upload (PDFs, links)
- Breakout room configuration:
  - Auto-assign by interest
  - Manual assignment
  - Random
  - Number of participants per room (3-4 recommended)

**Manage Existing Labs:**
- Edit details (up to 24hr before)
- View enrolled students
- Send reminders/updates
- Cancel (with auto-refund if <24hr notice)
- Duplicate lab (quick setup)

#### During Lab
- Launch lab interface (same as student view + instructor controls)
- Monitor all breakout rooms (thumbnail view)
- Join any room instantly
- Broadcast announcements
- End/extend session
- Remove disruptive participants

#### Student Management
- View all enrolled students
- Filter by level, activity, subscription status
- Message individual students or groups
- View student progress in your labs
- Flag students for follow-up

#### Content Library (if instructors create courses)
- Upload video lessons
- Create quizzes and exercises
- Organize into course modules
- Set pricing (if revenue share model)
- View analytics (views, completion rate, ratings)

#### Analytics & Reports
- Lab attendance rates
- Student engagement metrics (speaking time per student)
- Most popular topics
- Peak booking times
- Revenue reports (if applicable)
- Student satisfaction scores
- Export data (CSV/Excel)

---

### 5. ADMIN DASHBOARD

#### User Management
- All users list (students + instructors)
- Search and filters
- User detail view:
  - Activity log
  - Subscription status
  - Course progress
  - Support tickets
- Actions:
  - Edit user details
  - Reset password
  - Grant/revoke access
  - Issue refund
  - Ban/suspend

#### Course Management (CMS Features)
**Course Library:**
- List all courses (searchable, filterable)
- Create new course
- Edit existing courses
- Set visibility (published/draft/archived)
- Bulk actions (publish, unpublish, delete)

**Course Builder:**
- Drag-and-drop module organization
- Video upload with processing status
- Add text lessons, PDFs, external links
- Create quizzes (multiple choice, fill-in-blank, matching)
- Set prerequisites (must complete X before accessing Y)
- Schedule content release (drip content)

**Media Library:**
- All uploaded videos, images, PDFs
- Storage usage tracker
- Bulk delete/organize
- Replace files (maintains links)

#### Lab Management (Admin View)
- All labs calendar
- Approve/reject instructor-created labs
- Monitor live labs (join as invisible observer)
- Handle support issues during labs
- View lab recordings (if enabled)
- Cancel problematic labs

#### Payment & Subscriptions
- Revenue dashboard (MRR, churn, LTV)
- All transactions log
- Refund management
- Failed payments follow-up
- Subscription analytics (upgrades, downgrades, cancellations)
- Discount code management:
  - Create codes (percentage or fixed amount)
  - Set expiration dates
  - Usage limits
  - Track redemptions

#### Analytics & Reporting
**User Metrics:**
- Total users (growth chart)
- Active users (DAU, WAU, MAU)
- Retention cohorts
- Churn analysis
- User demographics (country, age, level)

**Content Metrics:**
- Most popular courses
- Completion rates
- Average watch time
- Lab attendance rates
- Topic popularity

**Business Metrics:**
- Revenue breakdown (subscriptions, courses, labs)
- Customer acquisition cost (CAC)
- Lifetime value (LTV)
- Conversion funnel (visitors → free → paid)

#### Settings
- Platform configuration
- Email templates (welcome, reminders, receipts)
- Payment gateway settings
- Integrations (Google Analytics, Mixpanel, etc.)
- Feature flags (enable/disable features)
- Maintenance mode

---

## USER FLOWS (Critical Paths)

### 1. New User Onboarding
1. Land on homepage → watch hero video (optional)
2. Click "Start Free Trial"
3. Registration form:
   - Name, email, password
   - Country (dropdown)
   - Current English level (self-assessment: Beginner/Intermediate/Advanced)
   - Learning goals (checkboxes: Career, Travel, Studies, Personal)
   - Interests (select 3-5 tags for better lab matching)
4. Email verification (optional: allow skip for faster onboarding)
5. Welcome tour (optional dismissible overlay):
   - "Here are your courses"
   - "Schedule your first lab here"
   - "Track progress here"
6. Redirect to dashboard with:
   - 3 recommended courses based on level
   - Next available lab for their level
   - "Complete your profile" reminder

### 2. Booking & Attending a Conversation Lab
1. Student navigates to "Conversation Labs"
2. Filters by date/topic/level
3. Clicks on interesting lab
4. Views details (time, instructor, description, spots available)
5. Clicks "Reserve Spot"
6. Selects interest sub-topic from dropdown (for breakout room assignment)
7. Confirmation message + calendar invite sent
8. 24hr before: Email reminder with prep materials
9. 15min before: Push notification + email "Lab starting soon"
10. 5min before: "Join Lab" button becomes active
11. Clicks "Join Lab" → tech check → enters lobby
12. At start time: Instructor begins, intro presentation
13. Breakout rooms created → students auto-moved
14. 30-40min conversation in breakout
15. Instructor rotates through rooms
16. Return to main room for 5min recap
17. Session ends → feedback form
18. Post-session email: "Here's what you learned" + next lab recommendation

### 3. Completing a Course
1. Student browses courses or receives recommendation
2. Clicks course → views overview
3. Clicks "Start Course" (or "Continue" if returning)
4. Video player loads, lesson begins
5. After each video: 
   - Interactive exercise (quiz, fill-in-blank, etc.)
   - Must pass to continue (can retry)
6. Progress bar updates
7. After each module (3-5 lessons): Quiz checkpoint
8. Upon course completion:
   - Congratulations modal with confetti animation
   - Certificate generated (downloadable PDF)
   - Share achievement (LinkedIn, social media)
   - Recommendation for next course
   - Unlock bonus content (if applicable)

### 4. Upgrading from Free to Paid
1. Free user attempts to access locked content
2. Paywall modal appears:
   - "Upgrade to continue learning"
   - Shows comparison: Free vs Standard vs Premium
   - Highlights what they're missing
3. Clicks "Upgrade to Standard"
4. Payment form:
   - Card details (via Stripe)
   - Or: MercadoPago for local payment methods
   - Apply promo code (optional)
   - Billing cycle: Monthly/Annual toggle (annual shows discount)
5. Review order
6. Submit → Processing
7. Success: 
   - Welcome email with "what's now unlocked"
   - Redirect to dashboard with celebration banner
   - Immediate access to all content

---

## TECHNICAL SPECIFICATIONS

### Database Schema (Key Tables)

#### users
- id (UUID, primary key)
- email (unique)
- password_hash
- first_name
- last_name
- profile_image_url
- country
- timezone
- language_preference (es/pt)
- english_level (A1-C2)
- learning_goals (JSON array)
- interests (JSON array)
- subscription_tier (free/standard/premium)
- subscription_status (active/canceled/past_due)
- subscription_start_date
- subscription_end_date
- stripe_customer_id
- created_at
- updated_at

#### courses
- id (UUID, primary key)
- title
- slug (unique, for URLs)
- description
- thumbnail_url
- level (A1/A2/B1/B2/C1/C2)
- category (business/travel/tech/etc.)
- duration_minutes
- is_published (boolean)
- price (if selling individually)
- prerequisite_course_id (nullable, foreign key)
- instructor_id (foreign key to users)
- created_at
- updated_at

#### course_modules
- id (UUID, primary key)
- course_id (foreign key)
- title
- description
- order_index
- created_at
- updated_at

#### lessons
- id (UUID, primary key)
- module_id (foreign key)
- title
- video_url
- video_duration_seconds
- transcript_url
- lesson_type (video/text/quiz/exercise)
- content (JSON, for text lessons or quiz data)
- order_index
- created_at
- updated_at

#### user_progress
- id (UUID, primary key)
- user_id (foreign key)
- lesson_id (foreign key)
- status (not_started/in_progress/completed)
- progress_percentage
- last_accessed_at
- completed_at
- time_spent_seconds

#### conversation_labs
- id (UUID, primary key)
- title
- description
- topic
- level (can be array: [B1, B2])
- scheduled_time
- duration_minutes
- max_participants
- instructor_id (foreign key)
- status (scheduled/live/completed/canceled)
- room_size (participants per breakout room)
- prep_materials_url (JSON array of links)
- created_at
- updated_at

#### lab_enrollments
- id (UUID, primary key)
- lab_id (foreign key)
- user_id (foreign key)
- interest_subtopic (for room assignment)
- attended (boolean)
- feedback_rating (1-5)
- feedback_comment
- speaking_time_minutes
- enrolled_at
- attended_at

#### breakout_rooms
- id (UUID, primary key)
- lab_id (foreign key)
- room_name
- topic
- participant_ids (JSON array)
- created_at

#### certificates
- id (UUID, primary key)
- user_id (foreign key)
- course_id (foreign key, nullable)
- certificate_type (course_completion/level_achievement)
- issued_at
- pdf_url

#### payments
- id (UUID, primary key)
- user_id (foreign key)
- amount
- currency
- payment_provider (stripe/mercadopago)
- payment_method
- transaction_id
- status (pending/completed/failed/refunded)
- description
- created_at

### API Endpoints Structure

#### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh-token
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/verify-email/:token

#### Users
- GET /api/users/me (current user profile)
- PUT /api/users/me (update profile)
- GET /api/users/:id (admin only)
- PUT /api/users/:id (admin only)
- DELETE /api/users/:id (admin only)

#### Courses
- GET /api/courses (list all, with filters)
- GET /api/courses/:slug (course details)
- POST /api/courses (create, instructor/admin only)
- PUT /api/courses/:id (update, instructor/admin only)
- DELETE /api/courses/:id (admin only)
- GET /api/courses/:id/modules (get course structure)
- POST /api/courses/:id/enroll (enroll user in course)

#### Lessons
- GET /api/lessons/:id (get lesson details + video URL)
- POST /api/lessons/:id/progress (update user progress)
- POST /api/lessons/:id/complete (mark lesson complete)
- GET /api/lessons/:id/next (get next lesson in sequence)

#### Conversation Labs
- GET /api/labs (list available labs, filtered)
- GET /api/labs/:id (lab details)
- POST /api/labs (create, instructor/admin only)
- PUT /api/labs/:id (update, instructor/admin only)
- DELETE /api/labs/:id (cancel, instructor/admin only)
- POST /api/labs/:id/enroll (book spot in lab)
- DELETE /api/labs/:id/enroll (cancel booking)
- GET /api/labs/my-bookings (user's enrolled labs)
- POST /api/labs/:id/start (instructor starts lab session)
- POST /api/labs/:id/breakout-rooms (create breakout rooms)
- POST /api/labs/:id/feedback (submit post-lab feedback)
- GET /api/labs/:id/recording (get recording URL if available)

#### Progress & Certificates
- GET /api/progress/courses (user's course progress)
- GET /api/progress/stats (overall stats)
- GET /api/certificates (user's earned certificates)
- GET /api/certificates/:id/download (download PDF)
- POST /api/certificates/:id/share (share to LinkedIn)

#### Payments
- POST /api/payments/create-checkout-session (start Stripe checkout)
- POST /api/payments/webhook (Stripe/MercadoPago webhooks)
- GET /api/payments/subscription (current subscription details)
- POST /api/payments/subscription/cancel
- POST /api/payments/subscription/update (upgrade/downgrade)
- POST /api/payments/apply-coupon

#### Admin
- GET /api/admin/users (all users with pagination)
- GET /api/admin/analytics (platform analytics)
- GET /api/admin/revenue (revenue reports)
- POST /api/admin/users/:id/ban
- POST /api/admin/coupons (create discount code)
- GET /api/admin/labs/live (monitor live labs)

### Video Processing Pipeline
1. Instructor uploads video to S3/Cloudflare
2. Trigger webhook to video encoding service (Mux, Cloudflare Stream)
3. Service transcodes to multiple resolutions (1080p, 720p, 480p, 360p)
4. Generate thumbnails (for video preview)
5. Generate subtitles (auto-transcribe via Deepgram or AWS Transcribe)
6. Update database with processed video URLs
7. Notify instructor of completion status
8. Video becomes available to students

### Real-Time Communication (Conversation Labs)
**Technology Choice:** Agora.io SDK or Daily.co

**Implementation:**
1. When lab starts, create room via API
2. Generate unique access tokens for each participant
3. Frontend receives token + room ID
4. Initialize video SDK with token
5. Connect to room
6. Handle events:
   - User joined/left
   - Mic/camera toggle
   - Screen share
   - Chat message
7. Instructor can:
   - Create breakout rooms (use Agora's "sub-rooms" feature)
   - Move users between rooms
   - Broadcast to all
   - Record session (if enabled)
8. After lab ends, destroy room
9. If recorded, save recording URL to database

### Search Implementation
**Tool:** Elasticsearch or Algolia

**Indexed Content:**
- Courses (title, description, tags, instructor name)
- Labs (topic, description)
- Lessons (title, transcript)

**Features:**
- Autocomplete suggestions
- Typo tolerance
- Filters (level, category, price, rating)
- Sorting (relevance, newest, popular, rating)
- Analytics (track search queries for content insights)

---

## PERFORMANCE REQUIREMENTS

- **Page Load:** First Contentful Paint < 1.5s
- **Video Playback:** Start streaming < 2s
- **API Response:** Average < 200ms, 95th percentile < 500ms
- **Uptime:** 99.9% (excluding planned maintenance)
- **Concurrent Users:** Support 1,000+ simultaneous live lab participants
- **Mobile Optimization:** Responsive design, works on 3G networks

---

## SECURITY REQUIREMENTS

- HTTPS everywhere (force redirect from HTTP)
- JWT tokens for authentication (15min access token, 7day refresh token)
- Store passwords with bcrypt (minimum cost factor 10)
- Rate limiting on all API endpoints (100 requests/min per IP)
- SQL injection prevention (use parameterized queries/ORM)
- XSS protection (sanitize all user inputs)
- CSRF protection (tokens on state-changing requests)
- Secure video URLs (signed URLs with expiration)
- Payment data: Never store card details (use Stripe/MercadoPago tokenization)
- GDPR compliance (data export, account deletion)
- User data encryption at rest (database encryption)

---

## LOCALIZATION (i18n)

**Supported Languages:**
- Spanish (es)
- Portuguese (pt)
- English (en) - for interface, not content

**Translation Requirements:**
- All UI text must be translatable (use i18n library like next-intl)
- Date/time formatting per locale
- Currency formatting ($ for USD, R$ for BRL, $ for MXN, etc.)
- Number formatting (1,000 vs 1.000)
- Default language based on user's country
- Language switcher in header

**Content Language:**
- All course content in English (that's what they're learning)
- Subtitles in Spanish/Portuguese available
- UI instructions in user's preferred language

---

## ACCESSIBILITY (WCAG 2.1 Level AA)

- Keyboard navigation for all interactive elements
- Screen reader compatible (proper ARIA labels)
- Color contrast ratio minimum 4.5:1 for text
- Captions for all video content
- Alt text for all images
- Focus indicators visible
- Skip to main content link
- Forms with clear labels and error messages

---

## ANALYTICS & TRACKING

**Track These Events:**
- Page views
- User registration
- Course enrollment
- Lesson completion
- Lab booking
- Lab attendance
- Payment events (start checkout, complete payment, failed payment)
- Video engagement (play, pause, completion percentage)
- Search queries
- Button clicks on CTAs
- Subscription changes (upgrade, downgrade, cancel)
- User retention (daily, weekly, monthly active users)

**Tools:**
- Google Analytics 4 (general traffic)
- Mixpanel or PostHog (product analytics)
- Hotjar or Microsoft Clarity (heatmaps, session recordings)
- Stripe Dashboard (payment analytics)

---

## EMAIL NOTIFICATIONS

**Transactional Emails (via SendGrid/Resend):**
- Welcome email (upon registration)
- Email verification
- Password reset
- Course enrollment confirmation
- Lab booking confirmation (with calendar file attached)
- Lab reminder (24hr before, 1hr before)
- Lab feedback request (immediately after)
- Course completion congratulations
- Certificate earned
- Payment receipt
- Payment failed
- Subscription canceled
- Subscription expiring soon (7 days before)

**Marketing Emails (via SendGrid/Mailchimp):**
- Weekly learning digest (courses to try, upcoming labs)
- New course announcements
- Special offers/discounts
- Re-engagement (if inactive 30+ days)

**Email Design:**
- Mobile-responsive templates
- Brand colors and logo
- Clear CTA buttons
- Unsubscribe link (legally required)
- Plain text version for compatibility

---

## TESTING REQUIREMENTS

### Unit Tests
- All business logic functions
- API route handlers
- Database queries
- Utility functions
- Target: 80%+ code coverage

### Integration Tests
- Authentication flow
- Payment processing
- Course enrollment
- Lab booking
- Video playback
- Email sending

### End-to-End Tests (Playwright or Cypress)
- Complete user registration flow
- Complete course enrollment and watching
- Complete lab booking and joining
- Complete checkout and payment
- Admin dashboard operations

### Load Testing (K6 or Artillery)
- Simulate 1,000 concurrent users
- Measure API response times under load
- Test video streaming capacity
- Test live lab connections

---

## DEPLOYMENT & CI/CD

**Environments:**
1. **Development:** Local + Docker Compose
2. **Staging:** Mirror of production (for testing)
3. **Production:** Live platform

**CI/CD Pipeline (GitHub Actions):**
1. On push to `develop` branch:
   - Run linter (ESLint, Prettier)
   - Run unit tests
   - Build Docker images
   - Deploy to staging
   - Run integration tests
   - Run E2E tests
   - Notify team of results

2. On push to `main` branch (after PR approval):
   - Run all tests
   - Build optimized production images
   - Deploy to production (blue-green deployment)
   - Run smoke tests
   - Monitor for errors
   - Rollback if critical issues detected

**Monitoring:**
- Error tracking: Sentry
- Uptime monitoring: Uptime Robot or Pingdom
- Performance: New Relic or Datadog
- Logs: Papertrail or Loggly
- Alerts: Slack/email notifications for critical issues

---

## LAUNCH CHECKLIST

### Before Soft Launch (Beta)
- [ ] All core features functional (courses, labs, payments)
- [ ] 10+ pre-recorded courses ready (beginner to intermediate)
- [ ] 5+ instructors trained and onboarded
- [ ] Payment processing tested (Stripe + MercadoPago)
- [ ] Email templates finalized
- [ ] Analytics tracking implemented
- [ ] Security audit completed
- [ ] Performance testing passed
- [ ] Mobile responsiveness verified
- [ ] Beta user group recruited (50-100 users)

### Before Public Launch
- [ ] Beta feedback incorporated
- [ ] 50+ courses available
- [ ] 10+ active instructors
- [ ] Marketing materials ready (social media, ads, email campaigns)
- [ ] Customer support system in place (live chat or ticketing)
- [ ] Help center/FAQ articles published
- [ ] Legal pages (Terms, Privacy, Refund Policy)
- [ ] SEO optimization completed
- [ ] Press release drafted
- [ ] Launch event/webinar scheduled
- [ ] Referral program activated
- [ ] Monitoring and alerting fully configured

---

## PRIORITIZATION (MVP Phases)

### Phase 1 - MVP (3 months)
**Goal:** Core learning platform with basic labs

**Must-Have:**
- Landing page (high-conversion)
- User registration/authentication
- Student dashboard (basic)
- Course catalog
- Video player
- Course progress tracking
- Conversation lab booking
- Live lab interface (basic, 1 main room, instructor-led)
- Payment integration (Stripe only)
- Admin panel (basic)

**Can Wait:**
- Breakout room functionality
- Instructor dashboard
- Advanced analytics
- Mobile app
- Multiple payment providers
- Certificates
- Gamification

### Phase 2 - Enhanced Labs (2 months)
**Goal:** Launch Conversation Practice Labs methodology

**Add:**
- Breakout room system
- Interest-based room matching
- Instructor rotation through rooms
- Post-lab feedback
- Lab recordings (optional)
- Instructor dashboard
- Lab management tools

### Phase 3 - Scale & Optimize (2 months)
**Goal:** Support 1,000+ students, improve retention

**Add:**
- Certificate generation
- Advanced analytics
- MercadoPago integration
- Referral program
- Email marketing automation
- Mobile-optimized experience
- Course recommendations (ML-based)

### Phase 4 - Growth Features (Ongoing)
**Add:**
- Mobile apps (iOS/Android)
- B2B corporate plans
- White-label option for partners
- API for third-party integrations
- AI-powered speaking practice (between labs)
- Community forums
- Gamification and leaderboards

---

## BUDGET ESTIMATES (Monthly Operational Costs)

**Infrastructure:**
- Hosting (Vercel + Railway): $200-500
- Database (PostgreSQL): $50-150
- CDN (Cloudflare): $20-50
- Video hosting: $300-800 (depends on usage)
- Live video (Agora.io): $200-500 (depends on minutes)
- File storage (S3/R2): $50-100

**Services:**
- Email (SendGrid): $20-100
- Analytics (Mixpanel): $0-200
- Error monitoring (Sentry): $0-50
- Customer support: $50-200
- SSL certificates: $0 (Let's Encrypt)

**Total Estimated:** $900-2,600/month (scales with user growth)

---

## FINAL NOTES FOR DEVELOPER AGENT

1. **Start with the landing page:** This is your conversion engine. Make it AMAZING.

2. **Prioritize the lab booking and live session experience:** This is the unique differentiator. Get this right.

3. **Keep the design clean and professional:** Reference modern SaaS platforms (Linear, Notion, Stripe) for inspiration, not traditional "language learning" sites.

4. **Mobile-first mindset:** Many LATAM users will access on mobile. Design for mobile, enhance for desktop.

5. **Test payments thoroughly:** Payment failures lose customers forever. Test every edge case.

6. **Localization from day one:** Don't retrofit Spanish/Portuguese later. Build it in now.

7. **Performance matters:** Slow sites = high bounce rates. Optimize everything.

8. **Security is non-negotiable:** User data and payments must be rock-solid secure.

9. **Analytics from day one:** You can't improve what you don't measure.

10. **Think scalability:** Build for 100 users, architect for 100,000.

---

## QUESTIONS TO CLARIFY BEFORE DEVELOPMENT

1. Do you have existing course content, or will that be created in parallel?
2. How many instructors do you have ready to run labs at launch?
3. What's your target launch date?
4. What's your initial marketing budget?
5. Do you have a brand logo and visual identity, or should we create that?
6. Who will handle customer support in the early days?
7. What's your preference: build fast MVP or build comprehensive platform?
8. Any specific LATAM countries to prioritize first (Mexico, Brazil, Colombia, Argentina)?
9. Do you want mobile apps immediately, or can they wait for Phase 3?
10. What's your target for initial user acquisition (100? 500? 1,000?)?

---

## SUCCESS METRICS (Track from Day 1)

**User Acquisition:**
- Website visitors
- Conversion rate (visitor → signup)
- Free-to-paid conversion rate
- User growth rate (week-over-week)

**Engagement:**
- Daily/Monthly active users
- Course completion rate
- Lab attendance rate
- Average sessions per week
- Average session duration

**Business:**
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- Churn rate
- Net Promoter Score (NPS)

**Learning Outcomes:**
- Average level progression (A1→A2, etc.)
- Student satisfaction ratings
- Speaking time per student
- Retention rate (30-day, 60-day, 90-day)

---

END OF DEVELOPMENT BRIEF
