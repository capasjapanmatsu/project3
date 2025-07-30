import {
    ArrowLeft,
    Calendar,
    Clock,
    Gift,
    MapPin,
    Shield,
    Star,
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
    if (!coupon.discount_value) return '';
    
    if (coupon.discount_type === 'free_gift') {
      return '🎁 無料プレゼント';
    } else if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else {
      return `${coupon.discount_value.toLocaleString()}円 OFF`;
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
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-3xl p-8 shadow-xl">
              <h1 className="text-4xl font-bold mb-3 flex items-center justify-center">
                <Ticket className="w-10 h-10 mr-4" />
                マイクーポン
              </h1>
              <p className="text-pink-100 text-lg mb-6">取得したクーポンの管理・利用ができます</p>
              
              {/* 統計情報 */}
              <div className="flex justify-center space-x-8">
                <div className="text-center">
                  <div className="text-3xl font-bold">{coupons.filter(c => !c.is_used && new Date(c.coupon.end_date) >= new Date()).length}</div>
                  <div className="text-sm text-pink-100">利用可能</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{coupons.filter(c => c.is_used).length}</div>
                  <div className="text-sm text-pink-100">使用済み</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{coupons.length}</div>
                  <div className="text-sm text-pink-100">合計</div>
                </div>
              </div>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 rounded-xl p-4 mb-6">
              {error}
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="bg-white rounded-2xl shadow-lg border mb-8 overflow-hidden">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('available')}
                className={`flex-1 py-5 px-6 font-bold text-center transition-all duration-300 ${
                  activeTab === 'available'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Gift className="w-5 h-5 inline mr-2" />
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
                className={`flex-1 py-5 px-6 font-bold text-center transition-all duration-300 ${
                  activeTab === 'used'
                    ? 'bg-gray-500 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Ticket className="w-5 h-5 inline mr-2" />
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
                className={`flex-1 py-5 px-6 font-bold text-center transition-all duration-300 ${
                  activeTab === 'expired'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-5 h-5 inline mr-2" />
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
            <div className="space-y-6">
              {filteredCoupons.map((coupon) => (
                <Card key={coupon.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {/* クーポンヘッダー */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-5 border-b border-pink-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-2xl font-bold text-gray-900">{coupon.coupon.title}</h3>
                        {getStatusBadge(coupon)}
                      </div>
                      {formatDiscount(coupon.coupon) && (
                        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-3 rounded-full shadow-lg">
                          <span className="text-lg font-bold">
                            {formatDiscount(coupon.coupon)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* クーポン本文 */}
                  <div className="p-6">
                    <p className="text-gray-700 text-lg mb-6 leading-relaxed">{coupon.coupon.service_content}</p>

                    {/* 施設情報 */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl mb-6 border border-blue-100">
                      <div className="flex items-center mb-2">
                        <MapPin className="w-5 h-5 mr-3 text-blue-500" />
                        <span className="font-bold text-gray-900 text-lg">{coupon.coupon.facility?.name}</span>
                      </div>
                      <p className="text-gray-600 ml-8">{coupon.coupon.facility?.address}</p>
                    </div>

                    {/* クーポン詳細情報 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                        <div>
                          <div className="text-xs text-gray-500">有効期限</div>
                          <div className="font-medium text-gray-900">
                            {new Date(coupon.coupon.end_date).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Ticket className="w-5 h-5 mr-3 text-green-500" />
                        <div>
                          <div className="text-xs text-gray-500">利用制限</div>
                          <div className={`font-medium ${
                            coupon.coupon.usage_limit_type === 'once' 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {coupon.coupon.usage_limit_type === 'once' ? '1回限定' : '何回でも'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Clock className="w-5 h-5 mr-3 text-purple-500" />
                        <div>
                          <div className="text-xs text-gray-500">取得日</div>
                          <div className="font-medium text-gray-900">
                            {new Date(coupon.obtained_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>

                      {coupon.is_used && coupon.used_at && (
                        <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                          <Star className="w-5 h-5 mr-3 text-yellow-500" />
                          <div>
                            <div className="text-xs text-gray-500">使用日</div>
                            <div className="font-medium text-gray-900">
                              {new Date(coupon.used_at).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* クーポン画像 */}
                    {coupon.coupon.coupon_image_url && (
                      <div className="mb-6">
                        <img
                          src={coupon.coupon.coupon_image_url}
                          alt="クーポン画像"
                          className="w-full max-w-lg h-auto border-2 border-gray-200 rounded-xl shadow-md mx-auto"
                        />
                      </div>  
                    )}

                    {/* 説明文 */}
                    {coupon.coupon.description && (
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                        <p className="text-blue-800 leading-relaxed">{coupon.coupon.description}</p>
                      </div>
                    )}

                    {/* 1回限定クーポンの警告 */}
                    {activeTab === 'available' && coupon.coupon.usage_limit_type === 'once' && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 mb-6">
                        <div className="flex items-start">
                          <Shield className="w-6 h-6 text-amber-500 mr-3 mt-1 flex-shrink-0" />
                          <div>
                            <div className="font-bold text-amber-800 mb-2 text-lg">⚠️ 1回限定クーポン</div>
                            <div className="text-amber-700 leading-relaxed">
                              1度表示すると消えてしまい再取得ができません。店頭で店員さんに見せるときに表示してください。
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* クーポンボタン（下部に配置） */}
                  {activeTab === 'available' && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-6 border-t">
                      <Button
                        onClick={() => handleShowCoupon(coupon)}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        size="lg"
                      >
                        <Gift className="w-6 h-6 mr-3" />
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