import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { sendEmail } from "../../resendClient";

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
    // Check if this is a new user (for welcome email)
    const existingUser = await this.getUser(userData.id!);
    const isNewUser = !existingUser;

    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Send welcome email to new users (async, don't wait)
    if (isNewUser && user.email && !user.welcomeEmailSent) {
      this.sendWelcomeEmail(user).catch(err => 
        console.error("Failed to send welcome email:", err)
      );
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
}

export const authStorage = new AuthStorage();
