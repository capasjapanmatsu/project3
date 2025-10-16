import { supabase } from '@/utils/supabase';
import Button from './Button';
import Card from './Card';

type Props = {
  title?: string;
  description?: string;
};

export default function PremiumPaywall({
  title = 'プレミアムオーナー会員',
  description = 'クーポン管理と予約管理はプレミアム会員（月額¥500）でご利用いただけます。'
}: Props) {
  const startCheckout = async () => {
    const priceId = import.meta.env.VITE_PREMIUM_OWNER_PRICE_ID;
    if (!priceId) {
      // eslint-disable-next-line no-alert
      alert('環境変数 VITE_PREMIUM_OWNER_PRICE_ID が未設定です');
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      const success = `${window.location.origin}/payment-return?success=true`;
      const cancel = `${window.location.origin}/payment-return?canceled=true`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          mode: 'subscription',
          price_id: priceId,
          trial_period_days: 30,
          success_url: success,
          cancel_url: cancel,
          notes: 'premium_owner_subscription'
        })
      });
      const body = await res.json();
      if (!res.ok || !body?.url) throw new Error(body?.error || 'checkout failed');
      window.location.href = body.url;
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(`決済開始に失敗しました: ${e?.message || e}`);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-700 mb-4">{description}</p>
      <ul className="text-sm text-gray-700 list-disc pl-5 mb-4">
        <li>クーポン管理（発行・配布・使用履歴）</li>
        <li>予約管理（受付・カレンダー・上限制御）</li>
        <li>サポート優先対応</li>
      </ul>
      <div className="flex items-center justify-between">
        <div className="text-gray-900 font-bold">月額 ¥500</div>
        <Button onClick={startCheckout} className="bg-blue-600 hover:bg-blue-700">お支払いに進む</Button>
      </div>
    </Card>
  );
}


