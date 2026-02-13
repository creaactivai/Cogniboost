# CogniBoost — Operations, Maintenance & Change Management Protocol

**Version:** 1.0
**Effective:** February 13, 2026
**Owner:** CogniBoost Engineering
**Last reviewed:** February 13, 2026

---

## 1. Purpose

This document defines how CogniBoost is operated, maintained, and improved going forward. It establishes clear rules for **who can change what**, **how changes are submitted**, and **when routine maintenance happens**. All operational agents and team members must follow this protocol until the platform reaches autonomous-operation readiness.

---

## 2. Architecture Overview (Reference)

| Layer | Technology | Host | URL |
|-------|-----------|------|-----|
| Frontend | React 18 + Vite | Vercel | `cogniboost.co` |
| Backend API | Express 5 + Node 20 | Railway | `cogniboost-production.up.railway.app` |
| Database | PostgreSQL 16 | Railway (heroic-joy project) | `shortline.proxy.rlwy.net:38917` |
| Auth | Passport.js (email/password, Google, Apple) | Railway | — |
| Email | Resend | SaaS | — |
| Payments | Stripe | SaaS | — |
| Error Tracking | Sentry | SaaS | — |
| DNS | Vercel + Railway | — | — |

---

## 3. Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Engineering Lead** | Claude (via ticket) | Full code access, deployments, DB migrations, infrastructure changes |
| **Business Operators** | Team members running day-to-day operations | Admin panel access, content management, student support, ticket creation |
| **Founder** | Hermes | Final approval on all changes, direct engineering requests |

---

## 4. Change Management — The Ticket System

### 4.1 Golden Rule

> **No platform change happens without a ticket.**
> Business operators do NOT modify code, environment variables, Railway/Vercel settings, or database records directly. All changes are submitted as tickets.

### 4.2 Ticket Format

Every ticket must include:

```
TICKET #[auto-increment]
Date: YYYY-MM-DD
Submitted by: [Name]
Priority: CRITICAL / HIGH / NORMAL / LOW
Category: BUG / FEATURE / CONTENT / CONFIG / INFRASTRUCTURE

SUMMARY:
[1-2 sentence description of what is needed]

DETAILS:
[Full description. Include screenshots, URLs, error messages,
user reports — anything relevant]

EXPECTED OUTCOME:
[What should happen after the change is applied]

AFFECTED AREAS:
[Which part of the platform: auth, courses, payments, admin, etc.]
```

### 4.3 Priority Definitions

| Priority | Response Time | Examples |
|----------|--------------|---------|
| **CRITICAL** | Within 1 hour | Site down, payments broken, data breach, auth failure |
| **HIGH** | Within 24 hours | Feature broken for users, email delivery failure, OAuth not working |
| **NORMAL** | Within 72 hours | UI improvements, new content requests, minor bugs |
| **LOW** | Next maintenance window | Copy changes, analytics requests, nice-to-have features |

### 4.4 Ticket Workflow

```
SUBMITTED → REVIEWED → APPROVED → IN PROGRESS → TESTING → DEPLOYED → CLOSED
```

1. **Submitted** — Operator creates ticket
2. **Reviewed** — Engineering reviews feasibility and impact
3. **Approved** — Founder approves (CRITICAL/HIGH auto-approved)
4. **In Progress** — Engineering implements
5. **Testing** — Verified on staging or production with rollback plan
6. **Deployed** — Live on cogniboost.co
7. **Closed** — Confirmed working, ticket archived

---

## 5. Periodic Maintenance Schedule

### 5.1 Daily (Automated / Quick Check)

| Task | How | Who |
|------|-----|-----|
| Health check | `GET https://cogniboost-production.up.railway.app/health` | Automated or operator |
| Sentry error review | Check Sentry dashboard for new/recurring errors | Business operator |
| Railway logs scan | `railway logs --lines 50` — look for errors | Engineering (on request) |

### 5.2 Weekly (Every Monday)

| Task | Details |
|------|---------|
| **Error triage** | Review all Sentry errors from past 7 days. File tickets for any new issues. |
| **Performance review** | Check Railway Metrics (CPU, memory, response times). Flag anything above 80% resource usage. |
| **Email delivery check** | Verify Resend dashboard — check bounce rates, delivery rates. Flag if delivery < 95%. |
| **Stripe reconciliation** | Compare Stripe dashboard payments with admin panel records. Flag discrepancies. |
| **User activity review** | Check admin panel for new signups, active students, engagement trends. |

### 5.3 Bi-Weekly (1st and 15th of each month)

| Task | Details |
|------|---------|
| **Dependency audit** | Run `npm audit` — file CRITICAL ticket for any high/critical vulnerabilities. |
| **Database health** | Check table sizes, index usage, connection pool stats. Run `VACUUM ANALYZE` if needed. |
| **Session cleanup** | Verify expired sessions are being pruned from the `sessions` table. |
| **SSL certificate check** | Verify cogniboost.co SSL is valid and not expiring within 30 days. |
| **Backup verification** | Confirm Railway Postgres backups exist and are recent. Test restore if first time. |

### 5.4 Monthly (1st of each month)

| Task | Details |
|------|---------|
| **Full platform test** | Manual walkthrough: signup, login, OAuth, course access, payment flow, admin panel, password reset. |
| **Security review** | Review rate limiting effectiveness, check for suspicious login patterns, verify CORS settings. |
| **Cost review** | Check Railway, Vercel, Stripe, Resend, Sentry bills. Flag unexpected increases. |
| **Schema review** | Compare Drizzle schema with production DB. Ensure they're in sync. Run `drizzle-kit check` if available. |
| **Protocol review** | Review this document. Update if needed based on lessons learned. |

### 5.5 Quarterly (Jan 1, Apr 1, Jul 1, Oct 1)

| Task | Details |
|------|---------|
| **Major dependency update** | Update Node.js, Express, React, Drizzle, and other core dependencies. Test thoroughly before deploying. |
| **Performance audit** | Lighthouse audit on frontend. Backend response time profiling. Database query optimization. |
| **Security penetration test** | Review OWASP top 10 against the application. Check for exposed secrets, XSS, CSRF. |
| **Disaster recovery drill** | Test: What if Railway goes down? What if DB is corrupted? Verify backup restore works. |
| **Documentation update** | Update DEPLOYMENT.md, this protocol, and any architecture diagrams. |

---

## 6. Deployment Protocol

### 6.1 Pre-Deployment Checklist

Before ANY deployment:

- [ ] Code changes committed to a feature branch (NOT directly to `main`)
- [ ] `npm run build` passes locally without errors
- [ ] `npm run check` (TypeScript) passes without new errors
- [ ] Database schema changes identified and migration plan documented
- [ ] Rollback plan documented (what to revert if things break)
- [ ] Ticket number attached to the commit message

### 6.2 Deployment Steps

```
1. Create feature branch: git checkout -b ticket/[number]-[description]
2. Make changes, test locally
3. Build: npm run build
4. Type check: npm run check
5. Commit: git commit -m "ticket-[N]: [description]"
6. Push branch: git push origin ticket/[number]-[description]
7. Create PR to main
8. Review PR (engineering + founder for HIGH/CRITICAL)
9. Merge to main → auto-deploys to Railway (backend) + Vercel (frontend)
10. Monitor Railway logs for 15 minutes post-deploy
11. Run smoke tests (health check, login, core flows)
12. Update ticket status to DEPLOYED
```

### 6.3 Rollback Procedure

If a deployment causes issues:

```
1. IMMEDIATE: Check Railway logs for errors
2. If critical: Revert via Railway dashboard (redeploy previous deployment)
3. If frontend only: Revert Vercel deployment from dashboard
4. Git: git revert [commit] && git push origin main
5. Notify team: "Rollback performed for ticket #[N] — [reason]"
6. File post-mortem ticket
```

### 6.4 Database Migration Rules

- **NEVER** drop columns or tables in production without a 2-week deprecation period
- **ALWAYS** use `IF NOT EXISTS` / `IF EXISTS` guards
- **ALWAYS** test migrations on a local copy of the schema first
- Schema changes require explicit approval from founder
- Migrations run automatically via `npm run db:push` in the Railway start command

---

## 7. Incident Response

### 7.1 Severity Levels

| Level | Definition | Response |
|-------|-----------|----------|
| **SEV-1** | Platform completely down, no users can access | Immediate. All hands. Fix within 1 hour. |
| **SEV-2** | Major feature broken (auth, payments, course access) | Within 4 hours. Engineering priority. |
| **SEV-3** | Minor feature broken, workaround exists | Within 24 hours. Normal ticket flow. |
| **SEV-4** | Cosmetic issue, no functional impact | Next maintenance window. |

### 7.2 Incident Checklist

When an incident occurs:

1. **Identify**: What is broken? Who reported it? What's the impact?
2. **Communicate**: Notify founder immediately for SEV-1/SEV-2
3. **Diagnose**: Check Railway logs, Sentry errors, browser console
4. **Fix or Rollback**: Apply fix or revert to last known good deployment
5. **Verify**: Confirm the fix works on production
6. **Post-mortem**: Document what happened, why, and how to prevent it

### 7.3 Key Diagnostic Commands

```bash
# Check if server is up
curl https://cogniboost-production.up.railway.app/health

# View recent logs
railway logs --lines 50

# Check deployment status
railway service status

# Test database connection
curl https://cogniboost-production.up.railway.app/api/courses

# Redeploy (if needed)
railway redeploy --yes

# Check Vercel deployment
# → vercel.com/creaactivas-projects/cogniboost
```

---

## 8. What Business Operators CAN Do (Without a Ticket)

These actions are safe and expected as part of daily operations:

- **Admin panel**: Add/edit courses, lessons, quizzes via the admin UI
- **Student management**: View student profiles, track progress, lock/unlock accounts via admin UI
- **Content updates**: Upload lesson materials, modify quiz questions via admin UI
- **Support responses**: Help students with login issues, guide them through password reset
- **Monitoring**: Check Sentry, Railway dashboard, Stripe dashboard for anomalies
- **Report issues**: Submit tickets for anything that looks wrong

### What Operators MUST NOT Do

- Modify environment variables on Railway or Vercel
- Push code to GitHub
- Run database queries directly
- Change DNS settings
- Modify Stripe webhook configurations
- Install or update npm packages
- Change Railway or Vercel build/deploy settings

---

## 9. Operational Contacts & Access

| Service | Dashboard URL | Access Level |
|---------|--------------|--------------|
| Railway | `railway.com/project/c231ff19-fca6-47b9-b0ec-0620dff2467d` | Founder only |
| Vercel | `vercel.com/creaactivas-projects/cogniboost` | Founder only |
| Sentry | Configured via SENTRY_DSN | Founder + operators (read-only) |
| Stripe | `dashboard.stripe.com` | Founder (full), operators (read-only) |
| Resend | `resend.com/dashboard` | Founder only |
| GitHub | `github.com/creaactivai/Cogniboost` | Founder only |
| Admin Panel | `cogniboost.co/admin` | Founder + authorized operators |

---

## 10. Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database in separate Railway project | Cross-project networking uses public TCP proxy (slower, exposed) | Monitor latency. Long-term: move DB to same project. |
| No automated tests | Regressions possible on every deploy | Add test suite (quarterly goal). Manual testing checklist for now. |
| No GitHub Actions CI | Broken code can reach production | Add CI pipeline (quarterly goal). Local build check required before merge. |
| No automated DB backups | Data loss risk | Enable Railway automatic backups immediately (ticket this). |
| Railway free tier ($5/month limit) | Service could stop if budget exceeded | Monitor costs weekly. Upgrade plan if user base grows. |
| Single point of failure (1 replica) | No redundancy | Scale to 2+ replicas when revenue justifies it. |

---

## 11. Immediate Action Items (Post-Protocol)

These should be ticketed and addressed in order:

1. **[CRITICAL]** Enable automatic database backups on Railway Postgres
2. **[HIGH]** Create admin user account for the founder on the fresh database
3. **[HIGH]** Re-add course content to the fresh database
4. **[NORMAL]** Set up a weekly automated health check (cron or Railway cron service)
5. **[NORMAL]** Add basic smoke tests that run post-deployment
6. **[LOW]** Move Postgres into the same Railway project as Cogniboost (eliminates public proxy)
7. **[LOW]** Add GitHub Actions CI workflow (lint + build + type check)

---

## 12. Protocol Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-13 | Initial protocol established after Replit Auth removal and infrastructure stabilization |

---

*This protocol is a living document. It will be reviewed and updated monthly as part of the maintenance schedule. All team members are expected to read and follow it.*
