import { cleanEnv, str, url, port, makeValidator } from "envalid";

/**
 * Custom validator for optional URLs
 */
const optionalUrl = makeValidator<string | undefined>((input) => {
  if (!input || input === "") return undefined;
  try {
    new URL(input);
    return input;
  } catch {
    throw new Error("Invalid URL format");
  }
});

/**
 * Custom validator for optional strings
 */
const optionalStr = makeValidator<string | undefined>((input) => {
  if (!input || input === "") return undefined;
  return input;
});

/**
 * Validate environment variables at startup
 * Fails fast with clear error messages if required variables are missing
 */
export function validateEnv() {
  const env = cleanEnv(process.env, {
    // Server
    NODE_ENV: str({
      choices: ["development", "production", "test"],
      default: "development",
    }),
    PORT: port({ default: 5000 }),

    // Database
    DATABASE_URL: url({
      desc: "PostgreSQL connection string",
    }),

    // Session
    SESSION_SECRET: str({
      desc: "Secret key for session encryption",
      minLength: 32,
    }),

    // OAuth - Google (Optional in development, required in production)
    GOOGLE_CLIENT_ID: optionalStr({
      desc: "Google OAuth Client ID",
    }),
    GOOGLE_CLIENT_SECRET: optionalStr({
      desc: "Google OAuth Client Secret",
    }),

    // OAuth - Apple (Optional in development, required in production)
    APPLE_CLIENT_ID: optionalStr({
      desc: "Apple Sign-In Client ID (Service ID)",
    }),
    APPLE_TEAM_ID: optionalStr({
      desc: "Apple Developer Team ID",
    }),
    APPLE_KEY_ID: optionalStr({
      desc: "Apple Sign-In Key ID",
    }),
    APPLE_PRIVATE_KEY: optionalStr({
      desc: "Apple Sign-In Private Key (base64 or raw PEM)",
    }),

    // Stripe (Required for payments)
    STRIPE_SECRET_KEY: str({
      desc: "Stripe secret key (sk_test_... or sk_live_...)",
    }),
    STRIPE_PUBLISHABLE_KEY: str({
      desc: "Stripe publishable key",
    }),

    // Email (Resend) - Optional in development
    RESEND_API_KEY: optionalStr({
      desc: "Resend API key for sending emails",
    }),

    // AI/OpenAI - Optional
    AI_INTEGRATIONS_OPENAI_API_KEY: optionalStr({
      desc: "OpenAI API key for AI features",
    }),
    AI_INTEGRATIONS_OPENAI_BASE_URL: optionalUrl({
      desc: "OpenAI API base URL (optional custom endpoint)",
    }),

    // Sentry (Error tracking) - Optional but recommended
    SENTRY_DSN: optionalUrl({
      desc: "Sentry DSN for error tracking",
    }),

    // Deployment (Railway/Replit)
    REPLIT_DOMAINS: optionalStr({
      desc: "Comma-separated list of Replit domains for webhooks",
    }),
  });

  // Production-specific validation
  if (env.NODE_ENV === "production") {
    // Ensure OAuth is configured in production
    const hasGoogleOAuth = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET;
    const hasAppleOAuth =
      env.APPLE_CLIENT_ID &&
      env.APPLE_TEAM_ID &&
      env.APPLE_KEY_ID &&
      env.APPLE_PRIVATE_KEY;

    if (!hasGoogleOAuth && !hasAppleOAuth) {
      console.warn(
        "⚠️ WARNING: No OAuth providers configured in production. Users won't be able to sign in!"
      );
    }

    // Ensure email is configured in production
    if (!env.RESEND_API_KEY) {
      console.warn(
        "⚠️ WARNING: RESEND_API_KEY not set in production. Email functionality will be disabled!"
      );
    }

    // Ensure error tracking is configured
    if (!env.SENTRY_DSN) {
      console.warn(
        "⚠️ WARNING: SENTRY_DSN not set in production. Error tracking will be disabled!"
      );
    }
  }

  console.log("✅ Environment variables validated");
  console.log(
    `   - Mode: ${env.NODE_ENV}`
  );
  console.log(
    `   - Database: ${env.DATABASE_URL.substring(0, 20)}...`
  );
  console.log(
    `   - OAuth: ${env.GOOGLE_CLIENT_ID ? "Google ✓" : "Google ✗"} ${env.APPLE_CLIENT_ID ? "Apple ✓" : "Apple ✗"}`
  );
  console.log(
    `   - Stripe: ${env.STRIPE_SECRET_KEY.substring(0, 12)}...`
  );
  console.log(
    `   - Email: ${env.RESEND_API_KEY ? "Configured ✓" : "Not configured ✗"}`
  );
  console.log(
    `   - Sentry: ${env.SENTRY_DSN ? "Enabled ✓" : "Disabled ✗"}`
  );

  return env;
}
