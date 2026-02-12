import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { Express } from "express";

/**
 * Configure Helmet security headers
 * https://helmetjs.github.io/
 */
export function setupSecurityHeaders(app: Express) {
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for React dev
          styleSrc: ["'self'", "'unsafe-inline'"], // Required for inline styles
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "https://api.stripe.com", "wss:"],
          frameSrc: ["'self'", "https://js.stripe.com"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      // Strict Transport Security (HSTS)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      // Prevent MIME type sniffing
      noSniff: true,
      // Prevent clickjacking
      frameguard: {
        action: "deny",
      },
      // XSS protection (legacy browsers)
      xssFilter: true,
      // Hide X-Powered-By header
      hidePoweredBy: true,
    })
  );

  console.log("✅ Security headers configured (Helmet)");
}

/**
 * Rate limiting configuration
 * Prevents brute force attacks and API abuse
 */

// General API rate limiter (100 requests per 15 minutes)
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: "Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for certain IPs (e.g., health checks)
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === "/health";
  },
});

// Login rate limiter (5 attempts per 15 minutes)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: {
    error: "Demasiados intentos de inicio de sesión, por favor intenta de nuevo en 15 minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Admin API rate limiter (50 requests per 15 minutes)
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  message: {
    error: "Demasiadas solicitudes al panel de administración, por favor intenta de nuevo más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Payment/checkout rate limiter (10 requests per hour)
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment attempts per hour
  message: {
    error: "Demasiados intentos de pago, por favor contacta a soporte si necesitas ayuda.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Apply rate limiters to specific routes
 */
export function setupRateLimiting(app: Express) {
  // Apply general rate limiter to all API routes
  app.use("/api", generalRateLimiter);

  // Apply stricter rate limiting to authentication endpoints
  app.use("/auth/google", loginRateLimiter);
  app.use("/auth/apple", loginRateLimiter);
  app.use("/api/auth/activate", loginRateLimiter);
  app.use("/api/login", loginRateLimiter);

  // Apply admin rate limiter to admin routes
  app.use("/api/admin", adminRateLimiter);

  // Apply payment rate limiter to payment routes
  app.use("/api/create-checkout-session", paymentRateLimiter);

  console.log("✅ Rate limiting configured");
}
