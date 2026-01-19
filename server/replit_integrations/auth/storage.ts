import { users, adminInvitations, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { sendEmail } from "../../resendClient";

// Super admin emails that automatically get admin access during beta
const SUPER_ADMIN_EMAILS = [
  'cognimight@gmail.com',
  'acreaactiva@gmail.com',
];

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
    // Check if this is a new user (for welcome email)
    const existingUser = await this.getUser(userData.id!);
    const isNewUser = !existingUser;

    // Auto-grant admin to super admin emails during beta or if invited as admin
    const isSuperAdmin = userData.email && SUPER_ADMIN_EMAILS.includes(userData.email.toLowerCase());
    const isInvited = userData.email ? await isInvitedAdmin(userData.email) : false;
    const shouldBeAdmin = isSuperAdmin || isInvited;
    const userDataWithAdmin = shouldBeAdmin ? { ...userData, isAdmin: true } : userData;

    const [user] = await db
      .insert(users)
      .values(userDataWithAdmin)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userDataWithAdmin,
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
