import { AlertTriangle, Send, X } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

type Props = {
  spotId: string;
  onClose: () => void;
};

const REASONS = [
  '位置情報が間違えている',
  'スポットが存在しない',
  'ワンちゃん入場禁止の場所だった',
  'その他',
] as const;

export default function SpotReportModal({ spotId, onClose }: Props) {
  const [reason, setReason] = useState<typeof REASONS[number]>('位置情報が間違えている');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSending(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('通報にはログインが必要です'); setSending(false); return; }
      const payload = {
        spot_id: spotId,
        reporter_id: user.id,
        reason: reason === 'その他' && comment.trim() ? `その他: ${comment.trim()}` : reason,
      } as const;
      const { error } = await supabase.from('spot_reports').insert(payload);
      if (error) throw error;
      setDone(true);
      setTimeout(() => { onClose(); }, 1200);
    } catch (e: any) {
      setError(e?.message || '送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 text-red-600 font-semibold"><AlertTriangle className="w-5 h-5"/>通報</div>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="p-2 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          {done ? (
            <div className="p-3 bg-green-50 text-green-700 rounded text-sm">通報を受け付けました。ありがとうございました。</div>
          ) : (
            <>
              <div>
                <div className="text-sm font-medium mb-2">理由を選択</div>
                <div className="space-y-2">
                  {REASONS.map(r => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="reason" className="accent-blue-600" checked={reason===r} onChange={()=>setReason(r)} />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">コメント（任意・『その他』選択時は入力推奨）</label>
                <textarea value={comment} onChange={(e)=>setComment(e.target.value)} rows={3} className="w-full border rounded px-3 py-2" placeholder="詳細をご記入ください"/>
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>閉じる</Button>
          {!done && <Button onClick={submit} isLoading={sending}><Send className="w-4 h-4 mr-2"/>送信</Button>}
        </div>
      </Card>
    </div>
  );
}


