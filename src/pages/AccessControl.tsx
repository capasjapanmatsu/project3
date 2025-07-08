import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  PawPrint,
  Key
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { PinCodeEntry } from '../components/PinCodeEntry';
import { supabase } from '../utils/supabase';
import type { Dog, SmartLock, DogPark } from '../types';
import VaccineBadge, { getVaccineStatusFromDog } from '../components/VaccineBadge';

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

  const MAX_DOGS = 3; // 最大3頭まで選択可能

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

  // PINコード生成成功時の処理
  const handlePinSuccess = (result: any) => {
    setSuccess(`PINコードを生成しました`);
    
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
              <PinCodeEntry
                lockId={selectedLock.lock_id}
                parkName={parks.find(p => p.id === selectedLock.park_id)?.name || 'ドッグパーク'}
                purpose="entry"
                onSuccess={handlePinSuccess}
                onError={handlePinError}
              />
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

