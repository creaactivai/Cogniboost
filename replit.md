# CogniBoost / CogniMight 2.0

## Overview
CogniBoost (cogniboost.co) is an English learning platform designed for Latin American adults. It features pre-recorded courses (A1-C2 levels), live Conversation Practice Labs with peer-to-peer learning, and progress tracking.

## Target Audience
Spanish-speaking Latin American professionals learning English.

## Current State
- Full Spanish UI translation complete
- Landing page with hero, methodology, testimonials, pricing, FAQ sections
- Dashboard with course catalog, conversation labs, progress tracking, settings
- Database schema with PostgreSQL
- Replit Auth integration
- Object Storage integration

## User Preferences

### Language
- **Interface language**: Spanish (ES-LATAM)
- All user-facing content must be in Spanish
- English values are used internally for database consistency

### Design System (neotribe.vc-inspired)
- Primary color: Cyan #33CBFB
- Accent color: Coral #FD335A
- **Zero border-radius** throughout (sharp edges)
- Fonts: Impact/Arial Black for display headings, JetBrains Mono for body text

## Project Architecture

### Topic Translation Pattern
Topics are stored in English for database consistency but displayed in Spanish:

```typescript
// English keys for data/filtering
const courseTopicsEs: Record<string, string> = {
  "Business English": "Inglés de Negocios",
  "Travel & Tourism": "Viajes y Turismo",
  "Technology": "Tecnología",
  // ...
};

const getTopicLabel = (topic: string) => courseTopicsEs[topic] || topic;
```

This pattern is used in:
- `client/src/components/dashboard/course-catalog.tsx`
- `client/src/components/dashboard/conversation-labs.tsx`

### Key Files
- Landing page components: `client/src/components/landing/`
- Dashboard components: `client/src/components/dashboard/`
- Database schema: `shared/schema.ts`
- API routes: `server/routes.ts`

### Subscription Tiers
- Free: Basic access
- Standard: $29/month
- Premium: $79/month

## Recent Changes
- 2026-01-17: Complete Spanish translation of all UI components
- 2026-01-17: Implemented bilingual topic filtering (English keys, Spanish labels)
- 2026-01-17: Fixed language selector in settings (Inglés, Español, Portugués)

## Development Notes
- Frontend runs on port 5000
- Backend Express server with Vite for development
- PostgreSQL database with Drizzle ORM
- Replit Auth for authentication
- Object Storage for file uploads
