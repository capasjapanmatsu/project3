import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';

export default function InvitePage() {
  const { token } = useParams();
  const { user, effectiveUserId } = useAuth();
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-unlock?token=${encodeURIComponent(token || '')}`);
        const body = await resp.json();
        if (!resp.ok) throw new Error(body?.error || '読み込みに失敗しました');
        setInfo(body.invite);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleUnlock = async () => {
    if (!info) return;
    setUnlocking(true);
    setError('');
    try {
      const { data: session } = await (await import('../utils/supabase')).supabase.auth.getSession();
      const jwt = session.session?.access_token;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: jwt ? `Bearer ${jwt}` : '' },
        body: JSON.stringify({ token, userId: user?.id || effectiveUserId }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || '解錠に失敗しました');
      alert('解錠しました。ドアをお開けください。');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-2">{info?.title || '予約のご招待'}</h1>
        <p className="text-gray-700">場所ID: {info?.park_id}</p>
        <p className="text-gray-700">開始: {new Date(info?.start_time).toLocaleString()}</p>
        <p className="text-gray-700">終了: {new Date(info?.end_time).toLocaleString()}</p>
        <div className="mt-4">
          <Button onClick={handleUnlock} disabled={unlocking}>{unlocking ? '解錠中...' : 'この予約で解錠する'}</Button>
        </div>
      </Card>
    </div>
  );
}


