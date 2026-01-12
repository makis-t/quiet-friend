import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { adminDb as db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // 1) Checkout completed -> we mark user as Pro (start)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      if (userId) {
        await db.collection("users").doc(userId).set(
          {
            isPro: true,
            subscriptionStatus: "active",
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            proSince: new Date(),
          },
          { merge: true }
        );
      }
    }

    // 2) Subscription updates -> keep status in sync
    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const status = sub.status; // active, canceled, past_due, etc.
      const isPro = status === "active" || status === "trialing";

      const subscriptionId = sub.id;
      const customerId = typeof sub.customer === "string" ? sub.customer : null;

      // Find user by stripeSubscriptionId
      const q = await db
        .collection("users")
        .where("stripeSubscriptionId", "==", subscriptionId)
        .limit(1)
        .get();

      if (!q.empty) {
        const doc = q.docs[0];
        await doc.ref.set(
          {
            isPro,
            subscriptionStatus: status,
            stripeCustomerId: customerId,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
          { merge: true }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
