import { insertNotificationSafe } from '@/lib/supabase/notifications';
import { notifyAppAndLine } from '@/utils/notify';

type Params = {
  userId: string;
  title: string;
  message: string;
  linkUrl?: string;
  type: string; // DB側の許可タイプに合わせる
  data?: Record<string, unknown> | null;
  // 既定でLINEへも送る（ユーザーが連携・許可していれば内部で送信）
  sendLine?: boolean;
};

/**
 * アプリ内通知（notifications）とLINE通知を同時に送る安全なヘルパ
 * - まずアプリ内通知を作成（型の正規化は insertNotificationSafe に委譲）
 * - その後、ユーザーが連携・許可済みなら LINE へ転送（notifyAppAndLine 内で判定）
 */
export async function notifyAppAndLineBoth(params: Params) {
  const { userId, title, message, linkUrl, type, data, sendLine = true } = params;

  // 1) アプリ内通知
  await insertNotificationSafe({
    user_id: userId,
    type,
    title,
    message,
    link_url: linkUrl ?? null,
    data: data ?? null,
  });

  // 2) LINE（任意・連携済みのみ）
  if (sendLine) {
    await notifyAppAndLine({
      userId,
      title,
      message,
      linkUrl,
      kind: 'alert',
      sendApp: false,
      sendLine: true,
    });
  }
}


