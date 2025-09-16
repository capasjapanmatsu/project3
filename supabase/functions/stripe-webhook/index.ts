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
          const isJPY = (session.currency || 'jpy').toLowerCase() === 'jpy';
          const amount_total = typeof session.amount_total === 'number'
            ? (isJPY ? session.amount_total : Math.round(session.amount_total / 100))
            : 0;
          const notesMeta = (session.metadata?.notes as string) || '';
          const isPremiumOwner = /premium_owner/i.test(notesMeta);
          const label = isPremiumOwner
            ? '施設オーナー向けプレミアム会員（500円）'
            : 'サブスクリプション（3800円）';
          // プロファイルから氏名・住所・電話を推測
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, address, phone_number, postal_code, email')
            .eq('id', customerMap.user_id)
            .maybeSingle();
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
            shipping_name: profile?.name || profile?.email || customerMap.user_id,
            shipping_postal_code: (profile as any)?.postal_code || '-',
            shipping_address: (profile as any)?.address || '-',
            shipping_phone: (profile as any)?.phone_number || '-',
            notes: label,
          });
          if (orderErr) console.error('Failed to insert subscription order:', orderErr);

          // Notify user (App notification + LINE)
          try {
            const notes = notesMeta;
            const isPremiumOwner = /premium_owner/i.test(notesMeta);
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
        // 詳細（line_items 含む）を取得
        const detailed = await stripe.checkout.sessions.retrieve(
          (stripeData as Stripe.Checkout.Session).id as string,
          { expand: ['line_items.data.price.product'] }
        );
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
          line_items,
          metadata,
          customer_details,
        } = detailed as Stripe.Checkout.Session;

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

        // Also create a minimal entry in orders for user history/admin views（商品名・明細・送料・ポイントを保存）
        try {
          // Lookup app user_id from stripe_customers
          const { data: customerMap2 } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('customer_id', customerId)
            .maybeSingle();

          if (customerMap2?.user_id) {
            const orderNumber = `SP${Date.now()}`;
            const isJPY2 = (currency || 'jpy').toLowerCase() === 'jpy';
            const totalYen = typeof amount_subtotal === 'number'
              ? (isJPY2 ? amount_subtotal : Math.round(amount_subtotal / 100))
              : 0;
            const finalYen = typeof amount_total === 'number'
              ? (isJPY2 ? amount_total : Math.round(amount_total / 100))
              : totalYen;

            // 商品名を抽出
            let itemName = 'オンライン決済';
            let itemThumb: string | null = null;
            let orderItemsMeta: string | null = null;
            let shippingFeeYen = 0;
            const usedPoints = Math.max(0, parseInt(((metadata as any)?.points_use as string) || '0', 10) || 0);
            try {
              const meta: any = (detailed as any).metadata || {};
              if (typeof meta.order_items === 'string') {
                orderItemsMeta = meta.order_items;
              }
            } catch (_) {}
            try {
              const liData = (line_items as any)?.data || [];
              const first = liData?.[0];
              itemName =
                first?.price?.product && typeof first.price.product !== 'string'
                  ? (first.price.product as any).name || first?.description || itemName
                  : first?.description || itemName;
              // サムネイルURL
              if (first?.price?.product && typeof first.price.product !== 'string') {
                const prod: any = first.price.product;
                if (Array.isArray(prod.images) && prod.images.length > 0) {
                  itemThumb = prod.images[0];
                }
              }
              // 送料行（名称が"送料"）を集計
              for (const it of liData) {
                const name = (it?.price?.product && typeof it.price.product !== 'string')
                  ? (it.price.product as any).name || it?.description || ''
                  : it?.description || '';
                if (String(name).includes('送料')) {
                  const unit = (it?.price?.unit_amount ?? 0) as number;
                  const qty = (it?.quantity ?? 1) as number;
                  shippingFeeYen += (isJPY2 ? unit : Math.round(unit / 100)) * qty;
                }
              }
            } catch (_) {}
            const orderInsert = {
              user_id: customerMap2.user_id,
              order_number: orderNumber,
              status: 'confirmed',
              total_amount: totalYen,
              discount_amount: usedPoints,
              shipping_fee: shippingFeeYen,
              final_amount: finalYen,
              shipping_address: customer_details?.address?.line1 || '-',
              shipping_postal_code: customer_details?.address?.postal_code || '-',
              shipping_phone: customer_details?.phone || '-',
              shipping_name: itemName,
              payment_method: 'credit_card',
              payment_status: 'completed',
              notes: orderItemsMeta || itemName,
              // 画像URLをメモに格納（将来のUI表示用。専用カラムが無ければnotesにJSONで付与も可）
              // 今回は簡易に notes にそのまま残し、画像は将来必要であれば別テーブル化
            } as any;

            // 注文を作成しIDを回収
            const { data: createdOrder, error: createOrderErr } = await supabase
              .from('orders')
              .insert(orderInsert)
              .select('id')
              .single();
            if (createOrderErr) throw createOrderErr;

            // 明細を保存（メタデータから）
            try {
              if (orderItemsMeta && createdOrder?.id) {
                const parsed: Array<{ product_id: string; name: string; quantity: number; unit_price: number; image_url?: string }>
                  = JSON.parse(orderItemsMeta);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const rows = parsed.map(it => ({
                    order_id: createdOrder.id,
                    product_id: it.product_id,
                    quantity: it.quantity,
                    unit_price: it.unit_price,
                    total_price: it.unit_price * it.quantity,
                  }));
                  const { error: oiErr } = await supabase.from('order_items').insert(rows);
                  if (oiErr) console.error('Failed to insert order_items:', oiErr);
                }
              }
            } catch (e) {
              console.error('Failed parsing/inserting order_items metadata:', e);
            }
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
              const { error: useErr } = await supabase.rpc('rpc_use_points', {
                p_user: customerMap.user_id,
                p_points: usedPoints,
                p_reference: 'order',
                p_reference_id: checkout_session_id,
              });
              if (useErr) {
                console.error('Failed to deduct points via rpc_use_points:', useErr);
              } else {
                // ordersテーブル側の表示名称を「ポイント利用」に統一
                try {
                  await supabase
                    .from('orders')
                    .update({ discount_label: 'ポイント利用' })
                    .eq('order_number', orderNumber);
                } catch (_) {}
              }
            }

            if (typeof amount_total === 'number') {
              const points = Math.round(amount_total * 0.01); // 1% 還元（JPYは0桁通貨）
              if (points > 0) {
                await supabase.rpc('fn_add_points', {
                  p_user: customerMap.user_id,
                  p_points: points,
                  p_entry_type: 'earn',
                  p_source: 'shop',
                  p_description: 'ショップ購入1%還元',
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

    // 非即時決済（例: コンビニ/銀行振込）の支払い手順保存
    if (event.type === 'checkout.session.completed') {
      try {
        const s = (await stripe.checkout.sessions.retrieve(
          (stripeData as Stripe.Checkout.Session).id as string,
          { expand: ['payment_intent'] }
        )) as any;
        const pmType = s?.payment_method_types?.[0];
        if (pmType === 'konbini' || pmType === 'customer_balance') {
          const pi = s?.payment_intent;
          const next = pi?.next_action;

          let instructions: any = null;
          if (pmType === 'konbini' && next?.konbini_display_details) {
            const d = next.konbini_display_details;
            instructions = {
              type: 'konbini',
              store: d.store || null,
              number: d.number || null,
              expires_at: d.expires_at || null,
            };
          }
          if (pmType === 'customer_balance' && next?.display_bank_transfer_instructions) {
            const d = next.display_bank_transfer_instructions;
            instructions = {
              type: 'jp_bank_transfer',
              bank_name: d.bank_name,
              account_number: d.account_number,
              account_holder_name: d.account_holder_name,
              branch_name: d.bank_branch,
              iban: d.iban || null,
              swift: d.swift || null,
            };
          }

          if (instructions) {
            // 注文スナップショットの作成（未入金）
            const { data: map } = await supabase
              .from('stripe_customers')
              .select('user_id')
              .eq('customer_id', String(s.customer))
              .maybeSingle();
            if (map?.user_id) {
              await supabase.from('orders').insert({
                user_id: map.user_id,
                order_number: `SP${Date.now()}`,
                status: 'pending',
                total_amount: s.amount_subtotal || 0,
                discount_amount: 0,
                shipping_fee: 0,
                final_amount: s.amount_total || 0,
                payment_method: pmType === 'konbini' ? 'konbini' : 'bank_transfer',
                payment_status: 'pending',
                notes: JSON.stringify({ payment_instructions: instructions }),
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to persist async payment instructions:', e);
      }
    }

    // 入金確定/失敗イベントに応じた更新
    if (event.type === 'checkout.session.async_payment_succeeded') {
      try {
        // 注文を確定状態に更新
        // ここでは最も近い pending 注文を final_amount で特定（簡易）
        const s = event.data.object as any;
        const { data: latest } = await supabase
          .from('orders')
          .select('id')
          .eq('payment_status', 'pending')
          .eq('final_amount', s.amount_total || 0)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latest?.id) {
          await supabase
            .from('orders')
            .update({ status: 'confirmed', payment_status: 'completed' })
            .eq('id', latest.id);
        }
      } catch (e) {
        console.error('Failed to update order on async_payment_succeeded:', e);
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