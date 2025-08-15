import { MessageCircle, Send, X, Trash2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  time: number; // epoch ms
};

const STORAGE_KEY = 'ai_chat_history_v1';
const MAX_HISTORY = 20;

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 初期読み込み（ローカル履歴）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        setMessages(parsed.slice(-MAX_HISTORY));
      } else {
        // 初回ガイドメッセージ
        setMessages([
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'こんにちは！ご質問をどうぞ。例: マイページの見方 / クーポンの使い方 / ログインに失敗した時の対処 など',
            time: Date.now(),
          },
        ]);
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {
      // ignore
    }
  }, [messages]);

  // スクロールを末尾に
  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [isOpen, messages.length]);

  const prettyTime = useCallback((t: number) => {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const send = useCallback(async () => {
    if (!canSend) return;
    const text = input.trim();
    setInput('');
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, time: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      // まずはプレティパス
      let res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      // 404 の場合は Functions の生パス
      if (res.status === 404) {
        res = await fetch('/.netlify/functions/assistant-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
      }
      const json = await res.json().catch(() => ({} as any));
      const reply = (json && json.reply) || (res.ok ? '（回答が取得できませんでした）' : 'エラーが発生しました。時間をおいて再度お試しください。');
      const botMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: reply, time: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '通信エラーが発生しました。ネットワークをご確認のうえ再度お試しください。',
        time: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [canSend, input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
  };

  return (
    <>
      {/* フローティングボタン */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        aria-expanded={isOpen}
        aria-controls="ai-chat-widget-panel"
        className={`fixed top-40 md:top-48 right-4 md:right-6 z-50 rounded-full w-14 h-14 flex items-center justify-center shadow-2xl border-4 border-white/30 transition-all ${
          isOpen ? 'bg-purple-600 hover:bg-purple-700 scale-95' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-110'
        }`}
        title="AIに質問"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {/* サイドパネル */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* 背景 */}
          <div
            className="absolute inset-0 bg-black/30"
            aria-hidden
            onClick={() => setIsOpen(false)}
          />

          {/* パネル */}
          <section
            id="ai-chat-widget-panel"
            aria-label="AIチャット"
            className="absolute right-0 bottom-0 top-0 w-full sm:w-96 bg-white shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-200"
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="font-semibold text-gray-800">AIサポート</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearHistory}
                  className="p-2 rounded hover:bg-gray-100"
                  title="履歴をクリア"
                >
                  <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded hover:bg-gray-100"
                  title="閉じる"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            {/* 履歴 */}
            <div ref={listRef} className="flex-1 overflow-auto px-4 py-3 space-y-3 bg-white">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                    title={prettyTime(m.time)}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  回答を取得しています…
                </div>
              )}
            </div>

            {/* 入力 */}
            <div className="border-t p-3 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="質問を入力してEnter…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className={`rounded-lg px-3 py-2 text-white flex items-center gap-1 ${
                  canSend ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
                送信
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}


