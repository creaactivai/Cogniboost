import { users, adminInvitations, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { sendEmail } from "../../resendClient";
import { randomBytes } from "crypto";

// Super admin emails that automatically get admin access during beta
const SUPER_ADMIN_EMAILS = [
  'cognimight@gmail.com',
  'acreaactiva@gmail.com',
];

// Test accounts that automatically get premium subscription on first login
const PREMIUM_TEST_EMAILS = [
  'corallozanoc@gmail.com',
];

// Generate a secure random token for email verification
function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

// Check if email is in the admin invitations table
async function isInvitedAdmin(email: string): Promise<boolean> {
  const [invitation] = await db
    .select()
    .from(adminInvitations)
    .where(eq(adminInvitations.email, email.toLowerCase()));
  return invitation?.isActive === true;
}

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if a user with this email already exists (different from ID-based lookup)
    let existingUser = await this.getUser(userData.id!);
    let existingUserByEmail: User | undefined;
    
    if (userData.email) {
      const [userByEmail] = await db.select().from(users).where(eq(users.email, userData.email.toLowerCase()));
      existingUserByEmail = userByEmail;
    }
    
    // If user exists by email but with different ID, update that user instead
    if (existingUserByEmail && existingUserByEmail.id !== userData.id) {
      existingUser = existingUserByEmail;
      // Use the existing user's ID to avoid unique constraint violation
      userData = { ...userData, id: existingUserByEmail.id };
    }
    
    const isNewUser = !existingUser;

    // Auto-grant admin to super admin emails during beta or if invited as admin
    const isSuperAdmin = userData.email && SUPER_ADMIN_EMAILS.includes(userData.email.toLowerCase());
    const isInvited = userData.email ? await isInvitedAdmin(userData.email) : false;
    const shouldBeAdmin = isSuperAdmin || isInvited;
    const userDataWithAdmin = shouldBeAdmin ? { ...userData, isAdmin: true } : userData;

    // Auto-grant premium subscription to test student emails
    const isPremiumTest = userDataWithAdmin.email && PREMIUM_TEST_EMAILS.includes(userDataWithAdmin.email.toLowerCase());
    const userDataWithPremium = isPremiumTest
      ? { ...userDataWithAdmin, subscriptionTier: 'premium', onboardingCompleted: true, skipOnboarding: true }
      : userDataWithAdmin;

    // For new self-registered users (not manually added), generate email verification token
    // Skip verification for OAuth users whose email is already verified by the provider
    let finalUserData = userDataWithPremium;
    const isOAuthVerified = userDataWithPremium.emailVerified === true;

    if (isNewUser && !existingUserByEmail?.addedManually && !isOAuthVerified) {
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      finalUserData = {
        ...userDataWithPremium,
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: expiresAt,
        emailVerified: false,
      };
    } else if (isOAuthVerified) {
      // OAuth user with verified email - mark as verified, no token needed
      finalUserData = {
        ...userDataWithPremium,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      };
    }

    const [user] = await db
      .insert(users)
      .values(finalUserData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...finalUserData,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Send emails to new users (async, don't wait)
    if (isNewUser && user.email) {
      // Send verification email only for self-registered users who aren't OAuth verified
      if (!user.addedManually && user.emailVerificationToken && !isOAuthVerified) {
        this.sendVerificationEmail(user).catch(err => 
          console.error("Failed to send verification email:", err)
        );
      }
      
      // Send welcome email
      if (!user.welcomeEmailSent) {
        this.sendWelcomeEmail(user).catch(err => 
          console.error("Failed to send welcome email:", err)
        );
      }
    }

    return user;
  }

  private async sendWelcomeEmail(user: User): Promise<void> {
    if (!user.email) return;
    
    try {
      await sendEmail(user.email, 'welcome', {
        firstName: user.firstName || 'estudiante',
        onboardingUrl: `${process.env.REPLIT_DEPLOYMENT_URL || 'https://cogniboost.co'}/onboarding`,
      });
      
      // Mark welcome email as sent
      await db.update(users)
        .set({ welcomeEmailSent: true, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      
      console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send welcome email to ${user.email}:`, error);
    }
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    if (!user.email || !user.emailVerificationToken) return;
    
    try {
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'https://cogniboost.co';
      const verificationUrl = `${baseUrl}/verify-email?token=${user.emailVerificationToken}`;
      
      await sendEmail(user.email, 'email_verification', {
        firstName: user.firstName || 'estudiante',
        verificationUrl,
      });
      
      console.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send verification email to ${user.email}:`, error);
    }
  }
}

export const authStorage = new AuthStorage();
