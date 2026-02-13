import * as Sentry from "@sentry/node";
import type { Express } from "express";

export function initializeMonitoring(app: Express) {
  // Only initialize Sentry if DSN is provided
  if (!process.env.SENTRY_DSN) {
    console.log("⚠️ Sentry DSN not configured - error tracking disabled");
    return;
  }

  // Try to load profiling integration (has native bindings that may fail)
  let profilingIntegration: any = null;
  try {
    const profiling = require("@sentry/profiling-node");
    profilingIntegration = profiling.nodeProfilingIntegration();
  } catch (e) {
    console.log("⚠️ Sentry profiling not available (native module), skipping");
  }

  const integrations: any[] = [
    Sentry.httpIntegration(),
    Sentry.postgresIntegration(),
  ];
  if (profilingIntegration) {
    integrations.push(profilingIntegration);
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: 1.0,
    integrations,
    initialScope: {
      tags: {
        "runtime": "node",
        "platform": "cogniboost-lms",
      },
    },
    beforeSend(event, hint) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.['authorization'];
        delete event.request.headers?.['cookie'];
      }
      return event;
    },
  });

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
