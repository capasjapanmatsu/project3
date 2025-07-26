import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    Clock,
    Key,
    MapPin,
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
import { supabase } from '../utils/supabase';

export function AccessControl() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isActive: hasSubscription } = useSubscription();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [smartLocks, setSmartLocks] = useState<SmartLock[]>([]);
  const [parks, setParks] = useState<DogPark[]>([]);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]);
  const [selectedLock, setSelectedLock] = useState<SmartLock | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [pinExpiresAt, setPinExpiresAt] = useState<string | null>(null);
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);

  const MAX_DOGS = 3; // 最大3頭まで選択可能

  // PIN生成機能
  const generatePin = async () => {
    if (!selectedLock || selectedDogs.length === 0) return;

    setIsGeneratingPin(true);
    setError('');

    try {
      const { data, error } = await supabase.functions.invoke('ttlock-generate-pin', {
        body: {
          userId: user?.id,
          lockId: selectedLock.lock_id,
          purpose: 'entry',
          expiryMinutes: 5
        }
      });

      if (error) throw error;

      if (data.success) {
        setPinCode(data.pin_code);
        setPinExpiresAt(data.expires_at);
        setSuccess('PINコードが生成されました');
      } else {
        throw new Error(data.error || 'PIN生成に失敗しました');
      }
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

        if (error) throw error;
        
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

    const fetchParksAndLocks = async () => {
      try {
        setIsLoading(true);
        
        // 承認済みのドッグパークを取得
        const { data: parksData, error: parksError } = await supabase
          .from('dog_parks')
          .select('*')
          .eq('status', 'approved');

        if (parksError) throw parksError;
        setParks(parksData || []);

        // スマートロックを取得
        const { data: locksData, error: locksError } = await supabase
          .from('smart_locks')
          .select('*')
          .eq('status', 'active');

        if (locksError) throw locksError;
        setSmartLocks(locksData || []);
        
        // 最初のロックを選択
        if (locksData && locksData.length > 0) {
          setSelectedLock(locksData[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('データの取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDogs();
    fetchParksAndLocks();
  }, [user]);

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左側: 犬の選択とPIN生成 */}
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
              </>
            )}
          </Card>

          {/* 施設選択セクション */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 text-blue-600 mr-2" />
              施設を選択
            </h2>
            
            {smartLocks.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">利用可能な施設がありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {smartLocks.map((lock) => {
                  const park = parks.find(p => p.id === lock.park_id);
                  const isSelected = selectedLock?.id === lock.id;
                  
                  return (
                    <div
                      key={lock.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedLock(lock)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{park?.name || 'Unknown Park'}</h3>
                          <p className="text-sm text-gray-600">{lock.lock_name}</p>
                          <p className="text-xs text-gray-500">{park?.address}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
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
            
            {selectedLock && selectedDogs.length > 0 ? (
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
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">PINコードを生成するには：</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• ワンちゃんを1頭以上選択</li>
                  <li>• 施設を選択</li>
                </ul>
              </div>
            )}
          </Card>

          {/* 使い方ガイド */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">PINコードの使い方</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold flex-shrink-0">
                  1
                </div>
                <p>ワンちゃんと施設を選択してPINコードを生成します</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold flex-shrink-0">
                  2
                </div>
                <p>ドッグランの入口にあるスマートロックのキーパッドにPINコードを入力します</p>
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
                <p>退場時も同様にPINコードを生成して使用します</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

