import { Loader2, MapPin, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type Thread = {
  id: string;
  prefecture: string;
  title: string;
  content: string | null;
  allow_dm: boolean;
  author_id: string;
  dog_name?: string | null;
  created_at: string;
};

type Reply = {
  id: string;
  thread_id: string;
  content: string;
  author_id: string;
  created_at: string;
};

export default function PrefBoard() {
  const { user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const initialPref = params.get('pref') || localStorage.getItem('communityPreferredPrefecture') || '東京都';

  const [pref, setPref] = useState(initialPref);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [allowDM, setAllowDM] = useState(true);
  const [posting, setPosting] = useState(false);

  const PREFS = useMemo(() => ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'], []);

  useEffect(() => {
    localStorage.setItem('communityPreferredPrefecture', pref);
    void fetchThreads(pref);
  }, [pref]);

  const fetchThreads = async (p: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pref_threads')
      .select('id, prefecture, title, content, allow_dm, author_id, dog_name, created_at')
      .eq('prefecture', p)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setThreads((data as Thread[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) { nav('/login?redirect=' + encodeURIComponent(`/community/boards?pref=${pref}`)); return; }
    if (!title.trim()) return;
    setPosting(true);
    try {
      // ユーザーの最初の犬名を取得し、表示名として使用
      let dogName: string | null = null;
      const { data: dogs } = await supabase.from('dogs').select('name, gender').eq('owner_id', user.id).order('created_at', { ascending: true }).limit(1);
      if (dogs && dogs[0]?.name) dogName = dogs[0].name + ((dogs[0] as any).gender === 'オス' ? 'くん' : 'ちゃん');
      const { error } = await supabase.from('pref_threads').insert({ prefecture: pref, title: title.trim(), content: content.trim() || null, allow_dm: allowDM, author_id: user.id, dog_name: dogName });
      if (error) throw error;
      setTitle(''); setContent(''); setAllowDM(true);
      await fetchThreads(pref);
    } finally { setPosting(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/community" className="text-gray-600 hover:text-gray-800">← コミュニティへ戻る</Link>
      </div>
      <h1 className="text-2xl font-bold flex items-center"><MapPin className="w-6 h-6 text-blue-600 mr-2" />{pref}の掲示板</h1>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">都道府県</label>
            <select value={pref} onChange={(e)=>setPref(e.target.value)} className="w-full border rounded px-2 py-2">
              {PREFS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-[2]">
            <label className="block text-sm text-gray-600 mb-1">タイトル（例: 迷子犬を探しています）</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="タイトル" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">内容（任意）</label>
          <textarea value={content} onChange={(e)=>setContent(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} placeholder="詳細や連絡方法など" />
        </div>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allowDM} onChange={(e)=>setAllowDM(e.target.checked)} />
            ダイレクトメッセージを受け付ける
          </label>
        </div>
        <div className="mt-3">
          <Button onClick={handleCreate} disabled={posting}>{posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Send className="w-4 h-4 mr-2"/>} 投稿する</Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card className="p-4 text-center text-gray-500">読み込み中...</Card>
        ) : threads.length === 0 ? (
          <Card className="p-4 text-center text-gray-500">まだ投稿がありません</Card>
        ) : (
          threads.map(t => (
            <Card key={t.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">{new Date(t.created_at).toLocaleString('ja-JP')}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div>{t.allow_dm ? 'DM受付中' : 'DM不可'}</div>
                  {user?.email === 'capasjapan@gmail.com' && (
                    <button
                      className="text-red-600 hover:text-red-700 underline"
                      onClick={async () => {
                        if (!confirm('このスレッドを削除しますか？返信も削除されます。')) return;
                        const { data, error } = await supabase
                          .from('pref_threads')
                          .delete()
                          .eq('id', t.id)
                          .select('id');
                        if (error || !data || data.length === 0) {
                          alert(`削除に失敗しました: ${error?.message || '権限がないか、対象が存在しません'}`);
                          return;
                        }
                        setThreads(prev => prev.filter(x => x.id !== t.id));
                        // 念のため再取得
                        await fetchThreads(pref);
                      }}
                    >削除</button>
                  )}
                  {t.allow_dm && user && user.id !== t.author_id && (
                    <button
                      className="text-blue-600 hover:text-blue-800 underline"
                      onClick={() => {
                        try {
                          sessionStorage.setItem('communityActiveTab', 'messages');
                          sessionStorage.setItem('communityOpenPartnerId', t.author_id);
                        } catch {}
                        nav('/community');
                      }}
                    >
                      DMを送る
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-lg mt-1">{t.title}</h3>
              {t.dog_name && <p className="text-sm text-gray-600 mt-1">{t.dog_name} の飼い主さん</p>}
              {t.content && <p className="text-gray-700 mt-2 whitespace-pre-line">{t.content}</p>}
              <div className="mt-3">
                <Link to={`/community/boards/${t.id}`}>スレッドを開く</Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


