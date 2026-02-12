# CogniBoost LMS - Deployment Guide

This guide covers deploying the CogniBoost LMS application to production using Vercel (frontend) and Railway (backend + database).

## Prerequisites

- [ ] GitHub account with repository access
- [ ] Vercel account
- [ ] Railway account
- [ ] Google Cloud Console project (for Google OAuth)
- [ ] Apple Developer account (for Apple Sign-In)
- [ ] Stripe account (for payments)
- [ ] Resend account (for emails)
- [ ] Sentry account (for error tracking)

---

## Part 1: Database Deployment (Railway)

### 1.1 Create PostgreSQL Database

1. Log in to [Railway](https://railway.app)
2. Click "New Project" → "Provision PostgreSQL"
3. Wait for database to be provisioned
4. Click on the PostgreSQL service
5. Go to "Variables" tab
6. Copy the `DATABASE_URL` value (you'll need this later)

### 1.2 Run Database Migrations

Option A: From your local machine (recommended for first deployment)

```bash
# Set the Railway DATABASE_URL as an environment variable
export DATABASE_URL="your-railway-database-url-here"

# Run migrations
npm run db:push
```

Option B: Via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run db:push
```

---

## Part 2: Backend API Deployment (Railway)

### 2.1 Create Backend Service

1. In your Railway project, click "New Service"
2. Select "GitHub Repo"
3. Connect your CogniBoost repository
4. Railway will auto-detect the Node.js app

### 2.2 Configure Environment Variables

Go to the backend service → Variables tab and add:

**Required Variables:**

```bash
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Reference to PostgreSQL service

# Server
NODE_ENV=production
PORT=5000
SESSION_SECRET=<generate-secure-random-32+-char-string>

# Stripe
STRIPE_SECRET_KEY=sk_live_...  # Live key from Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Resend (Email)
RESEND_API_KEY=re_...  # From resend.com

# Sentry (Error Tracking)
SENTRY_DSN=https://...@sentry.io/...  # From sentry.io
```

**OAuth Variables:**

```bash
# Google OAuth
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# Apple Sign-In
APPLE_CLIENT_ID=<service-id-from-apple-developer>
APPLE_TEAM_ID=<your-apple-team-id>
APPLE_KEY_ID=<apple-key-id>
APPLE_PRIVATE_KEY=<base64-encoded-private-key>
```

**Optional Variables:**

```bash
# OpenAI (for AI features)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# Replit Domains (if using Replit webhooks)
REPLIT_DOMAINS=your-app.repl.co
```

### 2.3 Configure Custom Domain

1. Go to backend service → Settings → Networking
2. Click "Generate Domain" or add custom domain
3. Note the domain (e.g., `api.cogniboost.co` or `your-app.up.railway.app`)
4. If using custom domain, add CNAME record in your DNS:
   - Name: `api`
   - Value: `<your-railway-domain>.railway.app`

### 2.4 Deploy

Railway will automatically deploy when you push to your repository's main branch.

---

## Part 3: Frontend Deployment (Vercel)

### 3.1 Create Vercel Project

1. Log in to [Vercel](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Vite**
   - Root Directory: `./` (leave as root)
   - Build Command: `npm run build`
   - Output Directory: `dist/public`

### 3.2 Configure Environment Variables

Go to Project Settings → Environment Variables:

```bash
# API URL (your Railway backend domain)
VITE_API_URL=https://api.cogniboost.co

# Sentry (Frontend error tracking)
VITE_SENTRY_DSN=https://...@sentry.io/...
```

### 3.3 Configure Custom Domain

1. Go to Project Settings → Domains
2. Add your domain (e.g., `cogniboost.co`)
3. Follow Vercel's DNS configuration instructions
4. Add these DNS records to your domain registrar:
   - A Record: `@` → Vercel IP
   - CNAME: `www` → `cname.vercel-dns.com`

### 3.4 Deploy

Vercel will automatically deploy when you push to main branch.

---

## Part 4: OAuth Configuration

### 4.1 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: **Web application**
6. Authorized redirect URIs:
   - Production: `https://api.cogniboost.co/auth/google/callback`
   - Development: `http://localhost:5000/auth/google/callback`
7. Copy Client ID and Client Secret to Railway environment variables

### 4.2 Apple Sign-In Setup

1. Go to [Apple Developer](https://developer.apple.com)
2. Certificates, Identifiers & Profiles → Identifiers
3. Click "+" → "Services IDs"
4. Create a Service ID (this is your `APPLE_CLIENT_ID`)
5. Enable "Sign in with Apple"
6. Configure domains and return URLs:
   - Domains: `cogniboost.co`
   - Return URLs: `https://api.cogniboost.co/auth/apple/callback`
7. Create a Private Key:
   - Certificates, Identifiers & Profiles → Keys
   - Enable "Sign in with Apple"
   - Download the .p8 file
   - Convert to base64: `base64 -i AuthKey_XXX.p8`
8. Copy all credentials to Railway environment variables

---

## Part 5: Stripe Configuration

### 5.1 Update Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Developers → Webhooks
3. Add endpoint: `https://api.cogniboost.co/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 5.2 Switch to Live Mode

1. In Stripe Dashboard, toggle from "Test mode" to "Live mode"
2. Update Railway environment variables with live keys:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_PUBLISHABLE_KEY` → `pk_live_...`

---

## Part 6: Email Configuration (Resend)

### 6.1 Setup Domain

1. Go to [Resend Dashboard](https://resend.com)
2. Add your domain (e.g., `cogniboost.co`)
3. Add DNS records provided by Resend:
   - TXT record for verification
   - MX records for receiving
   - DKIM records for authentication

### 6.2 Verify Domain

Wait for DNS propagation (can take 24-48 hours) and verify domain in Resend dashboard.

---

## Part 7: Post-Deployment Checklist

### 7.1 Verify Deployment

- [ ] Frontend loads at `https://cogniboost.co`
- [ ] API health check: `https://api.cogniboost.co/health` returns `{"status":"ok"}`
- [ ] Google OAuth login works
- [ ] Apple Sign-In works
- [ ] Course enrollment works
- [ ] Payment flow completes (test with Stripe test mode first!)
- [ ] Email sending works
- [ ] Admin dashboard accessible
- [ ] Analytics page shows data

### 7.2 Configure DNS

All DNS records should be configured:
- [ ] A/CNAME for main domain → Vercel
- [ ] CNAME for api subdomain → Railway
- [ ] MX/DKIM records for email → Resend
- [ ] SSL certificates active (auto via Vercel/Railway)

### 7.3 Security Checklist

- [ ] All environment variables are set in Railway/Vercel (not in code!)
- [ ] `.env` files are in `.gitignore`
- [ ] HTTPS enabled on all domains
- [ ] Rate limiting is active
- [ ] Helmet security headers configured
- [ ] OAuth redirect URIs match production domains
- [ ] Stripe webhook signing secret configured

### 7.4 Monitoring Setup

- [ ] Sentry error tracking receiving events
- [ ] Railway logs accessible
- [ ] Vercel logs accessible
- [ ] Set up uptime monitoring (e.g., UptimeRobot, Pingdom)

---

## Part 8: Rollback Procedure

If deployment fails or critical bugs are found:

### 8.1 Railway Rollback

1. Go to backend service → Deployments
2. Find last working deployment
3. Click "..." → "Redeploy"

### 8.2 Vercel Rollback

1. Go to project → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

---

## Part 9: Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `5000` (Railway auto-assigns) |
| `SESSION_SECRET` | ✅ | 32+ character random string |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key |
| `GOOGLE_CLIENT_ID` | ⚠️ | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | Google OAuth Client Secret |
| `APPLE_CLIENT_ID` | ⚠️ | Apple Service ID |
| `APPLE_TEAM_ID` | ⚠️ | Apple Team ID |
| `APPLE_KEY_ID` | ⚠️ | Apple Key ID |
| `APPLE_PRIVATE_KEY` | ⚠️ | Apple Private Key (base64) |
| `RESEND_API_KEY` | ⚠️ | Resend API key |
| `SENTRY_DSN` | ⚠️ | Sentry backend DSN |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ❌ | OpenAI API key |

⚠️ = Recommended but optional in development
❌ = Optional

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API URL |
| `VITE_SENTRY_DSN` | ⚠️ | Sentry frontend DSN |

---

## Troubleshooting

### Issue: OAuth redirect mismatch

**Solution:** Ensure redirect URIs in Google/Apple console exactly match your production URL:
- `https://api.cogniboost.co/auth/google/callback`
- `https://api.cogniboost.co/auth/apple/callback`

### Issue: Database connection timeout

**Solution:** Verify `DATABASE_URL` is correctly set and Railway PostgreSQL is running.

### Issue: Stripe webhooks not working

**Solution:**
1. Verify webhook URL is `https://api.cogniboost.co/api/stripe/webhook`
2. Check Railway logs for webhook errors
3. Test webhook in Stripe Dashboard → Developers → Webhooks → Test

### Issue: CORS errors

**Solution:** CORS is already configured in the app. Ensure `VITE_API_URL` in Vercel matches your Railway backend URL.

---

## Support

For deployment issues, check:
- Railway logs: Service → Deployments → View logs
- Vercel logs: Project → Deployments → Build logs
- Sentry errors: [sentry.io](https://sentry.io)

---

## Next Steps After Deployment

1. **Load Testing:** Test with 50+ concurrent users
2. **Backup Strategy:** Configure Railway automatic backups
3. **CDN:** Consider Cloudflare for static assets
4. **Analytics:** Set up Google Analytics or Plausible
5. **Beta Launch:** Invite first users and monitor Sentry
