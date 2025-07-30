import { Gift, Plus, Shield, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

export const FloatingActionButton: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  console.log('🔍 [FAB Debug] Component rendered');
  console.log('🔍 [FAB Debug] user:', user);

  // データ取得
  useEffect(() => {
    if (user) {
      console.log('🔍 [FAB Debug] User found, fetching data');
      void fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log('🔍 [FAB Debug] Fetching user coupons...');

      // ユーザーのクーポンを取得
      const { data: couponsData, error } = await supabase
        .from('user_coupons')
        .select(`
          *,
          facility_coupons (
            *,
            pet_facilities (name)
          )
        `)
        .eq('user_id', user.id)
        .is('used_at', null)
        .gte('facility_coupons.validity_end', new Date().toISOString());

      if (error) {
        console.error('🔍 [FAB Debug] Error fetching coupons:', error);
      } else {
        console.log('🔍 [FAB Debug] Coupons fetched:', couponsData);
        setUserCoupons(couponsData || []);
      }
    } catch (error) {
      console.error('🔍 [FAB Debug] Error in fetchUserData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeAllModals = () => {
    setIsOpen(false);
  };

  // ログインしていない場合は表示しない
  if (!user) {
    console.log('❌ [FAB Debug] User not found, not rendering FAB');
    return null;
  }

  console.log('✅ [FAB Debug] User found, rendering FAB');

  return (
    <>
      {/* フローティングアクションボタン */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* サブメニュー */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 space-y-3 animate-in slide-in-from-bottom duration-200">
            {/* クーポン表示ボタン */}
            <button
              onClick={() => {
                console.log('🎫 [FAB Debug] Coupon button clicked');
                alert(`クーポン機能：${userCoupons.length}件のクーポンがあります`);
                setIsOpen(false);
              }}
              className="flex items-center bg-pink-500 hover:bg-pink-600 text-white rounded-full px-4 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Gift className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium whitespace-nowrap">
                クーポン ({userCoupons.length})
              </span>
            </button>

            {/* 将来のスポンサー機能ボタン */}
            <button
              onClick={() => {
                console.log('💰 [FAB Debug] Sponsor button clicked');
                alert('スポンサー機能は準備中です');
                setIsOpen(false);
              }}
              className="flex items-center bg-purple-500 hover:bg-purple-600 text-white rounded-full px-4 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Shield className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium whitespace-nowrap">
                スポンサー
              </span>
            </button>
          </div>
        )}

        {/* メインボタン */}
        <button
          onClick={() => {
            console.log('🔘 [FAB Debug] Main button clicked, isOpen:', isOpen);
            setIsOpen(!isOpen);
          }}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-200 ${
            isOpen
              ? 'bg-red-500 hover:bg-red-600 rotate-45'
              : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* 背景オーバーレイ（メニューが開いている時） */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => {
            console.log('🌆 [FAB Debug] Background overlay clicked');
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
};

export default FloatingActionButton; 