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
import { users, leads } from "../shared/models/auth";
import { lessonProgress, quizAttempts, roomBookings } from "../shared/schema";
import { and, eq, lt, gt, sql, isNull, isNotNull, desc, count } from "drizzle-orm";
import { sendEmail, type EmailTemplate } from "./resendClient";

const BASE_URL = process.env.APP_URL || process.env.APP_BASE_URL || "https://cogniboost.co";

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
// 6. LEAD NURTURE — placement quiz takers who have not yet enrolled
// ---------------------------------------------------------------------------
// These mirror the manual admin trigger at /api/admin/leads/run-sequences in
// routes.ts. Previously the lead nurture flow only ran when an admin pressed
// the button; this hooks them into the hourly cron so leads progress
// automatically (matches Master Plan §6 "Conversion Funnel").

/** Day 1 after placement quiz — course recommendations */
async function runLeadDay1(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "lead_day1", sent: 0, errors: [] };
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const eligible = await db.select().from(leads).where(
      and(
        eq(leads.day1EmailSent, false),
        eq(leads.resultEmailSent, true),
        sql`${leads.quizCompletedAt} < ${oneDayAgo}`,
        eq(leads.convertedToUser, false),
        isNotNull(leads.email)
      )
    ).limit(50);

    for (const lead of eligible) {
      try {
        await sendEmail(lead.email, "lead_day1_followup", {
          firstName: lead.firstName || "estudiante",
          level: lead.placementLevel || "B1",
          email: lead.email,
        });
        await db.update(leads).set({
          day1EmailSent: true,
          day1EmailSentAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(leads.id, lead.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

/** Day 3 after placement quiz — Conversation Lab invitation */
async function runLeadDay3(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "lead_day3", sent: 0, errors: [] };
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  try {
    const eligible = await db.select().from(leads).where(
      and(
        eq(leads.day3EmailSent, false),
        eq(leads.day1EmailSent, true),
        sql`${leads.quizCompletedAt} < ${threeDaysAgo}`,
        eq(leads.convertedToUser, false),
        isNotNull(leads.email)
      )
    ).limit(50);

    for (const lead of eligible) {
      try {
        await sendEmail(lead.email, "lead_day3_lab_invite", {
          firstName: lead.firstName || "estudiante",
          level: lead.placementLevel || "B1",
          email: lead.email,
        });
        await db.update(leads).set({
          day3EmailSent: true,
          day3EmailSentAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(leads.id, lead.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

/** Day 7 after placement quiz — final special offer */
async function runLeadDay7(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "lead_day7", sent: 0, errors: [] };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const eligible = await db.select().from(leads).where(
      and(
        eq(leads.day7EmailSent, false),
        eq(leads.day3EmailSent, true),
        sql`${leads.quizCompletedAt} < ${sevenDaysAgo}`,
        eq(leads.convertedToUser, false),
        isNotNull(leads.email)
      )
    ).limit(50);

    for (const lead of eligible) {
      try {
        await sendEmail(lead.email, "lead_day7_offer", {
          firstName: lead.firstName || "estudiante",
          level: lead.placementLevel || "B1",
          email: lead.email,
        });
        await db.update(leads).set({
          day7EmailSent: true,
          day7EmailSentAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(leads.id, lead.id));
        result.sent++;
      } catch (e: any) {
        result.errors.push(`${lead.email}: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 10. LAB REMINDERS (24h + 30min before scheduled session)
// ---------------------------------------------------------------------------
// Two sister functions that find lab_sessions inside a target time window
// and that haven't sent the relevant reminder yet, then email every
// non-cancelled registrant + flip the flag so we never spam.

async function runLabReminders24h(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "lab_reminder_24h", sent: 0, errors: [] };
  try {
    const { db: db2 } = await import("./db");
    const { sql: sqlOp, and: andOp, eq: eqOp } = await import("drizzle-orm");
    const { labSessionsV2, labRegistrations, users: usersT } = await import("@shared/schema");

    // Sessions starting in ~24h (window 23h-25h to give the 15-min cron a hit
    // chance regardless of when it runs) and not yet 24h-reminded.
    const sessions = await db2.execute(sqlOp`
      SELECT id, title, description, grammar_focus, scheduled_at, duration_minutes, meeting_url
      FROM lab_sessions
      WHERE reminder_24h_sent = false
        AND status = 'scheduled'
        AND scheduled_at BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
      LIMIT 100
    `);
    const rows: any[] = (sessions as any).rows ?? sessions;

    for (const s of rows) {
      try {
        // Find registrants
        const regs = await db2
          .select({ reg: labRegistrations, user: usersT })
          .from(labRegistrations)
          .innerJoin(usersT, eqOp(labRegistrations.studentId, usersT.id))
          .where(andOp(eqOp(labRegistrations.labSessionId, s.id), eqOp(labRegistrations.cancelled, false)));

        if (regs.length === 0) {
          // Still mark sent so we don't re-check this row hourly
          await db2.execute(sqlOp`UPDATE lab_sessions SET reminder_24h_sent = true WHERE id = ${s.id}`);
          continue;
        }

        const scheduledAt = new Date(s.scheduled_at);
        const dayLabel = scheduledAt.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
        const timeLabel = scheduledAt.toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });

        for (const r of regs) {
          if (!r.user.email) continue;
          try {
            await sendEmail(r.user.email, "lab_reminder_24h", {
              firstName: r.user.firstName || "estudiante",
              title: s.title,
              description: s.description,
              grammarFocus: s.grammar_focus,
              durationMinutes: s.duration_minutes,
              meetingUrl: s.meeting_url,
              dashboardUrl: `${BASE_URL}/dashboard/labs`,
              dayLabel,
              timeLabel,
            });
            result.sent++;
          } catch (e: any) {
            result.errors.push(`${r.user.email} / lab ${s.id}: ${e.message}`);
          }
        }
        await db2.execute(sqlOp`UPDATE lab_sessions SET reminder_24h_sent = true WHERE id = ${s.id}`);
      } catch (e: any) {
        result.errors.push(`Lab ${s.id} reminder failed: ${e.message}`);
      }
    }
  } catch (e: any) {
    result.errors.push(`Query error: ${e.message}`);
  }
  return result;
}

async function runLabReminders30min(): Promise<SequenceResult> {
  const result: SequenceResult = { sequence: "lab_reminder_30min", sent: 0, errors: [] };
  try {
    const { db: db2 } = await import("./db");
    const { sql: sqlOp, and: andOp, eq: eqOp } = await import("drizzle-orm");
    const { labSessionsV2, labRegistrations, users: usersT } = await import("@shared/schema");

    // Sessions starting in ~30 min (window 20-40 min) and not yet 30min-reminded.
    const sessions = await db2.execute(sqlOp`
      SELECT id, title, grammar_focus, scheduled_at, meeting_url
      FROM lab_sessions
      WHERE reminder_30min_sent = false
        AND status = 'scheduled'
        AND scheduled_at BETWEEN NOW() + INTERVAL '20 minutes' AND NOW() + INTERVAL '40 minutes'
      LIMIT 100
    `);
    const rows: any[] = (sessions as any).rows ?? sessions;

    for (const s of rows) {
      try {
        const regs = await db2
          .select({ reg: labRegistrations, user: usersT })
          .from(labRegistrations)
          .innerJoin(usersT, eqOp(labRegistrations.studentId, usersT.id))
          .where(andOp(eqOp(labRegistrations.labSessionId, s.id), eqOp(labRegistrations.cancelled, false)));

        if (regs.length === 0) {
          await db2.execute(sqlOp`UPDATE lab_sessions SET reminder_30min_sent = true WHERE id = ${s.id}`);
          continue;
        }

        for (const r of regs) {
          if (!r.user.email) continue;
          try {
            await sendEmail(r.user.email, "lab_reminder_30min", {
              firstName: r.user.firstName || "estudiante",
              title: s.title,
              grammarFocus: s.grammar_focus,
              meetingUrl: s.meeting_url,
              dashboardUrl: `${BASE_URL}/dashboard/labs`,
            });
            result.sent++;
          } catch (e: any) {
            result.errors.push(`${r.user.email} / lab ${s.id}: ${e.message}`);
          }
        }
        await db2.execute(sqlOp`UPDATE lab_sessions SET reminder_30min_sent = true WHERE id = ${s.id}`);
      } catch (e: any) {
        result.errors.push(`Lab ${s.id} 30min reminder failed: ${e.message}`);
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
    runLeadDay1(),
    runLeadDay3(),
    runLeadDay7(),
    runLabReminders24h(),
    runLabReminders30min(),
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
