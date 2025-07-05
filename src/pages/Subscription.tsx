import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../context/AuthContext'; // ← ここだけでOK
import {
  Crown,
  CheckCircle,
  Calendar,
  CreditCard,
  ArrowLeft,
  PawPrint,
  ShoppingBag,
  Building,
  Users,
  Clock,
  Shield,
  AlertTriangle,
  Pause,
  Play,
  Info
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { useStripe } from '../hooks/useStripe';
import { useSubscription } from '../hooks/useSubscription';
import { products } from '../stripe-config';
import { supabase } from '../utils/supabase';
export function Subscription() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { createCheckoutSession, loading: checkoutLoading, error: checkoutError } = useStripe();
  const { 
    isActive, 
    isPaused,
    loading: subscriptionLoading, 
    currentPeriodEnd,
    paymentMethod,
    willCancel
  } = useSubscription();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmPause, setShowConfirmPause] = useState(false);
  const [showConfirmResume, setShowConfirmResume] = useState(false);
  const [isPauseLoading, setIsPauseLoading] = useState(false);
  const [isResumeLoading, setIsResumeLoading] = useState(false);
  const [pauseError, setPauseError] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [pauseSuccess, setPauseSuccess] = useState('');
  const [resumeSuccess, setResumeSuccess] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
    
    // Check for success parameter in URL
    if (location.search.includes('success=true')) {
      setShowSuccessMessage(true);
      // Remove the query parameter
      window.history.replaceState({}, document.title, location.pathname);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [user, navigate, location]);

  const handleSubscribe = async () => {
    const subscriptionProduct = products.find(p => p.mode === 'subscription');
    if (!subscriptionProduct) {
      console.error('Subscription product not found');
      return;
    }

    await createCheckoutSession({
      priceId: subscriptionProduct.priceId,
      mode: 'subscription',
      successUrl: `${window.location.origin}/subscription?success=true`,
      cancelUrl: `${window.location.origin}/subscription?canceled=true`,
    });
  };

  const handleCancelSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サブスクリプションのキャンセルに失敗しました');
      }

      setShowConfirmCancel(false);
      window.location.reload();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert((error as Error).message || 'サブスクリプションのキャンセルに失敗しました');
    }
  };

  const handlePauseSubscription = async () => {
    try {
      setIsPauseLoading(true);
      setPauseError('');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-pause-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サブスクリプションの一時停止に失敗しました');
      }

      setShowConfirmPause(false);
      setPauseSuccess('サブスクリプションを一時停止しました。翌月から請求が停止されます。');
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setPauseSuccess('');
      }, 5000);
      
      // リロードして最新の状態を取得
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error pausing subscription:', error);
      setPauseError((error as Error).message || 'サブスクリプションの一時停止に失敗しました');
    } finally {
      setIsPauseLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setIsResumeLoading(true);
      setResumeError('');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-resume-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サブスクリプションの再開に失敗しました');
      }

      setShowConfirmResume(false);
      setResumeSuccess('サブスクリプションを再開しました。当月から請求が再開されます。');
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setResumeSuccess('');
      }, 5000);
      
      // リロードして最新の状態を取得
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resuming subscription:', error);
      setResumeError((error as Error).message || 'サブスクリプションの再開に失敗しました');
    } finally {
      setIsResumeLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Crown className="w-8 h-8 text-purple-600 mr-3" />
          ドッグパークJPサブスクリプション
        </h1>
        <p className="text-lg text-gray-600">
          月額3,800円で全国のドッグランが使い放題
        </p>
      </div>

      {/* サブスクリプションステータス */}
      {isActive || isPaused ? (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">サブスクリプション会員</h2>
                <p className="opacity-90">全国のドッグラン使い放題 + ペットショップ10%OFF</p>
                {isPaused && (
                  <div className="mt-2 bg-white/20 px-3 py-1 rounded-full inline-flex items-center">
                    <Pause className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">一時停止中</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">月額</p>
              <p className="text-2xl font-bold">¥3,800</p>
              {currentPeriodEnd && (
                <p className="text-sm opacity-80 mt-1">
                  {willCancel 
                    ? `${currentPeriodEnd}に終了予定` 
                    : isPaused
                      ? `${currentPeriodEnd}まで有効`
                      : `次回更新日: ${currentPeriodEnd}`}
                </p>
              )}
            </div>
          </div>
          
          {paymentMethod && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">お支払い方法: {paymentMethod}</span>
              </div>
            </div>
          )}
          
          {/* 一時停止中の表示 */}
          {isPaused && (
            <div className="mt-4 bg-white/10 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Pause className="w-5 h-5" />
                <p className="font-medium">サブスクリプションは一時停止中です</p>
              </div>
              <p className="text-sm mt-1">現在の期間（{currentPeriodEnd}まで）は引き続きご利用いただけます。その後は自動更新されません。</p>
            </div>
          )}
          
          {/* 解約予定の表示 */}
          {willCancel && !isPaused && (
            <div className="mt-4 bg-white/10 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <p className="font-medium">サブスクリプションは現在の期間終了後にキャンセルされます</p>
              </div>
              <p className="text-sm mt-1">引き続き{currentPeriodEnd}までご利用いただけます</p>
            </div>
          )}
          
          {/* アクションボタン */}
          <div className="mt-4 flex justify-end space-x-3">
            {isPaused ? (
              <Button 
                onClick={() => setShowConfirmResume(true)}
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                <Play className="w-4 h-4 mr-2" />
                サブスクリプションを再開
              </Button>
            ) : willCancel ? (
              <Button 
                disabled
                className="bg-white/50 text-purple-600 cursor-not-allowed"
              >
                解約手続き中
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => setShowConfirmPause(true)}
                  className="bg-white/80 text-purple-600 hover:bg-white hover:text-gray-900 font-bold"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  一時停止
                </Button>
                <Button 
                  onClick={() => setShowConfirmCancel(true)}
                  className="bg-white text-purple-600 hover:bg-gray-100 hover:text-gray-900 font-bold"
                >
                  解約する
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center mb-6">
            <Crown className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">サブスクリプションに加入する</h2>
            <p className="text-gray-600">
              月額3,800円で全国のドッグランが使い放題になります
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                <PawPrint className="w-5 h-5 text-purple-600 mr-2" />
                ドッグラン使い放題
              </h3>
              <div className="space-y-2 text-sm text-purple-800">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>全国のドッグランが使い放題</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>3頭まで同時入場可能</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>施設貸し切り20%OFF</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>プライベートブース利用可能</span>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                <ShoppingBag className="w-5 h-5 text-green-600 mr-2" />
                ショッピング特典
              </h3>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>ペットショップ全商品10%OFF</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>送料無料（金額制限なし）</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>会員限定商品へのアクセス</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>優先カスタマーサポート</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Button 
              onClick={handleSubscribe}
              isLoading={checkoutLoading}
              className="bg-purple-600 hover:bg-purple-700 text-lg py-3 px-8"
            >
              <Crown className="w-5 h-5 mr-2" />
              今すぐ加入する（月額3,800円）
            </Button>
            
            {checkoutError && (
              <p className="text-red-600 mt-2">{checkoutError}</p>
            )}
            
            <p className="text-sm text-gray-500 mt-3">
              いつでもキャンセル可能・初月無料キャンペーン中
            </p>
          </div>
        </Card>
      )}

      {/* 成功メッセージ */}
      {showSuccessMessage && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium">サブスクリプションの登録が完了しました！</p>
            <p className="text-sm mt-1">全国のドッグランが使い放題になりました。ペットショップでの10%割引も適用されます。</p>
          </div>
        </div>
      )}

      {/* 一時停止の成功メッセージ */}
      {pauseSuccess && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium">{pauseSuccess}</p>
          </div>
        </div>
      )}

      {/* 再開の成功メッセージ */}
      {resumeSuccess && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium">{resumeSuccess}</p>
          </div>
        </div>
      )}

      {/* サブスクリプションの特徴 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">全国対応</h3>
          </div>
          <p className="text-sm text-gray-600">
            日本全国のドッグパークJP加盟施設で利用可能。旅行先でも安心して愛犬と遊べます。
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">3頭まで同時入場</h3>
          </div>
          <p className="text-sm text-gray-600">
            最大3頭まで同時入場可能。複数の愛犬を飼っている方も追加料金なしで利用できます。
          </p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">時間制限なし</h3>
          </div>
          <p className="text-sm text-gray-600">
            1日の利用時間に制限はありません。朝から晩まで、愛犬と思う存分遊べます。
          </p>
        </Card>
      </div>

      {/* サブスクリプション管理について */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">サブスクリプション管理について</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><span className="font-medium">一時停止:</span> サブスクリプションを一時的に停止できます。一時停止すると、現在の期間が終了した後、次の請求が行われなくなります。いつでも再開できます。</p>
              <p><span className="font-medium">再開:</span> 一時停止中のサブスクリプションを再開できます。再開すると、当月から請求が再開されます。</p>
              <p><span className="font-medium">解約:</span> サブスクリプションを完全に解約できます。解約しても、現在の期間が終了するまではサービスを利用できます。</p>
            </div>
          </div>
        </div>
      </Card>

      {/* よくある質問 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <Shield className="w-6 h-6 text-blue-600 mr-2" />
          よくある質問
        </h2>
        
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-900 mb-2">Q: サブスクリプションはいつでもキャンセルできますか？</h3>
            <p className="text-gray-700">
              A: はい、いつでもキャンセル可能です。キャンセルした場合でも、次回更新日まではサービスを利用できます。自動更新が停止されるだけで、即時解約ではありません。
            </p>
          </div>
          
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-900 mb-2">Q: 一時停止と解約の違いは何ですか？</h3>
            <p className="text-gray-700">
              A: 一時停止は次回更新日から請求が停止され、いつでも再開できます。解約は完全にサブスクリプションを終了し、再開するには新たに登録する必要があります。どちらも現在の期間が終了するまではサービスを利用できます。
            </p>
          </div>
          
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-900 mb-2">Q: 3頭以上の犬を連れて行くことはできますか？</h3>
            <p className="text-gray-700">
              A: サブスクリプションでは最大3頭まで同時入場可能です。4頭以上の入場はできません。
            </p>
          </div>
          
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-900 mb-2">Q: 施設貸し切りも無料ですか？</h3>
            <p className="text-gray-700">
              A: 施設貸し切りは別料金ですが、サブスクリプション会員は20%割引で利用できます（通常4,400円→会員3,520円/時間）。
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Q: 支払い方法を変更するにはどうすればいいですか？</h3>
            <p className="text-gray-700">
              A: マイページの「支払い設定」から、クレジットカード情報の更新や変更が可能です。次回の請求から新しい支払い方法が適用されます。
            </p>
          </div>
        </div>
      </Card>

      {/* キャンセル確認モーダル */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-4">
              <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">サブスクリプションを解約しますか？</h3>
              <p className="text-gray-600">
                解約すると、現在の期間（{currentPeriodEnd}まで）は引き続きご利用いただけますが、その後は自動更新されません。
              </p>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">解約後の変更点</p>
                  <ul className="space-y-1">
                    <li>• ドッグランの利用が1日800円になります</li>
                    <li>• ペットショップの10%割引が適用されなくなります</li>
                    <li>• 施設貸し切りの20%割引が適用されなくなります</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmCancel(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCancelSubscription}
                className="bg-red-600 hover:bg-red-700"
              >
                解約する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 一時停止確認モーダル */}
      {showConfirmPause && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-4">
              <Pause className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">サブスクリプションを一時停止しますか？</h3>
              <p className="text-gray-600">
                一時停止すると、現在の期間（{currentPeriodEnd}まで）は引き続きご利用いただけますが、翌月からの請求が停止されます。いつでも再開できます。
              </p>
            </div>
            
            {pauseError && (
              <div className="bg-red-50 p-3 rounded-lg mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{pauseError}</p>
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">一時停止について</p>
                  <ul className="space-y-1">
                    <li>• 現在の期間（{currentPeriodEnd}まで）は引き続きご利用いただけます</li>
                    <li>• 翌月からの請求が停止されます</li>
                    <li>• いつでも再開ボタンを押すだけで再開できます</li>
                    <li>• 再開すると当月から請求が再開されます</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmPause(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handlePauseSubscription}
                isLoading={isPauseLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                一時停止する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 再開確認モーダル */}
      {showConfirmResume && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-4">
              <Play className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">サブスクリプションを再開しますか？</h3>
              <p className="text-gray-600">
                再開すると、当月から請求が再開されます。
              </p>
            </div>
            
            {resumeError && (
              <div className="bg-red-50 p-3 rounded-lg mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{resumeError}</p>
                </div>
              </div>
            )}
            
            <div className="bg-green-50 p-3 rounded-lg mb-4">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">再開について</p>
                  <ul className="space-y-1">
                    <li>• 再開すると当月から請求が再開されます</li>
                    <li>• すべての会員特典がすぐに利用可能になります</li>
                    <li>• 全国のドッグランが使い放題になります</li>
                    <li>• ペットショップの10%割引が適用されます</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmResume(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleResumeSubscription}
                isLoading={isResumeLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                再開する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}