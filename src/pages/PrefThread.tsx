import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ImagePlus, Loader2, Send } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

export default function PrefThread() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [thread, setThread] = useState<any>(null);
  const [replies, setReplies] = useState<Array<{id:string; content:string; author_id:string; created_at:string; image_url?:string|null}>>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => { if (id) { void fetchAll(id); } }, [id]);

  const fetchAll = async (tid: string) => {
    const { data: th } = await supabase.from('pref_threads').select('*').eq('id', tid).maybeSingle();
    setThread(th);
    const { data: reps } = await supabase.from('pref_replies').select('*').eq('thread_id', tid).order('created_at', { ascending: true });
    setReplies((reps as any) || []);
  };

  const toWebP = async (file: File): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const size = Math.min(bitmap.width, bitmap.height, 1200);
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const sx = (bitmap.width - size) / 2; const sy = (bitmap.height - size) / 2;
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size);
    const blob = await new Promise<Blob>((resolve)=>canvas.toBlob((b)=>resolve(b!), 'image/webp', 0.9));
    return blob;
  };

  const handleReply = async () => {
    if (!user) { nav('/login?redirect=' + encodeURIComponent(location.pathname)); return; }
    if (!id) return;
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const webp = await toWebP(file);
        const path = `boards/${id}/${user.id}_${Date.now()}.webp`;
        const up = await supabase.storage.from('photos').upload(path, webp, { contentType: 'image/webp' });
        if (!up.error) {
          const { data: pub } = supabase.storage.from('photos').getPublicUrl(path);
          imageUrl = pub.publicUrl;
        }
      }
      const { error } = await supabase.from('pref_replies').insert({ thread_id: id, content: text.trim(), author_id: user.id, image_url: imageUrl });
      if (error) throw error;
      setText(''); setFile(null);
      await fetchAll(id);
    } finally { setPosting(false); }
  };

  if (!thread) return <div className="max-w-3xl mx-auto px-4 py-6"><Card className="p-4 text-center text-gray-500">読み込み中...</Card></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link to={`/community/boards?pref=${encodeURIComponent(thread.prefecture)}`} className="text-gray-600 hover:text-gray-800">← {thread.prefecture}の掲示板へ</Link>
      <Card className="p-4">
        <h1 className="font-bold text-xl">{thread.title}</h1>
        {thread.dog_name && <p className="text-sm text-gray-600 mt-1">{thread.dog_name} の飼い主さん</p>}
        {thread.content && <p className="mt-2 whitespace-pre-line">{thread.content}</p>}
        {user?.email === 'capasjapan@gmail.com' && (
          <div className="mt-3">
            <button
              className="text-red-600 hover:text-red-700 underline text-sm"
              onClick={async ()=>{ if(!confirm('このスレッドを削除しますか？')) return; const { error } = await supabase.from('pref_threads').delete().eq('id', thread.id); if(!error) nav(`/community/boards?pref=${encodeURIComponent(thread.prefecture)}`); }}
            >スレッドを削除</button>
          </div>
        )}
        {thread.allow_dm && user && user.id !== thread.author_id && (
          <div className="mt-3">
            <button
              className="text-blue-600 hover:text-blue-800 underline text-sm"
              onClick={()=>{ try { sessionStorage.setItem('communityActiveTab','messages'); sessionStorage.setItem('communityOpenPartnerId', thread.author_id); } catch {}; nav('/community'); }}
            >
              この投稿者にDMを送る
            </button>
          </div>
        )}
      </Card>
      <div className="space-y-3">
        {replies.map(r => (
          <Card key={r.id} className="p-3">
            <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('ja-JP')}</div>
            {r.image_url && (
              <div className="mt-2">
                <img src={r.image_url} alt="attachment" className="w-full max-h-80 object-cover rounded" />
              </div>
            )}
            <p className="mt-2 whitespace-pre-line">{r.content}</p>
            {user?.email === 'capasjapan@gmail.com' && (
              <div className="mt-2">
                <button className="text-red-600 hover:text-red-700 underline text-sm" onClick={async ()=>{ if(!confirm('この返信を削除しますか？')) return; const { error } = await supabase.from('pref_replies').delete().eq('id', r.id); if(!error) setReplies(prev=>prev.filter(x=>x.id!==r.id)); }}>返信を削除</button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">返信を書く</h2>
        <textarea value={text} onChange={(e)=>setText(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} placeholder="返信内容" />
        <div className="mt-2 flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
            <ImagePlus className="w-4 h-4" /> 画像を添付（自動で1:1 WebP化）
          </label>
        </div>
        <div className="mt-3">
          <Button onClick={handleReply} disabled={posting || !text.trim()}>{posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Send className="w-4 h-4 mr-2"/>} 返信する</Button>
        </div>
      </Card>
    </div>
  );
}


