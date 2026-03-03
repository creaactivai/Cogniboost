import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
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

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await WebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionUpdate(event.data.object);
        break;
      case 'charge.failed':
      case 'payment_intent.payment_failed':
        await WebhookHandlers.handlePaymentFailed(event.data.object);
        break;
      case 'charge.succeeded':
      case 'payment_intent.succeeded':
        await WebhookHandlers.handlePaymentSucceeded(event.data.object);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Handle checkout.session.completed — fires when a customer finishes Stripe Checkout.
   * For logged-in users: the user already has stripeCustomerId, so the subscription webhook will handle email.
   * For guest users: the user doesn't exist yet, so we store the session info and send email later via link-customer.
   * This handler ensures we at least attempt to link + email for logged-in users who already have a Stripe customer.
   */
  static async handleCheckoutCompleted(session: any) {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const planName = session.metadata?.planName || '';
    const customerEmail = session.customer_details?.email || '';

    console.log(`[Webhook] checkout.session.completed: customer=${customerId}, plan=${planName}, email=${customerEmail}`);

    if (!customerId) {
      console.warn('[Webhook] checkout.session.completed: No customer ID found');
      return;
    }

    // Try to find the user by stripeCustomerId first, then fall back to email
    let [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));

    // Fallback: if no user found by stripeCustomerId, try matching by email
    // This handles the case where a user signs up AFTER purchasing (guest checkout)
    if (!user && customerEmail) {
      const [userByEmail] = await db.select().from(users).where(eq(users.email, customerEmail.toLowerCase()));
      if (userByEmail && !userByEmail.stripeCustomerId) {
        // Link the Stripe customer to this user
        await db.update(users).set({
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        }).where(eq(users.id, userByEmail.id));
        user = { ...userByEmail, stripeCustomerId: customerId };
        console.log(`[Webhook] checkout.session.completed: Auto-linked customer ${customerId} to user ${userByEmail.id} by email ${customerEmail}`);
      }
    }

    if (user) {
      // Logged-in user: update their subscription info and send email
      let subscriptionTier: 'flex' | 'basic' | 'premium' = 'basic';
      if (planName) {
        const lowerPlan = planName.toLowerCase();
        if (lowerPlan.includes('flex')) subscriptionTier = 'flex';
        else if (lowerPlan.includes('premium')) subscriptionTier = 'premium';
        else subscriptionTier = 'basic';
      }

      await db.update(users).set({
        stripeSubscriptionId: subscriptionId || undefined,
        subscriptionTier,
        status: 'active',
        onboardingCompleted: true,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      console.log(`[Webhook] checkout.session.completed: Updated user ${user.id} with plan=${planName}, tier=${subscriptionTier}`);

      // Send subscription activated email for logged-in users
      if (user.email) {
        const displayPlan = planName || subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1);
        const planPrices: Record<string, string> = { flex: '14.99', basic: '49.99', premium: '99.99' };

        sendEmail(user.email, 'subscription_activated', {
          firstName: user.firstName || 'Estudiante',
          planName: displayPlan,
          dashboardUrl: `${process.env.APP_URL || 'https://cogniboost.co'}/dashboard`,
        }).then(() => {
          console.log(`[Webhook] Subscription activated email sent to ${user.email}`);
        }).catch(err => {
          console.error(`[Webhook] Failed to send subscription activated email to ${user.email}:`, err);
        });

        // Notify admin about new subscription
        const academyEmail = 'cognimight@gmail.com';
        sendEmail(academyEmail, 'admin_subscription_notification', {
          studentName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No proporcionado',
          studentEmail: user.email,
          planName: displayPlan,
          tier: subscriptionTier,
          amount: planPrices[subscriptionTier] || '0',
          timestamp: new Date().toLocaleString('es-ES', { timeZone: 'America/Mexico_City' }),
          adminUrl: `${process.env.APP_URL || 'https://cogniboost-production.up.railway.app'}/admin/financials`,
        }).then(() => {
          console.log(`[Webhook] Admin notification sent for new subscription: ${user.email} → ${displayPlan}`);
        }).catch(err => {
          console.error(`[Webhook] Failed to send admin subscription notification:`, err);
        });
      }
    } else {
      // Guest checkout: user doesn't exist yet in our DB — email will be sent via /api/stripe/link-customer
      console.log(`[Webhook] checkout.session.completed: No user found for customer ${customerId} (guest checkout). Email will be sent when account is linked.`);
    }
  }

  static async handleSubscriptionUpdate(subscription: any) {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const status = subscription.status;

    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    if (!user) {
      console.log(`[Webhook] subscription.${status}: No user found for customer ${customerId} (likely guest checkout, will be handled via link-customer)`);
      return;
    }

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
    // IMPORTANT: For active/trialing subscriptions where plan name can't be determined,
    // preserve the user's existing tier instead of resetting to 'free'
    let subscriptionTier: 'free' | 'flex' | 'basic' | 'premium' | null = null;

    if (status === 'canceled' || status === 'incomplete_expired' || status === 'past_due' || status === 'unpaid') {
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
    if (!planName && (status === 'active' || status === 'trialing')) {
      console.warn(`[Webhook] Warning: Could not determine plan for active subscription ${subscriptionId}. Preserving user's existing tier: ${user.subscriptionTier}`);
    }

    // Build update payload — only include subscriptionTier if we positively identified it
    const updatePayload: Record<string, any> = {
      stripeSubscriptionId: subscriptionId,
      status: userStatus,
      updatedAt: new Date(),
    };
    if (subscriptionTier !== null) {
      updatePayload.subscriptionTier = subscriptionTier;
    }

    await db.update(users).set(updatePayload).where(eq(users.id, user.id));

    console.log(`Subscription updated for user ${user.id}: status=${userStatus}, tier=${subscriptionTier}, plan=${planName}`);

    // Send activation email only for REACTIVATIONS (e.g., user was hold/inactive and comes back)
    // New subscriptions are handled by checkout.session.completed (logged-in) or link-customer (guest)
    const isReactivation = userStatus === 'active' && (previousStatus === 'hold' || previousStatus === 'inactive');
    if (isReactivation && user.email) {
      sendEmail(user.email, 'subscription_activated', {
        firstName: user.firstName || 'Estudiante',
        planName: planName || subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1),
        dashboardUrl: `${process.env.APP_URL || 'https://cogniboost.co'}/dashboard`,
      }).then(() => {
        console.log(`[Webhook] Reactivation email sent to ${user.email} for plan ${planName}`);
      }).catch(err => console.error('[Webhook] Failed to send reactivation email:', err));
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
