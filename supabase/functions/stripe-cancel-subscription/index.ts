import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    // 受信ボディ（任意）。subscription_id が指定されている場合はそれを優先的に使用
    let requestedSubscriptionId: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.subscription_id === 'string' && body.subscription_id.trim().length > 0) {
        requestedSubscriptionId = body.subscription_id.trim();
      }
    } catch (_) {
      // ignore JSON parse errors; body is optional
    }
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

    // Get the customer ID for the user
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
      return corsResponse({ error: 'No subscription found for this user' }, 404);
    }

    // Determine target subscription id
    let targetSubscriptionId: string | undefined = requestedSubscriptionId;
    if (!targetSubscriptionId) {
      // Find latest active/trialing/paused subscription for the customer
      const { data: sub, error: getSubErr } = await supabase
        .from('stripe_subscriptions')
        .select('subscription_id, status, created_at')
        .eq('customer_id', customer.customer_id)
        .in('status', ['active', 'trialing', 'paused'] as any)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (getSubErr) {
        console.error('Failed to fetch subscription information from the database', getSubErr);
        return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
      }
      if (!sub || !sub.subscription_id) {
        return corsResponse({ error: 'No active subscription found for this user' }, 404);
      }
      if (sub.status === 'canceled') {
        return corsResponse({ message: 'Subscription is already canceled' });
      }
      targetSubscriptionId = sub.subscription_id as string;
    }

    // Cancel the subscription at the end of the current period
    await stripe.subscriptions.update(targetSubscriptionId!, {
      cancel_at_period_end: true,
    });

    // Update the subscription in the database
    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', targetSubscriptionId!);

    if (updateError) {
      console.error('Failed to update subscription in the database', updateError);
      return corsResponse({ error: 'Failed to update subscription in the database' }, 500);
    }

    return corsResponse({ message: 'Subscription will be canceled at the end of the current period', subscription_id: targetSubscriptionId });
  } catch (error: unknown) {
    console.error(`Subscription cancellation error: ${(error as Error).message}`);
    return corsResponse({ error: (error as Error).message }, 500);
  }
});