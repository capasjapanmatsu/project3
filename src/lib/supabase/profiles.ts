import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Ensure a minimal profile row exists for the current user.
 * Creates { id: user.id, auth_type: 'line' | 'email' } if not present.
 * Does not overwrite user-provided fields.
 */
export async function ensureMinimalProfile(
  supabase: SupabaseClient,
  user: User | null | undefined,
  inferredAuthType?: 'line' | 'email'
): Promise<void> {
  if (!user?.id) return;
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, auth_type')
      .eq('id', user.id as any)
      .maybeSingle();

    if (existing?.id) return; // already exists

    // Infer provider -> auth_type
    let authType: 'line' | 'email' = inferredAuthType ?? 'email';
    const providers: string[] = (user.app_metadata as any)?.providers ?? [];
    if (providers.includes('line')) authType = 'line';

    await supabase.from('profiles').insert({ id: user.id, auth_type: authType } as any);
  } catch (e) {
    // Non-fatal; log quietly
    console.warn('ensureMinimalProfile failed:', e);
  }
}


