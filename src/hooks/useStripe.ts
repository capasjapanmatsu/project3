import { loadStripe } from '@stripe/stripe-js';
import { useCallback, useState } from 'react';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface CheckoutParams {
  priceId?: string;
  mode: 'payment' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
  customAmount?: number;
  customName?: string;
  customParams?: Record<string, unknown>;
  cartItems?: string[];
  trialPeriodDays?: number; // 初月無料のためのトライアル期間（日数）
}



export function useStripe() {
  const { user, lineUser, effectiveUserId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // LINEログイン時にSupabaseセッションを確実に用意
  const ensureSupabaseSession = useCallback(async (): Promise<void> => {
    const { data: { user: sbUser } } = await supabase.auth.getUser();
    if (sbUser) return;
    if (!lineUser && !effectiveUserId) return;
    try {
      const resp = await fetch('/line/exchange-supabase-session', {
        method: 'POST',
        credentials: 'include'
      });
      if (!resp.ok) return;
      const { access_token, refresh_token } = await resp.json() as { access_token: string; refresh_token: string };
      await supabase.auth.setSession({ access_token, refresh_token });
    } catch {}
  }, [lineUser, effectiveUserId]);

  const createCheckoutSession = useCallback(async ({
    priceId,
    mode,
    successUrl = `${window.location.origin}/payment-confirmation?success=true`,
    cancelUrl = `${window.location.origin}/payment-confirmation?canceled=true`,
    customAmount,
    customName,
    customParams,
    cartItems,
    trialPeriodDays,
  }: CheckoutParams) => {
    setLoading(true);
    setError(null);

    try {
      // Supabaseセッションを確実に準備
      await ensureSupabaseSession();
      // ユーザーIDを取得（LINEユーザーとメールユーザー両方対応）
      const uid = user?.id || lineUser?.app_user_id || lineUser?.id || effectiveUserId;
      
      if (!uid) {
        throw new Error('認証が必要です');
      }

      // LINEユーザーの場合、Supabaseセッションがないため、別の方法で認証トークンを取得
      let accessToken: string | undefined;
      let userEmail: string | undefined;
      
      if (user) {
        // メールユーザーの場合
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token;
        userEmail = session?.user.email;
      } else if (lineUser) {
        // LINEユーザーの場合、仮のトークンを使用（Edge Function側で処理）
        // profilesテーブルからユーザー情報を取得
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', uid)
          .single();
        
        userEmail = profile?.email || `line_${lineUser.line_user_id}@line.local`;
        // LINEユーザー用の特殊なトークンを設定
        accessToken = `line_user_${uid}`;
      }
      
      if (!accessToken && !lineUser) {
        throw new Error('認証が必要です');
      }

      // 決済前に認証状態を保存
      localStorage.setItem('pre_payment_auth_state', JSON.stringify({
        user_id: uid,
        user_email: userEmail || '',
        timestamp: Date.now(),
        return_url: window.location.href,
        is_line_user: !!lineUser
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

      // Add trial period for subscriptions (初月無料)
      if (trialPeriodDays && mode === 'subscription') {
        requestBody.trial_period_days = trialPeriodDays;
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

      // LINEユーザーの場合はuser_idをリクエストボディに追加
      if (lineUser) {
        requestBody.user_id = uid;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
  }, [user, lineUser, effectiveUserId]);

  return {
    createCheckoutSession,
    loading,
    error,
  };
}