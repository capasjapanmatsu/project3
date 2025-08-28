import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import Stripe from 'npm:stripe@17.7.0';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const requestData = await req.json();
    const { price_id, success_url, cancel_url, mode, custom_amount, custom_name, cart_items, reservation_data, trial_period_days, points_use, subscription, ...customParams } = requestData;

    if (!success_url || !cancel_url || !mode) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    if (mode !== 'payment' && mode !== 'subscription') {
      return corsResponse({ error: 'Invalid mode. Must be "payment" or "subscription"' }, 400);
    }

    // Validate URLs (Stripeは完全URLを要求)
    const isValidUrl = (value: string): boolean => {
      try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

    if (!isValidUrl(success_url)) {
      return corsResponse({ error: 'Invalid success_url' }, 400);
    }
    if (!isValidUrl(cancel_url)) {
      return corsResponse({ error: 'Invalid cancel_url' }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    // Get or create Stripe customer
    let customerId: string;
    
    // Check if customer already exists
    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    if (!customer || !customer.customer_id) {
      // Create new customer in Stripe
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      console.log(`Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      // Save customer in database
      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer information in the database', createCustomerError);
        
        // Try to clean up the Stripe customer
        try {
          await stripe.customers.del(newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to delete Stripe customer after database error:', deleteError);
        }
        
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      customerId = newCustomer.id;
      
      // For subscription mode, create a subscription record
      if (mode === 'subscription') {
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('Failed to save subscription in the database', createSubscriptionError);
          return corsResponse({ error: 'Unable to save the subscription in the database' }, 500);
        }
      }
    } else {
      customerId = customer.customer_id;
      
      // For subscription mode, check if subscription record exists
      if (mode === 'subscription') {
        // Verify subscription exists for existing customer
        const { data: subscription, error: getSubscriptionError } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('Failed to fetch subscription information from the database', getSubscriptionError);
          return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
        }

        if (!subscription) {
          // Create subscription record for existing customer if missing
          const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });

          if (createSubscriptionError) {
            console.error('Failed to create subscription record for existing customer', createSubscriptionError);
            return corsResponse({ error: 'Failed to create subscription record for existing customer' }, 500);
          }
        }
      }
    }

    // Get saved payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Create checkout session parameters
    // Stripe metadataはstringのみ許容
    const metadata: Record<string, string> = {};
    Object.entries(customParams || {}).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      metadata[k] = String(v);
    });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: mode as 'payment' | 'subscription',
      success_url,
      cancel_url,
      metadata,
    };

    // サブスクリプションモードの場合、トライアル期間を設定
    if (mode === 'subscription' && trial_period_days && trial_period_days > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trial_period_days,
      };
    }

    // If the customer has saved payment methods, use them
    if (paymentMethods.data.length > 0) {
      // Find the default payment method (if any)
      const { data: paymentCards, error: paymentCardsError } = await supabase
        .from('payment_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .maybeSingle();

      if (!paymentCardsError && paymentCards) {
        // If there's a default payment method, try to find it in Stripe
        const defaultMethod = paymentMethods.data.find(
          method => method.card?.last4 === paymentCards.card_number_masked.slice(-4)
        );
        
        if (defaultMethod) {
          sessionParams.payment_method = defaultMethod.id;
        }
      }
    }

    // Handle line items based on mode and custom parameters
    if (mode === 'subscription') {
      let effectivePriceId = price_id;
      // price_id が未指定なら動的にStripe価格を作成
      if (!effectivePriceId && subscription && typeof subscription === 'object') {
        const name = String(subscription.name ?? '定期購入');
        const unit_price = Number(subscription.unit_price ?? 0);
        const interval_months = Number(subscription.interval_months ?? subscription.interval ?? 1);
        if (!unit_price || unit_price <= 0) {
          return corsResponse({ error: 'unit_price is required for dynamic price' }, 400);
        }

        // Stripe Product 作成（または再利用）
        const product = await stripe.products.create({
          name,
        });
        const interval = interval_months === 3 ? 'month' : interval_months === 12 ? 'year' : 'month';
        const interval_count = interval_months === 12 ? 1 : interval_months; // 12ヶ月はyear×1で表現
        const price = await stripe.prices.create({
          currency: 'jpy',
          unit_amount: unit_price,
          recurring: {
            interval: interval as 'day' | 'week' | 'month' | 'year',
            interval_count,
          },
          product: product.id,
        });
        effectivePriceId = price.id;
      }

      if (!effectivePriceId) {
        return corsResponse({ error: 'price_id or subscription details are required for subscription' }, 400);
      }

      sessionParams.line_items = [
        {
          price: effectivePriceId,
          quantity: 1,
        },
      ];
      // 管理用途のメタデータ
      if (subscription && typeof subscription === 'object') {
        sessionParams.metadata = {
          ...sessionParams.metadata,
          sub_product_id: String(subscription.product_id ?? ''),
          sub_option_id: String(subscription.option_id ?? ''),
          sub_interval: String(subscription.interval ?? ''),
          sub_unit_price: String(subscription.unit_price ?? ''),
        } as Record<string, string>;
      }
    } else if (mode === 'payment') {
      if (custom_amount && custom_name) {
        // 施設貸し切りなどのカスタム金額の場合
        sessionParams.line_items = [
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: custom_name,
              },
              unit_amount: custom_amount,
            },
            quantity: 1,
          },
        ];
      } else if (cart_items && cart_items.length > 0) {
        // カート商品の場合は動的価格で処理
        // カート内の商品情報を取得
        const { data: cartData, error: cartError } = await supabase
          .from('cart_items')
          .select(`
            id,
            quantity,
            product:products(id, name, price, image_url)
          `)
          .in('id', cart_items)
          .eq('user_id', user.id);

        if (cartError) {
          console.error('Failed to fetch cart items', cartError);
          return corsResponse({ error: 'Failed to fetch cart items' }, 500);
        }

        if (!cartData || cartData.length === 0) {
          return corsResponse({ error: 'No cart items found' }, 400);
        }

        // サブスクリプション会員かどうかを確認
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('stripe_user_subscriptions')
          .select('status')
          .maybeSingle();

        const hasSubscription = !subscriptionError && 
                               subscriptionData && 
                               (subscriptionData.status === 'active' || 
                                subscriptionData.status === 'trialing');

        // 送料を計算
        let shippingFee = 690; // デフォルト送料
        const subtotal = cartData.reduce((sum, item) => {
          const price = hasSubscription 
            ? Math.round(item.product.price * 0.9) // サブスク会員は10%オフ
            : item.product.price;
          return sum + (price * item.quantity);
        }, 0);

        // 5000円以上またはサブスク会員は送料無料
        if (subtotal >= 5000 || hasSubscription) {
          shippingFee = 0;
        }

        // 商品ごとの行アイテムを作成
        const getFirstImageUrl = (imageData?: string | null): string | undefined => {
          if (!imageData) return undefined;
          try {
            const parsed = JSON.parse(imageData);
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
              const url = parsed[0] as string;
              return url.startsWith('http://') || url.startsWith('https://') ? url : undefined;
            }
          } catch {
            // not JSON, treat as plain URL
            if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
              return imageData;
            }
          }
          return undefined;
        };

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cartData.map(item => {
          const price = hasSubscription 
            ? Math.round(item.product.price * 0.9) // サブスク会員は10%オフ
            : item.product.price;
          const firstImage = getFirstImageUrl(item.product.image_url as unknown as string);
          
          return {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: item.product.name,
                images: firstImage ? [firstImage] : undefined,
              },
              unit_amount: price,
            },
            quantity: item.quantity,
          };
        });

        // 送料を追加（送料がある場合のみ）
        if (shippingFee > 0) {
          lineItems.push({
            price_data: {
              currency: 'jpy',
              product_data: {
                name: '送料',
              },
              unit_amount: shippingFee,
            },
            quantity: 1,
          });
        }

        sessionParams.line_items = lineItems;
      } else if (reservation_data) {
        // 予約データがある場合（ドッグラン1日券）
        try {
          // 予約データをパース
          const reservationInfo = typeof reservation_data === 'string' 
            ? JSON.parse(reservation_data) 
            : reservation_data;
          
          // 選択された犬の数を取得
          const dogCount = reservationInfo.selectedDogs?.length || 0;
          
          // 段階的料金を計算
          let totalAmount = 0;
          if (dogCount > 0) {
            // 1頭目: 800円
            totalAmount += 800;
            
            // 2頭目以降: 各400円
            if (dogCount > 1) {
              totalAmount += (dogCount - 1) * 400;
            }
          }
          
          // 料金が0円以上の場合のみ
          if (totalAmount > 0) {
            sessionParams.line_items = [
              {
                price_data: {
                  currency: 'jpy',
                  product_data: {
                    name: `ドッグラン1日券 (${dogCount}頭)`,
                  },
                  unit_amount: totalAmount,
                },
                quantity: 1,
              },
            ];
          } else {
            // デフォルトの1日券
            sessionParams.line_items = [
              {
                price: price_id || 'price_1Ra8ZvAHWLDQ7ynZQnuailVL', // 1日券
                quantity: 1,
              },
            ];
          }
        } catch (error) {
          console.error('Error parsing reservation data:', error);
          // エラーが発生した場合はデフォルトの1日券を使用
          sessionParams.line_items = [
            {
              price: price_id || 'price_1Ra8ZvAHWLDQ7ynZQnuailVL', // 1日券
              quantity: 1,
            },
          ];
        }
      } else {
        // 1日券などの固定価格商品
        sessionParams.line_items = [
          {
            price: price_id || 'price_1Ra8ZvAHWLDQ7ynZQnuailVL', // 1日券
            quantity: 1,
          },
        ];
      }
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);

    // Return the session ID and URL
    return corsResponse({ 
      sessionId: session.id, 
      url: session.url,
      points_use: points_use || 0,
    });
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    return corsResponse({ error: (error as Error).message }, 500);
  }
});