import { useEffect, useState } from 'react';
import { safeGetItem } from '../utils/safeStorage';
import { supabase } from '../utils/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedEmail = safeGetItem('lastUsedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) {
      setMessage('エラー: ' + error.message);
    } else {
      setMessage('パスワードリセット用のメールを送信しました。メールをご確認ください。');
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">パスワードリセットメール送信</h2>
      {message && <div className="mb-4 text-blue-500">{message}</div>}
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">
          メールアドレス
          <input
            type="email"
            className="w-full border p-2 rounded mt-1"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded mt-4"
          disabled={submitting}
        >
          {submitting ? '送信中...' : 'メールを送信'}
        </button>
      </form>
    </div>
  );
}
export default ForgotPassword; 
