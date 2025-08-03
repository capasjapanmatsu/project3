import {
    Gift,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FacilityCoupon, UserCoupon } from '../../types/coupons';
import { supabase } from '../../utils/supabase';

interface CouponDisplayProps {
  userCoupon: UserCoupon & { coupon: FacilityCoupon & { facility?: { name: string; address: string } } };
  onClose: () => void;
  onUse?: (qrToken: string) => void;
}

export function CouponDisplay({ userCoupon, onClose, onUse }: CouponDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isScreenshotBlocked, setIsScreenshotBlocked] = useState(false);
  const [openedAt, setOpenedAt] = useState<string>('');
  const [isProcessingUse, setIsProcessingUse] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  const { coupon } = userCoupon;

  useEffect(() => {
    // クーポンを開いた時刻を記録
    const now = new Date();
    setOpenedAt(now.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));

    // 1回限りクーポンの場合、表示時点で使用済みにする
    if (coupon.usage_limit_type === 'once' && !userCoupon.is_used && !isProcessingUse) {
      void handleAutoUse();
    }

    // スクリーンショット防止の設定
    setIsScreenshotBlocked(true);
    
    // CSS でスクリーンショット防止を試行
    if (displayRef.current) {
      displayRef.current.style.userSelect = 'none';
      displayRef.current.style.webkitUserSelect = 'none';
      displayRef.current.style.pointerEvents = 'none';
      
      // 画面キャプチャを検出する試み（完全ではないが抑制効果あり）
      const preventScreenshot = (e: KeyboardEvent) => {
        // Print Screen キー
        if (e.key === 'PrintScreen') {
          e.preventDefault();
          alert('スクリーンショットは禁止されています。店員にこの画面を直接お見せください。');
          return false;
        }
        
        // Ctrl+Shift+I (開発者ツール)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          return false;
        }
        
        // F12 (開発者ツール)
        if (e.key === 'F12') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+S (保存)
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          return false;
        }
      };

      document.addEventListener('keydown', preventScreenshot);
      
      // 右クリック禁止
      const preventRightClick = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };
      
      document.addEventListener('contextmenu', preventRightClick);

      return () => {
        document.removeEventListener('keydown', preventScreenshot);
        document.removeEventListener('contextmenu', preventRightClick);
      };
    }
  }, []);

  useEffect(() => {
    // 有効期限までの残り時間を計算
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(coupon.end_date).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`${days}日${hours}時間${minutes}分`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}時間${minutes}分`);
        } else {
          setTimeLeft(`${minutes}分`);
        }
      } else {
        setTimeLeft('有効期限切れ');
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // 1分ごとに更新

    return () => clearInterval(interval);
  }, [coupon.end_date]);

  // 1回限りクーポンの自動使用処理
  const handleAutoUse = async () => {
    if (isProcessingUse) return;
    
    setIsProcessingUse(true);
    
    try {
      const { error } = await supabase
        .from('user_coupons')
        .update({
          is_used: true,
          used_at: new Date().toISOString()
        })
        .eq('qr_code_token', userCoupon.qr_code_token);

      if (error) {
        console.error('❌ Error auto-using coupon:', error);
        return;
      }

      // onUse コールバックがあれば呼び出し
      if (onUse) {
        onUse(userCoupon.qr_code_token);
      }
      
    } catch (error) {
      console.error('❌ Error in handleAutoUse:', error);
    } finally {
      setIsProcessingUse(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={displayRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ 
          // 追加のスクリーンショット防止スタイル
          filter: isScreenshotBlocked ? 'none' : 'blur(5px)',
          WebkitFilter: isScreenshotBlocked ? 'none' : 'blur(5px)'
        }}
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 pointer-events-auto"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">ドッグパークJP</h1>
            <h2 className="text-xl font-medium">クーポン</h2>
          </div>
          
          {/* クーポン表示時刻 */}
          <div className="flex items-center justify-center mt-4 bg-black bg-opacity-20 rounded-lg p-2">
            <span className="text-sm">表示: {openedAt}</span>
          </div>
        </div>

        {/* メインクーポン表示エリア */}
        <div className="p-6">
          <div className="w-full max-w-sm mx-auto">
            {coupon.coupon_image_url ? (
              // 画像クーポンの表示
              <div className="aspect-square w-full border-2 border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={coupon.coupon_image_url}
                  alt="クーポン画像"
                  className="w-full h-full object-cover"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                />
              </div>
            ) : (
              // 文字クーポンの表示（CouponManagerと同じデザイン、赤色グラデーション）
              <div className="aspect-square w-full border-2 border-gray-300 rounded-lg relative overflow-hidden">
                {/* チケット風の背景（赤色グラデーション） */}
                <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 relative">
                  {/* チケットの切り込み装飾 */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                  
                  {/* 背景の薄い「COUPON」テキスト */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <span className="text-6xl font-bold text-white transform rotate-12">
                      COUPON
                    </span>
                  </div>
                  
                  {/* メインコンテンツ */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center space-y-3">
                    {/* ドッグパークJPクーポン（一番上） */}
                    <div className="bg-white/95 px-3 py-1 rounded-full shadow-sm">
                      <span className="text-xs font-medium text-red-600">
                        ドッグパークJPクーポン
                      </span>
                    </div>
                    
                    {/* 店舗名（2番目） */}
                    <div className="text-white">
                      <h2 className="text-lg font-bold leading-tight">
                        {coupon.facility?.name || '店舗名'}
                      </h2>
                    </div>
                    
                    {/* クーポンタイトル */}
                    <div className="text-white">
                      <h3 className="text-xl font-bold leading-tight">
                        {coupon.title}
                      </h3>
                    </div>
                    
                    {/* サービス内容 */}
                    <div className="text-white/90">
                      <p className="text-base leading-tight">
                        {coupon.service_content}
                      </p>
                    </div>
                    
                    {/* 割引表示 */}
                    {(coupon.discount_value && coupon.discount_type) && (
                      <div className="bg-white text-red-600 px-6 py-3 rounded-lg shadow-md">
                        <span className="text-4xl font-bold">
                          {coupon.discount_value}{coupon.discount_type === 'amount' ? '円' : '%'}
                        </span>
                        <span className="text-lg ml-2 font-medium">
                          OFF
                        </span>
                      </div>
                    )}
                    
                    {/* 詳細説明 */}
                    {coupon.description && (
                      <div className="border-t border-white/30 pt-2">
                        <p className="text-sm text-white/80">
                          {coupon.description}
                        </p>
                      </div>
                    )}
                    
                    {/* 有効期限 */}
                    {(coupon.start_date && coupon.end_date) && (
                      <div className="border-t border-white/30 pt-2 mt-2">
                        <p className="text-xs text-white/90 font-medium">
                          有効期限: {new Date(coupon.start_date).toLocaleDateString()} 〜 {new Date(coupon.end_date).toLocaleDateString()}
                        </p>
                        {timeLeft && (
                          <p className="text-xs text-white/70 mt-1">
                            (残り{timeLeft})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-2 text-xs text-gray-500 text-center">
              {coupon.coupon_image_url ? '画像クーポン' : 'テキストクーポン'}
            </div>
          </div>

          {/* 使用制限情報 */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Gift className="w-4 h-4 mr-1" />
                <span>使用制限: {coupon.usage_limit_type === 'once' ? '1回限り' : '何回でも'}</span>
              </div>
            </div>
          </div>

          {/* 使用状態 */}
          <div className="mt-6 text-center">
            {userCoupon.is_used ? (
              <div className="bg-gray-100 text-gray-600 py-3 px-4 rounded-lg">
                <p className="font-semibold">使用済み</p>
                <p className="text-sm">
                  {userCoupon.used_at && new Date(userCoupon.used_at).toLocaleString('ja-JP')}
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-semibold mb-2">使用可能</p>
                <p className="text-green-700 text-sm mb-3">
                  この画面を店員さんにお見せください
                </p>
                {coupon.usage_limit_type === 'once' && (
                  <p className="text-red-600 text-xs">
                    ※このクーポンは1回限りです。使用後は表示できなくなります。
                  </p>
                )}
              </div>
            )}
          </div>

          {/* QRコード表示エリア（将来の拡張用） */}
          <div className="text-center text-xs text-gray-500 mt-4">
            ID: {userCoupon.qr_code_token.substring(0, 8)}...
          </div>
        </div>

        {/* フッター */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            ※このクーポンは{coupon.usage_limit_type === 'once' ? '一度' : '何度でも'}ご利用いただけます
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ※有効期限をお確かめの上ご利用ください
          </p>
        </div>
      </div>
    </div>
  );
} 