import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Heart, ImagePlus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type PhotoPost = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  like_count?: number;
  created_at: string;
};

export default function PhotoGallery() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PhotoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const canPost = useMemo(() => !!(user && preview && !isUploading), [user, preview, isUploading]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setError(null);
        setLoading(true);
        // 直近50件
        const { data, error } = await supabase
          .from('photo_posts')
          .select('id, user_id, image_url, caption, created_at, like_count')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setPosts((data as PhotoPost[]) || []);
      } catch (e) {
        setError((e as Error).message || '読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    void fetchPosts();
  }, []);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  // 画像を1:1にトリミングし、WebPへ変換
  const cropToSquareWebP = async (src: string, maxSize = 1080, quality = 0.9): Promise<Blob> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
    const size = Math.min(img.width, img.height, maxSize);
    const startX = (img.width - size) / 2;
    const startY = (img.height - size) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/webp', quality));
    return blob;
  };

  const handleUpload = async () => {
    if (!user || !preview) return;
    setIsUploading(true);
    try {
      // 1) 画像変換
      const webpBlob = await cropToSquareWebP(preview);
      const photoId = crypto.randomUUID();
      const path = `${user.id}/${photoId}.webp`;

      // 2) Storageアップロード（public bucket `photos` を前提）
      const { error: upErr } = await supabase.storage.from('photos').upload(path, webpBlob, {
        contentType: 'image/webp',
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('photos').getPublicUrl(path);
      const imageUrl = pub.publicUrl;

      // 3) DB登録
      const { data: inserted, error: insErr } = await supabase
        .from('photo_posts')
        .insert({ id: photoId, user_id: user.id, image_url: imageUrl, caption: caption.trim() || null })
        .select('id, user_id, image_url, caption, created_at, like_count')
        .single();
      if (insErr) throw insErr;

      // 4) 投稿ボーナス(10P)
      try {
        await supabase.rpc('rpc_award_photo_post', { p_user: user.id, p_photo_id: photoId });
      } catch (e) {
        console.warn('award photo post points failed:', e);
      }

      setPosts(prev => [inserted as PhotoPost, ...prev]);
      setCaption('');
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      setError((e as Error).message || 'アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLike = async (photoId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('photo_likes').insert({ photo_id: photoId, user_id: user.id });
      if (error) throw error;
      // 1P 付与
      try {
        await supabase.rpc('rpc_award_photo_like', { p_user: user.id, p_photo_id: photoId });
      } catch (e) { console.warn('award photo like failed', e); }
      setPosts(prev => prev.map(p => p.id === photoId ? { ...p, like_count: (p.like_count || 0) + 1 } : p));
    } catch (e) {
      console.warn('like failed', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" /> ホームへ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold">写真投稿</h1>

      {/* アップロードカード */}
      <Card className="p-4">
        {user ? (
          <div className="space-y-3">
            <input ref={inputRef} type="file" accept="image/*" onChange={handleSelectFile} />
            {preview && (
              <div className="w-48 h-48 overflow-hidden rounded-lg border">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
            <input
              type="text"
              placeholder="写真のコメント（任意）"
              className="w-full border rounded px-3 py-2"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={120}
            />
            <Button onClick={handleUpload} disabled={!canPost}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
              投稿する
            </Button>
          </div>
        ) : (
          <p className="text-gray-600">投稿するにはログインしてください。</p>
        )}
      </Card>

      {/* 一覧 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-600">まだ投稿がありません。</p>
        ) : (
          posts.map(p => (
            <Card key={p.id} className="p-2">
              <div className="aspect-square w-full overflow-hidden rounded">
                <img src={p.image_url} alt="photo" className="w-full h-full object-cover" />
              </div>
              {p.caption && <p className="text-sm text-gray-700 mt-2 break-words">{p.caption}</p>}
              <div className="flex items-center justify-between mt-2">
                <button onClick={() => handleLike(p.id)} className="inline-flex items-center text-pink-600 hover:text-pink-700">
                  <Heart className="w-4 h-4 mr-1" /> いいね {p.like_count || 0}
                </button>
                <span className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


