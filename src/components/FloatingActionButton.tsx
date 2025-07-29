import { Gift, Plus, Shield, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { CouponDisplay } from './coupons/CouponDisplay';

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

interface VaccineCertificate {
  id: string;
  dog_id: string;
  certificate_url: string;
  vaccine_type: string;
  vaccination_date: string;
  expiry_date: string;
  dogs: {
    name: string;
    breed: string;
  };
}

export const FloatingActionButton: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [vaccineCertificates, setVaccineCertificates] = useState<VaccineCertificate[]>([]);
  const [showCouponSelect, setShowCouponSelect] = useState(false);
  const [showVaccineSelect, setShowVaccineSelect] = useState(false);
  const [showCouponDisplay, setShowCouponDisplay] = useState(false);
  const [showVaccineDisplay, setShowVaccineDisplay] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null);
  const [selectedVaccine, setSelectedVaccine] = useState<VaccineCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // データ取得
  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // ユーザーのクーポンを取得
      const { data: couponsData } = await supabase
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

      // ユーザーの犬のワクチン証明書を取得（一時的に無効化）
      /*
      const { data: vaccinesData } = await supabase
        .from('vaccine_certificates')
        .select(`
          *,
          dogs (name, breed)
        `)
        .eq('dogs.owner_id', user.id)
        .eq('status', 'approved')
        .gte('expiry_date', new Date().toISOString().split('T')[0]);
      */

      setUserCoupons(couponsData || []);
      // setVaccineCertificates(vaccinesData || []);
      setVaccineCertificates([]); // 一時的に空配列
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCouponSelect = (coupon: UserCoupon) => {
    // CouponDisplayコンポーネントが期待する形式に変換
    const transformedCoupon = {
      ...coupon,
      coupon: {
        id: coupon.facility_coupons.id,
        facility_id: coupon.facility_coupons.facility_id,
        title: coupon.facility_coupons.title,
        service_content: coupon.facility_coupons.service_content,
        discount_value: coupon.facility_coupons.discount_value,
        discount_type: coupon.facility_coupons.discount_type,
        description: coupon.facility_coupons.description,
        validity_start: coupon.facility_coupons.validity_start,
        validity_end: coupon.facility_coupons.validity_end,
        usage_limit_type: coupon.facility_coupons.usage_limit_type,
        coupon_image_url: coupon.facility_coupons.coupon_image_url,
        is_active: true,
        created_at: '',
        updated_at: ''
      }
    };
    
    setSelectedCoupon(transformedCoupon as any);
    setShowCouponSelect(false);
    setShowCouponDisplay(true);
    setIsOpen(false);
  };

  const handleVaccineSelect = (vaccine: VaccineCertificate) => {
    setSelectedVaccine(vaccine);
    setShowVaccineSelect(false);
    setShowVaccineDisplay(true);
    setIsOpen(false);
  };

  const closeAllModals = () => {
    setShowCouponSelect(false);
    setShowVaccineSelect(false);
    setShowCouponDisplay(false);
    setShowVaccineDisplay(false);
    setSelectedCoupon(null);
    setSelectedVaccine(null);
    setIsOpen(false);
  };

  // ログインしていない場合は表示しない
  if (!user) return null;

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
                setShowCouponSelect(true);
                setIsOpen(false);
              }}
              className="flex items-center bg-pink-500 hover:bg-pink-600 text-white rounded-full px-4 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Gift className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium whitespace-nowrap">
                クーポン ({userCoupons.length})
              </span>
            </button>

            {/* ワクチン証明書表示ボタン - 一時的に無効化 */}
            {false && (
            <button
              onClick={() => {
                setShowVaccineSelect(true);
                setIsOpen(false);
              }}
              className="flex items-center bg-green-500 hover:bg-green-600 text-white rounded-full px-4 py-3 shadow-lg transform transition-all duration-200 hover:scale-105"
            >
              <Shield className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium whitespace-nowrap">
                ワクチン証明書 ({vaccineCertificates.length})
              </span>
            </button>
            )}
          </div>
        )}

        {/* メインボタン */}
        <button
          onClick={() => setIsOpen(!isOpen)}
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

      {/* クーポン選択モーダル */}
      {showCouponSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center">
                  <Gift className="w-6 h-6 mr-2" />
                  クーポンを選択
                </h2>
                <button
                  onClick={() => setShowCouponSelect(false)}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {userCoupons.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">利用可能なクーポンがありません</p>
                  <p className="text-sm text-gray-400">
                    施設でクーポンを取得してみましょう
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userCoupons.map((coupon) => (
                    <button
                      key={coupon.id}
                      onClick={() => handleCouponSelect(coupon)}
                      className="w-full p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg border border-pink-200 hover:from-pink-100 hover:to-pink-200 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {coupon.facility_coupons.title}
                        </h4>
                        <span className="text-sm text-pink-600 font-medium">
                          {coupon.facility_coupons.discount_value}
                          {coupon.facility_coupons.discount_type === 'amount' ? '円' : '%'} OFF
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {coupon.facility_coupons.pet_facilities.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        期限: {new Date(coupon.facility_coupons.validity_end).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ワクチン証明書選択モーダル */}
      {showVaccineSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center">
                  <Shield className="w-6 h-6 mr-2" />
                  ワクチン証明書を選択
                </h2>
                <button
                  onClick={() => setShowVaccineSelect(false)}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {vaccineCertificates.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">有効なワクチン証明書がありません</p>
                  <p className="text-sm text-gray-400">
                    マイページで証明書を登録してみましょう
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vaccineCertificates.map((vaccine) => (
                    <button
                      key={vaccine.id}
                      onClick={() => handleVaccineSelect(vaccine)}
                      className="w-full p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 hover:from-green-100 hover:to-green-200 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {vaccine.dogs.name}
                        </h4>
                        <span className="text-sm text-green-600 font-medium">
                          {vaccine.vaccine_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {vaccine.dogs.breed}
                      </p>
                      <p className="text-xs text-gray-500">
                        有効期限: {new Date(vaccine.expiry_date).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* クーポン表示モーダル */}
      {showCouponDisplay && selectedCoupon && (
        <CouponDisplay
          userCoupon={selectedCoupon}
          onClose={() => {
            setShowCouponDisplay(false);
            setSelectedCoupon(null);
          }}
        />
      )}

      {/* ワクチン証明書表示モーダル */}
      {showVaccineDisplay && selectedVaccine && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center">
                  <Shield className="w-6 h-6 mr-2" />
                  ワクチン接種証明書
                </h2>
                <button
                  onClick={() => {
                    setShowVaccineDisplay(false);
                    setSelectedVaccine(null);
                  }}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedVaccine.dogs.name}
                </h3>
                <p className="text-gray-600">{selectedVaccine.dogs.breed}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">ワクチン種類</p>
                    <p className="font-semibold">{selectedVaccine.vaccine_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">接種日</p>
                    <p className="font-semibold">
                      {new Date(selectedVaccine.vaccination_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">有効期限</p>
                    <p className="font-semibold">
                      {new Date(selectedVaccine.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">ステータス</p>
                    <span className="inline-flex px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      有効
                    </span>
                  </div>
                </div>
              </div>

              {selectedVaccine.certificate_url && (
                <div className="text-center mb-6">
                  <img
                    src={selectedVaccine.certificate_url}
                    alt="ワクチン接種証明書"
                    className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  この証明書は施設で提示してください
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 背景オーバーレイ（メニューが開いている時） */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default FloatingActionButton; 