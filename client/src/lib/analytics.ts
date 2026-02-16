/**
 * CogniBoost Analytics Tracking Library
 *
 * Centralized analytics with GA4 (gtag.js) + dataLayer support.
 * Respects cookie consent (cb_cookie_consent in localStorage).
 *
 * Event naming: object_action (lowercase, underscore-separated)
 * See TRACKING_PLAN.md for full event documentation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
}

// Extend window for gtag + dataLayer
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: Record<string, unknown>[];
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COOKIE_CONSENT_KEY = "cb_cookie_consent";
const UTM_STORAGE_KEY = "cb_utm_params";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "";

// ---------------------------------------------------------------------------
// Consent helpers
// ---------------------------------------------------------------------------

function getConsent(): CookiePreferences {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* default */ }
  return { essential: true, functional: false, analytics: false, marketing: false };
}

export function hasAnalyticsConsent(): boolean {
  return getConsent().analytics;
}

export function hasMarketingConsent(): boolean {
  return getConsent().marketing;
}

/**
 * Update GA4 consent state. Called when user changes cookie preferences.
 */
export function updateConsentState(): void {
  if (typeof window.gtag !== "function") return;
  const consent = getConsent();
  window.gtag("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    ad_personalization: consent.marketing ? "granted" : "denied",
  });
}

// ---------------------------------------------------------------------------
// Core tracking
// ---------------------------------------------------------------------------

/**
 * Push to dataLayer (GTM-compatible) and send gtag event.
 */
export function trackEvent(eventName: string, properties: EventProperties = {}): void {
  // Always push to dataLayer (for future GTM)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...properties,
  });

  // Only send to GA4 if analytics consent is granted
  if (!hasAnalyticsConsent()) return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, properties);
}

/**
 * Set user properties (plan, level, etc.)
 */
export function setUserProperties(properties: EventProperties): void {
  if (typeof window.gtag !== "function") return;
  if (!hasAnalyticsConsent()) return;
  window.gtag("set", "user_properties", properties);
}

/**
 * Set user ID for cross-device tracking.
 */
export function setUserId(userId: string | null): void {
  if (typeof window.gtag !== "function") return;
  if (!hasAnalyticsConsent()) return;
  if (GA_MEASUREMENT_ID) {
    window.gtag("config", GA_MEASUREMENT_ID, { user_id: userId });
  }
}

// ---------------------------------------------------------------------------
// UTM parameter capture & persistence
// ---------------------------------------------------------------------------

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  referrer?: string;
  captured_at?: string;
}

/**
 * Capture UTM parameters from URL on page load.
 * Persists to sessionStorage so they survive navigation.
 */
export function captureUTMParams(): UTMParams {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  const hasUTM = utmKeys.some((key) => params.has(key));

  if (hasUTM) {
    const utmData: UTMParams = {
      landing_page: window.location.pathname,
      referrer: document.referrer || undefined,
      captured_at: new Date().toISOString(),
    };
    utmKeys.forEach((key) => {
      const val = params.get(key);
      if (val) (utmData as Record<string, string>)[key] = val;
    });

    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmData));
    return utmData;
  }

  // Return stored UTMs if they exist
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }

  return {};
}

export function getStoredUTM(): UTMParams {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

// ---------------------------------------------------------------------------
// Marketing Site Events
// ---------------------------------------------------------------------------

/** CTA button clicked (hero, pricing, footer, etc.) */
export function trackCTAClicked(buttonText: string, location: string): void {
  trackEvent("cta_clicked", { button_text: buttonText, cta_location: location, page: window.location.pathname });
}

/** Pricing section viewed */
export function trackPricingViewed(source?: string): void {
  trackEvent("pricing_viewed", { source: source || "direct", page: window.location.pathname });
}

/** Specific plan selected/clicked */
export function trackPlanSelected(planName: string, price: string, billingCycle: string = "monthly"): void {
  trackEvent("plan_selected", { plan_name: planName, price, billing_cycle: billingCycle });
}

/** FAQ section expanded */
export function trackFAQExpanded(): void {
  trackEvent("faq_expanded", { page: window.location.pathname });
}

/** Individual FAQ question opened */
export function trackFAQQuestionOpened(questionText: string, index: number): void {
  trackEvent("faq_question_opened", { question: questionText.slice(0, 100), question_index: index });
}

/** Social link clicked */
export function trackSocialClicked(platform: string): void {
  trackEvent("social_link_clicked", { platform, page: window.location.pathname });
}

/** WhatsApp community link clicked */
export function trackWhatsAppClicked(location: string): void {
  trackEvent("whatsapp_clicked", { cta_location: location });
}

/** Booking modal opened (class or demo) */
export function trackBookingOpened(bookingType: string): void {
  trackEvent("booking_modal_opened", { booking_type: bookingType });
}

/** Booking form submitted */
export function trackBookingSubmitted(bookingType: string, email?: string): void {
  // Never send PII — only type
  trackEvent("booking_submitted", { booking_type: bookingType });
}

/** Scroll depth milestones */
export function trackScrollDepth(depth: number, page: string): void {
  trackEvent("scroll_depth", { depth, page });
}

// ---------------------------------------------------------------------------
// Conversion Events (Signup / Purchase Funnel)
// ---------------------------------------------------------------------------

/** User started signup flow */
export function trackSignupStarted(method: string = "email"): void {
  trackEvent("signup_started", { method, ...getStoredUTM() });
}

/** User completed signup */
export function trackSignupCompleted(method: string = "email"): void {
  trackEvent("sign_up", { method, ...getStoredUTM() });
}

/** User started checkout (Stripe redirect) */
export function trackCheckoutStarted(plan: string, value: number): void {
  trackEvent("begin_checkout", {
    plan,
    value,
    currency: "USD",
    items: JSON.stringify([{ item_id: plan, item_name: `CogniBoost ${plan}`, price: value }]),
  });
}

/** Purchase completed (on purchase-complete page) */
export function trackPurchaseCompleted(plan: string, value: number, transactionId?: string): void {
  trackEvent("purchase", {
    transaction_id: transactionId || `cb_${Date.now()}`,
    value,
    currency: "USD",
    plan,
    items: JSON.stringify([{ item_id: plan, item_name: `CogniBoost ${plan}`, price: value }]),
  });
}

// ---------------------------------------------------------------------------
// Product / App Events
// ---------------------------------------------------------------------------

/** Onboarding step completed */
export function trackOnboardingStep(stepNumber: number, stepName: string): void {
  trackEvent("onboarding_step_completed", { step_number: stepNumber, step_name: stepName });
}

/** Onboarding completed */
export function trackOnboardingCompleted(stepsCompleted: number): void {
  trackEvent("onboarding_completed", { steps_completed: stepsCompleted });
}

/** Placement quiz started */
export function trackPlacementQuizStarted(): void {
  trackEvent("placement_quiz_started", { page: "/placement-quiz" });
}

/** Placement quiz completed */
export function trackPlacementQuizCompleted(level: string, confidence: number): void {
  trackEvent("placement_quiz_completed", { level, confidence, page: "/placement-quiz" });
}

/** Course enrolled */
export function trackCourseEnrolled(courseId: string, courseName: string): void {
  trackEvent("course_enrolled", { course_id: courseId, course_name: courseName });
}

/** Lesson completed */
export function trackLessonCompleted(lessonId: string, lessonTitle: string, courseId: string): void {
  trackEvent("lesson_completed", { lesson_id: lessonId, lesson_title: lessonTitle, course_id: courseId });
}

/** Quiz attempted */
export function trackQuizAttempted(quizId: string, score: number, passed: boolean): void {
  trackEvent("quiz_attempted", { quiz_id: quizId, score, passed });
}

/** Lab booked */
export function trackLabBooked(labId: string, labName: string): void {
  trackEvent("lab_booked", { lab_id: labId, lab_name: labName });
}

/** AI Tutor used */
export function trackAITutorUsed(courseId: string): void {
  trackEvent("ai_tutor_used", { course_id: courseId });
}

/** Login */
export function trackLogin(method: string = "email"): void {
  trackEvent("login", { method });
}

// ---------------------------------------------------------------------------
// Page view (virtual, for SPA navigation)
// ---------------------------------------------------------------------------

export function trackPageView(path?: string): void {
  if (typeof window.gtag !== "function") return;
  if (!hasAnalyticsConsent()) return;

  const pagePath = path || window.location.pathname;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_title: document.title,
    page_location: window.location.href,
  });
}

// ---------------------------------------------------------------------------
// Initialize analytics on app load
// ---------------------------------------------------------------------------

export function initAnalytics(): void {
  // Ensure dataLayer exists
  window.dataLayer = window.dataLayer || [];

  // Capture UTM params on first load
  captureUTMParams();

  // Set initial consent state
  updateConsentState();
}
