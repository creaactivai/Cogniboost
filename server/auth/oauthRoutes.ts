import type { Express } from "express";
import passport from "passport";
import { setupGoogleAuth } from "./googleStrategy";
import { setupAppleAuth } from "./appleStrategy";

export function registerOAuthRoutes(app: Express) {
  // Initialize OAuth strategies
  const googleEnabled = setupGoogleAuth();
  const appleEnabled = setupAppleAuth();

  if (!googleEnabled && !appleEnabled) {
    console.warn("⚠️ No OAuth providers configured - users will need to use Replit Auth");
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

  // Logout route (works for all auth methods)
  app.get("/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });

  console.log("✅ OAuth routes registered");
}
