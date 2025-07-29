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
      void fetchFacilityData();
      if (user) {
        void fetchUserCoupons();
      }
    }
  }, [facilityId, user]);

  const fetchFacilityData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching facility data for ID:', facilityId);

      // 施設の基本情報、画像、アクティブなクーポンを並列取得
      const [facilityResult, imagesResult, couponsResult] = await Promise.all([
        // 施設基本情報
        supabase
          .from('pet_facilities')
          .select('*')
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

      console.log('📋 Facility result:', facilityResult);
      console.log('🖼️ Images result:', imagesResult);
      console.log('🎫 Coupons result:', couponsResult);

      if (facilityResult.error) {
        console.error('❌ Facility query error:', facilityResult.error);
        throw new Error(`施設データ取得エラー: ${facilityResult.error.message}`);
      }

      if (!facilityResult.data) {
        console.log('⚠️ No facility data found');
        setError('施設が見つかりません');
        return;
      }

      if (imagesResult.error) {
        console.error('❌ Images query error:', imagesResult.error);
        // 画像エラーは致命的ではないので続行
      }

      if (couponsResult.error) {
        console.error('❌ Coupons query error:', couponsResult.error);
        // クーポンエラーは致命的ではないので続行
      }

      console.log('✅ Facility data:', facilityResult.data);
      console.log('🖼️ Images data:', imagesResult.data);
      console.log('🎫 Coupons data:', couponsResult.data);

      // カテゴリ情報を個別に取得
      let categoryInfo = null;
      const categoryId = (facilityResult.data as any)?.category_id || (facilityResult.data as any)?.category;
      
      console.log('🏷️ カテゴリID取得:', {
        categoryId,
        facilityData: facilityResult.data,
        categoryIdField: (facilityResult.data as any)?.category_id,
        categoryField: (facilityResult.data as any)?.category
      });
      
      if (categoryId) {
        // カテゴリIDがUUIDの場合とstring名の場合を両方対応
        let categoryQuery = supabase.from('facility_categories').select('*');
        
        // UUIDの形式かチェック（36文字でハイフンを含む）
        const isUUID = typeof categoryId === 'string' && 
                      categoryId.length === 36 && 
                      categoryId.includes('-');
        
        if (isUUID) {
          categoryQuery = categoryQuery.eq('id', categoryId);
        } else {
          categoryQuery = categoryQuery.eq('name', categoryId);
        }
        
        console.log('🔍 カテゴリクエリ実行:', { categoryId, isUUID });
        
        const { data: categoryData, error: categoryError } = await categoryQuery.single();
        
        if (categoryError) {
          console.error('❌ カテゴリクエリエラー:', categoryError);
        } else {
          categoryInfo = categoryData;
          console.log('✅ カテゴリ情報取得成功:', categoryInfo);
        }
      }

      setFacility({
        ...facilityResult.data,
        category_info: categoryInfo,
        images: imagesResult.data || [],
        coupons: couponsResult.data || []
      } as any);

      console.log('🏗️ 最終的な施設データ:', {
        facilityName: (facilityResult.data as any)?.name,
        categoryInfo,
        imagesCount: (imagesResult.data || []).length,
        couponsCount: (couponsResult.data || []).length,
        address: (facilityResult.data as any)?.address,
        phone: (facilityResult.data as any)?.phone,
        website: (facilityResult.data as any)?.website_url
      });

    } catch (err) {
      console.error('💥 施設データの取得に失敗:', err);
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(`施設データの取得に失敗しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserCoupons = async () => {
    if (!user) return;
    
    console.log('🎫 Fetching user coupons for user:', user.id, 'facility:', facilityId);
    
    try {
      const { data, error } = await supabase
        .from('user_coupons')
        .select('*')
        .eq('user_id', user.id)
        .eq('facility_id', facilityId);

      if (error) {
        console.error('❌ User coupons fetch error:', error);
      } else {
        console.log('✅ User coupons data:', data);
        setUserCoupons(data || []);
      }
    } catch (error) {
      console.error('💥 Error fetching user coupons:', error);
    }
  };

  const handleObtainCoupon = async (couponId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    console.log('🎫 Attempting to obtain coupon:', couponId, 'for user:', user.id);
    setObtainingCouponId(couponId);
    
    try {
      const { data, error } = await supabase
        .rpc('obtain_coupon', {
          p_coupon_id: couponId,
          p_user_id: user.id
        });

      console.log('🎫 Obtain coupon result:', { data, error });

      if (error) {
        console.error('❌ Obtain coupon error:', error);
        throw new Error(`クーポン取得エラー: ${error.message}`);
      }

      if (data === 'success') {
        console.log('✅ Coupon obtained successfully!');
        // クーポン取得成功
        await fetchUserCoupons(); // ユーザークーポンを再取得
        
        // 取得したクーポンを表示
        const obtainedCoupon = userCoupons.find(uc => uc.coupon_id === couponId);
        if (obtainedCoupon) {
          setDisplayingCoupon(obtainedCoupon);
          setShowCouponDisplay(true);
        }
      } else {
        // エラーハンドリング
        const errorMessages = {
          'coupon_not_found': 'クーポンが見つかりません',
          'coupon_expired': 'クーポンの有効期限が切れています',
          'coupon_inactive': 'クーポンが利用できません',
          'already_obtained': 'すでに取得済みのクーポンです'
        };
        
        const message = errorMessages[data as keyof typeof errorMessages] || `不明なエラー: ${data}`;
        console.error('❌ Coupon obtain failed:', message);
        setError(message);
      }
    } catch (error) {
      console.error('💥 Coupon obtain error:', error);
      const errorMessage = error instanceof Error ? error.message : 'クーポンの取得に失敗しました';
      setError(errorMessage);
    } finally {
      setObtainingCouponId(null);
    }
  };

  const handleShowCoupon = (userCoupon: UserCoupon) => {
    setDisplayingCoupon(userCoupon);
    setShowCouponDisplay(true);
  };

  const nextImage = () => {
    if (facility?.images && facility.images.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === facility.images!.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (facility?.images && facility.images.length > 0) {
      setSelectedImageIndex((prev) => 
        prev === 0 ? facility.images!.length - 1 : prev - 1
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">施設情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/facilities')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              施設一覧に戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="p-6 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏢</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">施設が見つかりません</h1>
            <p className="text-gray-600 mb-4">指定された施設は存在しないか、現在利用できません。</p>
            <Button onClick={() => navigate('/facilities')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              施設一覧に戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${facility.name} - ペット関連施設`}
        description={facility.description || `${facility.category_info?.name || ''}の${facility.name}の詳細情報をご覧ください。`}
      />

      <div className="min-h-screen bg-gray-50">
        {/* ヒーローセクション */}
        <div className="relative bg-white">
          {/* ナビゲーションヘッダー */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <button
                  onClick={() => navigate('/facilities')}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  施設一覧に戻る
                </button>
              </div>
            </div>
          </div>

          {/* メインヒーローエリア */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* 左側：施設情報 */}
              <div className="space-y-6">
                {/* カテゴリバッジ */}
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
                    <Building className="w-4 h-4 mr-2" />
                    {CATEGORY_LABELS[facility.category_info?.name || ''] || facility.category_info?.name || 'ペット関連施設'}
                  </div>
                </div>

                {/* 施設名とアドレス */}
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                    {facility.name}
                  </h1>
                  
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-lg">{facility.address}</span>
                  </div>
                </div>

                {/* 連絡先情報 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {facility.phone && (
                    <div className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <Phone className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">電話番号</p>
                        <p className="font-medium text-gray-900">{facility.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {facility.website && (
                    <a
                      href={facility.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <ExternalLink className="w-5 h-5 text-blue-500 mr-3 group-hover:text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">ウェブサイト</p>
                        <p className="font-medium text-gray-900 group-hover:text-blue-600">公式サイトを見る</p>
                      </div>
                    </a>
                  )}
                </div>

                {/* 施設説明 */}
                {facility.description && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">施設について</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {facility.description}
                    </p>
                  </div>
                )}
              </div>

              {/* 右側：メイン画像 */}
              <div className="lg:sticky lg:top-24">
                {facility.images && facility.images.length > 0 ? (
                  <div className="space-y-4">
                    {/* メイン画像 */}
                    <div 
                      className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
                      onClick={() => {
                        setSelectedImageIndex(0);
                        setShowImageModal(true);
                      }}
                    >
                      <img
                        src={facility.images[0].image_url}
                        alt={facility.images[0].description || `${facility.name}のメイン画像`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />
                      <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                        {facility.images.length}枚の写真
                      </div>
                    </div>

                    {/* サムネイル画像ギャラリー */}
                    {facility.images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {facility.images.slice(1, 5).map((image, index) => (
                          <div
                            key={index}
                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => {
                              setSelectedImageIndex(index + 1);
                              setShowImageModal(true);
                            }}
                          >
                            <img
                              src={image.image_url}
                              alt={image.description || `${facility.name}の画像${index + 2}`}
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        ))}
                        
                        {/* さらに多くの画像がある場合の表示 */}
                        {facility.images.length > 5 && (
                          <div
                            className="aspect-square rounded-lg bg-gray-900 bg-opacity-75 flex items-center justify-center cursor-pointer hover:bg-opacity-60 transition-all"
                            onClick={() => {
                              setSelectedImageIndex(5);
                              setShowImageModal(true);
                            }}
                          >
                            <span className="text-white font-medium text-sm">
                              +{facility.images.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-2xl bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">画像がありません</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* クーポンセクション */}
          {facility.coupons && facility.coupons.length > 0 && (
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  <Gift className="w-8 h-8 inline mr-3 text-red-500" />
                  利用可能なクーポン
                </h2>
                <p className="text-gray-600">お得なクーポンをご利用ください</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {facility.coupons.map((coupon) => {
                  const userCoupon = userCoupons.find(uc => uc.coupon_id === coupon.id);
                  const isExpired = new Date(coupon.end_date) < new Date();
                  const canObtain = !isExpired && !userCoupon && coupon.is_active;

                  return (
                    <Card key={coupon.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* 左側：チケット風クーポンデザイン */}
                          <div className="w-full max-w-sm mx-auto">
                            {coupon.coupon_image_url ? (
                              // 画像クーポンの表示
                              <div className="aspect-square w-full border-2 border-gray-300 rounded-xl overflow-hidden shadow-md">
                                <img
                                  src={coupon.coupon_image_url}
                                  alt="クーポン画像"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              // 文字クーポンの表示
                              <div className="aspect-square w-full border-2 border-gray-300 rounded-xl relative overflow-hidden shadow-md">
                                {/* チケット風の背景 */}
                                <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 relative">
                                  {/* チケットの切り込み装飾 */}
                                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-gray-50 rounded-full transform -translate-y-1/2"></div>
                                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-gray-50 rounded-full transform -translate-y-1/2"></div>
                                  
                                  {/* 背景の薄い「COUPON」テキスト */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <span className="text-6xl font-bold text-white transform rotate-12">
                                      COUPON
                                    </span>
                                  </div>
                                  
                                  {/* メインコンテンツ */}
                                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 text-center space-y-3">
                                    <div className="bg-white/95 px-3 py-1 rounded-full shadow-sm">
                                      <span className="text-xs font-medium text-red-600">
                                        ドッグパークJPクーポン
                                      </span>
                                    </div>
                                    
                                    <div className="text-white font-bold text-sm">
                                      {facility.name}
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <h3 className="text-base font-bold text-white leading-tight">
                                        {coupon.title}
                                      </h3>
                                      <p className="text-sm text-white/90 leading-tight">
                                        {coupon.service_content}
                                      </p>
                                    </div>
                                    
                                    {coupon.discount_value && (
                                      <div className="bg-white text-red-600 px-4 py-2 rounded-full shadow-md">
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
                          </div>

                          {/* 右側：クーポン情報と取得ボタン */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{coupon.title}</h3>
                              <p className="text-gray-600 mt-2 leading-relaxed">{coupon.service_content}</p>
                            </div>
                            
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span className="text-gray-700">有効期限: {new Date(coupon.end_date).toLocaleDateString('ja-JP')}</span>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Users className="w-4 h-4 text-green-500" />
                                <span className="text-gray-700">利用制限: {coupon.usage_limit_type === 'once' ? '1回限り' : '何回でも'}</span>
                              </div>
                            </div>
                            
                            <div className="pt-4">
                              {!user ? (
                                <Link to="/login">
                                  <Button className="w-full py-3 text-base" variant="outline">
                                    ログインしてクーポンを取得
                                  </Button>
                                </Link>
                              ) : userCoupon ? (
                                <div className="space-y-3">
                                  <Button
                                    onClick={() => handleShowCoupon(userCoupon)}
                                    className="w-full py-3 text-base bg-green-600 hover:bg-green-700"
                                    disabled={userCoupon.is_used}
                                  >
                                    <Ticket className="w-5 h-5 mr-2" />
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
                                  className="w-full py-3 text-base bg-red-600 hover:bg-red-700 shadow-lg"
                                >
                                  {obtainingCouponId === coupon.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                      取得中...
                                    </>
                                  ) : (
                                    <>
                                      <Gift className="w-5 h-5 mr-2" />
                                      クーポンを取得
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <Button disabled className="w-full py-3 text-base" variant="outline">
                                  {isExpired ? 'クーポンの有効期限切れ' : 'クーポン利用不可'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
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