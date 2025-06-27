import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Key, 
  PawPrint, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard,
  Calendar,
  Building,
  Users,
  X,
  LogIn,
  LogOut,
  QrCode,
  Search,
  MapPin,
  Star
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PinCodeGenerator } from '../components/PinCodeGenerator';
import { PinCodeEntry } from '../components/PinCodeEntry';
import type { Dog, SmartLock, DogPark } from '../types';

export function AccessControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isActive: hasSubscription } = useSubscription();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]);
  const [activeQRCode, setActiveQRCode] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [smartLocks, setSmartLocks] = useState<SmartLock[]>([]);
  const [selectedLock, setSelectedLock] = useState<SmartLock | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'pin'>('pin');
  const [pinPurpose, setPinPurpose] = useState<'entry' | 'exit'>('entry');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentType, setPaymentType] = useState<'single' | 'subscription'>('single');
  const [nearbyParks, setNearbyParks] = useState<DogPark[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllParks, setShowAllParks] = useState(false);

  const MAX_DOGS = 3; // 最大3頭まで選択可能

  useEffect(() => {
    if (user) {
      fetchData();
      // Get user's location
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to Tokyo if location access is denied
          setUserLocation({ lat: 35.6812, lng: 139.7671 });
        }
      );
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  // When user location is available, fetch nearby parks
  useEffect(() => {
    if (userLocation) {
      fetchNearbyParks();
    }
  }, [userLocation]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 犬の情報を取得
      const { data: dogsData, error: dogsError } = await supabase
        .from('dogs')
        .select(`
          *,
          vaccine_certifications!inner(*)
        `)
        .eq('owner_id', user?.id)
        .eq('vaccine_certifications.status', 'approved');
      
      if (dogsError) throw dogsError;
      setDogs(dogsData || []);
      
      // スマートロック情報を取得
      const { data: locksData, error: locksError } = await supabase
        .from('smart_locks')
        .select('id, lock_id, lock_name, park_id, pin_enabled')
        .eq('status', 'active');
      
      if (locksError) throw locksError;
      setSmartLocks(locksData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNearbyParks = async () => {
    if (!userLocation) return;
    
    try {
      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('status', 'approved');
      
      if (error) throw error;
      
      // Calculate distance and sort by distance
      const parksWithDistance = (data || []).map(park => {
        const distance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          Number(park.latitude), 
          Number(park.longitude)
        );
        return { ...park, distance };
      });
      
      // Sort by distance
      parksWithDistance.sort((a, b) => a.distance - b.distance);
      
      setNearbyParks(parksWithDistance);
      
      // If there are parks, select the closest one by default
      if (parksWithDistance.length > 0) {
        const closestPark = parksWithDistance[0];
        
        // Find the lock for this park
        const parkLock = smartLocks.find(lock => lock.park_id === closestPark.id);
        if (parkLock) {
          setSelectedLock(parkLock);
        }
      }
    } catch (error) {
      console.error('Error fetching nearby parks:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // 犬選択の処理
  const handleDogSelection = (dogId: string) => {
    setSelectedDogs(prev => {
      if (prev.includes(dogId)) {
        // 既に選択されている場合は削除
        return prev.filter(id => id !== dogId);
      } else {
        // 新しく選択する場合
        if (prev.length >= MAX_DOGS) {
          setError(`最大${MAX_DOGS}頭まで選択可能です。`);
          return prev;
        }
        setError(''); // エラーをクリア
        return [...prev, dogId];
      }
    });
  };

  // 施設選択の処理
  const handleParkSelection = (parkId: string) => {
    const parkLock = smartLocks.find(lock => lock.park_id === parkId);
    if (parkLock) {
      setSelectedLock(parkLock);
      setError('');
    } else {
      setError('選択した施設にはスマートロックが設定されていません。');
    }
  };

  // QRコード生成処理
  const generateQRCode = async () => {
    if (selectedDogs.length === 0) {
      setError('ワンちゃんを1頭以上選択してください。');
      return;
    }
    
    // サブスクリプションがない場合は支払いオプションを表示
    if (!hasSubscription && !showPaymentOptions) {
      setShowPaymentOptions(true);
      return;
    }
    
    // 支払いタイプが選択されていない場合
    if (!hasSubscription && showPaymentOptions && !paymentType) {
      setError('支払い方法を選択してください。');
      return;
    }
    
    // サブスクリプション選択時はサブスク購入ページへ
    if (!hasSubscription && paymentType === 'subscription') {
      navigate('/subscription');
      return;
    }
    
    // 1日券選択時は決済ページへ
    if (!hasSubscription && paymentType === 'single') {
      navigate(`/parks/${selectedLock?.park_id}/reserve`, {
        state: {
          selectedDogs,
          paymentType: 'single'
        }
      });
      return;
    }
    
    // サブスク会員の場合はQRコードを生成
    if (hasSubscription) {
      navigate('/entrance-qr', {
        state: {
          selectedDogs,
          paymentType: 'subscription'
        }
      });
    }
  };

  // PINコード生成成功時の処理
  const handlePinSuccess = (pin: string) => {
    setSuccess(`PINコードを生成しました: ${pin}`);
    
    // 3秒後に成功メッセージを消す
    setTimeout(() => {
      setSuccess('');
    }, 3000);
  };

  // PINコード生成エラー時の処理
  const handlePinError = (errorMessage: string) => {
    setError(errorMessage);
    
    // 5秒後にエラーメッセージを消す
    setTimeout(() => {
      setError('');
    }, 5000);
  };

  // 犬の性別に応じた敬称を取得する関数
  const getDogHonorific = (gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
  };

  // 選択された犬の名前を取得
  const getSelectedDogNames = () => {
    return selectedDogs.map(dogId => {
      const dog = dogs.find(d => d.id === dogId);
      return dog ? `${dog.name}${getDogHonorific(dog.gender)}` : '';
    }).filter(name => name).join('、');
  };

  // 検索結果のフィルタリング
  const filteredParks = nearbyParks.filter(park => 
    park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    park.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 表示する公園の数を制限（検索時または「すべて表示」が選択されている場合は全て表示）
  const displayedParks = searchTerm || showAllParks 
    ? filteredParks 
    : filteredParks.slice(0, 5);

  const [success, setSuccess] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-8">
        <h2 className="text-xl font-semibold mb-4">ワクチン接種証明書が必要です</h2>
        <p className="text-gray-600 mb-4">
          ドッグランを利用するには、ワクチン接種証明書の承認が必要です。
          まだ証明書を提出していない場合は、ワンちゃんの登録時に提出してください。
        </p>
        <Button onClick={() => navigate('/register-dog')}>
          ワンちゃんを登録する
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8 flex items-center justify-center">
        <Key className="w-8 h-8 text-green-600 mr-3" />
        ドッグラン入退場
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 犬選択セクション - タブの外に配置 */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <PawPrint className="w-6 h-6 text-blue-600 mr-2" />
              入場するワンちゃん
            </h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>{success}</p>
              </div>
            )}
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  入場するワンちゃんを選択（最大{MAX_DOGS}頭）
                </label>
                <div className="text-sm text-gray-600">
                  {selectedDogs.length}/{MAX_DOGS}頭選択中
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <h3 className="font-semibold">{dog.name}{getDogHonorific(dog.gender)}</h3>
                          <p className="text-sm text-gray-600">{dog.breed} • {dog.gender}</p>
                          <div className="flex items-center text-xs text-green-600 mt-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>ワクチン承認済み</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {selectedDogs.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-1">選択中のワンちゃん</h4>
                  <p className="text-sm text-green-800">{getSelectedDogNames()}</p>
                  <p className="text-xs text-green-700 mt-1">
                    {selectedDogs.length}頭が同時入場できます
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 施設選択セクション */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Building className="w-6 h-6 text-blue-600 mr-2" />
              施設を選択
            </h2>

            {/* 施設検索 */}
            <div className="mb-4">
              <Input
                label=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="施設名や住所で検索..."
                icon={<Search className="w-4 h-4 text-gray-500" />}
              />
            </div>

            {/* 近くの施設一覧 */}
            <div className="space-y-3 mb-4">
              <h3 className="font-medium text-gray-700">
                {searchTerm ? "検索結果" : "近くのドッグラン"}
              </h3>
              
              {displayedParks.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-600">施設が見つかりませんでした</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedParks.map((park) => {
                    const isSelected = selectedLock?.park_id === park.id;
                    const parkLock = smartLocks.find(lock => lock.park_id === park.id);
                    const distance = park.distance ? `約${Math.round(park.distance * 10) / 10}km` : '';
                    
                    return (
                      <div
                        key={park.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        } ${!parkLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => parkLock && handleParkSelection(park.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                            {park.image_url ? (
                              <img 
                                src={park.image_url} 
                                alt={park.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building className="w-8 h-8 text-gray-400 m-auto mt-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <h4 className="font-medium">{park.name}</h4>
                              {distance && (
                                <span className="text-xs text-gray-500">{distance}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-1">{park.address}</p>
                            <div className="flex items-center mt-1">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= Math.round(park.average_rating)
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="text-xs text-gray-600 ml-1">
                                  {park.average_rating.toFixed(1)}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 ml-2">
                                {park.current_occupancy}/{park.max_capacity}人
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* もっと見るボタン */}
              {!searchTerm && filteredParks.length > 5 && !showAllParks && (
                <button
                  onClick={() => setShowAllParks(true)}
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 text-center"
                >
                  すべての施設を表示 ({filteredParks.length}件)
                </button>
              )}
              
              {/* 検索結果が多い場合の表示 */}
              {searchTerm && filteredParks.length > 10 && (
                <p className="text-xs text-gray-500 text-center">
                  {filteredParks.length}件の施設が見つかりました
                </p>
              )}
              
              {/* 施設が見つからない場合のリンク */}
              <div className="text-center mt-2">
                <Link to="/parks" className="text-sm text-blue-600 hover:text-blue-800">
                  すべてのドッグランを見る
                </Link>
              </div>
            </div>
          </Card>
          
          {/* タブナビゲーション */}
          <div className="flex justify-center space-x-2 mb-4">
            <button
              className={`px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'pin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveTab('pin')}
            >
              <Key className="w-4 h-4 mr-2" />
              PINコード
            </button>
            <button
              className={`px-4 py-2 rounded-lg flex items-center ${
                activeTab === 'qr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveTab('qr')}
            >
              <QrCode className="w-4 h-4 mr-2" />
              QRコード
            </button>
          </div>
          
          {/* PINコードタブ */}
          {activeTab === 'pin' && (
            <div className="space-y-6">
              {/* 入退場切り替え */}
              <div className="flex justify-center space-x-4 mb-4">
                <button
                  className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                    pinPurpose === 'entry'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setPinPurpose('entry')}
                >
                  <LogIn className="w-5 h-5" />
                  <span>入場</span>
                </button>
                <button
                  className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                    pinPurpose === 'exit'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  onClick={() => setPinPurpose('exit')}
                >
                  <LogOut className="w-5 h-5" />
                  <span>退場</span>
                </button>
              </div>
              
              {/* PINコードジェネレーター */}
              {selectedLock && selectedDogs.length > 0 ? (
                <PinCodeGenerator
                  lockId={selectedLock.lock_id}
                  parkName={nearbyParks.find(p => p.id === selectedLock.park_id)?.name || selectedLock.lock_name}
                  purpose={pinPurpose}
                  onSuccess={handlePinSuccess}
                  onError={handlePinError}
                />
              ) : (
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  {!selectedLock && (
                    <div className="mb-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-yellow-800 font-medium">施設を選択してください</p>
                      <p className="text-sm text-yellow-700 mt-1">PINコードを発行するには、施設を選択する必要があります</p>
                    </div>
                  )}
                  
                  {selectedLock && selectedDogs.length === 0 && (
                    <div>
                      <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-yellow-800 font-medium">ワンちゃんを1頭以上選択してください</p>
                      <p className="text-sm text-yellow-700 mt-1">PINコードを発行するには、入場するワンちゃんを選択する必要があります</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* PINコード入力 */}
              {selectedLock && (
                <PinCodeEntry
                  lockId={selectedLock.lock_id}
                  parkName={nearbyParks.find(p => p.id === selectedLock.park_id)?.name || selectedLock.lock_name}
                  purpose={pinPurpose}
                />
              )}
            </div>
          )}
          
          {/* QRコードタブ */}
          {activeTab === 'qr' && (
            <>
              {/* 支払い方法（サブスクリプションがない場合のみ表示） */}
              {!hasSubscription && showPaymentOptions && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-3">支払い方法を選択</h3>
                  <div className="space-y-3">
                    <label className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      paymentType === 'single' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="single"
                        checked={paymentType === 'single'}
                        onChange={() => setPaymentType('single')}
                        className="form-radio text-blue-600"
                      />
                      <div>
                        <span className="font-medium">1日券</span>
                        <p className="text-sm text-gray-600">
                          1頭目¥800 + 2頭目以降¥400/頭・24時間有効
                        </p>
                      </div>
                    </label>
                    
                    <label className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      paymentType === 'subscription' ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="subscription"
                        checked={paymentType === 'subscription'}
                        onChange={() => setPaymentType('subscription')}
                        className="form-radio text-purple-600"
                      />
                      <div>
                        <span className="font-medium">サブスクリプション（月額¥3,800）</span>
                        <p className="text-sm text-gray-600">
                          3頭まで使い放題・全国のドッグランで利用可能
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              
              {/* QRコード生成ボタン */}
              <Button 
                onClick={generateQRCode}
                isLoading={isGenerating}
                disabled={selectedDogs.length === 0 || !selectedLock}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <QrCode className="w-4 h-4 mr-2" />
                {!hasSubscription && !showPaymentOptions 
                  ? 'QRコードを発行する' 
                  : hasSubscription 
                    ? 'QRコードを発行する' 
                    : paymentType === 'single' 
                      ? '1日券を購入する' 
                      : 'サブスクリプションに加入する'}
              </Button>
            </>
          )}
        </div>
        
        {/* サイドバー */}
        <div className="space-y-6">
          {/* PINコードの使い方 */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">PINコードの使い方</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold flex-shrink-0">
                  1
                </div>
                <p>「入場用PIN」または「退場用PIN」ボタンをクリックしてPINコードを生成します</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold flex-shrink-0">
                  2
                </div>
                <p>ドッグランの入口または出口にあるスマートロックのキーパッドにPINコードを入力します</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold flex-shrink-0">
                  3
                </div>
                <p>PINコードは5分間有効です</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold flex-shrink-0">
                  4
                </div>
                <p>入場と退場それぞれでPINコードが必要です</p>
              </div>
            </div>
          </Card>
          
          {/* QRコードの使い方 */}
          <Card className="p-6 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900 mb-3">QRコードの使い方</h3>
            <div className="space-y-3 text-sm text-green-800">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold flex-shrink-0">
                  1
                </div>
                <p>ドッグランの入口にあるQRコードリーダーにかざします</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold flex-shrink-0">
                  2
                </div>
                <p>認証が完了すると、自動的にドアが開きます</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold flex-shrink-0">
                  3
                </div>
                <p>QRコードは24時間有効です</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold flex-shrink-0">
                  4
                </div>
                <p>選択した全ての犬が同時に入場できます</p>
              </div>
            </div>
          </Card>

          {/* 料金情報 */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">料金情報</h3>
            <div className="space-y-3">
              {hasSubscription ? (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">サブスク会員特典</span>
                  </div>
                  <p className="text-sm text-purple-800">
                    月額3,800円で全国のドッグランが使い放題！
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>1頭目</span>
                    <span>¥800</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2頭目</span>
                    <span>+¥400</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3頭目</span>
                    <span>+¥400</span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>3頭合計</span>
                    <span>¥1,600</span>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <Link to="/subscription" className="text-sm text-blue-800 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1 text-blue-600" />
                      <span>サブスクリプションなら月額3,800円で使い放題！</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* 注意事項 */}
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <h3 className="font-semibold text-yellow-900 mb-3">注意事項</h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>• PINコードは他人と共有しないでください</p>
              <p>• 施設貸し切りの場合は友達と共有できます</p>
              <p>• 選択した犬のみ入場できます</p>
              <p>• 発情中のメス犬は入場できません</p>
              <p>• 攻撃的な行動を示す犬は退場していただきます</p>
              <p>• 各施設のルールを必ず守ってください</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LogIn({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function LogOut({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}