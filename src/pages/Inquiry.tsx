import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface InquiryForm {
  category: 'ご要望' | '不具合' | 'その他';
  message: string;
}

export default function Inquiry() {
  const { user, lineUser, effectiveUserId } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<InquiryForm>({
    category: 'ご要望',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user && !lineUser && !effectiveUserId) {
      navigate('/liff/login');
    }
  }, [user, lineUser, effectiveUserId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const uid = user?.id || lineUser?.app_user_id || lineUser?.id || effectiveUserId;
      if (!uid) throw new Error('ログインが必要です');

      // 管理者ユーザーを取得（profiles.user_type='admin'）
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'admin')
        .limit(1)
        .maybeSingle();

      const adminId = adminProfile?.id as string | undefined;
      if (!adminId) throw new Error('管理者ユーザーが見つかりません');

      // 1) メッセージを保存（ユーザー→管理者）
      const content = `[${form.category}]\n\n${form.message}`;
      const { data: msgRow, error: msgErr } = await supabase
        .from('messages')
        .insert({ sender_id: uid, receiver_id: adminId, content })
        .select('id')
        .single();
      if (msgErr || !msgRow) throw msgErr;

      // 2) 管理者に通知（Netlify Functions: app-notify）
      const notifyRes = await fetch('/.netlify/functions/app-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminId,
          title: '新規お問い合わせ',
          message: `${form.category} の問い合わせ`,
          linkUrl: `${window.location.origin}/community`,
          kind: 'inquiry',
        }),
      });
      if (!notifyRes.ok) throw new Error('通知の送信に失敗しました');

      // コミュニティのメッセージタブを開く指示を保存
      sessionStorage.setItem('communityActiveTab', 'messages');

      setSuccess('送信しました。コミュニティのメッセージに履歴を作成しました。');
      setForm({ category: 'ご要望', message: '' });
      // メッセージ画面へ遷移
      navigate('/community');
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 添付アップロード（画像/カメラ/PDF）
  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    try {
      setUploading(true);
      const uid = user?.id || lineUser?.app_user_id || lineUser?.id || effectiveUserId;
      if (!uid) throw new Error('ログインが必要です');

      // 管理者取得
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_type', 'admin')
        .limit(1)
        .maybeSingle();
      const adminId = adminProfile?.id as string | undefined;
      if (!adminId) throw new Error('管理者ユーザーが見つかりません');

      // メッセージ行を用意
      const { data: msgRow, error: msgErr } = await supabase
        .from('messages')
        .insert({ sender_id: uid, receiver_id: adminId, content: '(添付あり)' })
        .select('id')
        .single();
      if (msgErr || !msgRow) throw msgErr;

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const key = `${msgRow.id}/${Date.now()}_${encodeURIComponent(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from('message-attachments')
          .upload(key, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('message-attachments').getPublicUrl(key);
        const type = file.type.startsWith('image/') ? 'image' : (ext === 'pdf' ? 'pdf' : 'other');
        await supabase.from('message_attachments').insert({
          message_id: msgRow.id,
          file_url: pub.publicUrl,
          file_type: type,
          file_name: file.name
        });
      }

      setSuccess('添付を送信しました。');
      navigate('/community');
    } catch (e) {
      console.error(e);
      setError('添付の送信に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="要望・お問い合わせ" description="アプリへのご要望やお問い合わせはこちらから" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">要望・お問い合わせ</h1>

          {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800">{success}</div>}
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as InquiryForm['category'] })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="ご要望">ご要望</option>
                <option value="不具合">不具合</option>
                <option value="その他">その他</option>
              </select>
            </div>

            {/* 件名は非表示（要望によりなし） */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={6}
                placeholder="できるだけ具体的にご記入ください"
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? '送信中...' : '送信する'}
              </Button>
            </div>
            <div className="pt-2">
              <div className="flex gap-3">
                <label className="inline-flex items-center justify-center w-10 h-10 rounded-full border cursor-pointer bg-white" title="ファイルを選択">
                  <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e)=>handleFiles(e.target.files)} />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95L8.46 19.04a2 2 0 11-2.83-2.83l8.49-8.49"/></svg>
                </label>
                <label className="inline-flex items-center justify-center w-10 h-10 rounded-full border cursor-pointer bg-white" title="カメラで撮影">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>handleFiles(e.target.files)} />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h3l2-3h8l2 3h3a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </label>
              </div>
              {uploading && <div className="text-xs text-gray-500 mt-1">アップロード中...</div>}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}


