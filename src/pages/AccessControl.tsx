import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    CreditCard,
    Key,
    MapPin,
    Navigation,
    PawPrint,
    Shield
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import VaccineBadge, { getVaccineStatusFromDog } from '../components/VaccineBadge';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import type { Dog, DogPark, SmartLock } from '../types';
import { DEFAULT_LOCATION, LocationError, formatDistance, getCurrentLocation, sortByDistance, type Location } from '../utils/location';
import { checkPaymentStatus, type PaymentStatus } from '../utils/paymentUtils';
import { supabase } from '../utils/supabase';

type ParkWithDistance = DogPark & { distance: number };

export function AccessControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isActive: hasSubscription } = useSubscription();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [parks, setParks] = useState<DogPark[]>([]);
  const [nearbyParks, setNearbyParks] = useState<ParkWithDistance[]>([]);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]);
  const [selectedPark, setSelectedPark] = useState<ParkWithDistance | null>(null);
  const [selectedLock, setSelectedLock] = useState<SmartLock | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [pinExpiresAt, setPinExpiresAt] = useState<string | null>(null);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showOtherParks, setShowOtherParks] = useState(false);
  const [otherParksPage, setOtherParksPage] = useState(1);

  const MAX_DOGS = 3; // 最大3頭まで選択可能
  const NEARBY_PARKS_LIMIT = 3; // 近い順に表示する施設数
  const OTHERS_PARKS_PER_PAGE = 10; // その他施設の1ページあたり表示件数

  // PIN生成機能（簡略化版）
  const generatePin = async () => {
    if (!selectedPark || selectedDogs.length === 0) {
      setError('犬と施設を選択してください');
      return;
    }

    // 決済状況確認
    if (!paymentStatus || paymentStatus.needsPayment) {
      // 予約ページにリダイレクト
      navigate(`/parks/${selectedPark.id}/reserve`);
      return;
    }

    setIsGeneratingPin(true);
    setError('');

    try {
      // デモ用のPIN生成（実際のTTLock APIが利用可能になるまで）
      const demoPin = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5分後
      
      setPinCode(demoPin);
      setPinExpiresAt(expiresAt);
      setSuccess('PINコードが生成されました（デモ版）');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'PIN生成中にエラーが発生しました';
      setError(errorMessage);
    } finally {
      setIsGeneratingPin(false);
    }
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMinutes = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60));
    return `${diffMinutes}分後`;
  };

  // 現在位置を取得
  const getCurrentUserLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
    } catch (error) {
      console.warn('GPS location failed, using default location:', error);
      setUserLocation(DEFAULT_LOCATION);
      if (error instanceof LocationError && error.code === 1) {
        setError('位置情報の使用が拒否されました。手動で施設を選択してください。');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 施設を距離順にソート
  const sortParksByDistance = (parks: DogPark[], location: Location) => {
    const sorted = sortByDistance(parks, location);
    setNearbyParks(sorted);
    
    // 最も近い施設を自動選択
    if (sorted.length > 0 && !selectedPark) {
      handleParkSelection(sorted[0]);
    }
  };

  // 施設選択処理（簡略化版）
  const handleParkSelection = (park: ParkWithDistance) => {
    setSelectedPark(park);
    setError('');
    
    // 施設選択時にその他施設表示を閉じて基本の3件表示に戻る
    setShowOtherParks(false);
    setOtherParksPage(1);
    
    // デモ用のスマートロック情報を設定
    const demoLock: SmartLock = {
      id: `lock_${park.id}`,
      lock_id: `LOCK_${park.name}`,
      park_id: park.id,
      lock_name: `${park.name} - 入場ゲート`,
      lock_type: 'ttlock_smart_lock',
      is_online: true,
      battery_level: 85,
      purpose: 'entry_exit',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setSelectedLock(demoLock);
  };

  useEffect(() => {
    const fetchUserDogs = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('dogs')
          .select(`
            *,
            vaccine_certifications (
              id,
              status,
              rabies_expiry_date,
              combo_expiry_date,
              approved_at
            )
          `)
          .eq('owner_id', user.id);

        if (error) {
          console.warn('Error fetching dogs:', error);
          setError('ワンちゃんの情報を取得できませんでした。');
          return;
        }
        
        // ワクチン承認済みのワンちゃんのみをフィルタリング
        const approvedDogs = (data || []).filter(dog => {
          const vaccineStatus = getVaccineStatusFromDog(dog);
          return vaccineStatus === 'approved';
        });
        
        setDogs(approvedDogs);
        
        // 承認済みのワンちゃんがいない場合の警告
        if (data && data.length > 0 && approvedDogs.length === 0) {
          setError('ワクチン接種証明書が承認されたワンちゃんがいません。マイページからワクチン証明書をアップロードして承認を受けてください。');
        }
      } catch (error) {
        console.error('Error fetching dogs:', error);
        setError('ワンちゃんの情報を取得できませんでした。');
      }
    };

    const fetchParks = async () => {
      try {
        setIsLoading(true);
        
        // より安全なクエリ（is_publicカラムの存在に関係なく動作）
        let query = supabase
          .from('dog_parks')
          .select('*')
          .eq('status', 'approved');

        const { data: parksData, error: parksError } = await query;

        if (parksError) {
          console.warn('Error fetching parks:', parksError);
          // フォールバック：テストデータを使用
          const fallbackParks: DogPark[] = [
            {
              id: 'test-park-1',
              name: 'テスト用ドッグラン',
              address: '東京都渋谷区1-1-1',
              prefecture: '東京都',
              city: '渋谷区',
              status: 'approved',
              is_public: true,
              latitude: 35.6580,
              longitude: 139.7016,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ];
          setParks(fallbackParks);

          // 位置情報が取得されている場合、距離順でソート
          if (userLocation) {
            sortParksByDistance(fallbackParks, userLocation);
          }
          return;
        }

        setParks(parksData || []);

        // 位置情報が取得されている場合、距離順でソート
        if (userLocation && parksData) {
          sortParksByDistance(parksData, userLocation);
        }
      } catch (error) {
        console.error('Error fetching parks:', error);
        setError('施設データの取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPaymentStatus = async () => {
      if (!user) return;
      
      try {
        const status = await checkPaymentStatus(user.id);
        setPaymentStatus(status);
      } catch (error) {
        console.error('Error checking payment status:', error);
        // デフォルトの決済状況を設定
        setPaymentStatus({
          hasSubscription: false,
          hasDayPass: false,
          needsPayment: true
        });
      }
    };

    fetchUserDogs();
    fetchParks();
    fetchPaymentStatus();
    getCurrentUserLocation();
  }, [user]);

  // 位置情報が更新されたら施設をソート
  useEffect(() => {
    if (userLocation && parks.length > 0) {
      sortParksByDistance(parks, userLocation);
    }
  }, [userLocation, parks]);

  // 犬の選択処理
  const handleDogSelection = (dogId: string) => {
    setSelectedDogs(prev => {
      if (prev.includes(dogId)) {
        return prev.filter(id => id !== dogId);
      } else if (prev.length < MAX_DOGS) {
        return [...prev, dogId];
      }
      return prev;
    });
  };

  // 選択された犬の名前を取得
  const getSelectedDogNames = () => {
    return selectedDogs
      .map(id => {
        const dog = dogs.find(d => d.id === id);
        return dog ? `${dog.name}${getDogHonorific(dog.gender)}` : '';
      })
      .filter(Boolean)
      .join('、');
  };

  // 犬の性別に応じた敬称を取得する関数
  const getDogHonorific = (gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
  };

  // 決済状況に応じたメッセージ
  const getPaymentStatusMessage = () => {
    if (!paymentStatus) return '';
    
    if (paymentStatus.hasSubscription) {
      return '✅ サブスクリプション会員（全国利用可能）';
    } else if (paymentStatus.hasDayPass) {
      const validUntil = paymentStatus.validUntil ? new Date(paymentStatus.validUntil).toLocaleString('ja-JP') : '';
      return `✅ ワンデイパス利用可能（${validUntil}まで）`;
    } else {
      return '⚠️ 利用にはサブスクリプションまたはワンデイパスが必要です';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">ドッグラン入場管理</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* 決済状況表示 */}
      {paymentStatus && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">{getPaymentStatusMessage()}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左側: 犬の選択と施設選択 */}
        <div className="space-y-6">
          {/* ワンちゃん選択セクション */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <PawPrint className="w-5 h-5 text-blue-600 mr-2" />
              入場するワンちゃんを選択
            </h2>
            
            {dogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">ワクチン承認済みのワンちゃんがいません</p>
                <Button onClick={() => navigate('/register-dog')}>
                  ワンちゃんを登録する
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      入場するワンちゃんを選択（最大{MAX_DOGS}頭）
                    </label>
                    <div className="text-sm text-gray-600">
                      {selectedDogs.length}/{MAX_DOGS}頭選択中
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {dogs.map((dog) => {
                      const isSelected = selectedDogs.includes(dog.id);
                      const isDisabled = !isSelected && selectedDogs.length >= MAX_DOGS;
                      
                      return (
                        <div
                          key={dog.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors relative ${
                            isSelected
                              ? 'border-green-500 bg-green-50'
                              : isDisabled
                              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => !isDisabled && handleDogSelection(dog.id)}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                              {dog.image_url ? (
                                <img 
                                  src={dog.image_url} 
                                  alt={dog.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <PawPrint className="w-6 h-6 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{dog.name}{getDogHonorific(dog.gender)}</h3>
                                <VaccineBadge 
                                  status={getVaccineStatusFromDog(dog)} 
                                  size="sm" 
                                />
                              </div>
                              <p className="text-sm text-gray-600">{dog.breed} • {dog.gender}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedDogs.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>選択中:</strong> {getSelectedDogNames()}
                    </p>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* 施設選択セクション */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
              利用する施設を選択
            </h2>

            {isLoadingLocation && (
              <div className="flex items-center justify-center py-4 text-blue-600">
                <Navigation className="w-4 h-4 animate-spin mr-2" />
                現在位置を取得中...
              </div>
            )}

            {nearbyParks.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">利用可能な施設がありません</p>
                <Button onClick={() => navigate('/parks')}>
                  ドッグラン一覧を見る
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 近い順3件表示または選択された施設を含む3件表示 */}
                {!showOtherParks ? (
                  nearbyParks.slice(0, NEARBY_PARKS_LIMIT).map((park) => (
                    <div
                      key={park.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPark?.id === park.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleParkSelection(park)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{park.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{park.address}</p>
                          <div className="flex items-center text-sm text-blue-600">
                            <Navigation className="w-4 h-4 mr-1" />
                            約 {formatDistance(park.distance)}
                          </div>
                        </div>
                        {selectedPark?.id === park.id && (
                          <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  /* その他施設のページネーション表示 */
                  (() => {
                    const otherParks = nearbyParks.slice(NEARBY_PARKS_LIMIT);
                    const startIndex = (otherParksPage - 1) * OTHERS_PARKS_PER_PAGE;
                    const endIndex = startIndex + OTHERS_PARKS_PER_PAGE;
                    const currentPageParks = otherParks.slice(startIndex, endIndex);
                    const totalPages = Math.ceil(otherParks.length / OTHERS_PARKS_PER_PAGE);

                    return (
                      <div className="space-y-3">
                        {currentPageParks.map((park) => (
                          <div
                            key={park.id}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              selectedPark?.id === park.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleParkSelection(park)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold mb-1">{park.name}</h3>
                                <p className="text-sm text-gray-600 mb-2">{park.address}</p>
                                <div className="flex items-center text-sm text-blue-600">
                                  <Navigation className="w-4 h-4 mr-1" />
                                  約 {formatDistance(park.distance)}
                                </div>
                              </div>
                              {selectedPark?.id === park.id && (
                                <CheckCircle className="w-6 h-6 text-blue-500 flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* ページネーション */}
                        {totalPages > 1 && (
                          <div className="flex justify-center items-center space-x-2 pt-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={otherParksPage === 1}
                              onClick={() => setOtherParksPage(prev => prev - 1)}
                            >
                              前の10件
                            </Button>
                            <span className="text-sm text-gray-600">
                              {otherParksPage} / {totalPages}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={otherParksPage === totalPages}
                              onClick={() => setOtherParksPage(prev => prev + 1)}
                            >
                              次の10件
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* その他の施設を表示/非表示ボタン */}
                {nearbyParks.length > NEARBY_PARKS_LIMIT && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setShowOtherParks(!showOtherParks);
                      if (!showOtherParks) {
                        setOtherParksPage(1); // その他施設を開く時はページ1から
                      }
                    }}
                  >
                    {showOtherParks ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        近い順{NEARBY_PARKS_LIMIT}件のみ表示
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        その他の施設を表示（{nearbyParks.length - NEARBY_PARKS_LIMIT}件）
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* 右側: PIN生成 */}
        <div className="space-y-6">
          {/* PIN生成セクション */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Key className="w-5 h-5 text-blue-600 mr-2" />
              PINコード生成
            </h2>
            
            {selectedPark && selectedDogs.length > 0 ? (
              <div className="space-y-4">
                {pinCode ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800 font-medium">PIN生成完了</span>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-800 mb-2 tracking-wider">
                          {pinCode}
                        </div>
                        <div className="flex items-center justify-center text-sm text-green-700">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>有効期限: {pinExpiresAt && formatExpiryTime(pinExpiresAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Shield className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">ご利用方法</p>
                          <p>ドッグランの入り口でこのPINコードを入力してください。</p>
                          <p>このPINは一度のみ使用可能で、{pinExpiresAt && formatExpiryTime(pinExpiresAt)}に期限切れとなります。</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setPinCode(null);
                        setPinExpiresAt(null);
                        setSuccess('');
                      }}
                      className="w-full"
                      variant="secondary"
                    >
                      新しいPINを生成
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium mb-2">利用予定</h3>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>施設:</strong> {selectedPark.name}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>ワンちゃん:</strong> {getSelectedDogNames()}
                      </p>
                      {userLocation && (
                        <p className="text-sm text-gray-600">
                          <strong>距離:</strong> 約 {formatDistance(selectedPark.distance)}
                        </p>
                      )}
                    </div>

                    {paymentStatus?.needsPayment ? (
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start">
                            <CreditCard className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-medium mb-1">決済が必要です</p>
                              <p>この施設を利用するには、サブスクリプションまたはワンデイパスの購入が必要です。</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <Button
                            onClick={() => navigate('/subscription-intro')}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            サブスクリプション加入（¥3,800/月）
                          </Button>
                          
                          <Button
                            onClick={generatePin}
                            className="w-full"
                          >
                            <Key className="w-4 h-4 mr-2" />
                            ワンデイパス購入（¥800〜）
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={generatePin}
                        isLoading={isGeneratingPin}
                        className="w-full"
                        disabled={isGeneratingPin}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        PINコードを生成
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">PINコードを生成するには：</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• ワンちゃんを1頭以上選択</li>
                  <li>• 施設を選択</li>
                </ul>
              </div>
            )}
          </Card>

          {/* PINコードの使い方説明 */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3">PINコードの使い方</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>1. 犬とドッグランを選択してPINを生成</p>
              <p>2. 現地でスマートロックにPINを入力</p>
              <p>3. ロックが解除されて入場完了</p>
              <p>4. 退場時も同様にPINを生成して解錠</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

