import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface InquiryForm {
  category: 'ご要望' | '不具合' | 'その他';
  subject: string;
  message: string;
}

export default function Inquiry() {
  const { user, lineUser, effectiveUserId } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<InquiryForm>({
    category: 'ご要望',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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
      const content = `[${form.category}] ${form.subject}\n\n${form.message}`;
      const { error: msgErr } = await supabase.from('messages').insert({
        sender_id: uid,
        receiver_id: adminId,
        content,
      });
      if (msgErr) throw msgErr;

      // 2) 管理者に通知（Netlify Functions: app-notify）
      const notifyRes = await fetch('/.netlify/functions/app-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: adminId,
          title: '新規お問い合わせ',
          message: `${form.category}：${form.subject}`,
          linkUrl: `${window.location.origin}/community`,
          kind: 'inquiry',
        }),
      });
      if (!notifyRes.ok) throw new Error('通知の送信に失敗しました');

      // コミュニティのメッセージタブを開く指示を保存
      sessionStorage.setItem('communityActiveTab', 'messages');

      setSuccess('送信しました。コミュニティのメッセージに履歴を作成しました。');
      setForm({ category: 'ご要望', subject: '', message: '' });
      // メッセージ画面へ遷移
      navigate('/community');
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">件名</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="例: 施設オーナー向けのメッセージ機能について"
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

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
          </form>
        </Card>
      </div>
    </div>
  );
}


