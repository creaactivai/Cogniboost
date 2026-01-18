import { getStripeSync } from './stripeClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

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

    let userStatus: 'active' | 'hold' | 'inactive' = 'active';
    
    if (status === 'active' || status === 'trialing') {
      userStatus = 'active';
    } else if (status === 'past_due' || status === 'unpaid') {
      userStatus = 'hold';
    } else if (status === 'canceled' || status === 'incomplete_expired') {
      userStatus = 'inactive';
    }

    await db.update(users).set({
      stripeSubscriptionId: subscriptionId,
      status: userStatus,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
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
