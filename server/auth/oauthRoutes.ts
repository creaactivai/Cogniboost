import type { Express } from "express";
import passport from "passport";
import { setupGoogleAuth } from "./googleStrategy";
import { setupAppleAuth } from "./appleStrategy";

export function registerOAuthRoutes(app: Express) {
  // Initialize OAuth strategies
  const googleEnabled = setupGoogleAuth();
  const appleEnabled = setupAppleAuth();

  if (!googleEnabled && !appleEnabled) {
    console.warn("⚠️ No OAuth providers configured - users can still use email/password login");
    return;
  }

  // Google OAuth routes
  if (googleEnabled) {
    app.get(
      "/auth/google",
      passport.authenticate("google", {
        scope: ["profile", "email"],
      })
    );

    app.get(
      "/auth/google/callback",
      passport.authenticate("google", {
        failureRedirect: "/?error=google_auth_failed",
        successRedirect: "/dashboard",
      })
    );
  }

  // Apple OAuth routes
  if (appleEnabled) {
    app.post(
      "/auth/apple",
      passport.authenticate("apple")
    );

    app.post(
      "/auth/apple/callback",
      passport.authenticate("apple", {
        failureRedirect: "/?error=apple_auth_failed",
        successRedirect: "/dashboard",
      })
    );
  }

  console.log("✅ OAuth routes registered");
}
