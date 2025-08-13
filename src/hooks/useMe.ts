import { useEffect, useState } from 'react';

export interface Me {
  id: string;
  display_name?: string | null;
  app_user_id?: string | null;
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch('/auth/me', { credentials: 'include' });
        if (!r.ok) throw new Error('not_authenticated');
        const j = await r.json();
        if (!mounted) return;
        setMe(j as Me);
      } catch (e: any) {
        if (mounted) setError(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { me, loading, error };
}


