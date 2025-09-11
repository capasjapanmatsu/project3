import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@17.7.0';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: unknown) {
      console.error('Webhook signature verification failed:', error);
      return corsResponse({ error: (error as Error).message }, 400);
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    return corsResponse({ error: (error as Error).message }, 500);
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
      // When a new subscription is created, create a pseudo order for admin visibility
      try {
        const session = stripeData as Stripe.Checkout.Session;
        const { data: customerMap } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .maybeSingle();
        if (customerMap?.user_id) {
          const amount_total = (session.amount_total ?? 0) / 100;
          const { error: orderErr } = await supabase.from('orders').insert({
            user_id: customerMap.user_id,
            order_number: `SUB${Date.now()}`,
            status: 'confirmed',
            payment_method: 'credit_card',
            payment_status: 'completed',
            total_amount: amount_total,
            final_amount: amount_total,
            is_subscription: true,
            subscription_id: (session.subscription as string) || null,
          });
          if (orderErr) console.error('Failed to insert subscription order:', orderErr);

          // Notify user (App notification + LINE)
          try {
            const notes = (session.metadata?.notes as string) || '';
            const isPremiumOwner = /premium_owner/i.test(notes);
            const title = isPremiumOwner ? 'プレミアムオーナー登録が完了しました' : 'サブスクリプションの登録が完了しました';
            const message = isPremiumOwner
              ? '予約管理・クーポン管理（プレミアム）がご利用いただけます。'
              : 'サブスクリプションが開始されました。ご利用ありがとうございます。';
            await supabase.from('notifications').insert({
              user_id: customerMap.user_id,
              type: 'order',
              title,
              message,
              link_url: isPremiumOwner ? `${Deno.env.get('PUBLIC_SITE_URL') ?? ''}/my-facilities-management` : `${Deno.env.get('PUBLIC_SITE_URL') ?? ''}/dashboard`,
              data: {
                mode: 'subscription',
                subscription_id: session.subscription || null,
              },
              read: false,
            });

            // LINE通知（Netlify Functions 経由）
            try {
              const base = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://dogparkjp.com';
              await fetch(`${base}/.netlify/functions/line-notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: customerMap.user_id,
                  kind: 'alert',
                  title,
                  message,
                  linkUrl: isPremiumOwner ? `${base}/my-facilities-management` : `${base}/dashboard`,
                })
              });
            } catch (e) {
              console.error('Failed to send LINE notification for subscription:', e);
            }
          } catch (notifyErr) {
            console.error('Failed to insert subscription notification:', notifyErr);
          }
        }
      } catch (e) {
        console.error('Error creating subscription order record:', e);
      }
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);

        // Also create a minimal entry in orders for user history/admin views
        try {
          // Lookup app user_id from stripe_customers
          const { data: customerMap2 } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .maybeSingle();

          if (customerMap2?.user_id) {
            const orderNumber = `SP${Date.now()}`;
            const totalYen = typeof amount_subtotal === 'number' ? Math.round(amount_subtotal / 100) : 0;
            const finalYen = typeof amount_total === 'number' ? Math.round(amount_total / 100) : totalYen;
            await supabase.from('orders').insert({
              user_id: customerMap2.user_id,
              order_number: orderNumber,
              status: 'confirmed',
              total_amount: totalYen,
              discount_amount: 0,
              shipping_fee: 0,
              final_amount: finalYen,
              shipping_address: '-',
              shipping_postal_code: '-',
              shipping_phone: '-',
              shipping_name: 'オンライン決済',
              payment_method: 'credit_card',
              payment_status: 'completed',
              notes: 'Stripe決済(簡易記録)'
            });
          }
        } catch (e) {
          console.error('Failed to create orders snapshot for history:', e);
        }

        // Handle point usage (deduct) and award 10% back for shop purchases
        try {
          // Lookup app user_id from stripe_customers
          const { data: customerMap } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .maybeSingle();

          if (customerMap?.user_id) {
            // Deduct points if used (embedded in metadata by checkout function)
            const checkout = stripeData as Stripe.Checkout.Session;
            const usedPointsRaw = (checkout.metadata?.points_use as string) || '0';
            const usedPoints = Math.max(0, parseInt(usedPointsRaw, 10) || 0);
            if (usedPoints > 0) {
              await supabase.rpc('rpc_use_points', {
                p_user: customerMap.user_id,
                p_points: usedPoints,
                p_reference: 'order',
                p_reference_id: checkout_session_id,
              });
            }

            if (typeof amount_total === 'number') {
              const points = Math.round((amount_total / 100) * 0.10); // amount_total in yen
              if (points > 0) {
                await supabase.rpc('fn_add_points', {
                  p_user: customerMap.user_id,
                  p_points: points,
                  p_entry_type: 'earn',
                  p_source: 'shop',
                  p_description: 'ショップ購入10%還元',
                  p_reference: 'stripe_checkout',
                  p_reference_id: checkout_session_id,
                });
              }
            }

            // Notify user (App notification + LINE)
            try {
              const title = 'お支払いが完了しました';
              const message = 'ご注文の決済が完了しました。ご利用ありがとうございます。';
              await supabase.from('notifications').insert({
                user_id: customerMap.user_id,
                type: 'order',
                title,
                message,
                link_url: `${Deno.env.get('PUBLIC_SITE_URL') ?? ''}/dashboard`,
                data: {
                  mode: 'payment',
                  checkout_session_id,
                  amount_total,
                },
                read: false,
              });

              // LINE通知（Netlify Functions 経由）
              try {
                const base = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://dogparkjp.com';
                await fetch(`${base}/.netlify/functions/line-notify`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: customerMap.user_id,
                    kind: 'alert',
                    title,
                    message,
                    linkUrl: `${base}/dashboard`,
                  })
                });
              } catch (e) {
                console.error('Failed to send LINE notification for payment:', e);
              }
            } catch (notifyErr) {
              console.error('Failed to insert payment notification:', notifyErr);
            }
          }
        } catch (pointsError) {
          console.error('Failed to award shop points:', pointsError);
        }
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}