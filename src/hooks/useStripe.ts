import { useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { loadStripe } from '@stripe/stripe-js';

interface CheckoutParams {
  priceId?: string;
  mode: 'payment' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
  customAmount?: number;
  customName?: string;
  customParams?: Record<string, unknown>;
  cartItems?: string[];
}



export function useStripe() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = useCallback(async ({
    priceId,
    mode,
    successUrl = `${window.location.origin}/payment-confirmation?success=true`,
    cancelUrl = `${window.location.origin}/payment-confirmation?canceled=true`,
    customAmount,
    customName,
    customParams,
    cartItems,
  }: CheckoutParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      // 決済前に認証状態を保存
      localStorage.setItem('pre_payment_auth_state', JSON.stringify({
        user_id: session.user.id,
        user_email: session.user.email,
        timestamp: Date.now(),
        return_url: window.location.href
      }));

      const requestBody: Record<string, unknown> = {
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
      };

      // priceIdが指定されている場合は追加
      if (priceId) {
        requestBody.price_id = priceId;
      }

      // Add custom amount and name if provided (for facility rental)
      if (customAmount && customName) {
        requestBody.custom_amount = customAmount;
        requestBody.custom_name = customName;
      }
      
      // Add cart items if provided
      if (cartItems && cartItems.length > 0) {
        requestBody.cart_items = cartItems;
      }
      
      // Add any additional custom parameters
      if (customParams) {
        Object.entries(customParams).forEach(([key, value]) => {
          requestBody[key] = value;
        });
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'チェックアウトセッションの作成に失敗しました');
      }

      const { sessionId, url } = await response.json();
      
      if (url) {
        // Redirect directly to the URL if provided
        window.location.href = url;
        return;
      } else if (sessionId) {
        // Stripe.jsをロード
        const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        if (!stripePublicKey) {
          throw new Error('Stripe公開キーが設定されていません');
        }
        
        const stripe = await loadStripe(stripePublicKey);
        if (!stripe) {
          throw new Error('Stripeの読み込みに失敗しました');
        }
        
        // Stripeチェックアウトにリダイレクト
        const { error: redirectError } = await stripe.redirectToCheckout({
          sessionId
        });
        
        if (redirectError) {
          throw redirectError;
        }
      } else {
        throw new Error('チェックアウトURLが取得できませんでした');
      }
    } catch (err) {
      setError((err as Error).message || 'チェックアウトに失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createCheckoutSession,
    loading,
    error,
  };
}