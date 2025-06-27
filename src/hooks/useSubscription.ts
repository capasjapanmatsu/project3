import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

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

      // Query the stripe_user_subscriptions view
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSubscription(data);
        setIsPaused(data.status === 'paused');
      } else {
        setSubscription(null);
        setIsPaused(false);
      }
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message || 'サブスクリプション情報の取得に失敗しました');
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
    currentPeriodEnd: formatDate(subscription?.current_period_end),
    currentPeriodStart: formatDate(subscription?.current_period_start),
    paymentMethod: subscription?.payment_method_last4 
      ? `${subscription.payment_method_brand} **** ${subscription.payment_method_last4}`
      : null,
    willCancel: subscription?.cancel_at_period_end,
  };
}