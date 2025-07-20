import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export interface SafeSupabaseResult<T = unknown> {
  data: T | null;
  error: unknown | null;
}

export async function safeSupabaseQuery<T>(
  queryFn: () => PostgrestFilterBuilder<any, any, any>
): Promise<SafeSupabaseResult<T>> {
  try {
    const result = await queryFn();
    return {
      data: result.data as T,
      error: result.error
    };
  } catch (error) {
    return {
      data: null,
      error
    };
  }
}
