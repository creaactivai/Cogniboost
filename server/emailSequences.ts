/**
 * CogniBoost Automated Email Sequences
 *
 * Runs periodically (via cron or setInterval) to send lifecycle emails:
 * 1. Onboarding sequence (day 2, 5, 7 after signup)
 * 2. Trial ending / expired notifications
 * 3. Re-engagement for inactive users (30+ days)
 * 4. Failed payment recovery
 * 5. Weekly progress summaries
 *
 * Each sequence checks the DB for eligible users, sends the email,
 * and marks the flag so the email is never sent twice.
 */

import { db } from "./db";
import { users } from "../shared/models/auth";
import { lessonProgress, quizAttempts, roomBookings } from "../shared/schema";
import { and, eq, lt, gt, sql, isNull, isNotNull, desc, count } from "drizzle-orm";
import { sendEmail, type EmailTemplate } from "./resendClient";

const BASE_URL = process.env.APP_URL || process.env.APP_BASE_URL || "https://cogniboost-production.up.railway.app";

interface SequenceResult {
  sequence: string;
  sent: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// 1. ONBOARDING SEQUENCE (registered users)
// ---------------------------------------------------------------------------

/** Day 2: Quick win — complete your first lesson */
async function runOnboardingDay2(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "onboarding_day2", sent: 0, errors: [] };
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  try {
    const eligible = await db.select().from(users).where(
      and(
        eq(users.onboardingDay2Sent, false),
        eq(users.welcomeEmailSent, true),
        lt(users.createdAt, twoDaysAgo),
        gt(users.createdAt, new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)), // not older than 10 days
        isNotNull(users.email)
      )
    ).limit(50);

    for (const user of eligible) {
      try {
        await sendEmail(user.email!, "onboarding_day2_quickwin", {
          firstName: user.firstName || "estudiante",
          dashboardUrl: `${BASE_URL}/dashboard`,
        });
        await db.update(users).set({ onboardingDay2Sent: true }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

/** Day 5: Social proof — student success story */
async function runOnboardingDay5(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "onboarding_day5", sent: 0, errors: [] };
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  try {
    const eligible = await db.select().from(users).where(
      and(
        eq(users.onboardingDay5Sent, false),
        eq(users.onboardingDay2Sent, true),
        lt(users.createdAt, fiveDaysAgo),
        gt(users.createdAt, new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
        isNotNull(users.email)
      )
    ).limit(50);

    for (const user of eligible) {
      try {
        await sendEmail(user.email!, "onboarding_day5_social_proof", {
          firstName: user.firstName || "estudiante",
          dashboardUrl: `${BASE_URL}/dashboard`,
        });
        await db.update(users).set({ onboardingDay5Sent: true }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

/** Day 7: Feature highlight — quiz & labs */
async function runOnboardingDay7(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "onboarding_day7", sent: 0, errors: [] };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const eligible = await db.select().from(users).where(
      and(
        eq(users.onboardingDay7Sent, false),
        eq(users.onboardingDay5Sent, true),
        lt(users.createdAt, sevenDaysAgo),
        gt(users.createdAt, new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
        isNotNull(users.email)
      )
    ).limit(50);

    for (const user of eligible) {
      try {
        await sendEmail(user.email!, "onboarding_day7_feature", {
          firstName: user.firstName || "estudiante",
          dashboardUrl: `${BASE_URL}/placement-quiz`,
        });
        await db.update(users).set({ onboardingDay7Sent: true }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2. TRIAL ENDING / EXPIRED
// ---------------------------------------------------------------------------

/** 5 days into 7-day trial → reminder */
async function runTrialEnding(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "trial_ending", sent: 0, errors: [] };
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

  try {
    // Users with stripe subscription who signed up 5-6 days ago and haven't received this email
    const eligible = await db.select().from(users).where(
      and(
        eq(users.trialEndingSent, false),
        isNotNull(users.stripeSubscriptionId),
        lt(users.createdAt, fiveDaysAgo),
        gt(users.createdAt, sixDaysAgo),
        isNotNull(users.email)
      )
    ).limit(50);

    for (const user of eligible) {
      try {
        const tierNames: Record<string, string> = { flex: "Flex", basic: "Básico", standard: "Básico", premium: "Premium" };
        await sendEmail(user.email!, "trial_ending", {
          firstName: user.firstName || "estudiante",
          planName: tierNames[user.subscriptionTier] || user.subscriptionTier,
          dashboardUrl: `${BASE_URL}/dashboard`,
        });
        await db.update(users).set({ trialEndingSent: true }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

/** Trial expired — user subscription went inactive */
async function runTrialExpired(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "trial_expired", sent: 0, errors: [] };

  try {
    // Users whose status is inactive and who haven't received this email
    const eligible = await db.select().from(users).where(
      and(
        eq(users.trialExpiredSent, false),
        eq(users.status, "inactive"),
        isNotNull(users.stripeSubscriptionId),
        isNotNull(users.email)
      )
    ).limit(50);

    for (const user of eligible) {
      try {
        const tierNames: Record<string, string> = { flex: "Flex", basic: "Básico", standard: "Básico", premium: "Premium" };
        await sendEmail(user.email!, "trial_expired", {
          firstName: user.firstName || "estudiante",
          planName: tierNames[user.subscriptionTier] || user.subscriptionTier,
        });
        await db.update(users).set({ trialExpiredSent: true }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 3. RE-ENGAGEMENT (30+ days inactive)
// ---------------------------------------------------------------------------

async function runReengagement(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "reengagement", sent: 0, errors: [] };
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const eligible = await db.select().from(users).where(
      and(
        eq(users.reengagementSent, false),
        eq(users.status, "active"),
        isNotNull(users.email),
        // lastActiveAt older than 30 days
        lt(users.lastActiveAt, thirtyDaysAgo),
        isNotNull(users.lastActiveAt)
      )
    ).limit(50);

    for (const user of eligible) {
      try {
        await sendEmail(user.email!, "reengagement", {
          firstName: user.firstName || "estudiante",
          dashboardUrl: `${BASE_URL}/dashboard`,
        });
        await db.update(users).set({ reengagementSent: true }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. FAILED PAYMENT RECOVERY
// ---------------------------------------------------------------------------

async function runPaymentFailed(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "payment_failed", sent: 0, errors: [] };

  try {
    // Users on hold status (past_due from Stripe) who haven't gotten this email
    const eligible = await db.select().from(users).where(
      and(
        eq(users.paymentFailedSent, false),
        eq(users.status, "hold"),
        isNotNull(users.email),
        isNotNull(users.stripeSubscriptionId)
      )
    ).limit(50);

    for (const user of eligible) {
      try {
        const tierNames: Record<string, string> = { flex: "Flex", basic: "Básico", standard: "Básico", premium: "Premium" };
        await sendEmail(user.email!, "payment_failed", {
          firstName: user.firstName || "estudiante",
          planName: tierNames[user.subscriptionTier] || user.subscriptionTier,
          billingUrl: `${BASE_URL}/dashboard`,
        });
        await db.update(users).set({ paymentFailedSent: true }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 5. WEEKLY PROGRESS (every Monday)
// ---------------------------------------------------------------------------

async function runWeeklyProgress(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "weekly_progress", sent: 0, errors: [] };
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Only run on Mondays (or if weekly_progress_sent is null / > 7 days ago)
  const today = new Date();
  if (today.getDay() !== 1) {
    return result; // Not Monday, skip
  }

  try {
    const eligible = await db.select().from(users).where(
      and(
        eq(users.status, "active"),
        isNotNull(users.email),
        isNotNull(users.stripeSubscriptionId), // Only paid users
        // Haven't sent this week
        sql`(${users.weeklyProgressSent} IS NULL OR ${users.weeklyProgressSent} < ${oneWeekAgo})`
      )
    ).limit(100);

    for (const user of eligible) {
      try {
        // Get lesson count for the week
        const lessonsThisWeek = await db
          .select({ count: count() })
          .from(lessonProgress)
          .where(
            and(
              eq(lessonProgress.userId, user.id),
              gt(lessonProgress.completedAt, oneWeekAgo)
            )
          );

        const lessonsCount = lessonsThisWeek[0]?.count || 0;

        await sendEmail(user.email!, "weekly_progress", {
          firstName: user.firstName || "estudiante",
          lessonsCompleted: String(lessonsCount),
          quizzesCompleted: "0", // simplified for now
          labsAttended: "0",
          currentStreak: "0",
          dashboardUrl: `${BASE_URL}/dashboard`,
        });
        await db.update(users).set({ weeklyProgressSent: new Date() }).where(eq(users.id, user.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${user.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// MASTER RUNNER — called by cron or admin API
// ---------------------------------------------------------------------------

export async function runAllEmailSequences(): Promise<{
  timestamp: string;
  results: SequenceResult[];
  totalSent: number;
  totalErrors: number;
}> {
  console.log("[Email Sequences] Starting run at", new Date().toISOString());

  const results = await Promise.all([
    runOnboardingDay2(),
    runOnboardingDay5(),
    runOnboardingDay7(),
    runTrialEnding(),
    runTrialExpired(),
    runReengagement(),
    runPaymentFailed(),
    runWeeklyProgress(),
  ]);

  const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  console.log(`[Email Sequences] Complete: ${totalSent} sent, ${totalErrors} errors`);

  if (totalErrors > 0) {
    for (const r of results) {
      for (const err of r.errors) {
        console.error(`[Email Sequences] ${r.sequence}: ${err}`);
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    results,
    totalSent,
    totalErrors,
  };
}
