import useAuth from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';
import { useEffect, useMemo, useState } from 'react';

export type PremiumState = 'loading' | 'active' | 'inactive' | 'error';

/**
 * Check if current owner has active premium subscription. Falls back to false if not owner.
 * - Relies on view or table: user_subscriptions with fields: user_id, status ('active'|'canceled'...), product_key
 * - We treat product_key === 'premium_owner' OR price_id === VITE_PREMIUM_OWNER_PRICE_ID as premium
 */
export function usePremiumOwner() {
  const { user } = useAuth();
  const [state, setState] = useState<PremiumState>('loading');
  const [error, setError] = useState<string>('');

  const priceId = import.meta.env.VITE_PREMIUM_OWNER_PRICE_ID as string | undefined;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user) {
          if (mounted) setState('inactive');
          return;
        }
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select('status, product_key, price_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const isActive = !!data && data.status === 'active' && (
          (data as any).product_key === 'premium_owner' || (!!priceId && (data as any).price_id === priceId)
        );
        if (!mounted) return;
        setState(isActive ? 'active' : 'inactive');
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'failed to load');
        setState('error');
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const isActive = useMemo(() => state === 'active', [state]);
  return { state, isActive, error } as const;
}


