import {
    Clock,
    Gift,
    MapPin,
    Shield,
    Star,
    X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FacilityCoupon, UserCoupon } from '../../types/coupons';

interface CouponDisplayProps {
  userCoupon: UserCoupon & { coupon: FacilityCoupon };
  onClose: () => void;
  onUse?: (qrToken: string) => void;
}

export function CouponDisplay({ userCoupon, onClose, onUse }: CouponDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isScreenshotBlocked, setIsScreenshotBlocked] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  const { coupon } = userCoupon;

  useEffect(() => {
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

  const formatDiscount = () => {
    if (!coupon.discount_value) return '';
    
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else {
      return `${coupon.discount_value.toLocaleString()}円 OFF`;
    }
  };

  const handleUseCoupon = () => {
    if (onUse && !userCoupon.is_used) {
      onUse(userCoupon.qr_code_token);
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
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 relative">
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
          
          {/* セキュリティ警告 */}
          <div className="flex items-center justify-center mt-4 bg-black bg-opacity-20 rounded-lg p-2">
            <Shield className="w-4 h-4 mr-2" />
            <span className="text-sm">スクリーンショット禁止</span>
          </div>
        </div>

        {/* クーポン画像 */}
        {coupon.coupon_image_url && (
          <div className="aspect-[16/9] bg-gray-100">
            <img
              src={coupon.coupon_image_url}
              alt="クーポン画像"
              className="w-full h-full object-cover"
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            />
          </div>
        )}

        {/* クーポン内容 */}
        <div className="p-6 space-y-4">
          {/* タイトルと割引 */}
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{coupon.title}</h3>
            {formatDiscount() && (
              <div className="text-3xl font-extrabold text-red-600 mb-2">
                {formatDiscount()}
              </div>
            )}
          </div>

          {/* サービス内容 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Star className="w-5 h-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">サービス内容</h4>
                <p className="text-gray-700 text-sm">{coupon.service_content}</p>
              </div>
            </div>
          </div>

          {/* 利用可能店舗 */}
          <div className="flex items-start space-x-2">
            <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-900">利用可能店舗</h4>
              <p className="text-gray-600 text-sm">
                {/* ここに施設名を表示 - facilityNameは別途取得が必要 */}
                対象施設
              </p>
            </div>
          </div>

          {/* 有効期限 */}
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <span className="font-semibold text-gray-900">有効期限：</span>
              <span className="text-gray-600 ml-1">
                {new Date(coupon.end_date).toLocaleDateString('ja-JP')}
              </span>
              {timeLeft && (
                <span className="text-sm text-red-600 ml-2">
                  (残り{timeLeft})
                </span>
              )}
            </div>
          </div>

          {/* 使用制限 */}
          <div className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-gray-500" />
            <div>
              <span className="font-semibold text-gray-900">使用制限：</span>
              <span className="text-gray-600 ml-1">
                {coupon.usage_limit_type === 'once' ? '1回限り' : '何回でも'}
              </span>
            </div>
          </div>

          {/* 詳細説明 */}
          {coupon.description && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">{coupon.description}</p>
            </div>
          )}

          {/* 使用状態 */}
          <div className="text-center">
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