export interface SessionUser {
  id: string;
  line_user_id: string;
  display_name?: string | null;
  picture_url?: string | null;
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


