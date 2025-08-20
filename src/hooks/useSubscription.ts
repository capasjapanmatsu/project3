import { useEffect, useState } from 'react';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface Subscription {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  status: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);


  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
      setIsPaused(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // ビュー stripe_user_subscriptions は auth.uid() でフィルタされる
      // 取得できない環境でも落ちないよう最小列で取得
      let { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('customer_id, subscription_id, status, price_id, current_period_start, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4')
        .maybeSingle();
      if (error || !data) {
        // フォールバック: customers→subscriptions 直接参照
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .maybeSingle();
        if (customer?.customer_id) {
          const { data: sub } = await supabase
            .from('stripe_subscriptions')
            .select('customer_id, subscription_id, status, price_id, current_period_start, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4')
            .eq('customer_id', customer.customer_id)
            .maybeSingle();
          if (sub) {
            setSubscription(sub as any);
            setIsPaused(sub.status === 'paused');
            return;
          }
        }
        setSubscription(null);
        setIsPaused(false);
      } else {
        setSubscription(data);
        setIsPaused(data.status === 'paused');
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError((err as Error).message || 'サブスクリプションの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const isActive = subscription?.status === 'active' || 
                  subscription?.status === 'trialing';

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return null;
    return new Date(timestamp * 1000).toLocaleDateString('ja-JP');
  };

  return {
    subscription,
    isActive,
    isPaused,
    loading,
    error,
    refresh: fetchSubscription,
    currentPeriodEnd: formatDate(subscription?.current_period_end ?? null),
    currentPeriodStart: formatDate(subscription?.current_period_start ?? null),
    paymentMethod: subscription?.payment_method_last4 
      ? `${subscription.payment_method_brand} **** ${subscription.payment_method_last4}`
      : null,
    willCancel: subscription?.cancel_at_period_end,
  };
}