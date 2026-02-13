import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Express } from "express";

export function initializeMonitoring(app: Express) {
  // Only initialize Sentry if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.log("⚠️ Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",

    // Set sample rate for performance monitoring
    // 1.0 = 100% of transactions, 0.1 = 10% (recommended for production)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Set sample rate for profiling
    // This is relative to tracesSampleRate
    profilesSampleRate: 1.0,

    integrations: [
      // Profiling integration for performance insights
      nodeProfilingIntegration(),

      // HTTP integration for Express
      Sentry.httpIntegration(),

      // PostgreSQL integration (if available)
      Sentry.postgresIntegration(),
    ],

    // Add custom tags
    initialScope: {
      tags: {
        "runtime": "node",
        "platform": "cogniboost-lms",
      },
    },

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive request data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.['authorization'];
        delete event.request.headers?.['cookie'];
      }

      return event;
    },
  });

  // In Sentry v8+, Handlers API was removed. Sentry auto-instruments via init().

  console.log("✅ Sentry error tracking initialized");
}

// Error handler must be registered after all controllers but before other error middleware
export function errorHandler() {
  // In Sentry v8+, Handlers.errorHandler was removed.
  // Use Sentry.setupExpressErrorHandler if Sentry is initialized, else return a no-op middleware.
  if (process.env.SENTRY_DSN && typeof Sentry.setupExpressErrorHandler === 'function') {
    // Return a middleware that captures errors via Sentry
    return (err: any, req: any, res: any, next: any) => {
      Sentry.captureException(err);
      next(err);
    };
  }
  // No-op error middleware when Sentry is not configured
  return (err: any, _req: any, _res: any, next: any) => {
    next(err);
  };
}

// Manually capture errors with context
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Manually capture messages
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  Sentry.captureMessage(message, level);
}

// Add user context to Sentry
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

// Clear user context on logout
export function clearUserContext() {
  Sentry.setUser(null);
}
