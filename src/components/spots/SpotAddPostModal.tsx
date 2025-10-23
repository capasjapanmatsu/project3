import { Star, Upload, X } from 'lucide-react';
import { useState } from 'react';
import useAuth from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';
import ImageCropper from '../ImageCropper';

type Props = {
  spotId: string;
  onClose: () => void;
  onAdded: () => void; // refresh parent media/comments
};

export default function SpotAddPostModal({ spotId, onClose, onAdded }: Props) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<Array<File | null>>([null, null, null]);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState<number>(5);

  const handleSubmit = async () => {
    if (!user) { setError('ログインが必要です'); return; }
    if (!files.some(Boolean) && !comment.trim()) { setError('コメントまたは画像を追加してください'); return; }
    setError(''); setIsSubmitting(true);
    try {
      // insert comment if provided
      if (comment.trim()) {
        const { error: cErr } = await supabase.from('spot_comments').insert({ spot_id: spotId, author_id: user.id, content: comment.trim() });
        if (cErr) throw cErr;
      }
      // upsert rating (1..5)
      if (rating >= 1 && rating <= 5) {
        const { error: rErr } = await supabase
          .from('spot_ratings')
          .upsert({ spot_id: spotId, user_id: user.id, rating }, { onConflict: 'spot_id,user_id' });
        if (rErr) throw rErr;
      }
      // upload images (pre-cropped to webp by ImageCropper)
      const upFiles = files.filter(Boolean) as File[];
      // client-side guard for DB trigger (max 3 photos per user per spot)
      let allowed = 3;
      try {
        const { count } = await supabase
          .from('spot_media')
          .select('id', { count: 'exact', head: true })
          .eq('spot_id', spotId)
          .eq('author_id', user.id);
        allowed = Math.max(0, 3 - (count || 0));
      } catch {}
      const filesToUpload = upFiles.slice(0, allowed);
      const skipped = upFiles.length > filesToUpload.length ? (upFiles.length - filesToUpload.length) : 0;
      for (let i=0; i<filesToUpload.length; i++) {
        const f = filesToUpload[i]!;
        const key = `${user.id}/${spotId}/${Date.now()}_${i}_${f.name}`;
        const { data: storageRes, error: uerr } = await supabase.storage.from('spot-images').upload(key, f, { cacheControl: '31536000', upsert: false });
        if (uerr) throw uerr;
        const { data: pub } = supabase.storage.from('spot-images').getPublicUrl(storageRes!.path);
        const { error: insErr } = await supabase.from('spot_media').insert({ spot_id: spotId, author_id: user.id, url: pub.publicUrl, storage_key: storageRes!.path, sort_order: i });
        if (insErr) throw insErr;
      }
      onAdded();
      onClose();
      if (skipped > 0 && upFiles.length > 0) {
        // 非同期でユーザーに情報を伝える（UI簡易対応）
        try { setTimeout(() => alert(`写真は最大3枚までです。今回 ${skipped} 枚はスキップされました。`), 0); } catch {}
      }
    } catch (e: any) {
      setError(e?.message || '投稿に失敗しました');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">レビューする</h2>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">評価（★1〜5）</label>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((n)=> (
                <button
                  key={n}
                  type="button"
                  onClick={()=>setRating(n)}
                  className={`p-1 rounded ${n<=rating ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
                  aria-label={`評価 ${n}`}
                >
                  <Star className={`${n<=rating ? 'fill-current' : ''} w-5 h-5`} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">コメント（任意）</label>
            <textarea value={comment} onChange={(e)=>setComment(e.target.value)} rows={3} className="w-full border rounded px-3 py-2"/>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex items-center"><Upload className="w-4 h-4 mr-2"/>画像（1〜3枚、1:1トリミング）</label>
            <div className="space-y-2">
              {[0,1,2].map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-12">画像{idx+1}</span>
                  <input type="file" accept="image/*" onChange={(e)=>{
                    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    if (f) { setCropIndex(idx); setCropFile(f); }
                  }} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">※ アップロード時に1:1でトリミング・WebP変換します。</p>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2 shrink-0 bg-white">
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>投稿</Button>
        </div>

        {cropFile && cropIndex !== null && (
          <ImageCropper
            imageFile={cropFile}
            aspectRatio={1}
            maxWidth={1024}
            maxHeight={1024}
            onCropComplete={(blob: Blob) => {
              const out = new File([blob], cropFile.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
              setFiles(prev => { const copy = [...prev]; copy[cropIndex] = out; return copy; });
              setCropFile(null); setCropIndex(null);
            }}
            onCancel={() => { setCropFile(null); setCropIndex(null); }}
          />
        )}
      </Card>
    </div>
  );
}


