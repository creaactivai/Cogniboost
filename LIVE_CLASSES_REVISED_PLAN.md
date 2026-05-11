# Live Classes — Revised Engineering Plan

**Source:** `CogniBoost_Live_Classes_Spec.pdf` by Teacher Coral, Apr 20 2026.
**Same goals, corrected for CogniBoost's actual stack and reusable existing infra.**

The teacher's spec assumes Next.js + Supabase + Vercel Cron. CogniBoost is Vite+Express+Drizzle on Railway. Several of the "create new" tables already exist in `shared/schema.ts` under different names. This plan delivers all three goals (integrated video, email reminders, live widget) using what we already have, with security and ops improvements the original missed.

---

## TL;DR — What's Different From Coral's Plan

| Topic | Coral's plan | Revised |
|---|---|---|
| **Tables to create** | `classes_schedule`, `enrollments` from scratch | **Reuse** existing `liveSessions` + `labBookings` tables. Add columns, don't duplicate. |
| **Email provider** | New Resend account | **Reuse** existing `server/resendClient.ts` — Resend is already wired with all our domain auth + templates. |
| **Cron runner** | Vercel Cron | **In-process scheduler** on Railway with Postgres advisory lock for multi-replica safety. |
| **API framework** | Next.js route handlers | **Express routes** added to `server/routes.ts`. |
| **Jitsi auth** | Anonymous | **JWT-authenticated** rooms — only logged-in CogniBoost users with valid tokens can join. |
| **Mobile testing** | Not addressed | Explicit iOS Safari + Android Chrome smoke tests (we have known iOS quirks). |
| **Tier gating** | Not addressed | Live classes follow the existing Flex/Basic/Premium lab quota in `client/src/lib/tier-access.ts`. |
| **Time zones** | Not addressed | Class times stored UTC, rendered in student's locale. |
| **Recordings** | Not mentioned | Out-of-scope v1; revisit when teacher requests. |
| **Cost** | $12/mo combined | **$8–9/mo for CogniBoost alone** (droplet $6 + DO backups $1.20 + monitoring free). |

---

## Goal 1 — Integrated Video (Self-Hosted Jitsi)

### Stack correction
The Jitsi server itself is correct as proposed — DigitalOcean Marketplace droplet, NYC1, $6/mo, Let's Encrypt SSL, branding strip. **Keep** the Step 1–4 setup script from Coral's doc verbatim. **Change** one thing:

### Security correction — JWT auth instead of anonymous

Coral's spec sets Jitsi to `anonymous` auth, meaning anyone who guesses a room name (e.g., `cogniboost-session-42`) can join an in-progress class. With predictable room names that's a real risk.

**Replace Step 4's anon-auth line with JWT-protected rooms:**

```bash
# Install the JWT module on the Jitsi droplet
apt-get install jitsi-meet-tokens

# When prompted during install:
# - App ID: cogniboost
# - App Secret: <generate a long random string, save to Railway env as JITSI_JWT_SECRET>
```

On the CogniBoost backend, mint a short-lived JWT per student per class:

```ts
// server/jitsiToken.ts
import jwt from 'jsonwebtoken';

export function generateJitsiToken(opts: { userId: string; name: string; email: string; roomName: string; isModerator: boolean }) {
  return jwt.sign({
    aud: 'cogniboost',
    iss: 'cogniboost',
    sub: 'meet.cogniboost.com',
    room: opts.roomName,           // lock the token to this room only
    exp: Math.floor(Date.now() / 1000) + 60 * 90,  // 90-min validity
    context: {
      user: { id: opts.userId, name: opts.name, email: opts.email, moderator: opts.isModerator }
    }
  }, process.env.JITSI_JWT_SECRET!, { algorithm: 'HS256' });
}
```

The iframe URL appends `?jwt=<token>`. Anyone hitting the room URL without a valid JWT gets bounced. This costs zero extra dollars and removes the "guess the room name" attack surface.

### Component for our React stack (Vite, not Next.js)

```tsx
// client/src/components/live-class/LiveVideoPanel.tsx
import { useEffect, useState } from 'react';

interface LiveVideoPanelProps {
  classId: string;
  height?: number;
}

export function LiveVideoPanel({ classId, height = 480 }: LiveVideoPanelProps) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/live-class/${classId}/join`, { method: 'POST' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => setJoinUrl(data.url))
      .catch(async r => setError((await r.json?.())?.error ?? 'Failed to join'));
  }, [classId]);

  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!joinUrl) return <div className="p-4">Loading…</div>;

  return (
    <iframe
      src={joinUrl}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      style={{ width: '100%', height, border: 0, borderRadius: 12 }}
    />
  );
}
```

### Backend join endpoint

```ts
// server/routes.ts — new block
app.post('/api/live-class/:classId/join', async (req, res) => {
  const userId = (req.user as any)?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const cls = await storage.getLiveSessionById(req.params.classId);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  // Tier-gating: reuse existing labQuota logic
  const user = await storage.getUser(userId);
  const allowed = await canJoinLiveClass(user, cls);   // see tier-access.ts
  if (!allowed) return res.status(403).json({ error: 'Your plan does not include this class' });

  // Window check: only allow join from 10 min before start to 30 min after end
  const now = Date.now();
  const startsAt = cls.startTime.getTime();
  const endsAt = startsAt + (cls.durationMinutes ?? 60) * 60000;
  if (now < startsAt - 10*60000 || now > endsAt + 30*60000) {
    return res.status(403).json({ error: 'Class not currently joinable' });
  }

  const token = generateJitsiToken({
    userId, name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
    email: user.email!, roomName: cls.roomName,
    isModerator: user.role === 'instructor' || user.role === 'admin',
  });

  // Log attendance for analytics + reminder dedup
  await storage.logLiveClassAttendance({ userId, classId: cls.id, joinedAt: new Date() });

  res.json({
    url: `https://meet.cogniboost.com/${cls.roomName}?jwt=${token}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`
  });
});
```

---

## Goal 2 — Email Reminders

### Reuse existing infrastructure
We already have:
- `server/resendClient.ts` with templated emails and Resend API integration
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` env vars (verified domain)
- Email template patterns in place

**Don't create a new Resend account.** Add a new template `class_reminder` to the existing client.

### New template (in `server/resendClient.ts`)

```ts
// Append to existing template registry
class_reminder: {
  subject: ({ topic, minutesUntil }) => `Tu clase de ${topic} empieza en ${minutesUntil} min!`,
  html: ({ firstName, topic, teacherName, classTime, minutesUntil, joinUrl }) => `
    <!DOCTYPE html>
    <html><body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: auto;">
      <div style="background: #1e293b; padding: 20px; border-radius: 12px 12px 0 0; color: white;">
        <strong>CogniBoost</strong>
        <span style="float: right; color: #fbbf24;">Tu clase empieza en ${minutesUntil} min</span>
      </div>
      <div style="padding: 24px; background: white; border-radius: 0 0 12px 12px;">
        <h1>Hola ${firstName},</h1>
        <p>Tu clase de <strong>${topic}</strong> con ${teacherName} empieza a las ${classTime}.</p>
        <a href="${joinUrl}" style="display:inline-block; padding: 14px 28px; background:#f97316; color:white; border-radius:8px; text-decoration:none; font-weight:bold;">UNIRSE A LA CLASE</a>
        <p style="margin-top:24px; color:#64748b; font-size:13px;">Nos vemos pronto — Equipo CogniBoost</p>
      </div>
    </body></html>
  `,
},
```

### Cron strategy — in-process with Postgres advisory lock

We can't use Vercel Cron — backend runs on Railway. Three options:

| Option | Pros | Cons |
|---|---|---|
| External cron service hitting `/api/cron/...` | Decoupled | One more vendor, one more secret to manage |
| Postgres `pg_cron` extension | DB-native | Railway Postgres add-on may not have pg_cron enabled by default |
| **In-process `setInterval` + advisory lock** | Zero extra infra | Need lock for multi-replica safety |

Going with option 3 because it's the lowest operational overhead. The lock makes it safe even if Railway scales to multiple replicas (which it currently doesn't).

```ts
// server/cron/classReminders.ts
import { db } from '../db';
import { liveSessions, users, labBookings } from '@shared/schema';
import { sendEmail } from '../resendClient';
import { sql, and, gte, lte, eq } from 'drizzle-orm';

const ADVISORY_LOCK_KEY = 9001;  // any unique int

export function startClassReminderCron() {
  setInterval(runReminders, 5 * 60 * 1000);  // every 5 min
}

async function runReminders() {
  // Try to acquire advisory lock; bail if another replica holds it
  const [{ locked }] = await db.execute<{ locked: boolean }>(
    sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS locked`
  );
  if (!locked) return;

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);  // next 15 min

    const dueClasses = await db.select().from(liveSessions)
      .where(and(
        gte(liveSessions.startTime, now),
        lte(liveSessions.startTime, windowEnd),
        eq(liveSessions.reminderSent, false),
      ));

    for (const cls of dueClasses) {
      const bookings = await db.select().from(labBookings).where(eq(labBookings.sessionId, cls.id));
      for (const booking of bookings) {
        const [student] = await db.select().from(users).where(eq(users.id, booking.userId));
        if (!student?.email) continue;

        const minutesUntil = Math.round((cls.startTime.getTime() - Date.now()) / 60000);
        await sendEmail(student.email, 'class_reminder', {
          firstName: student.firstName ?? 'Estudiante',
          topic: cls.title,
          teacherName: cls.teacherName ?? 'tu instructor',
          classTime: cls.startTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          minutesUntil,
          joinUrl: `${process.env.APP_URL}/live/${cls.id}`,
        });
      }
      await db.update(liveSessions).set({ reminderSent: true }).where(eq(liveSessions.id, cls.id));
    }
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`);
  }
}
```

Wire it up in `server/index.ts`:

```ts
import { startClassReminderCron } from './cron/classReminders';

// after server starts
if (process.env.NODE_ENV === 'production') {
  startClassReminderCron();
  console.log('✅ Class reminder cron started');
}
```

### Email volume sanity check
At 100 active students with 1 class/day, that's 3,000 emails/month — **exactly Resend's free-tier ceiling**. If we grow past 100 students:
- Upgrade to Resend Pro ($20/mo, 50k emails)
- Or batch reminders (one digest email per student listing all today's classes)

Recommendation: batch from day one — students don't want N separate emails on a busy schedule day.

---

## Goal 3 — Live Classes Widget

### Schema additions
On the existing `liveSessions` table (`shared/schema.ts`), add:

```ts
// Edits to existing pgTable("live_sessions")
status: text("status").notNull().default("scheduled"),   // scheduled / live / ended / cancelled
roomName: text("room_name").notNull(),                    // e.g. "cb-session-42"
reminderSent: boolean("reminder_sent").notNull().default(false),
startedAt: timestamp("started_at"),                       // null until status='live'
endedAt: timestamp("ended_at"),                           // null until status='ended'
```

Auto-applies via `npm run db:push` on next deploy.

### Endpoint

```ts
// server/routes.ts
app.get('/api/classes/live', async (_req, res) => {
  const live = await db.select({
    id: liveSessions.id, title: liveSessions.title,
    teacherName: liveSessions.teacherName,
    startedAt: liveSessions.startedAt,
    roomName: liveSessions.roomName,
  }).from(liveSessions).where(eq(liveSessions.status, 'live'));
  res.json(live);
});
```

### Widget (React, not Next.js)

```tsx
// client/src/components/dashboard/LiveClassesWidget.tsx
import { useEffect, useState } from 'react';
import { Link } from 'wouter';

export function LiveClassesWidget() {
  const [live, setLive] = useState<any[]>([]);

  useEffect(() => {
    const fetchLive = () => fetch('/api/classes/live').then(r => r.json()).then(setLive);
    fetchLive();
    const t = setInterval(fetchLive, 30000);
    return () => clearInterval(t);
  }, []);

  if (live.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        En vivo ahora ({live.length})
      </h3>
      <ul className="space-y-2">
        {live.map(c => (
          <li key={c.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-slate-600">con {c.teacherName}</div>
            </div>
            <Link href={`/live/${c.id}`} className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm">Unirse</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Drop into `client/src/components/dashboard/overview.tsx` near the top.

### "Live" status transition
The widget only shows sessions where `status='live'`. Who flips that?

Two options:
1. **Teacher manually starts the class** — a "Start class" button in the teacher dashboard that POSTs to `/api/live-class/:id/start`.
2. **Auto-start at scheduled time** — the reminder cron also flips `status='live'` when `now() >= startTime`.

Use option 2 because teachers forget. The cron already runs every 5 min — same loop, two side effects.

---

## Risks the Original Doc Didn't Cover

| Risk | Mitigation |
|---|---|
| **iOS Safari WebRTC quirks** — camera/mic permissions can fail silently in iframes | Smoke test on real iPhone before announcing. If issues, fall back to opening Jitsi in new tab on iOS. |
| **Jitsi droplet goes down** — single $6 droplet, no redundancy | Enable DO weekly droplet backup ($1.20/mo). Document the recovery: spin up new droplet from backup snapshot, repoint DNS. RTO ~30 min. |
| **Predictable room name guessing** | Solved with JWT auth (above). |
| **SSL cert expiry** | Let's Encrypt auto-renews via cron on the droplet. Monitor with a free Uptime Robot check on `https://meet.cogniboost.com`. |
| **Email rate limit (3k/mo Resend free)** | Batch digest emails per student instead of per class. Upgrade to Pro at 100 paying students. |
| **Cron runs on every replica** if Railway scales | Postgres advisory lock (already in design). |
| **Time-zone confusion** for Latin American students | Store UTC in DB. Render with `toLocaleString` using student's browser locale. Show TZ abbreviation in emails ("18:00 CST"). |
| **Replit-residue var `REPLIT_CONNECTORS_HOSTNAME` still on Railway** | Unrelated but worth deleting during this work to keep env clean. |
| **No automated tests** in existing repo means regressions slip in | At minimum add a Vercel CI smoke test that hits `/api/classes/live` and asserts 200. Full E2E later. |

---

## Cost — Corrected

| Item | Monthly | Notes |
|---|---|---|
| DO droplet (Jitsi) | $6 | NYC1, 1 GB, Marketplace image |
| DO backups | $1.20 | 20% of droplet, weekly snapshot |
| Uptime monitoring | $0 | Uptime Robot free tier (5 monitors) |
| Resend emails | $0 | Free tier covers ≤3k/mo |
| **Total recurring add-on** | **$7.20/mo** | $86.40/year |

Coral's doc said $12/mo combined for both CogniMight + CogniBoost. For CogniBoost alone our add is $7.20/mo. Cheaper than her estimate because we don't double-count the shared CogniMight droplet (we run our own).

---

## Revised Timeline

Coral's 7-day estimate is reasonable for one focused developer working full-time. Slightly re-sequenced to ship value sooner and de-risk earlier:

| Day | Deliverable |
|---|---|
| **1** | DO droplet + Jitsi install + DNS + SSL + JWT auth configured. Manually test by joining `https://meet.cogniboost.com/test-room?jwt=...` from a browser. |
| **2** | Backend: schema changes (`liveSessions` columns) + `db:push` + JWT mint helper + `/api/live-class/:id/join` endpoint with tier gating + attendance log. |
| **3** | Frontend: `LiveVideoPanel` component + `/live/:classId` route + integrate into existing course-viewer or as standalone page. End-to-end test: teacher schedules → student joins. |
| **4** | Email reminder cron: template, scheduler, advisory lock, dedup. Test by manually inserting a session 16 min in the future and confirming email arrives. |
| **5** | Live widget: `/api/classes/live` endpoint + `LiveClassesWidget` component + status transition logic in cron (auto-flip to 'live' at start time). Drop widget into dashboard overview. |
| **6** | **Hard day** — full E2E rehearsal with three real accounts (teacher + 2 students). Mobile testing on iPhone + Android. Fix what breaks. |
| **7** | Soft launch internal team only. Monitor cron logs, email deliverability, Jitsi droplet load. |

Realistic add: +2 days buffer for the things that always break (DNS propagation, certificate timing, JWT secret mismatch). Plan as **9 calendar days**.

---

## Stack-Specific Decisions vs. Coral's Spec

### Routing — wouter, not Next.js
Already in use (`client/src/App.tsx` uses wouter). Routes live in JSX, not file-based.

### State — TanStack Query
We already use `@tanstack/react-query`. Replace the `useEffect + fetch` patterns in Coral's components with `useQuery` for consistency:

```tsx
const { data: live = [] } = useQuery({
  queryKey: ['live-classes'],
  queryFn: () => fetch('/api/classes/live').then(r => r.json()),
  refetchInterval: 30000,
});
```

### Auth — Passport sessions, not headers
Coral's spec implicitly assumes Bearer-token auth. Our app uses Passport with session cookies. The `/api/live-class/:id/join` endpoint reads `req.user.id` set by Passport (same pattern as every other authenticated endpoint).

### Cookies on iframe — sameSite already set to `lax` (PR #2)
Jitsi iframe will not share session with parent; it has its own JWT. No cookie cross-origin issues.

### Existing `liveSessions` + `labBookings` reuse
- `liveSessions` already has `id`, `title`, `instructorId`, `startTime`, `durationMinutes`, `recurrencePattern`. Add: `status`, `roomName`, `reminderSent`, `startedAt`, `endedAt`.
- `labBookings` already has `userId`, `sessionId`, `bookedAt`. This **is** the enrollments table — use it.
- No need to invent `classes_schedule` or duplicate `enrollments`.

---

## What I'd Drop From the Original Spec

- ❌ **Supabase suggestions** — we don't use Supabase. Postgres-direct via Drizzle.
- ❌ **Vercel Cron** — backend not on Vercel.
- ❌ **`anonymous` Jitsi auth** — replace with JWT.
- ❌ **New Resend account** — reuse existing.
- ❌ **New `enrollments` table** — `labBookings` already plays that role.
- ❌ **Coral's credential-handoff template** — already addressed by our `HANDOVER_TRANSFER_CHECKLIST.md` (more comprehensive).

---

## What I'd Add Beyond the Original Spec

1. **JWT-protected Jitsi rooms** (security).
2. **DO weekly droplet backups** ($1.20/mo, disaster recovery).
3. **Uptime monitoring** on `meet.cogniboost.com` (free, prevents silent outage repeat).
4. **Batched digest emails** instead of one-per-class (deliverability + UX).
5. **Tier-gated joining** matching the existing Flex/Basic/Premium quota model.
6. **Time-zone-aware rendering** of class times (locale + TZ abbreviation in emails).
7. **Auto-status transition** in the cron loop (no manual "Start class" button needed).
8. **Smoke test in CI** that `/api/classes/live` returns 200 — catches deploy regressions.

---

## Next Step

Decide:
1. ✅ **Approve this revised plan** as the basis for the engagement.
2. 🔧 **Adjustments** — tell me what to change before kickoff.
3. 🚀 **Kickoff** — Day 1 is "spin up the droplet and configure Jitsi+JWT." Want me to start that, or wait for the client greenlight first?

Once approved, this becomes a real PR plan — 5 PRs (schema, backend, frontend, cron, widget) merged in order over the 9 calendar days.
