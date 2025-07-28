import {
    ArrowLeft,
    Building,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Gift,
    MapPin,
    Phone,
    Ticket,
    Users,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import { CouponDisplay } from '../components/coupons/CouponDisplay';
import useAuth from '../context/AuthContext';
import type { FacilityCoupon, UserCoupon } from '../types/coupons';
import type { FacilityCategory, FacilityImage, PetFacility } from '../types/facilities';
import { supabase } from '../utils/supabase';

interface FacilityWithDetails extends PetFacility {
  category_info?: FacilityCategory;
  images?: FacilityImage[];
  coupons?: FacilityCoupon[];
}

export function FacilityDetail() {
  const { id: facilityId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [facility, setFacility] = useState<FacilityWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [showCouponDisplay, setShowCouponDisplay] = useState(false);
  const [displayingCoupon, setDisplayingCoupon] = useState<UserCoupon | null>(null);
  const [obtainingCouponId, setObtainingCouponId] = useState<string | null>(null);

  // カテゴリの日本語マッピング
  const CATEGORY_LABELS: { [key: string]: string } = {
    'pet_hotel': 'ペットホテル',
    'pet_salon': 'ペットサロン',
    'veterinary': '動物病院',
    'pet_cafe': 'ペットカフェ',
    'pet_restaurant': 'ペット同伴レストラン',
    'pet_shop': 'ペットショップ',
    'pet_accommodation': 'ペット同伴宿泊',
    'dog_training': 'しつけ教室',
    'pet_friendly_other': 'その他ワンちゃん同伴可能施設'
  };

  useEffect(() => {
    if (facilityId) {
      fetchFacilityData();
      if (user) {
        fetchUserCoupons();
      }
    }
  }, [facilityId, user]);

  const fetchFacilityData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 施設の基本情報、カテゴリ、画像、アクティブなクーポンを並列取得
      const [facilityResult, imagesResult, couponsResult] = await Promise.all([
        // 施設基本情報とカテゴリ
        supabase
          .from('pet_facilities')
          .select(`
            *,
            category_info:facility_categories(*)
          `)
          .eq('id', facilityId)
          .eq('status', 'approved')
          .single(),
        
        // 施設画像
        supabase
          .from('facility_images')
          .select('*')
          .eq('facility_id', facilityId)
          .order('created_at', { ascending: true }),
        
        // アクティブなクーポン
        supabase
          .from('facility_coupons')
          .select('*')
          .eq('facility_id', facilityId)
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false })
      ]);

      if (facilityResult.error) {
        throw facilityResult.error;
      }

      if (!facilityResult.data) {
        setError('施設が見つかりません');
        return;
      }

      setFacility({
        ...facilityResult.data,
        images: imagesResult.data || [],
        coupons: couponsResult.data || []
      });

    } catch (err) {
      console.error('施設データの取得に失敗:', err);
      setError('施設データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserCoupons = async () => {
    if (!user || !facilityId) return;

    try {
      const { data } = await supabase
        .from('user_coupons')
        .select(`
          *,
          coupon:facility_coupons(*)
        `)
        .eq('user_id', user.id)
        .in('coupon_id', 
          facility?.coupons?.map(c => c.id) || []
        );

      setUserCoupons(data || []);
    } catch (err) {
      console.error('ユーザークーポンの取得に失敗:', err);
    }
  };

  const handleObtainCoupon = async (couponId: string) => {
    if (!user || obtainingCouponId) return;

    try {
      setObtainingCouponId(couponId);

      const { data, error } = await supabase.rpc('obtain_coupon', {
        p_coupon_id: couponId,
        p_user_id: user.id
      });

      if (error) {
        throw error;
      }

      if (data === 'already_obtained') {
        alert('このクーポンは既に取得済みです');
        return;
      }

      if (data === 'coupon_not_found') {
        alert('クーポンが見つかりません');
        return;
      }

      if (data === 'coupon_expired') {
        alert('このクーポンは有効期限が切れています');
        return;
      }

      if (data === 'coupon_inactive') {
        alert('このクーポンは現在利用できません');
        return;
      }

      // 成功時
      alert('クーポンを取得しました！');
      await fetchUserCoupons(); // クーポン一覧を更新

    } catch (err) {
      console.error('クーポン取得エラー:', err);
      alert('クーポンの取得に失敗しました');
    } finally {
      setObtainingCouponId(null);
    }
  };

  const handleShowCoupon = (userCoupon: UserCoupon) => {
    setDisplayingCoupon(userCoupon);
    setShowCouponDisplay(true);
  };

  const nextImage = () => {
    if (facility?.images) {
      setSelectedImageIndex((prev) => 
        prev === facility.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (facility?.images) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? facility.images!.length - 1 : prev - 1
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">施設情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">施設が見つかりません</h2>
            <p className="text-gray-600 mb-6">{error || '指定された施設は存在しないか、承認待ちの可能性があります。'}</p>
            <Link to="/parks?view=facilities">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                施設一覧に戻る
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${facility.name} - 施設詳細`}
        description={facility.description || `${facility.name}の詳細情報です。`}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Back Navigation */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link to="/parks?view=facilities" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              施設一覧に戻る
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* ヘッダー情報 */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Building className="w-6 h-6 text-blue-600" />
                  <span className="text-sm text-blue-600 font-medium">
                    {CATEGORY_LABELS[facility.category] || facility.category}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{facility.name}</h1>
                
                <div className="space-y-3 text-gray-600">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5 text-gray-400" />
                    <span>{facility.address}</span>
                  </div>
                  
                  {facility.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <a href={`tel:${facility.phone}`} className="hover:text-blue-600">
                        {facility.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                {facility.website && (
                  <a
                    href={facility.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full md:w-auto"
                  >
                    <Button className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      公式サイト
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </Card>

          {/* 施設の説明 */}
          {facility.description && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">施設について</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{facility.description}</p>
            </Card>
          )}

          {/* 画像ギャラリー */}
          {facility.images && facility.images.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">施設画像</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {facility.images.slice(0, 6).map((image, index) => (
                  <div
                    key={image.id}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setShowImageModal(true);
                    }}
                  >
                    <img
                      src={image.image_url}
                      alt={image.description || `施設画像 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {facility.images.length > 6 && (
                  <div
                    className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => setShowImageModal(true)}
                  >
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">+{facility.images.length - 6}</p>
                      <p className="text-sm text-gray-500">その他の画像</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* クーポンセクション */}
          {facility.coupons && facility.coupons.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Gift className="w-6 h-6 mr-3 text-red-500" />
                利用可能なクーポン
              </h2>
              <div className="grid gap-6">
                {facility.coupons.map((coupon) => {
                  const userCoupon = userCoupons.find(uc => uc.coupon_id === coupon.id);
                  const isExpired = new Date(coupon.end_date) < new Date();
                  const canObtain = user && !userCoupon && !isExpired && coupon.is_active;
                  
                  return (
                    <div key={coupon.id} className="border rounded-lg p-6 bg-white">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 左側：チケット風クーポンデザイン */}
                        <div className="w-full max-w-sm mx-auto">
                          {coupon.coupon_image_url ? (
                            // 画像クーポンの表示
                            <div className="aspect-square w-full border-2 border-gray-300 rounded-lg overflow-hidden">
                              <img
                                src={coupon.coupon_image_url}
                                alt="クーポン画像"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            // 文字クーポンの表示
                            <div className="aspect-square w-full border-2 border-gray-300 rounded-lg relative overflow-hidden">
                              {/* チケット風の背景 */}
                              <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 relative">
                                {/* チケットの切り込み装飾 */}
                                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                                
                                {/* 背景の薄い「COUPON」テキスト */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                  <span className="text-6xl font-bold text-white transform rotate-12">
                                    COUPON
                                  </span>
                                </div>
                                
                                {/* メインコンテンツ */}
                                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
                                  <div className="bg-white/90 px-3 py-1 rounded-full">
                                    <span className="text-xs font-medium text-red-600">
                                      ドッグパークJPクーポン
                                    </span>
                                  </div>
                                  
                                  <div className="text-white font-bold text-sm">
                                    {facility.name}
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <h3 className="text-base font-bold text-white leading-tight">
                                      {coupon.title}
                                    </h3>
                                    <p className="text-sm text-white/90 leading-tight">
                                      {coupon.service_content}
                                    </p>
                                  </div>
                                  
                                  {coupon.discount_value && (
                                    <div className="bg-white text-red-600 px-3 py-1 rounded-full">
                                      <span className="text-xl font-bold">
                                        {coupon.discount_value}{coupon.discount_type === 'amount' ? '円' : '%'}
                                      </span>
                                      <span className="text-xs ml-1">OFF</span>
                                    </div>
                                  )}
                                  
                                  <div className="pt-2 border-t border-white/30">
                                    <p className="text-xs text-white/80 leading-tight">
                                      {coupon.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-gray-500 text-center">
                            {coupon.coupon_image_url ? '画像クーポン' : 'クーポン'}
                          </div>
                        </div>

                        {/* 右側：クーポン情報と取得ボタン */}
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{coupon.title}</h3>
                            <p className="text-gray-600 mt-1">{coupon.service_content}</p>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>有効期限: {new Date(coupon.end_date).toLocaleDateString('ja-JP')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>利用制限: {coupon.usage_limit_type === 'once' ? '1回限り' : '何回でも'}</span>
                            </div>
                          </div>
                          
                          <div className="pt-4">
                            {!user ? (
                              <Link to="/login">
                                <Button className="w-full" variant="outline">
                                  ログインしてクーポンを取得
                                </Button>
                              </Link>
                            ) : userCoupon ? (
                              <div className="space-y-3">
                                <Button
                                  onClick={() => handleShowCoupon(userCoupon)}
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  disabled={userCoupon.is_used}
                                >
                                  <Ticket className="w-4 h-4 mr-2" />
                                  {userCoupon.is_used ? 'クーポン使用済み' : 'クーポンを表示'}
                                </Button>
                                {userCoupon.is_used && (
                                  <p className="text-sm text-gray-500 text-center">
                                    {new Date(userCoupon.used_at!).toLocaleDateString('ja-JP')} に使用
                                  </p>
                                )}
                              </div>
                            ) : canObtain ? (
                              <Button
                                onClick={() => handleObtainCoupon(coupon.id)}
                                disabled={obtainingCouponId === coupon.id}
                                className="w-full bg-red-600 hover:bg-red-700"
                              >
                                {obtainingCouponId === coupon.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    取得中...
                                  </>
                                ) : (
                                  <>
                                    <Gift className="w-4 h-4 mr-2" />
                                    クーポンを取得
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button disabled className="w-full" variant="outline">
                                {isExpired ? 'クーポンの有効期限切れ' : 'クーポン利用不可'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* 画像モーダル */}
        {showImageModal && facility.images && facility.images.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl w-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
              >
                <X className="w-8 h-8" />
              </button>
              
              <div className="relative">
                <img
                  src={facility.images[selectedImageIndex].image_url}
                  alt={facility.images[selectedImageIndex].description || `施設画像`}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
                
                {facility.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                  </>
                )}
              </div>
              
              <div className="text-center mt-4 text-white">
                <p>{selectedImageIndex + 1} / {facility.images.length}</p>
                {facility.images[selectedImageIndex].description && (
                  <p className="text-sm text-gray-300 mt-2">
                    {facility.images[selectedImageIndex].description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* クーポン表示モーダル */}
        {showCouponDisplay && displayingCoupon && (
          <CouponDisplay
            userCoupon={displayingCoupon}
            onClose={() => {
              setShowCouponDisplay(false);
              setDisplayingCoupon(null);
            }}
          />
        )}
      </div>
    </>
  );
} 