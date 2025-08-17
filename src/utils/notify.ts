import { supabase } from './supabase';

type NotifyParams = {
  userId: string;
  title: string;
  message: string;
  linkUrl?: string;
  kind?: 'alert' | 'reservation';
};

export async function notifyAppAndLine(params: NotifyParams) {
  const { userId, title, message, linkUrl, kind = 'alert' } = params;
  try {
    // 1) アプリ内通知（クライアントRLSで失敗する環境に備え、Functionsにフォールバック）
    const ins = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      link_url: linkUrl || null,
      read: false,
      type: 'reservation_reminder',
      data: {}
    });
    if (ins.error) {
      await fetch('/.netlify/functions/app-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, message, linkUrl, kind })
      });
    }

    // 2) LINE転送（連携済みのみ）
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, line_user_id, notify_opt_in')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.notify_opt_in || !profile?.line_user_id) return;

    await fetch('/.netlify/functions/line-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, lineUserId: profile.line_user_id, title, message, mapUrl: linkUrl, linkUrl })
    });
  } catch (e) {
    // ログのみ（通知失敗で機能を止めない）
    console.error('notifyAppAndLine error', e);
  }
}


