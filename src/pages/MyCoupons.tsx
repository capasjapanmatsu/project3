import {
    Calendar,
    Clock,
    Gift,
    MapPin,
    Shield,
    Star,
    Ticket
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
          coupon:facility_coupons(
            *,
            facility:pet_facilities(
              name,
              address
            )
          )
        `)
        .eq('user_id', user.id)
        .order('obtained_at', { ascending: false });

      if (error) throw error;

      setCoupons(data as CouponWithFacility[] || []);
    } catch (error) {
      setError('クーポン情報の取得に失敗しました。');
      console.error('Error fetching coupons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowCoupon = (coupon: CouponWithFacility) => {
    // 有効期限チェック
    const now = new Date();
    const endDate = new Date(coupon.coupon.end_date);
    if (endDate < now) {
      alert('このクーポンは有効期限が切れています。');
      return;
    }

    // 1回限定クーポンの警告
    if (coupon.coupon.usage_limit_type === 'once') {
      const confirmMessage = `【重要】1回限定クーポンです\n\n` +
        `このクーポンは1度表示すると消えてしまい、再取得はできません。\n` +
        `店頭で店員さんに見せるときのみ表示してください。\n\n` +
        `本当にクーポンを表示しますか？`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setDisplayingCoupon(coupon);
    setShowCouponDisplay(true);
  };

  const filterCoupons = () => {
    const now = new Date();
    
    switch (activeTab) {
      case 'available':
        return coupons.filter(coupon => 
          !coupon.is_used && new Date(coupon.coupon.end_date) >= now
        );
      case 'used':
        return coupons.filter(coupon => coupon.is_used);
      case 'expired':
        return coupons.filter(coupon => 
          !coupon.is_used && new Date(coupon.coupon.end_date) < now
        );
      default:
        return coupons;
    }
  };

  const formatDiscount = (coupon: FacilityCoupon) => {
    if (!coupon.discount_value) return '';
    
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else {
      return `${coupon.discount_value.toLocaleString()}円 OFF`;
    }
  };

  const getStatusBadge = (coupon: CouponWithFacility) => {
    const now = new Date();
    const endDate = new Date(coupon.coupon.end_date);

    if (coupon.is_used) {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">使用済み</span>;
    } else if (endDate < now) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">期限切れ</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">利用可能</span>;
    }
  };

  const filteredCoupons = filterCoupons();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ログインが必要です</h2>
          <p className="text-gray-600 mb-4">クーポンを確認するにはログインしてください。</p>
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
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center">
              <Ticket className="w-8 h-8 mr-3 text-pink-500" />
              マイクーポン
            </h1>
            <p className="text-gray-600">取得したクーポンの管理・利用ができます</p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 mb-6">
              {error}
            </div>
          )}

          {/* タブナビゲーション */}
          <Card className="mb-6">
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('available')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'available'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Gift className="w-4 h-4 inline mr-2" />
                  利用可能 ({coupons.filter(c => !c.is_used && new Date(c.coupon.end_date) >= new Date()).length})
                </button>
                <button
                  onClick={() => setActiveTab('used')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'used'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  使用済み ({coupons.filter(c => c.is_used).length})
                </button>
                <button
                  onClick={() => setActiveTab('expired')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'expired'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  期限切れ ({coupons.filter(c => !c.is_used && new Date(c.coupon.end_date) < new Date()).length})
                </button>
              </nav>
            </div>
          </Card>

          {/* クーポン一覧 */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredCoupons.length === 0 ? (
            <Card className="p-12 text-center">
              <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'available' && '利用可能なクーポンがありません'}
                {activeTab === 'used' && '使用済みのクーポンがありません'}
                {activeTab === 'expired' && '期限切れのクーポンがありません'}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'available' && '施設一覧からクーポンを取得してみましょう'}
                {activeTab === 'used' && 'まだクーポンを使用していません'}
                {activeTab === 'expired' && '期限切れのクーポンはありません'}
              </p>
              {activeTab === 'available' && (
                <Button onClick={() => window.location.href = '/parks?view=facilities'}>
                  施設一覧を見る
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCoupons.map((coupon) => (
                <Card key={coupon.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{coupon.coupon.title}</h3>
                        {getStatusBadge(coupon)}
                        {formatDiscount(coupon.coupon) && (
                          <span className="text-2xl font-bold text-red-600">
                            {formatDiscount(coupon.coupon)}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-700 mb-3">{coupon.coupon.service_content}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">
                            {coupon.coupon.facility?.name} - {coupon.coupon.facility?.address}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">
                            有効期限: {new Date(coupon.coupon.end_date).toLocaleDateString('ja-JP')}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Ticket className="w-4 h-4 mr-2 text-gray-400" />
                          <span className={`text-sm font-medium ${
                            coupon.coupon.usage_limit_type === 'once' 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {coupon.coupon.usage_limit_type === 'once' ? '1回限定' : '何回でも'}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-gray-600">
                            取得日: {new Date(coupon.obtained_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>

                        {coupon.is_used && coupon.used_at && (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-gray-600">
                              使用日: {new Date(coupon.used_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        )}
                      </div>

                      {coupon.coupon.description && (
                        <p className="text-sm text-gray-500">{coupon.coupon.description}</p>
                      )}
                    </div>

                    <div className="ml-4">
                      {activeTab === 'available' && (
                        <>
                          <Button
                            onClick={() => handleShowCoupon(coupon)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Gift className="w-4 h-4 mr-2" />
                            クーポンを表示
                          </Button>
                          
                          {coupon.coupon.usage_limit_type === 'once' && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              <div className="font-medium mb-1">⚠️ 1回限定クーポン</div>
                              <div>1度表示すると消えてしまい再取得ができません。店頭で店員さんに見せるときに表示してください。</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {coupon.coupon.coupon_image_url && (
                    <div className="mt-4">
                      <img
                        src={coupon.coupon.coupon_image_url}
                        alt="クーポン画像"
                        className="max-w-md h-auto border rounded-lg"
                      />
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