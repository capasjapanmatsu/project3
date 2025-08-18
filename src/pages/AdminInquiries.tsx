import { MessageSquare, Send, User as UserIcon, Paperclip, Camera } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

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
  const [uploading, setUploading] = useState(false);
  const fileInputId = 'admin-inquiry-file';
  const cameraInputId = 'admin-inquiry-camera';

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

  const onSelectFiles = async (files: FileList | null) => {
    if (!files || !me || !activeUserId) return;
    try {
      setUploading(true);
      // 1) Create a message container first to obtain message_id
      const { data: msgData, error: msgErr } = await supabase
        .from('messages')
        .insert({ sender_id: me.id, receiver_id: activeUserId, content: text || '(添付あり)' })
        .select('id')
        .single();
      if (msgErr || !msgData) throw msgErr;

      const failures: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
          const key = `${msgData.id}/${Date.now()}_${encodeURIComponent(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from('message-attachments')
            .upload(key, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('message-attachments').getPublicUrl(key);
          const type = file.type.startsWith('image/') ? 'image' : (ext === 'pdf' ? 'pdf' : 'other');
          const { error: insErr } = await supabase.from('message_attachments').insert({
            message_id: msgData.id,
            file_url: pub.publicUrl,
            file_type: type,
            file_name: file.name
          });
          if (insErr) throw insErr;
        } catch (fe: any) {
          console.error('Attachment upload failed:', fe);
          failures.push(`${file.name}: ${fe?.message || fe}`);
        }
      }

      // 3) Reload messages
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .in('sender_id', [me.id, activeUserId])
        .in('receiver_id', [me.id, activeUserId])
        .order('created_at', { ascending: true });
      setMessages(data || []);
      setText('');
      if (failures.length > 0) {
        alert('一部の添付に失敗しました:\n' + failures.join('\n'));
      }
    } catch (e: any) {
      console.error(e);
      alert('添付のアップロードに失敗しました: ' + (e?.message || e));
    } finally {
      setUploading(false);
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
                  <MessageBubble key={m.id} message={m} myId={me!.id} />
                ))}
              </div>
              <div className="pt-3 mt-2 border-t flex items-center gap-2">
                <input value={text} onChange={(e)=>setText(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="メッセージを入力"/>
                <input id={fileInputId} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e)=>onSelectFiles(e.target.files)} />
                <button type="button" onClick={() => document.getElementById(fileInputId)?.click()} className="w-10 h-10 flex items-center justify-center rounded-full border bg-white hover:bg-gray-50" title="ファイル添付">
                  <Paperclip className="w-5 h-5 text-gray-700" />
                </button>
                <input id={cameraInputId} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>onSelectFiles(e.target.files)} />
                <button type="button" onClick={() => document.getElementById(cameraInputId)?.click()} className="w-10 h-10 flex items-center justify-center rounded-full border bg-white hover:bg-gray-50" title="カメラ">
                  <Camera className="w-5 h-5 text-gray-700" />
                </button>
                <button type="button" onClick={send} className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white" title="送信">
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {uploading && <div className="text-xs text-gray-500 mt-1">アップロード中...</div>}
            </div>
          ) : (
            <div className="text-sm text-gray-500">左のスレッドを選択してください</div>
          )}
        </Card>
      </div>
    </div>
  );
}


function MessageBubble({ message, myId }: { message: Msg; myId: string }) {
  const [attachments, setAttachments] = useState<Array<{file_url:string;file_type:string;file_name:string}>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('message_attachments')
        .select('file_url, file_type, file_name')
        .eq('message_id', message.id);
      setAttachments(data || []);
    })();
  }, [message.id]);

  const isMine = message.sender_id === myId;
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] space-y-2 ${isMine ? '' : ''}`}>
        <div className={`px-3 py-2 rounded-lg text-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>{message.content}</div>
        {attachments.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {attachments.map((a, i) => (
              a.file_type === 'image' ? (
                <a key={i} href={a.file_url} target="_blank" rel="noreferrer" className="block">
                  <img src={a.file_url} alt={a.file_name} className="rounded border object-cover h-32 w-full" />
                </a>
              ) : (
                <a key={i} href={a.file_url} target="_blank" rel="noreferrer" className="block text-xs text-blue-700 underline">
                  {a.file_name || '添付ファイル'}
                </a>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


