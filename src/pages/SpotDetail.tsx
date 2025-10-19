import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import Button from '../components/Button';
import Card from '../components/Card';
import { MapPin, Flag, MessageCircle, ImageIcon } from 'lucide-react';
import useAuth from '../context/AuthContext';

export default function SpotDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [spot, setSpot] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError('');
        const { data: s, error: e1 } = await supabase.from('spots').select('*').eq('id', id).single();
        if (e1) throw e1;
        setSpot(s);
        const { data: m } = await supabase.from('spot_media').select('*').eq('spot_id', id).order('is_thumbnail', { ascending: false }).order('created_at', { ascending: true });
        setMedia(m || []);
        const { data: cs } = await supabase.from('spot_comments').select('*').eq('spot_id', id).order('created_at', { ascending: true });
        setComments(cs || []);
      } catch (e: any) {
        setError(e?.message || '読み込みに失敗しました');
      }
    })();
  }, [id]);

  const addComment = async () => {
    if (!user || !comment.trim()) return;
    setIsSubmitting(true);
    try {
      const { error: e } = await supabase.from('spot_comments').insert({ spot_id: id, author_id: user.id, content: comment.trim() });
      if (e) throw e;
      setComment('');
      const { data: cs } = await supabase.from('spot_comments').select('*').eq('spot_id', id).order('created_at', { ascending: true });
      setComments(cs || []);
    } catch (e: any) {
      setError(e?.message || 'コメント送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 md:pt-12 pb-8">
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {!spot ? (
        <div className="py-16 text-center text-gray-500">読み込み中...</div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-sm text-blue-600 mb-1">{spot.category || '未分類'}</div>
            <h1 className="text-2xl font-bold">{spot.title}</h1>
            <div className="text-sm text-gray-600 mt-1 flex items-center">
              <MapPin className="w-4 h-4 mr-1"/>{spot.address || `${spot.latitude?.toFixed(5)}, ${spot.longitude?.toFixed(5)}`}
            </div>
          </div>

          {/* swipeable gallery (basic horizontal scroll) */}
          <div ref={scrollerRef} className="relative overflow-x-auto whitespace-nowrap snap-x snap-mandatory mb-4">
            {media.length === 0 ? (
              <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon className="w-10 h-10"/></div>
            ) : (
              media.map((m) => (
                <img key={m.id} src={m.url} alt={spot.title} className="h-64 w-auto inline-block mr-2 rounded snap-center object-cover" loading="lazy" decoding="async"/>
              ))
            )}
          </div>

          {spot.description && (
            <Card className="p-4 mb-4"><p className="text-gray-700 whitespace-pre-wrap">{spot.description}</p></Card>
          )}

          {/* comments */}
          <Card className="p-4">
            <div className="flex items-center mb-3"><MessageCircle className="w-5 h-5 text-blue-600 mr-2"/><h2 className="font-semibold">コメント</h2></div>
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="text-sm">
                  <div className="text-gray-800">{c.content}</div>
                  <div className="text-gray-400 text-xs">{new Date(c.created_at).toLocaleString()}</div>
                </div>
              ))}
              {comments.length === 0 && <div className="text-gray-500 text-sm">最初のコメントを書きましょう</div>}
            </div>
            <div className="flex gap-2">
              <input value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="コメントを書く" className="flex-1 border rounded px-3 py-2"/>
              <Button onClick={addComment} isLoading={isSubmitting}>送信</Button>
            </div>
          </Card>

          {/* report */}
          <div className="mt-4">
            <Button variant="secondary" onClick={async ()=>{
              if (!user) return;
              const reason = prompt('通報理由を入力してください');
              if (!reason) return;
              await supabase.from('spot_reports').insert({ spot_id: id, reporter_id: user.id, reason });
              alert('通報を受け付けました。ありがとうございました。');
            }}>
              <Flag className="w-4 h-4 mr-2"/>通報
            </Button>
          </div>
        </>
      )}
    </div>
  );
}


