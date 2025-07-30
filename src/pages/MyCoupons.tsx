import {
    ArrowLeft,
    Calendar,
    Gift,
    MapPin,
    Shield,
    Ticket
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import { CouponDisplay } from '../components/coupons/CouponDisplay';
import useAuth from '../context/AuthContext';
import { type FacilityCoupon, type UserCoupon } from '../types/coupons';
import { supabase } from '../utils/supabase';

type CouponWithFacility = UserCoupon & {
  coupon: FacilityCoupon & {
    facility: {
      name: string;
      address: string;
    }
  }
};

export function MyCoupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<CouponWithFacility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'used' | 'expired'>('available');
  const [error, setError] = useState('');
  const [showCouponDisplay, setShowCouponDisplay] = useState(false);
  const [displayingCoupon, setDisplayingCoupon] = useState<CouponWithFacility | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyCoupons();
    }
  }, [user]);

  const fetchMyCoupons = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_coupons')
        .select(`
          *,
          coupon:facility_coupons!inner (
            *,
            facility:pet_facilities (
              name,
              address
            )
          )
        `)
        .eq('user_id', user.id)
        .order('obtained_at', { ascending: false });

      if (error) throw error;

      console.log('✅ [MyCoupons] Fetched coupons:', data);
      setCoupons(data || []);
    } catch (error) {
      console.error('❌ [MyCoupons] Error fetching coupons:', error);
      setError('クーポンの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowCoupon = (coupon: CouponWithFacility) => {
    setDisplayingCoupon(coupon);
    setShowCouponDisplay(true);
  };

  const filterCoupons = () => {
    const now = new Date();
    
    switch (activeTab) {
      case 'available':
        return coupons.filter(c => !c.is_used && new Date(c.coupon.end_date) >= now);
      case 'used':
        return coupons.filter(c => c.is_used);
      case 'expired':
        return coupons.filter(c => !c.is_used && new Date(c.coupon.end_date) < now);
      default:
        return coupons;
    }
  };

  const formatDiscount = (coupon: FacilityCoupon) => {
    if (!coupon.discount_value && coupon.discount_type !== 'free_gift') return '';
    
    if (coupon.discount_type === 'free_gift') {
      return '🎁 無料プレゼント';
    } else if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else {
      return `${coupon.discount_value?.toLocaleString()}円 OFF`;
    }
  };

  const getStatusBadge = (coupon: CouponWithFacility) => {
    const now = new Date();
    const endDate = new Date(coupon.coupon.end_date);

    if (coupon.is_used) {
      return <span className="px-3 py-1 text-xs font-bold bg-gray-100 text-gray-700 rounded-full">使用済み</span>;
    } else if (endDate < now) {
      return <span className="px-3 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">期限切れ</span>;
    } else {
      return <span className="px-3 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">利用可能</span>;
    }
  };

  const filteredCoupons = filterCoupons();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ログインが必要です</h2>
          <p className="text-gray-600 mb-6">クーポンを確認するにはログインしてください。</p>
          <Link to="/login">
            <Button className="w-full">ログイン</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="マイクーポン - ドッグパークJP"
        description="取得したクーポンを管理・利用できます。"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* 戻るボタン */}
          <div className="mb-6">
            <Link to="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              マイページに戻る
            </Link>
          </div>

          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
              <Ticket className="w-8 h-8 mr-3 text-pink-500" />
              マイクーポン
            </h1>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 rounded-xl p-4 mb-6">
              {error}
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('available')}
                className={`flex-1 py-3 px-4 font-medium text-center transition-all duration-300 ${
                  activeTab === 'available'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Gift className="w-4 h-4 inline mr-2" />
                利用可能
                <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${
                  activeTab === 'available' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {coupons.filter(c => !c.is_used && new Date(c.coupon.end_date) >= new Date()).length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('used')}
                className={`flex-1 py-3 px-4 font-medium text-center transition-all duration-300 ${
                  activeTab === 'used'
                    ? 'bg-gray-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Ticket className="w-4 h-4 inline mr-2" />
                使用済み
                <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${
                  activeTab === 'used' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {coupons.filter(c => c.is_used).length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('expired')}
                className={`flex-1 py-3 px-4 font-medium text-center transition-all duration-300 ${
                  activeTab === 'expired'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                期限切れ
                <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${
                  activeTab === 'expired' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {coupons.filter(c => !c.is_used && new Date(c.coupon.end_date) < new Date()).length}
                </span>
              </button>
            </nav>
          </div>

          {/* ローディング状態 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-gray-600">クーポンを読み込み中...</p>
            </div>
          ) : filteredCoupons.length === 0 ? (
            <Card className="text-center py-16">
              <Ticket className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab === 'available' && 'まだ利用可能なクーポンがありません'}
                {activeTab === 'used' && '使用済みクーポンがありません'}
                {activeTab === 'expired' && '期限切れクーポンがありません'}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'available' && 'ドッグランや施設でクーポンを取得してみましょう！'}
                {activeTab === 'used' && 'クーポンを使用すると、ここに履歴が表示されます'}
                {activeTab === 'expired' && '期限切れのクーポンはありません'}
              </p>
              {activeTab === 'available' && (
                <Link to="/parks">
                  <Button className="bg-pink-500 hover:bg-pink-600">
                    施設一覧を見る
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCoupons.map((coupon) => (
                <Card key={coupon.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                  {/* クーポンヘッダー */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3 border-b border-pink-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-gray-900">{coupon.coupon.title}</h3>
                        {getStatusBadge(coupon)}
                      </div>
                      {formatDiscount(coupon.coupon) && (
                        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-2 rounded-full shadow-md">
                          <span className="text-sm font-bold">
                            {formatDiscount(coupon.coupon)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* クーポン本文 */}
                  <div className="p-4">
                    <p className="text-gray-700 mb-3">{coupon.coupon.service_content}</p>

                    {/* 施設情報 */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium text-gray-900 text-sm">{coupon.coupon.facility?.name}</span>
                      </div>
                    </div>

                    {/* クーポン詳細情報 */}
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-blue-500" />
                        <span className="text-gray-600">
                          期限: {new Date(coupon.coupon.end_date).toLocaleDateString('ja-JP')}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <Ticket className="w-3 h-3 mr-1 text-green-500" />
                        <span className={`font-medium ${
                          coupon.coupon.usage_limit_type === 'once' 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {coupon.coupon.usage_limit_type === 'once' ? '1回限定' : '何回でも'}
                        </span>
                      </div>
                    </div>

                    {/* クーポン画像 */}
                    {coupon.coupon.coupon_image_url && (
                      <div className="mb-3">
                        <img
                          src={coupon.coupon.coupon_image_url}
                          alt="クーポン画像"
                          className="w-full max-w-sm h-auto border rounded-lg shadow-sm mx-auto"
                        />
                      </div>  
                    )}

                    {/* 1回限定クーポンの警告 */}
                    {activeTab === 'available' && coupon.coupon.usage_limit_type === 'once' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                        <div className="flex items-start">
                          <Shield className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-amber-800 text-sm">⚠️ 1回限定</div>
                            <div className="text-xs text-amber-700">
                              表示すると消えます。店舗でのみ使用してください。
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* クーポンボタン（下部に配置） */}
                  {activeTab === 'available' && (
                    <div className="bg-gray-50 px-4 py-3 border-t">
                      <Button
                        onClick={() => handleShowCoupon(coupon)}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 shadow-md hover:shadow-lg transition-all duration-300"
                        size="lg"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        クーポンを表示
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* クーポン表示モーダル */}
        {showCouponDisplay && displayingCoupon && (
          <CouponDisplay
            userCoupon={displayingCoupon}
            onClose={() => {
              setShowCouponDisplay(false);
              setDisplayingCoupon(null);
              fetchMyCoupons(); // 使用状態が変わった可能性があるため再取得
            }}
          />
        )}
      </div>
    </>
  );
} 