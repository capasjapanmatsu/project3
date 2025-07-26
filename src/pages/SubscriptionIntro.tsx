import {
    Building2,
    Check,
    Crown,
    MapPin,
    Shield,
    ShoppingBag,
    Star,
    Truck,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { useStripe } from '../hooks/useStripe';
import { useSubscription } from '../hooks/useSubscription';
import { logFraudDetection } from '../utils/cardFraudPrevention';
import { getSubscriptionTrialDays } from '../utils/dateUtils';
import { checkDuplicateDevice, generateDeviceFingerprint, recordDeviceInfo } from '../utils/deviceFingerprint';
import { supabase } from '../utils/supabase';

const FEATURES = [
  {
    icon: MapPin,
    title: '全国どこでも使い放題',
    description: '日本全国のドッグランが月額定額で利用し放題。旅行先でも安心してワンちゃんと楽しめます。',
    highlight: true
  },
  {
    icon: ShoppingBag,
    title: 'ペットショップ10%OFF',
    description: '提携ペットショップでのお買い物が常に10%OFF。フードやおもちゃがお得に購入できます。',
    highlight: true
  },
  {
    icon: Truck,
    title: '送料無料',
    description: 'ペットショップでのオンライン購入時の送料が無料。重いフードも自宅まで無料配送。',
    highlight: true
  },
  {
    icon: Building2,
    title: 'ドッグラン施設貸し切り20%OFF',
    description: 'ドッグラン施設を貸し切りでご利用いただける場合は、20%OFFの特典をご用意しています。',
    highlight: true
  }
];

const SUBSCRIPTION_PLAN = {
  title: 'サブスクリプション',
  price: '3,800円',
  period: '月額',
  features: [
    '全国ドッグラン使い放題',
    'ペットショップ10%OFF',
    '送料無料',
    'ドッグラン施設貸し切り20%OFF'
  ]
};

export function SubscriptionIntro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isActive: hasSubscription } = useSubscription();
  const { createCheckoutSession, loading: checkoutLoading } = useStripe();
  const [error, setError] = useState('');
  const [isReturningUser, setIsReturningUser] = useState<boolean | null>(null); // null = 未確認
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [fraudCheckResult, setFraudCheckResult] = useState<{
    isBlocked: boolean;
    riskScore: number;
    reasons: string[];
  } | null>(null);

  // ページ読み込み時にサブスクリプション履歴をチェック
  useEffect(() => {
    const checkSubscriptionHistory = async () => {
      if (!user) return;

      try {
        const { data: subscriptionHistory, error: historyError } = await supabase
          .from('stripe_user_subscriptions')
          .select('id, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (historyError) {
          console.error('Error checking subscription history:', historyError);
          setIsReturningUser(false); // エラー時は初回扱い
          return;
        }

        const hasHistory = subscriptionHistory && subscriptionHistory.length > 0;
        setIsReturningUser(hasHistory);
      } catch (error) {
        console.error('Error in checkSubscriptionHistory:', error);
        setIsReturningUser(false); // エラー時は初回扱い
      }
    };

    void checkSubscriptionHistory();
  }, [user]);

  // デバイスフィンガープリントと不正検知
  useEffect(() => {
    const performFraudCheck = async () => {
      if (!user) return;

      try {
        // デバイスフィンガープリントを生成
        const deviceInfo = await generateDeviceFingerprint();
        setDeviceFingerprint(deviceInfo.fingerprint);

        // デバイス情報を記録
        await recordDeviceInfo(user.id, deviceInfo, 'subscription');

        // 重複デバイスチェック
        const duplicateCheck = await checkDuplicateDevice(deviceInfo.fingerprint);
        
        let riskScore = 0;
        const reasons: string[] = [];

        if (duplicateCheck.isDuplicate) {
          riskScore += 40;
          reasons.push('duplicate_device');
          
          // 不正検知ログを記録
          await logFraudDetection(
            user.id,
            'duplicate_device',
            riskScore,
            {
              fingerprint: deviceInfo.fingerprint,
              userCount: duplicateCheck.count,
              userIds: duplicateCheck.userIds,
              deviceInfo
            },
            riskScore >= 70 ? 'restriction' : 'warning'
          );
        }

        // リスクスコアが高い場合はブロック
        const isBlocked = riskScore >= 70;
        
        setFraudCheckResult({
          isBlocked,
          riskScore,
          reasons
        });

        if (isBlocked) {
          setError('セキュリティ上の理由により、この操作を実行できません。サポートにお問い合わせください。');
        }

      } catch (error) {
        console.error('Error in fraud check:', error);
        // エラー時は通常通り処理を続行
        setFraudCheckResult({
          isBlocked: false,
          riskScore: 0,
          reasons: []
        });
      }
    };

    void performFraudCheck();
  }, [user]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (hasSubscription) {
      navigate('/dashboard');
      return;
    }

    try {
      setError('');
      
      // 過去のサブスクリプション履歴をチェック
      const { data: subscriptionHistory, error: historyError } = await supabase
        .from('stripe_user_subscriptions')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error checking subscription history:', historyError);
      }

      // 過去にサブスクリプションに加入したことがあるかチェック
      const hasSubscriptionHistory = subscriptionHistory && subscriptionHistory.length > 0;
      
      // 初月無料期間の日数を計算
      let trialDays = 0;
      if (!hasSubscriptionHistory) {
        // 初回登録者は初月無料
        try {
          trialDays = getSubscriptionTrialDays();
        } catch (dateError) {
          console.warn('Date calculation error, using default:', dateError);
          trialDays = 30; // デフォルト値
        }
      } else {
        // 再登録者は即課金（トライアル期間0）
        trialDays = 0;
        console.log('User has subscription history - no trial period');
      }
      
      const subscriptionProduct = {
        priceId: 'price_1PDVF7B5vWJf0TQj6Lm0BVLP', // Stripeの実際のPrice ID
        mode: 'subscription' as const
      };

      await createCheckoutSession({
        priceId: subscriptionProduct.priceId,
        mode: subscriptionProduct.mode,
        trialPeriodDays: trialDays, // 初回は無料期間、再登録は0
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/subscription-intro?canceled=true`,
      });
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('決済ページの作成に失敗しました。もう一度お試しください。');
    }
  };

  if (hasSubscription) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SEO
          title="サブスクリプション会員"
          description="すでにサブスクリプション会員です"
        />
        <Card className="p-8 text-center">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">既にサブスクリプション会員です</h1>
          <p className="text-gray-600 mb-6">
            全国のドッグランをお楽しみください！
          </p>
          <div className="space-x-4">
            <Button onClick={() => navigate('/access-control')}>
              入退場管理へ
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/dashboard')}
            >
              設定変更
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SEO
        title="サブスクリプション - ドッグパークJP"
        description="全国のドッグランが使い放題！ペットショップでの購入も10%OFF&送料無料でお得にワンちゃんライフを楽しもう。"
      />

      {/* ヒーローセクション */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Star className="w-4 h-4 mr-2" />
          {isReturningUser === null ? '読み込み中...' : 
           isReturningUser ? '再登録の方向け' : '初月無料キャンペーン中！'}
        </div>
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            ワンちゃんライフを
          </span>
          <br />
          もっと楽しく、もっとお得に
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          {isReturningUser === null ? (
            <>月額3,800円で全国のドッグランが使い放題！</>
          ) : isReturningUser ? (
            <>
              <strong>再登録の方</strong>は即日から課金開始となります。<br />
              登録日から月末まで月額3,800円でご利用いただけます。<br />
            </>
          ) : (
            <>
              <strong>初月完全無料！</strong>登録日から月末まで0円でお試し可能<br />
            </>
          )}
          月額3,800円で全国のドッグランが使い放題！<br />
          さらにペットショップでの購入も10%OFF&送料無料でとってもお得です。
        </p>
      </div>

      {/* 主要メリット */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {FEATURES.filter(f => f.highlight).map((feature, index) => (
          <Card key={index} className="p-6 text-center border-2 border-purple-200 hover:border-purple-300 transition-colors">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <feature.icon className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </Card>
        ))}
      </div>

      {/* サブスクリプションプラン */}
      <Card className="p-8 mb-12">
        <h2 className="text-2xl font-bold text-center mb-8">サブスクリプションプラン</h2>
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-lg border-2 border-purple-300 bg-purple-50 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                初月無料
              </span>
            </div>
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">{SUBSCRIPTION_PLAN.title}</h3>
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {SUBSCRIPTION_PLAN.price}
              </div>
              <div className="text-gray-500">{SUBSCRIPTION_PLAN.period}</div>
            </div>
            <ul className="space-y-2">
              {SUBSCRIPTION_PLAN.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-center">
                  <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* サブスクリプション管理について */}
      <Card className="p-8 mb-12 bg-blue-50 border-blue-200">
        <div className="text-center">
          <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-4">安心のサブスクリプション管理</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            サブスクリプションの<strong>一時停止・退会</strong>は、マイページよりいつでも簡単に行えます。<br />
            お客様のペースでサービスをご利用いただけます。
          </p>
        </div>
      </Card>

      {/* コールトゥアクション */}
      <Card className="p-8 text-center bg-gradient-to-r from-purple-50 to-blue-50">
        <Crown className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">今すぐ始めよう！</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          <strong>初月完全無料！</strong>今月登録すれば月末まで0円でお試し。<br />
          翌月1日から月額3,800円の統一料金で、いつでもキャンセル可能です。<br />
          あなたとワンちゃんの新しい冒険が始まります。
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4 max-w-md mx-auto">
          <Button
            onClick={() => void handleSubscribe()}
            isLoading={checkoutLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
          >
            <Zap className="w-5 h-5 mr-2" />
            {isReturningUser === null ? '加入手続きを進める' :
             isReturningUser ? '即日課金で始める（月額3,800円）' : '初月無料で始める（翌月から月額3,800円）'}
          </Button>

          <p className="text-xs text-gray-500">
            {isReturningUser === null ? 'Stripeの安全な決済ページに移動します' :
             isReturningUser ? '再登録の方は登録日から課金開始。Stripeの安全な決済ページに移動します' : 
             '初月は完全無料。翌月1日から課金開始。Stripeの安全な決済ページに移動します'}
          </p>

          <div className="flex justify-center space-x-4 text-sm">
            <Link 
              to="/access-control" 
              className="text-gray-500 hover:text-gray-700"
            >
              後で決める
            </Link>
            <span className="text-gray-300">|</span>
            <Link 
              to="/shop" 
              className="text-purple-600 hover:text-purple-700"
            >
              ペットショップを見る
            </Link>
          </div>
        </div>
      </Card>

      {/* よくある質問セクション */}
      <Card className="p-8">
        <h2 className="text-2xl font-bold text-center mb-8">よくある質問</h2>
        <div className="space-y-6 max-w-3xl mx-auto">
          <div>
            <h3 className="font-semibold mb-2">Q. 初月無料はどのような仕組みですか？</h3>
            <p className="text-gray-600">
              A. <strong>初回登録の方のみ</strong>初月は登録日に関わらず、その月の月末まで無料でご利用いただけます。例えば15日に登録されても、月末まで無料です。翌月1日から月額3,800円の請求が開始されます。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Q. 一度解約して再登録する場合はどうなりますか？</h3>
            <p className="text-gray-600">
              A. 再登録の方は<strong>初月無料の対象外</strong>となります。登録日から即座に課金が開始され、登録日から月末まで月額3,800円（満額）をお支払いいただきます。翌月からは通常通り毎月1日から月末までの請求となります。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Q. 請求はいつから始まりますか？</h3>
            <p className="text-gray-600">
              A. <strong>初回登録</strong>：登録月の翌月1日から請求開始。<strong>再登録</strong>：登録日から即座に課金開始。請求は毎月1日〜月末までの1ヶ月単位で統一されています。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Q. いつでもキャンセルできますか？</h3>
            <p className="text-gray-600">
              A. はい、いつでもキャンセル可能です。マイページから簡単に解約手続きができます。解約月の月末まではサービスをご利用いただけます。
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Q. ペットショップの割引はどこで使えますか？</h3>
            <p className="text-gray-600">
              A. 提携ペットショップで使用できます。詳細は
              <Link 
                to="/petshop" 
                className="text-purple-600 hover:text-purple-700 underline mx-1"
              >
                ペットショップページ
              </Link>
              をご確認ください。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
} 