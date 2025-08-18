import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { MessageSquare, Send, User as UserIcon } from 'lucide-react';

interface ProfileLite { id: string; name: string | null }
interface Msg { id: string; sender_id: string; receiver_id: string; content: string; created_at: string }

export default function AdminInquiries() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<Array<Msg & { partner: ProfileLite }>>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [me, setMe] = useState<ProfileLite | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      // 自分(管理者)ID
      const { data: admin } = await supabase.from('profiles').select('id, name').eq('user_type','admin').limit(1).maybeSingle();
      if (!admin) return;
      setMe(admin as any);

      // 最新メッセージ一覧（管理者が関わるスレッド）
      const { data } = await supabase
        .from('latest_messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${admin.id},receiver_id.eq.${admin.id}`)
        .order('created_at', { ascending: false });

      const partnerIds = Array.from(new Set((data||[]).map(m => m.sender_id === admin.id ? m.receiver_id : m.sender_id)));
      const { data: partners } = await supabase.from('profiles').select('id, name').in('id', partnerIds);
      const partnerMap = new Map<string, ProfileLite>((partners||[]).map(p => [p.id, p as ProfileLite]));
      setThreads((data||[]).map(m => ({ ...m, partner: partnerMap.get(m.sender_id === admin.id ? m.receiver_id : m.sender_id)! })).filter(t => !!t.partner));

      // URLクエリ partner= を優先
      const partnerQ = searchParams.get('partner');
      if (partnerQ) setActiveUserId(partnerQ);
    })();
  }, [isAdmin]);

  useEffect(() => {
    (async () => {
      if (!me || !activeUserId) { setMessages([]); return; }
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .in('sender_id',[me.id, activeUserId])
        .in('receiver_id',[me.id, activeUserId])
        .order('created_at', { ascending: true });
      setMessages(data||[]);
    })();
  }, [me, activeUserId]);

  const partnerName = useMemo(() => threads.find(t => (t.sender_id === me?.id ? t.receiver_id : t.sender_id) === activeUserId)?.partner?.name || '', [threads, me, activeUserId]);

  const send = async () => {
    if (!me || !activeUserId || !text.trim()) return;
    const { error } = await supabase.from('messages').insert({ sender_id: me.id, receiver_id: activeUserId, content: text.trim() });
    if (!error) {
      setText('');
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .in('sender_id',[me.id, activeUserId])
        .in('receiver_id',[me.id, activeUserId])
        .order('created_at', { ascending: true });
      setMessages(data||[]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO title="お問い合わせ管理" />
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3 flex items-center"><MessageSquare className="w-5 h-5 mr-2"/>スレッド</h2>
          <div className="divide-y">
            {threads.map(t => {
              const pid = t.sender_id === me?.id ? t.receiver_id : t.sender_id;
              return (
                <button key={t.id} onClick={() => { setActiveUserId(pid); setSearchParams({ partner: pid }); }} className={`w-full text-left py-3 px-2 hover:bg-gray-50 ${activeUserId===pid?'bg-blue-50':''}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center"><UserIcon className="w-4 h-4 text-blue-600"/></div>
                    <div>
                      <div className="font-medium">{t.partner?.name || 'ユーザー'}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{t.content}</div>
                    </div>
                  </div>
                </button>
              );
            })}
            {threads.length===0 && <div className="text-sm text-gray-500 py-6 text-center">スレッドがありません</div>}
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          {activeUserId ? (
            <div className="flex flex-col h-[70vh]">
              <div className="border-b pb-2 mb-2 flex items-center justify-between">
                <div className="font-semibold">{partnerName || 'ユーザー'}</div>
                <Link to={`/admin/users/${activeUserId}`} className="text-blue-600 hover:text-blue-800 text-sm">ユーザー詳細へ</Link>
              </div>
              <div className="flex-1 overflow-auto space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_id===me?.id?'justify-end':'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.sender_id===me?.id?'bg-blue-600 text-white':'bg-gray-100 text-gray-900'}`}>{m.content}</div>
                  </div>
                ))}
              </div>
              <div className="pt-3 mt-2 border-t flex gap-2">
                <input value={text} onChange={(e)=>setText(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="メッセージを入力"/>
                <Button onClick={send}><Send className="w-4 h-4 mr-1"/>送信</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">左のスレッドを選択してください</div>
          )}
        </Card>
      </div>
    </div>
  );
}


