import { Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type InviteInfo = {
  id: string;
  token: string;
  host_user_id: string;
  park_id: string;
  title?: string | null;
  start_time: string;
  end_time: string;
  used_count?: number | null;
  max_uses?: number | null;
  revoked?: boolean | null;
};

export default function InviteUnlock() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, effectiveUserId } = useAuth();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [parkName, setParkName] = useState<string>('ドッグラン');
  const [parkAddress, setParkAddress] = useState<string>('');
  const [parkId, setParkId] = useState<string>('');
  const [mode, setMode] = useState<'entry'|'exit'>('entry');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!token) {
          setError('トークンが見つかりません');
          return;
        }
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-unlock?token=${encodeURIComponent(token)}`, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
          }
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body?.error || '招待の取得に失敗しました');
        }
        const data = await resp.json();
        const inv = data.invite as InviteInfo;
        setInvite(inv);
        // 施設名取得
        const { data: park } = await supabase.from('dog_parks').select('id,name,address').eq('id', inv.park_id).maybeSingle();
        if (park) {
          setParkName((park as any).name || 'ドッグラン');
          setParkAddress((park as any).address || '');
          setParkId((park as any).id || '');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleUnlock = async () => {
    try {
      setError(null);
      setSuccess(null);
      if (!invite) throw new Error('招待情報がありません');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('ログインが必要です');
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        // 目的（入場/退場）は現在ログ用途のみ。サーバー側は将来拡張で使用。
        body: JSON.stringify({ token: invite.token, userId: user?.id || effectiveUserId, purpose: mode })
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok || !body?.success) throw new Error(body?.error || '解錠に失敗しました');
      setSuccess('解錠しました。安全にご利用ください');
    } catch (e) {
      setError(e instanceof Error ? e.message : '解錠に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-6 text-center">読み込み中...</Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-6 text-center text-red-700">{error}</Card>
      </div>
    );
  }

  if (!invite) return null;

  const start = new Date(invite.start_time);
  const end = new Date(invite.end_time);
  const now = new Date();
  const within = now >= start && now <= end;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-2">貸し切りドッグランのご招待</h1>
        <p className="text-gray-700 mb-2">「{parkName}」の貸し切り予約です。</p>
        {parkAddress && (
          <div className="text-sm text-gray-600 mb-2">住所: {parkAddress}</div>
        )}
        <div className="bg-gray-50 rounded p-4 text-sm mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">開始</span>
            <span className="font-medium">{start.toLocaleString('ja-JP')}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-600">終了</span>
            <span className="font-medium">{end.toLocaleString('ja-JP')}</span>
          </div>
        </div>
        {/* 施設詳細へのリンク */}
        {parkId && (
          <div className="mb-4">
            <Link to={`/parks/${parkId}`} className="text-blue-700 underline">
              施設の詳細を見る（住所・説明など）
            </Link>
          </div>
        )}
        <div className="text-xs text-gray-600 mb-4">
          ・予約時間内のみ解錠できます。<br/>
          ・場内ではルールを守って安全にご利用ください。<br/>
          ・解錠までに少し時間がかかる場合があります。
        </div>
        {success && <div className="mb-3 text-green-700">{success}</div>}
        {error && <div className="mb-3 text-red-700">{error}</div>}
        {/* 入場/退場の切り替え（見た目はトグル） */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setMode('entry')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${mode==='entry'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}
          >入場</button>
          <button
            onClick={() => setMode('exit')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${mode==='exit'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}
          >退場</button>
        </div>

        {/* 大きな丸ボタン（通常の仕様に合わせる） */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleUnlock}
            disabled={!within}
            title={within? (mode==='entry'?'入場（解錠）':'退場（解錠）') : '現在は解錠できません'}
            className={`flex items-center justify-center rounded-full shadow-lg transition-colors ${within ? (mode==='exit' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white') : 'bg-gray-300 text-gray-500 cursor-not-allowed'} w-20 h-20 text-lg font-semibold`}
          >
            <Key className="w-7 h-7 mr-1" />
          </button>
          <Button variant="secondary" onClick={() => navigate('/community')}>コミュニティへ戻る</Button>
        </div>
      </Card>
    </div>
  );
}


