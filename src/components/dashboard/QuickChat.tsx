import { useState } from 'react';
import Button from '../Button';

export default function QuickChat() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setReply('');
    try {
      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const json = await res.json();
      setReply(json.reply || '');
    } catch (e) {
      setReply('エラーが発生しました。しばらくしてからお試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="font-semibold mb-2">お問い合わせ（AI）</h3>
      <div className="flex space-x-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ご質問を入力してください"
        />
        <Button onClick={ask} disabled={loading}>
          {loading ? '送信中…' : '送信'}
        </Button>
      </div>
      {reply && (
        <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap">{reply}</div>
      )}
    </div>
  );
}


