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
    const { price_id, success_url, cancel_url, mode, custom_amount, custom_name, cart_items, reservation_data, trial_period_days, points_use, subscription, payment_method = 'card', ...customParams } = requestData;

    if (!success_url || !cancel_url || !mode) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    if (mode !== 'payment' && mode !== 'subscription') {
      return corsResponse({ error: 'Invalid mode. Must be "payment" or "subscription"' }, 400);
    }

    // Validate URLs (Stripeは完全URLを要求)
    const isValidUrl = (value: string): boolean => {
      try {
        const u = new URL(String(value).trim());
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

    // 正規化 + localhost の場合は公開ドメインへフォールバック
    const PUBLIC_BASE_URL = Deno.env.get('PUBLIC_BASE_URL') || 'https://dogparkjp.com';
    const normalizeUrl = (value: string, fallbackPath: string): string => {
      try {
        const url = new URL(String(value).trim());
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          return `${PUBLIC_BASE_URL}${fallbackPath}`;
        }
        return url.href;
      } catch {
        return `${PUBLIC_BASE_URL}${fallbackPath}`;
      }
    };

    const addSessionPlaceholder = (url: string): string => {
      try {
        const u = new URL(url);
        if (!u.searchParams.has('session_id')) {
          u.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
        }
        return u.toString();
      } catch {
        return url;
      }
    };

    const BASE = (Deno.env.get('PUBLIC_BASE_URL') || 'https://dogparkjp.com').trim();
    // 入力に依存せず常に安全なURLを使用
    const normalizedSuccessUrl = `${BASE}/payment-confirmation?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const normalizedCancelUrl = `${BASE}/payment-confirmation?canceled=true`;

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
      success_url: normalizedSuccessUrl,
      cancel_url: normalizedCancelUrl,
      metadata,
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['JP'] },
      customer_update: { address: 'auto', name: 'auto', shipping: 'auto', email: 'auto' },
    };

    // 注意: customer と customer_email は同時に指定不可。
    // 現在は必ず customerId を使用するため、customer_email は設定しない。

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

    // 支払い手段の切替（モード: payment のみ）
    if (mode === 'payment') {
      if (payment_method === 'konbini') {
        sessionParams.payment_method_types = ['konbini'];
      } else if (payment_method === 'bank_transfer') {
        sessionParams.payment_method_types = ['customer_balance'];
        sessionParams.payment_intent_data = {
          ...(sessionParams.payment_intent_data || {}),
          setup_future_usage: 'off_session',
        };
        (sessionParams as any).payment_method_options = {
          customer_balance: {
            funding_type: 'bank_transfer',
            bank_transfer: { type: 'jp_bank_transfer' },
          },
        };
      } else {
        sessionParams.payment_method_types = ['card'];
      }
    }

    // サブスクの二重購入を防止（プレミアム会員/ドッグランのサブスク想定）
    if (mode === 'subscription') {
      const { data: existingSub } = await supabase
        .from('stripe_subscriptions')
        .select('status')
        .eq('customer_id', customerId)
        .maybeSingle();
      const blockingStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
      if (existingSub && blockingStatuses.includes((existingSub as any).status)) {
        return corsResponse({ error: 'すでに有効なサブスクリプションがあります。解約または期限終了後に再度お試しください。' }, 409);
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
        let hasSubscription = false;
        try {
          // 1) ビュー（存在すれば）からcustomer_id経由で参照
          const { data: vSub } = await supabase
            .from('stripe_user_subscriptions')
            .select('status, customer_id')
            .eq('customer_id', customerId)
            .maybeSingle();
          if (vSub && (vSub.status === 'active' || vSub.status === 'trialing')) {
            hasSubscription = true;
          }
        } catch {}

        if (!hasSubscription) {
          // 2) 直接テーブルで確認
          const { data: tSub } = await supabase
            .from('stripe_subscriptions')
            .select('status')
            .eq('customer_id', customerId)
            .maybeSingle();
          if (tSub && (tSub.status === 'active' || tSub.status === 'trialing')) {
            hasSubscription = true;
          }
        }

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
        const orderItems: Array<{ product_id: string; name: string; quantity: number; unit_price: number; image_url?: string }>=[];
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cartData.map(item => {
          const price = hasSubscription 
            ? Math.round(item.product.price * 0.9) // サブスク会員は10%オフ
            : item.product.price;
          orderItems.push({
            product_id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            unit_price: price,
            image_url: item.product.image_url || undefined,
          });
          
          return {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: item.product.name,
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
        sessionParams.metadata = {
          ...(sessionParams.metadata || {}),
          order_items: JSON.stringify(orderItems),
        } as Record<string,string>;
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

    // ポイント利用: 合計に直接反映（line_itemsの単価を調整）
    const pointsToUse = Number(points_use || 0) || 0;
    if (pointsToUse > 0 && (sessionParams.line_items || []).length > 0) {
      sessionParams.metadata = {
        ...(sessionParams.metadata || {}),
        points_use: String(pointsToUse),
      } as Record<string, string>;

      const items = (sessionParams.line_items as Stripe.Checkout.SessionCreateParams.LineItem[]) || [];
      // 小計算出
      const subtotal = items.reduce((sum, li) => {
        // @ts-ignore
        const unit = li.price_data?.unit_amount || 0;
        const qty = li.quantity || 1;
        return sum + (unit * qty);
      }, 0);
      let remaining = Math.max(0, Math.min(pointsToUse, subtotal));

      // 先頭のprice_dataを優先して差し引き（1商品想定だが複数でも順に適用）
      for (const li of items) {
        if (remaining <= 0) break;
        // @ts-ignore
        if (!li.price_data?.unit_amount) continue;
        // @ts-ignore
        const unit: number = li.price_data.unit_amount;
        const qty: number = li.quantity || 1;
        const lineTotal = unit * qty;
        const reduce = Math.min(remaining, lineTotal);
        const newLineTotal = lineTotal - reduce;
        const newUnit = Math.floor(newLineTotal / qty);
        // @ts-ignore
        li.price_data.unit_amount = Math.max(0, newUnit);
        remaining -= reduce;
      }
    }

    // Stripeの最小決済額（JPY=¥50）を事前チェック
    if (mode === 'payment' && (sessionParams.line_items || []).length > 0) {
      const calcTotal = () => {
        let total = 0;
        for (const li of (sessionParams.line_items as any[])) {
          const unit = li?.price_data?.unit_amount || 0;
          const qty = li?.quantity || 1;
          total += unit * qty;
        }
        return total;
      };
      const totalAfterAdjust = calcTotal();
      if (totalAfterAdjust > 0 && totalAfterAdjust <= 50) {
        return corsResponse({
          error: '合計が¥51以上必要です。ポイント利用を減らすか、数量を増やしてください。'
        }, 400);
      }
    }

    // 念のための安全策: 衝突する可能性のあるフィールドを確実に除去
    delete (sessionParams as any).customer_email;
    delete (sessionParams as any).customer_creation;

    // Create the checkout session
    let session: Stripe.Checkout.Session;
    try {
      console.log('Creating Checkout Session with URLs:', {
        success_url: sessionParams.success_url,
        cancel_url: sessionParams.cancel_url,
      });
      console.log('Checkout mode and line items:', {
        mode: sessionParams.mode,
        line_items_count: (sessionParams.line_items || []).length,
      });
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (e) {
      const message = (e as Error).message || '';
      console.error('Stripe create session failed:', message);
      if (message.toLowerCase().includes('not a valid url')) {
        // Retry with minimal required params and ultra-simple URLs
        const fallbackParams: Stripe.Checkout.SessionCreateParams = {
          customer: customerId,
          mode: mode as 'payment' | 'subscription',
          success_url: `${BASE}/payment-confirmation?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${BASE}/payment-confirmation?canceled=true`,
          line_items: sessionParams.line_items,
        };
        console.log('Retrying Checkout Session with fallback URLs');
        session = await stripe.checkout.sessions.create(fallbackParams);
      } else {
        throw e;
      }
    }

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);

    // Return the session ID and URL
    return corsResponse({ 
      sessionId: session.id, 
      url: session.url,
      points_use: points_use || 0,
    });
  } catch (error: unknown) {
    const err: any = error;
    console.error('Error creating checkout session:', err?.message || err);
    return corsResponse({ 
      error: (err?.message as string) || 'Unknown error',
      type: err?.type || null,
      param: err?.param || null
    }, 500);
  }
});