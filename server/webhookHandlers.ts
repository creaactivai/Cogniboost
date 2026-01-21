import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { sendEmail } from './resendClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async handleSubscriptionUpdate(subscription: any) {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;

    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    if (!user) return;

    const previousStatus = user.status;
    let userStatus: 'active' | 'hold' | 'inactive' = 'active';
    
    if (status === 'active' || status === 'trialing') {
      userStatus = 'active';
    } else if (status === 'past_due' || status === 'unpaid') {
      userStatus = 'hold';
    } else if (status === 'canceled' || status === 'incomplete_expired') {
      userStatus = 'inactive';
    }

    // Extract plan name from subscription metadata or price info
    let planName = '';
    try {
      // Priority 1: Check metadata (set during checkout)
      if (subscription.metadata?.planName) {
        planName = subscription.metadata.planName;
      } 
      // Priority 2: Check price nickname (set in Stripe dashboard)
      else if (subscription.items?.data?.[0]?.price?.nickname) {
        planName = subscription.items.data[0].price.nickname;
      } 
      // Priority 3: Map price IDs to plan names using server-side env vars only
      else if (subscription.items?.data?.[0]?.price?.id) {
        const priceId = subscription.items.data[0].price.id;
        if (priceId === process.env.STRIPE_PRICE_FLEX) {
          planName = 'Flex';
        } else if (priceId === process.env.STRIPE_PRICE_STANDARD) {
          planName = 'Básico';
        } else if (priceId === process.env.STRIPE_PRICE_PREMIUM) {
          planName = 'Premium';
        }
      }
    } catch (e) {
      console.log('Could not extract plan name from subscription');
    }

    // Map plan name to subscription tier
    // For inactive/hold statuses, set tier to 'free' to prevent feature access during payment issues
    let subscriptionTier: 'free' | 'flex' | 'basic' | 'premium' = 'free';
    
    if (status === 'canceled' || status === 'incomplete_expired' || status === 'past_due' || status === 'unpaid') {
      // Revoke paid tier access during payment issues or cancellation
      subscriptionTier = 'free';
    } else if (planName) {
      const lowerPlan = planName.toLowerCase();
      if (lowerPlan.includes('flex')) {
        subscriptionTier = 'flex';
      } else if (lowerPlan.includes('básico') || lowerPlan.includes('basic') || lowerPlan.includes('estándar') || lowerPlan.includes('standard')) {
        subscriptionTier = 'basic';
      } else if (lowerPlan.includes('premium')) {
        subscriptionTier = 'premium';
      }
    }
    // If no plan name found and status is active/trialing, log warning but keep existing tier
    if (!planName && (status === 'active' || status === 'trialing')) {
      console.warn(`Warning: Could not determine plan for subscription ${subscriptionId}, keeping tier as: ${subscriptionTier}`);
    }

    await db.update(users).set({
      stripeSubscriptionId: subscriptionId,
      status: userStatus,
      subscriptionTier: subscriptionTier,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    console.log(`Subscription updated for user ${user.id}: status=${userStatus}, tier=${subscriptionTier}, plan=${planName}`);

    // Send activation email when subscription becomes active (new or reactivated)
    if (userStatus === 'active' && previousStatus !== 'active' && user.email) {
      // Send subscription activated email asynchronously
      sendEmail(user.email, 'subscription_activated', {
        firstName: user.firstName || 'Estudiante',
        planName: planName,
        dashboardUrl: 'https://cogniboost.co/dashboard'
      }).catch(err => console.error('Failed to send subscription activated email:', err));

      console.log(`Subscription activated email sent to ${user.email} for plan ${planName}`);
    }
  }

  static async handlePaymentFailed(paymentIntent: any) {
    const customerId = paymentIntent.customer;
    
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    if (!user) return;

    await db.update(users).set({
      status: 'hold',
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
  }

  static async handlePaymentSucceeded(paymentIntent: any) {
    const customerId = paymentIntent.customer;
    
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    if (!user) return;

    await db.update(users).set({
      status: 'active',
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
  }
}
