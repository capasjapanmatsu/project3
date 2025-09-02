import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Ensure a minimal profile row exists for the current user.
 * Creates { id: user.id, auth_type: 'line' | 'email' } if not present.
 * Does not overwrite user-provided fields.
 */
export async function ensureMinimalProfile(
  supabase: SupabaseClient,
  user: User | null | undefined,
  _inferredAuthType?: 'line' | 'email'
): Promise<void> {
  if (!user?.id) return;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id as any)
      .maybeSingle();

    if (existing?.id) return; // already exists

    // Insert minimal row with required defaults to satisfy NOT NULL constraints in production
    await supabase.from('profiles').insert({ id: user.id, user_type: 'user' } as any);
  } catch (e) {
    // Non-fatal; log quietly
    console.warn('ensureMinimalProfile failed:', e);
  }
}


