import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Supabaseのリカバリーリンクからトークンを取得
  const accessToken = searchParams.get('access_token');
  const type = searchParams.get('type');

  useEffect(() => {
    // typeがrecoveryでなければトップへ
    if (type !== 'recovery' || !accessToken) {
      setMessage('無効なリンクです。');
    }
  }, [type, accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    // SupabaseのAPIでパスワードを更新
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage('エラー: ' + error.message);
    } else {
      setMessage('パスワードが変更されました。ログイン画面に戻ります。');
      setTimeout(() => navigate('/login'), 2000);
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">パスワード再設定</h2>
      {message && <div className="mb-4 text-red-500">{message}</div>}
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">
          新しいパスワード
          <input
            type="password"
            className="w-full border p-2 rounded mt-1"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded mt-4"
          disabled={submitting}
        >
          {submitting ? '送信中...' : 'パスワードを変更'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;