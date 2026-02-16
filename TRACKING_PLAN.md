# CogniBoost Analytics Tracking Plan

## Overview
- **Tools**: GA4 (gtag.js) with Consent Mode v2
- **Consent**: Cookie banner integrates with GA4 consent state (analytics + marketing)
- **SPA Tracking**: Virtual page views on every route change via wouter
- **UTM Capture**: Persists UTM params in sessionStorage for attribution
- **Last updated**: 2026-02-15

---

## Setup Instructions

### 1. Get your GA4 Measurement ID
1. Go to [Google Analytics](https://analytics.google.com)
2. Create a GA4 property for CogniBoost
3. Create a Web data stream for `cogniboost-production.up.railway.app`
4. Copy the Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Replace placeholder in code
In `client/index.html`, replace all instances of `G-XXXXXXXXXX` with your real Measurement ID.

### 3. Environment variable (optional)
Set `VITE_GA_MEASUREMENT_ID` in your Vercel/Railway environment to use in the analytics library.

### 4. Mark conversions in GA4 Admin
Go to Admin > Events > mark these as conversions:
- `sign_up` (Once per session)
- `purchase` (Every event)
- `booking_submitted` (Once per session)
- `placement_quiz_completed` (Once per session)

### 5. Create Custom Dimensions
Go to Admin > Data display > Custom definitions:

| Dimension | Scope | Parameter |
|-----------|-------|-----------|
| User Type | User | user_type |
| Plan Type | User | plan_type |
| English Level | User | english_level |
| Onboarding Completed | User | onboarding_completed |
| Booking Type | Event | booking_type |
| CTA Location | Event | cta_location |
| Plan Name | Event | plan_name |

---

## Events

### Marketing Site Events

| Event Name | Description | Properties | Trigger |
|------------|-------------|------------|---------|
| `page_view` | Virtual page view (SPA) | page_path, page_title, page_location | Every route change |
| `cta_clicked` | CTA button clicked | button_text, cta_location, page | Hero CTAs, pricing buttons |
| `pricing_viewed` | Pricing section enters viewport | source, page | IntersectionObserver (30%) |
| `plan_selected` | Specific plan clicked | plan_name, price, billing_cycle | Pricing card CTA |
| `faq_expanded` | FAQ section opened | page | Collapsible trigger |
| `faq_question_opened` | Individual FAQ expanded | question, question_index | Accordion item opened |
| `social_link_clicked` | Social media link clicked | platform, page | Footer social icons |
| `whatsapp_clicked` | WhatsApp community link | cta_location | Hero WhatsApp button |
| `booking_modal_opened` | Booking modal shown | booking_type | "Clase Gratis" CTA |
| `booking_submitted` | Booking form completed | booking_type | Successful room booking |

### Conversion Events (Funnel)

| Event Name | Description | Properties | Trigger |
|------------|-------------|------------|---------|
| `signup_started` | User clicked submit on signup | method, utm_* | Signup form submit |
| `sign_up` | Account created successfully | method, utm_* | POST /api/auth/signup success |
| `login` | User logged in | method | POST /api/auth/login success |
| `begin_checkout` | Stripe checkout initiated | plan, value, currency | Stripe redirect |
| `purchase` | Subscription confirmed | transaction_id, value, currency, plan | Purchase-complete page link success |
| `placement_quiz_started` | Quiz attempt begun | page | POST /api/placement/start success |
| `placement_quiz_completed` | Quiz finished with result | level, confidence | Quiz completed response |

### Product / App Events

| Event Name | Description | Properties | Trigger |
|------------|-------------|------------|---------|
| `onboarding_step_completed` | Onboarding step done | step_number, step_name | Each onboarding step |
| `onboarding_completed` | All onboarding done | steps_completed | Final onboarding step |
| `course_enrolled` | User enrolled in course | course_id, course_name | Enrollment action |
| `lesson_completed` | Lesson finished | lesson_id, lesson_title, course_id | Lesson progress saved |
| `quiz_attempted` | Quiz submission | quiz_id, score, passed | Quiz answer submitted |
| `lab_booked` | Conversation lab booked | lab_id, lab_name | Lab booking confirmed |
| `ai_tutor_used` | AI tutor interaction | course_id | AI tutor message sent |
| `scroll_depth` | Scroll milestone reached | depth, page | 25/50/75/100% scroll |

---

## User Properties

| Property | Type | Description |
|----------|------|-------------|
| user_type | string | Subscription tier: free, flex, basic, premium |
| plan_type | string | Same as user_type (GA4 standard) |
| is_admin | boolean | Admin flag |
| english_level | string | CEFR level from placement quiz |
| onboarding_completed | boolean | Whether onboarding is done |

---

## UTM Strategy

### Parameters captured
- `utm_source` - Traffic source (google, facebook, whatsapp, etc.)
- `utm_medium` - Marketing medium (cpc, email, social, organic)
- `utm_campaign` - Campaign name (launch_2026, spring_promo)
- `utm_content` - Content variant (hero_cta, footer_link)
- `utm_term` - Paid search keyword

### Example URLs
```
https://cogniboost-production.up.railway.app/?utm_source=whatsapp&utm_medium=social&utm_campaign=launch_2026&utm_content=community_share
https://cogniboost-production.up.railway.app/?utm_source=google&utm_medium=cpc&utm_campaign=ingles_profesional&utm_term=clases+ingles+online
https://cogniboost-production.up.railway.app/placement-quiz?utm_source=newsletter&utm_medium=email&utm_campaign=week1_nurture
```

### Attribution
UTM params are captured on landing and stored in sessionStorage. They persist across navigation and are attached to conversion events (signup, purchase).

---

## Funnels to Monitor

### Signup Funnel
1. `page_view` (landing page)
2. `cta_clicked` (hero or pricing)
3. `pricing_viewed`
4. `plan_selected`
5. `signup_started` / `begin_checkout`
6. `sign_up` / `purchase`

### Free Class Funnel
1. `cta_clicked` (Clase Gratis)
2. `booking_modal_opened`
3. `booking_submitted`

### Placement Quiz Funnel
1. `cta_clicked` (Evaluar Mi Nivel)
2. `placement_quiz_started`
3. `placement_quiz_completed`
4. `sign_up` (conversion from quiz result page)

---

## Consent & Privacy

- **Consent Mode v2**: All analytics default to `denied` until user accepts cookies
- **Cookie banner**: Existing `cb_cookie_consent` in localStorage drives consent state
- **No PII in events**: Email, names, passwords never sent to GA4
- **IP anonymization**: GA4 handles this by default
- **Data retention**: Set to 14 months in GA4 Admin
- **GDPR/CCPA compliant**: Users can reject analytics cookies, GA4 respects consent signals

---

## Files Modified

| File | Changes |
|------|---------|
| `client/index.html` | GA4 gtag.js + consent mode v2 scripts |
| `client/src/lib/analytics.ts` | Central analytics library (NEW) |
| `client/src/App.tsx` | AnalyticsTracker component, SPA page views, user properties |
| `client/src/components/cookie-consent.tsx` | updateConsentState() on save |
| `client/src/components/landing/hero.tsx` | CTA click tracking |
| `client/src/components/landing/pricing.tsx` | Pricing viewed, plan selected, checkout started |
| `client/src/components/landing/faq.tsx` | FAQ expanded, question opened |
| `client/src/components/landing/footer.tsx` | Social link clicks |
| `client/src/components/book-class-modal.tsx` | Booking submitted |
| `client/src/pages/signup.tsx` | Signup started/completed |
| `client/src/pages/login.tsx` | Login tracking |
| `client/src/pages/purchase-complete.tsx` | Purchase conversion |
| `client/src/pages/placement-quiz.tsx` | Quiz started/completed |
