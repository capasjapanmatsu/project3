import { Gift, Plus, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface UserCoupon {
  id: string;
  coupon_id: string;
  user_id: string;
  acquired_at: string;
  used_at?: string;
  facility_coupons: {
    id: string;
    facility_id: string;
    title: string;
    service_content: string;
    discount_value: number;
    discount_type: 'percentage' | 'amount';
    description: string;
    validity_start: string;
    validity_end: string;
    usage_limit_type: 'once' | 'unlimited';
    coupon_image_url?: string;
    pet_facilities: {
      name: string;
    };
  };
}

export const FloatingActionButton = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // データ取得
  useEffect(() => {
    if (user) {
      void fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // ユーザーのクーポンを取得（正しいカラム名を使用）
      const { data: couponsData, error } = await supabase
        .from('user_coupons')
        .select(`
          *,
          facility_coupons (
            id, facility_id, title, service_content, discount_value, discount_type, description, start_date, end_date, usage_limit_type, coupon_image_url,
            pet_facilities (name)
          )
        `)
        .eq('user_id', user.id)
        .is('used_at', null)
        .gte('facility_coupons.end_date', new Date().toISOString());

      if (error) {
        console.error('Error fetching coupons:', error);
      } else {
        setUserCoupons(couponsData || []);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ページフォーカス時にデータを自動更新
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        void fetchUserData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const closeAllModals = () => {
    setIsOpen(false);
  };

  // ログインしていない場合は表示しない
  if (!user) {
    return null;
  }

  return (
    <>
      {/* フローティングアクションボタン */}
      <div className="fixed bottom-28 right-4 z-40">
        {/* サブメニュー（下から上へ表示） */}
        {isOpen && (
          <div className="absolute bottom-24 -right-28 flex flex-col space-y-3 animate-in slide-in-from-right duration-300">
            {/* JPパスポート機能ボタン（上位置） */}
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/jp-passport');
              }}
              className="flex items-center bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-full px-12 py-4 shadow-xl transform transition-all duration-300 hover:scale-105 hover:-translate-x-2 min-w-[300px] border-2 border-white/20"
            >
              <Shield className="w-5 h-5 mr-3 drop-shadow-sm" />
              <div className="text-left">
                <span className="text-sm font-bold whitespace-nowrap block">JPパスポート</span>
                <span className="text-xs opacity-90 whitespace-nowrap block">ワクチン証明書表示</span>
              </div>
            </button>

            {/* 区切りライン */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-50"></div>

            {/* クーポン機能ボタン（下位置・慎重な操作用） */}
            <button
              onClick={() => {
                
                // データを最新に更新してからナビゲート（ダイアログなし）
                void fetchUserData().then(() => {
                  navigate('/my-coupons');
                });
                setIsOpen(false);
              }}
              className="flex items-center bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-full px-12 py-4 shadow-xl transform transition-all duration-300 hover:scale-105 hover:-translate-x-2 min-w-[300px] border-2 border-white/20"
            >
              <Gift className="w-5 h-5 mr-3 drop-shadow-sm" />
              <div className="text-left">
                <span className="text-sm font-bold whitespace-nowrap block">クーポン ({userCoupons.length})</span>
                <span className="text-xs opacity-90 whitespace-nowrap block">店舗利用時に表示</span>
              </div>
            </button>
          </div>
        )}

        {/* メインボタン - 小さくしてプレミアムデザイン */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transform transition-all duration-300 border-4 border-white/30 backdrop-blur-sm ${
            isOpen
              ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rotate-45 scale-95'
              : 'bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 hover:scale-110 hover:shadow-blue-500/25'
          }`}
          style={{
            boxShadow: isOpen 
              ? '0 15px 30px rgba(239, 68, 68, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)'
              : '0 15px 30px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <div className="relative">
            {isOpen ? (
              <X className="w-6 h-6 text-white drop-shadow-lg" />
            ) : (
              <Plus className="w-6 h-6 text-white drop-shadow-lg" />
            )}
            {/* 保有クーポン数の小さなバッジ */}
            {!isOpen && userCoupons.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-lg">
                {userCoupons.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 背景オーバーレイ（メニューが開いている時） */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => {
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
};

export default FloatingActionButton;

// Force reload - modification test 