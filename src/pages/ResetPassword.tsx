import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

function getTokenFromHashOrQuery() {
  // 1. ハッシュから取得
  const hash = window.location.hash.replace('#', '');
  const hashParams = new URLSearchParams(hash);
  let accessToken = hashParams.get('access_token') || hashParams.get('token');
  let type = hashParams.get('type');

  // 2. クエリパラメータから取得（なければ）
  if (!accessToken || !type) {
    const searchParams = new URLSearchParams(window.location.search);
    accessToken = accessToken || searchParams.get('access_token') || searchParams.get('token');
    type = type || searchParams.get('type');
  }
  return { accessToken, type };
}

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [{ accessToken, type }, setTokens] = useState(getTokenFromHashOrQuery());
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // ページロード時にトークンを再取得
    setTokens(getTokenFromHashOrQuery());
  }, []);

  useEffect(() => {
    // セッションセット処理（exchangeCodeForSessionを使用）
    const setSessionIfNeeded = async () => {
      if (type === 'recovery' && accessToken) {
        const { error } = await supabase.auth.exchangeCodeForSession(accessToken);
        if (error) {
          setMessage('セッションの設定に失敗しました。再度パスワードリセットを行ってください。');
          setSessionReady(false);
        } else {
          setSessionReady(true);
        }
      } else {
        setMessage('セッションの設定に失敗しました。再度パスワードリセットを行ってください。');
        setSessionReady(false);
      }
    };
    setSessionIfNeeded();
  }, [type, accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
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
      {sessionReady && (
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
      )}
    </div>
  );
};

export default ResetPassword;