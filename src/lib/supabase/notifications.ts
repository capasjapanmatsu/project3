import { normalizeType } from '@/constants/notificationTypes';
import { supabase } from '@/utils/supabase';

type InsertRow = {
  user_id: string;
  type: string; // 呼び出し元は string 可。ここで正規化
  title: string;
  message: string;
  link_url?: string | null;
  data?: Record<string, unknown> | null;
};

export async function insertNotificationSafe(row: InsertRow) {
  const t = normalizeType(row.type);
  if (!t) {
    // 早期検知
    // eslint-disable-next-line no-console
    console.error('Unsupported notifications.type =', row.type);
    throw new Error(`Unsupported notifications.type: ${row.type}`);
  }

  const payload = {
    user_id: row.user_id,
    type: t,
    title: row.title,
    message: row.message,
    link_url: row.link_url ?? null,
    data: row.data ?? null,
    read: false,
  } as const;

  const { error } = await supabase.from('notifications').insert(payload);
  if (error) throw error;
}


