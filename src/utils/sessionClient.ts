export interface SessionUser {
  id: string;
  line_user_id: string;
  display_name?: string | null;
  picture_url?: string | null;
  app_user_id?: string | null;
  notify_opt_in?: boolean | null;
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  try {
    const res = await fetch('/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {}
}

export async function getEffectiveUserId(): Promise<string | null> {
  try {
    const me = await fetchSessionUser();
    return me?.app_user_id || me?.id || null;
  } catch {
    return null;
  }
}


