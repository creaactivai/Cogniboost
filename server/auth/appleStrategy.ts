import passport from "passport";
import AppleStrategy from "passport-apple";
import { authStorage } from "../replit_integrations/auth/storage";

export function setupAppleAuth() {
  if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID || !process.env.APPLE_PRIVATE_KEY) {
    console.warn("⚠️ Apple Sign-In not configured - missing required environment variables");
    return false;
  }

  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY,
        callbackURL: process.env.APPLE_CALLBACK_URL || "https://cogniboost.co/auth/apple/callback",
        scope: ["name", "email"],
        passReqToCallback: false,
      },
      async (accessToken: string, refreshToken: string, idToken: any, profile: any, done: any) => {
        try {
          // Apple provides email only on first login
          const email = profile.email || idToken.email;
          const firstName = profile.name?.firstName;
          const lastName = profile.name?.lastName;

          if (!email) {
            return done(new Error("No email provided by Apple"), undefined);
          }

          // Upsert user in database
          const user = await authStorage.upsertUser({
            id: profile.id,
            email,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            // Apple OAuth users are automatically verified
            emailVerified: true,
          });

          return done(null, user);
        } catch (error) {
          console.error("Apple OAuth error:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );

  console.log("✅ Apple Sign-In strategy configured");
  return true;
}
