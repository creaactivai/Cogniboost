import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { useLocation } from "wouter";

// Initialize Sentry for React
export function initializeMonitoring() {
  // Only initialize if DSN is provided
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

  if (!sentryDsn) {
    console.warn("⚠️ Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE || "development",

    // Set sample rate for performance monitoring
    tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,

    // Set sample rate for replays
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    integrations: [
      // Browser integrations
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
            // Remove authorization headers
            if (breadcrumb.data?.headers) {
              delete breadcrumb.data.headers['authorization'];
              delete breadcrumb.data.headers['cookie'];
            }
          }
          return breadcrumb;
        });
      }

      return event;
    },
  });

  console.log("✅ Sentry monitoring initialized (client)");
}

// Error Boundary component
export const ErrorBoundary = Sentry.ErrorBoundary;

// Hook to track route changes
export function useSentryRouting() {
  const [location] = useLocation();

  useEffect(() => {
    // Update Sentry transaction on route change
    Sentry.getCurrentScope().setTransactionName(location);
  }, [location]);
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

// Set user context
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

// Fallback component for ErrorBoundary
export function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">
            Algo salió mal
          </h1>
          <p className="text-muted-foreground mb-4">
            Lo sentimos, ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
          </p>
          <div className="bg-muted p-4 rounded-md text-left mb-4">
            <p className="text-sm font-mono text-destructive">
              {error.message}
            </p>
          </div>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
