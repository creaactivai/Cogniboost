/**
 * Lab Reminder Cron — sends a 1-hour-before email to every student
 * booked in a Conversation Lab.
 *
 * Runs every 5 minutes from server/index.ts. Finds sessions starting
 * in the next 55-65 minutes and emails their booked students. Uses a
 * `reminder_sent_at` column on lab_registrations so each booking gets
 * one reminder only.
 */

import { db, pool } from "./db";
import { sendCustomEmail } from "./resendClient";

/**
 * Defensive migration: add the `reminder_sent_at` column on
 * lab_registrations if it doesn't exist yet. Safe to call repeatedly.
 */
export async function ensureReminderColumn() {
  try {
    await (pool as any).query(
      `ALTER TABLE lab_registrations ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp`,
    );
  } catch (err: any) {
    console.warn("[lab-reminder] defensive ALTER failed:", err?.message);
  }
}

export async function runLabReminderCron() {
  try {
    // Find sessions starting in the next 55-65 minutes that have at
    // least one non-cancelled registration without a reminder yet.
    const { rows: candidates } = await (pool as any).query(
      `SELECT
         lr.id          as registration_id,
         lr.student_id  as student_id,
         s.id           as session_id,
         s.title        as session_title,
         s.level        as session_level,
         s.scheduled_at as scheduled_at,
         s.duration_minutes as duration_minutes,
         s.meeting_url  as meeting_url,
         u.email        as student_email,
         u.first_name   as student_first_name
       FROM lab_registrations lr
       INNER JOIN lab_sessions s ON s.id = lr.lab_session_id
       INNER JOIN users u        ON u.id = lr.student_id
       WHERE lr.cancelled = false
         AND lr.reminder_sent_at IS NULL
         AND s.status IN ('scheduled', 'live')
         AND s.scheduled_at > now()
         AND s.scheduled_at <= now() + INTERVAL '70 minutes'
         AND s.scheduled_at >= now() + INTERVAL '50 minutes'`,
    );

    if (candidates.length === 0) return { sent: 0 };

    let sent = 0;
    for (const c of candidates) {
      const firstName = (c.student_first_name || "there").trim();
      const startsAt = new Date(c.scheduled_at);
      const when = startsAt.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      });
      try {
        await sendCustomEmail(
          c.student_email,
          `⏰ Your ${c.session_level} Lab starts in 1 hour — be ready`,
          buildReminderHtml({
            firstName,
            level: c.session_level,
            title: c.session_title,
            when,
            durationMinutes: c.duration_minutes,
            meetingUrl: c.meeting_url,
          }),
          { cc: "clozano@cognimight.com" },
        );
        // Mark reminder as sent (idempotency)
        await (pool as any).query(
          `UPDATE lab_registrations SET reminder_sent_at = now() WHERE id = $1`,
          [c.registration_id],
        );
        sent += 1;
      } catch (err: any) {
        console.warn(`[lab-reminder] failed for ${c.student_email}:`, err?.message);
      }
    }
    console.log(`[lab-reminder] ${sent} 1h-before reminders sent`);
    return { sent };
  } catch (err: any) {
    console.error("[lab-reminder] cron failed:", err?.message);
    return { sent: 0 };
  }
}

function buildReminderHtml(args: {
  firstName: string;
  level: string;
  title: string;
  when: string;
  durationMinutes: number;
  meetingUrl: string;
}) {
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111827;">
  <div style="padding:20px 24px;background:linear-gradient(135deg,#dc2626 0%,#f59e0b 100%);color:white;border-radius:12px 12px 0 0;">
    <div style="font-size:13px;text-transform:uppercase;letter-spacing:2px;font-weight:700;opacity:0.9;">⏰ Starting in 1 hour</div>
    <div style="font-size:22px;font-weight:800;margin-top:4px;">Your Conversation Lab is almost here</div>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;background:white;">
    <h1 style="font-size:20px;margin:0 0 12px;">Hi ${args.firstName} 👋</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">A quick heads-up: your live class starts at <strong>${args.when} CT</strong>. Use the link below to join 2-3 minutes early.</p>
    <div style="background:#ecfeff;border:2px solid #06b6d4;border-radius:10px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0e7490;font-weight:700;">Your class</p>
      <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#0c4a6e;">${args.title}</p>
      <p style="margin:0;font-size:14px;color:#0c4a6e;">🗓️ ${args.when} CT · ${args.durationMinutes} min</p>
    </div>
    <div style="text-align:center;margin:22px 0;">
      <a href="${args.meetingUrl}" style="display:inline-block;background:#dc2626;color:white;padding:16px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:17px;">🎙️ JOIN MY CLASS</a>
    </div>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;padding:12px 16px;font-size:13px;color:#78350f;">
      <strong>Quick checklist:</strong>
      <ul style="margin:6px 0 0;padding-left:18px;line-height:1.55;">
        <li>Headphones + quiet space ✓</li>
        <li>Camera + microphone enabled ✓</li>
        <li>If asked "open in app", choose <strong>open in browser</strong></li>
      </ul>
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:18px;">See you in class!<br/><strong style="color:#111827;">Coral Lozano, M.Ed.</strong> · CogniBoost</p>
  </div>
</div>`;
}
