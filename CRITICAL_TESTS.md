# CogniBoost - Critical Test Checklist

> Run after every deployment. Tests ordered by priority.
> Production URL: https://cogniboost.co
> Railway backend: https://cogniboost-production.up.railway.app

---

## P0 - BLOCKING (Must pass before any user touches the site)

### 1. Health Check
- [ ] `GET /health` returns `{ "status": "ok" }`
- [ ] Response time < 2 seconds

### 2. Email/Password Signup
- [ ] Go to `/signup` - form loads correctly
- [ ] Sign up with new email + password (min 8 chars)
- [ ] Confirmation message appears ("Check your email")
- [ ] Verification email arrives (from `info@inscripciones.cogniboost.co`)
- [ ] Click verification link in email - email marked as verified
- [ ] Redirect to dashboard or onboarding after verification

### 3. Email/Password Login
- [ ] Go to `/login` - form loads correctly
- [ ] Login with valid credentials - redirects to `/dashboard`
- [ ] Login with wrong password - shows error (no password hint)
- [ ] Session persists on page refresh (`GET /api/auth/user` returns user)

### 4. Password Reset
- [ ] Click "Forgot password" on login page
- [ ] Enter registered email - success message (always, even for non-existent emails)
- [ ] Password reset email arrives with reset link
- [ ] Click reset link - shows new password form
- [ ] Set new password (min 8 chars) - success message
- [ ] Login with new password works
- [ ] Old password no longer works

### 5. Google OAuth
- [ ] Click "Sign in with Google" on login page
- [ ] Google consent screen shows (no "access blocked" error)
- [ ] After Google approval, redirects back to `/dashboard`
- [ ] User created/linked correctly (check email in DB)
- [ ] Email automatically verified for Google users

### 6. Stripe Payment Flow
- [ ] Pricing page loads and shows plans (Flex, Basico, Premium)
- [ ] Click "Subscribe" on any plan
- [ ] Stripe Checkout opens correctly (no API errors)
- [ ] Complete test payment - redirects to success page
- [ ] Subscription tier updated in user profile
- [ ] Manage subscription link works (Stripe Customer Portal)

---

## P1 - HIGH (Core learning features - test within 1 hour of deploy)

### 7. Placement Quiz (Authenticated User)
- [ ] After onboarding, start placement quiz
- [ ] First question appears with 4 options
- [ ] Answer all 20 questions - each new question loads
- [ ] After question 20, quiz completes with level result (A1-C2)
- [ ] Level saved to user profile
- [ ] Result email sent with level explanation

### 8. Placement Quiz (Anonymous Lead)
- [ ] Go to `/placement-quiz` without logging in
- [ ] Lead capture form appears (email, firstName, lastName, phone)
- [ ] Submit form - quiz starts
- [ ] Complete quiz - result shown
- [ ] Lead record created in database with quiz result

### 9. AI Tutor Chat
- [ ] Open AI tutor widget on dashboard
- [ ] Send a message (e.g., "Hello, how are you?")
- [ ] AI response arrives (GPT-4o-mini, English tutor persona)
- [ ] Response is level-appropriate (matches user's placement level)
- [ ] Daily message counter shows usage (e.g., "2/5 messages today")
- [ ] Free tier: 5 msg/day limit enforced
- [ ] Premium tier: unlimited messages

### 10. Course Access & Content Gating
- [ ] Free user: sees courses but only first 3 lessons of Module 1 unlocked
- [ ] Free user: locked lessons show upgrade prompt (no video/PDF leaked)
- [ ] Paid user (flex/basic/premium): all lessons accessible
- [ ] Lesson video plays (Vimeo embed loads)
- [ ] PDF materials download link works

### 11. Lesson Progress
- [ ] Start watching a lesson - progress tracked
- [ ] Complete a lesson - marked as complete
- [ ] Return to course page - completed lessons show checkmark
- [ ] Course progress percentage updates

### 12. Lesson Quizzes
- [ ] After completing a lesson, quiz becomes available
- [ ] Submit quiz answers - score calculated
- [ ] Pass/fail feedback shown
- [ ] Quiz attempt recorded in history

---

## P2 - MEDIUM (Engagement features - test within 24 hours)

### 13. Email Delivery (All Templates)
- [ ] Welcome email on signup
- [ ] Email verification link
- [ ] Password reset link
- [ ] Placement quiz result
- [ ] Course enrollment confirmation
- [ ] Subscription activation confirmation

### 14. Onboarding Flow
- [ ] New user sees onboarding page after first login
- [ ] Can choose "Take placement quiz" or "Skip"
- [ ] Skip: goes to dashboard with default level
- [ ] Take quiz: redirects to placement quiz
- [ ] After completing onboarding, flag set (won't show again)

### 15. Live Sessions & Labs
- [ ] `/labs` page loads with available conversation labs
- [ ] Lab details show schedule, instructor, capacity
- [ ] Authenticated user can book a lab spot
- [ ] Booking confirmation email sent to user
- [ ] Notification email sent to admin
- [ ] Guest booking works (email + name required)

### 16. Stripe Webhooks
- [ ] Subscription renewal: user stays active
- [ ] Payment failure: user status changes to "hold"
- [ ] Subscription cancelled: tier reverts to "free"
- [ ] Resubscribe: tier and status restored

### 17. Lead Capture & Sequences
- [ ] Contact form creates lead record
- [ ] Day 1 followup email scheduled
- [ ] Day 3 lab invite email scheduled
- [ ] Day 7 offer email scheduled

---

## P3 - LOW (Admin features - test within 1 week)

### 18. Admin Dashboard
- [ ] Admin user sees admin menu in sidebar
- [ ] `/admin` loads with stats (total users, revenue, enrollments)
- [ ] Non-admin users cannot access `/admin` routes (403)

### 19. Admin - Student Management
- [ ] List students with filters (status, tier, level)
- [ ] Manually add student (sends invitation email)
- [ ] Invited student receives activation email
- [ ] Student activates account via link
- [ ] Lock/unlock student account
- [ ] Export students as CSV

### 20. Admin - Course Management
- [ ] Create new course with level, name, description
- [ ] Add modules to course
- [ ] Add lessons to modules (with Vimeo ID, PDF)
- [ ] Create quiz for lesson with questions
- [ ] AI-generate quiz questions from lesson content
- [ ] Reorder lessons/modules

### 21. Admin - Team Management
- [ ] Invite new admin (sends email)
- [ ] Invite staff/instructor (sends email)
- [ ] Revoke admin access
- [ ] Cancel pending invitations

### 22. Admin - Analytics
- [ ] Engagement metrics load (active users, completion rates)
- [ ] Financial report shows revenue, subscriptions
- [ ] Lead analytics show funnel metrics
- [ ] Export reports to CSV

---

## Environment Variables Checklist

Verify these are set on Railway before each deploy:

| Variable | Status | Notes |
|---|---|---|
| `DATABASE_URL` | Required | Public proxy URL (not .railway.internal) |
| `STRIPE_SECRET_KEY` | Required | Must start with `sk_live_` or `sk_test_` |
| `STRIPE_PUBLISHABLE_KEY` | Required | Must start with `pk_live_` or `pk_test_` |
| `STRIPE_WEBHOOK_SECRET` | Required | Starts with `whsec_` |
| `RESEND_API_KEY` | Required | Starts with `re_` |
| `GOOGLE_CLIENT_ID` | Required | For Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Required | For Google OAuth |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Required | Starts with `sk-proj-` |
| `SESSION_SECRET` | Required | Random string for sessions |
| `NODE_ENV` | Recommended | Set to `production` |
| `SENTRY_DSN` | Optional | Error tracking |

---

## Quick Smoke Test (5 minutes)

Run this after every deploy for a fast sanity check:

1. `curl https://cogniboost-production.up.railway.app/health` - returns OK
2. Open https://cogniboost.co - landing page loads
3. Click "Login" - login page loads
4. Click "Sign in with Google" - Google consent screen (no error)
5. Login with test account - dashboard loads
6. Open AI tutor - send message - response arrives
7. Check pricing page - plans show with "Subscribe" buttons
8. Click Subscribe - Stripe Checkout loads

---

## Test Accounts

| Account | Role | Purpose |
|---|---|---|
| `corallozanoc@gmail.com` | Test User | Primary test account |
| _(create new)_ | New User | Test fresh signup flow |
| _(admin account)_ | Admin | Test admin features |

---

*Last updated: 2026-02-13*
*After fixes: OAuth callback URLs, email delivery, Stripe key, OpenAI key*
