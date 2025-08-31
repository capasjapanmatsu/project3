import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Key,
    Loader2,
    MapPin,
    Navigation,
    PawPrint,
    Unlock
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import LazyImage from '../components/LazyImage';
import VaccineBadge, { getVaccineStatusFromDog } from '../components/VaccineBadge';
import useAuth from '../context/AuthContext';
import { retryConfigs, useRetryWithRecovery } from '../hooks/useRetryWithRecovery';
import { useSubscription } from '../hooks/useSubscription';
import type { Dog, DogPark, SmartLock } from '../types';
import { triggerHapticFeedback } from '../utils/hapticFeedback';
import { DEFAULT_LOCATION, LocationError, formatDistance, getCurrentLocation, sortByDistance, calculateDistance, type Location } from '../utils/location';
import { checkPaymentStatus, type PaymentStatus } from '../utils/paymentUtils';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { supabase } from '../utils/supabase';

type ParkWithDistance = DogPark & { distance: number };

export function AccessControl() {
  const { user, effectiveUserId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [showOtherParks, setShowOtherParks] = useState(false);
  const [otherParksPage, setOtherParksPage] = useState(1);
  const [lastUnlockAt, setLastUnlockAt] = useState<number | null>(null);
  const [cooldownRemain, setCooldownRemain] = useState(0);
  const [userInside, setUserInside] = useState<boolean | null>(null);
  const [currentAction, setCurrentAction] = useState<'entry' | 'exit'>('entry');
  const [occupancy, setOccupancy] = useState<{ current?: number; max?: number } | null>(null);
  const [parkIdFromStatus, setParkIdFromStatus] = useState<string | null>(null);
  const [dogsTimeout, setDogsTimeout] = useState(false);
  const { execute: executeRetry, state: retryState, reset: resetRetry } = useRetryWithRecovery(retryConfigs.api);

  const MAX_DOGS = 3; // 最大3頭まで選択可能
  const NEARBY_PARKS_LIMIT = 3; // 近い順に表示する施設数
  const OTHERS_PARKS_PER_PAGE = 10; // その他施設の1ページあたり表示件数

  // リモート解錠（GPS必須・半径1km以内）
  const remoteUnlock = async () => {
    if (!selectedPark || selectedDogs.length === 0) {
      setError('犬と施設を選択してください');
      return;
    }

    if (currentAction === 'entry' && (!paymentStatus || paymentStatus.needsPayment)) {
      navigate(`/parks/${selectedPark.id}/reserve`);
      return;
    }

    // 位置情報が必要であることを明示
    if (!userLocation) {
      setError('解錠には位置情報（GPS）の許可が必要です。設定 > 位置情報 で有効化し、ブラウザに許可してください。');
      return;
    }

    // 半径チェック（クライアント側の早期バリデーション）
    if (selectedPark?.latitude && selectedPark?.longitude) {
      const dist = calculateDistance(userLocation.latitude, userLocation.longitude, selectedPark.latitude, selectedPark.longitude);
      const allowed = (selectedPark as any).geofence_radius_km ?? 1;
      if (dist > allowed) {
        setError(`この施設から${dist.toFixed(2)}km離れています。解錠は${allowed}km以内でのみ可能です（推奨1.0km）。`);
        return;
      }
    }

    setIsGeneratingPin(true);
    setError('');
    setSuccess('');

    try {
      const { data: locks } = await supabase
        .from('smart_locks')
        .select('*')
        .eq('park_id', selectedPark.id as any)
        .eq('pin_enabled', true);

      // 目的に応じてロックを選択（entry/exit）。無ければフォールバック
      const desired = currentAction === 'entry' ? 'entry' : 'exit';
      const lock = (locks || []).find((l: any) => l.purpose === desired) 
        || (locks || []).find((l: any) => l.purpose === 'entry')
        || (locks || [])[0];
      if (!lock) {
        setError('この施設にはスマートロックが未登録です。管理者側で設定が必要です。');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('認証が必要です');

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ttlock-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ 
          lockId: lock.lock_id, 
          userId: (user?.id || effectiveUserId), 
          purpose: currentAction,
          userLat: userLocation.latitude,
          userLng: userLocation.longitude,
          radiusKm: 1
        })
      });

      const body = await resp.json();
      if (!resp.ok || !body?.success) throw new Error(body?.error || '解錠に失敗しました');

      setSuccess(currentAction === 'entry' ? '入場が完了しました。ドアをお開けください。' : '退場が完了しました。ドアをお開けください。');
      // 即時UI反映（サーバー反映待ちの間もデフォルト切替）
      setUserInside(currentAction === 'entry');
      setCurrentAction(prev => (prev === 'entry' ? 'exit' : 'entry'));
      // 状態更新
      await refreshUserStatus();
      await refreshOccupancy();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGeneratingPin(false);
      setLastUnlockAt(Date.now());
    }
  };

  // 大きな丸ボタン押下時のハプティック＋解錠
  const handleRoundActionClick = async () => {
    if (isGeneratingPin || cooldownRemain > 0) return;
    try {
      await triggerHapticFeedback(currentAction === 'exit' ? 'heavy' : 'medium');
    } catch {}
    await remoteUnlock();
  };

  // PIN生成（Edge Function を利用して実際のロックに登録）
  const generatePin = async () => {
    if (!selectedPark || selectedDogs.length === 0) {
      setError('犬と施設を選択してください');
      return;
    }

    // 決済状況確認
    if (!paymentStatus || paymentStatus.needsPayment) {
      navigate(`/parks/${selectedPark.id}/reserve`);
      return;
    }

    setIsGeneratingPin(true);
    setError('');
    setSuccess('');

    try {
      // 施設に紐づくスマートロック一覧を取得（入場用を優先）
      const { data: locks, error: lockErr } = await supabase
        .from('smart_locks')
        .select('*')
        .eq('park_id', selectedPark.id as any)
        .eq('pin_enabled', true);

      if (lockErr) {
        setError('スマートロック情報の取得に失敗しました');
        return;
      }

      const lock = (locks || []).find((l: any) => l.purpose === 'entry') || (locks || [])[0];

      if (!lock) {
        setError('この施設にはスマートロックが未登録です。管理者側で設定が必要です。');
        return;
      }

      // 認証トークン取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('認証が必要です');
      }

      // Edge Function を呼び出し
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ttlock-generate-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user?.id || effectiveUserId,
          lockId: lock.lock_id,
          purpose: 'entry',
          expiryMinutes: 5,
        }),
      });

      if (!resp.ok) {
        const e = await resp.json();
        throw new Error(e?.error || 'リモート解錠に失敗しました');
      }

      const result = await resp.json() as { pin_code: string; expires_at: string };
      setPinCode(result.pin_code);
      setPinExpiresAt(result.expires_at);
      setSuccess('リモート解錠の準備ができました');
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
    if (sorted.length > 0 && !selectedPark && sorted[0]) {
      handleParkSelection(sorted[0]);
    }
  };

  // 施設選択処理
  const handleParkSelection = (park: ParkWithDistance) => {
    setSelectedPark(park);
    setError('');
    
    // 施設選択時にその他施設表示を閉じて基本の3件表示に戻る
    setShowOtherParks(false);
    setOtherParksPage(1);
    
    // 実ロックは generatePin 内で取得するため、ここでは選択だけ
    setSelectedLock(null);
  };

  const fetchDogsRemote = useCallback(async () => {
    const uid = user?.id || effectiveUserId;
    if (!uid) return;
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
      .eq('owner_id', uid as any);

    if (error) {
      console.warn('Error fetching dogs:', error);
      throw new Error('ワンちゃんの情報を取得できませんでした。');
    }

    const approvedDogs = (data || []).filter((dog: any) => {
      const vaccineStatus = getVaccineStatusFromDog(dog);
      return vaccineStatus === 'approved';
    });

    setDogs(approvedDogs as Dog[]);
    safeSetItem('accesscontrol_dogs', JSON.stringify({ ts: Date.now(), dogs: approvedDogs }), 'sessionStorage');

    if (data && data.length > 0 && approvedDogs.length === 0) {
      setError('ワクチン接種証明書が承認されたワンちゃんがいません。マイページからワクチン証明書をアップロードして承認を受けてください。');
    }
  }, [user, effectiveUserId]);

  const handleRetryDogs = useCallback(async () => {
    setDogsTimeout(false);
    resetRetry();
    const timer = setTimeout(() => setDogsTimeout(true), 2000);
    try {
      await executeRetry(fetchDogsRemote);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearTimeout(timer);
      setDogsTimeout(false);
      setIsLoading(false);
    }
  }, [executeRetry, fetchDogsRemote, resetRetry]);

  useEffect(() => {
    const fetchInitialData = async () => {
      const uid = user?.id || effectiveUserId;
      if (!uid) return;

      // 1) キャッシュ即時表示（sessionStorage）
      try {
        const cached = safeGetItem('accesscontrol_dogs', 'sessionStorage');
        if (cached) {
          const parsed = JSON.parse(cached) as { ts: number; dogs: Dog[] };
          if (Array.isArray(parsed?.dogs)) {
            setDogs(parsed.dogs);
            setIsLoading(false);
          }
        }
      } catch {
        // ignore cache errors
      }

      // 2) リモート取得（2秒タイムアウト表示＋リトライ対応）
      // 2秒タイマー（UI通知用）
      setDogsTimeout(false);
      const timer = setTimeout(() => setDogsTimeout(true), 2000);
      try {
        await executeRetry(fetchDogsRemote);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        clearTimeout(timer);
        setDogsTimeout(false);
        setIsLoading(false);
      }

      // 3) バックグラウンド並列取得
      const backgroundPromises = [
        fetchParksData(),
        fetchPaymentStatusData(),
        getCurrentUserLocation()
      ];
      void Promise.allSettled(backgroundPromises);
    };

    // 🔄 ドッグラン情報取得の分離関数
    const fetchParksData = async () => {
      try {
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
          return;
        }

        const loadedParks = parksData || [];
        setParks(loadedParks);

        // クエリ ?park=ID があれば、その施設を選択しておく
        const parkIdFromQuery = searchParams.get('park');
        if (parkIdFromQuery) {
          const found = loadedParks.find((p: any) => p.id === parkIdFromQuery);
          if (found) {
            const withDistance = { ...(found as DogPark), distance: 0 } as ParkWithDistance;
            handleParkSelection(withDistance);
          }
        } else if (parkIdFromStatus) {
          const found = loadedParks.find((p: any) => p.id === parkIdFromStatus);
          if (found) {
            setCurrentAction('exit');
            const withDistance = { ...(found as DogPark), distance: 0 } as ParkWithDistance;
            handleParkSelection(withDistance);
          }
        }
      } catch (error) {
        console.error('Error fetching parks:', error);
      }
    };

    // 🔄 決済状況確認の分離関数
    const fetchPaymentStatusData = async () => {
      const uid2 = user?.id || effectiveUserId;
      if (!uid2) return;
      
      try {
        const status = await checkPaymentStatus(uid2);
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

    fetchInitialData();
  }, [user]);

  // 🚀 フェーズ3: 位置情報が更新されたら施設をソート（低優先度処理）
  useEffect(() => {
    if (userLocation && parks.length > 0) {
      // 🔄 非同期でソート処理を実行（UIをブロックしない）
      const sortParksAsync = async () => {
        // 少し遅延を入れてメインスレッドを譲る
        await new Promise(resolve => setTimeout(resolve, 10));
        sortParksByDistance(parks, userLocation);
      };
      
      void sortParksAsync();
    }
  }, [userLocation, parks]);

  // ユーザーの入退場ステータス取得
  const refreshUserStatus = useCallback(async () => {
    try {
      const uid = user?.id || effectiveUserId;
      if (!uid) return;
      const { data } = await supabase
        .from('user_entry_status')
        .select('is_inside, park_id')
        .eq('user_id', uid as any)
        .maybeSingle();
      if (data) {
        setUserInside(!!data.is_inside);
        setCurrentAction(data.is_inside ? 'exit' : 'entry');
        if ((data as any).park_id) setParkIdFromStatus((data as any).park_id);
      }
    } catch (e) {
      // ignore
    }
  }, [user, effectiveUserId]);

  // 施設の混雑状況取得
  const refreshOccupancy = useCallback(async () => {
    try {
      if (!selectedPark) return;
      const { data } = await supabase
        .from('dog_parks')
        .select('current_occupancy, max_capacity')
        .eq('id', selectedPark.id as any)
        .maybeSingle();
      if (data) setOccupancy({ current: data.current_occupancy as any, max: data.max_capacity as any });
    } catch (e) {
      // ignore
    }
  }, [selectedPark]);

  useEffect(() => { void refreshUserStatus(); }, [refreshUserStatus]);
  useEffect(() => { void refreshOccupancy(); }, [refreshOccupancy]);

  // クールダウン残り秒の更新
  useEffect(() => {
    if (!lastUnlockAt) return;
    const COOLDOWN_MS = 3000;
    const timer = setInterval(() => {
      const remain = Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - lastUnlockAt)) / 1000));
      setCooldownRemain(remain);
      if (remain === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [lastUnlockAt]);

  // 犬の選択処理
  const handleDogSelection = useCallback((dogId: string) => {
    setSelectedDogs(prev => {
      if (prev.includes(dogId)) {
        return prev.filter(id => id !== dogId);
      } else if (prev.length < MAX_DOGS) {
        return [...prev, dogId];
      }
      return prev;
    });
  }, []);

  // 選択された犬の名前を取得
  const getSelectedDogNames = useCallback(() => {
    return selectedDogs
      .map(id => {
        const dog = dogs.find(d => d.id === id);
        return dog ? `${dog.name}${getDogHonorific(dog.gender)}` : '';
      })
      .filter(Boolean)
      .join('、');
  }, [selectedDogs, dogs]);

  // 犬の性別に応じた敬称を取得する関数
  const getDogHonorific = useCallback((gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
  }, []);

  // 決済状況に応じたメッセージ
  const getPaymentStatusMessage = useMemo(() => {
    if (!paymentStatus) return '';
    
    if (paymentStatus.hasSubscription) {
      return '✅ サブスクリプション会員（全国利用可能）';
    } else if (paymentStatus.hasDayPass) {
      const validUntil = paymentStatus.validUntil ? new Date(paymentStatus.validUntil).toLocaleString('ja-JP') : '';
      return `✅ 1Dayパス利用可能（${validUntil}まで）`;
    } else {
      return '⚠️ 利用にはサブスクリプションまたは1Dayパスが必要です';
    }
  }, [paymentStatus]);

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

      {/* 注意喚起（GPS必須） */}
      <Card className="p-4 mb-4 bg-yellow-50 border-yellow-200">
        <div className="text-sm text-yellow-800">
          GPS機能をオンにして使用してください。ドッグランに近い場所でないと開錠はできません。
        </div>
      </Card>

      {/* 決済状況表示 */}
      {paymentStatus && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">{getPaymentStatusMessage}</span>
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
            {/* 2秒を超えた取得遅延を検知したら案内＋再試行 */}
            {dogsTimeout && (
              <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-sm">
                情報の取得に時間がかかっています。通信環境をご確認の上、
                <button className="underline ml-1" onClick={handleRetryDogs}>再試行</button>
                してください。
              </div>
            )}
            
            {dogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">ワクチン承認済みのワンちゃんがいません</p>
                <Button onClick={() => navigate('/dog-registration')}>
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
                                <LazyImage
                                  src={dog.image_url} 
                                  alt={dog.name}
                                  width={48}
                                  height={48}
                                  loading="lazy"
                                  priority={false}
                                  className="w-full h-full object-cover rounded-full"
                                  placeholderSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KPGVsbGlwc2UgY3g9IjEyIiBjeT0iMTMiIHJ4PSIxMCIgcnk9IjQiLz4KPHBhdGggZD0ibTEyIDEzIDQuNS05IDQuNSA5Ii8+CjxwYXRoIGQ9Im0xMiAxMyA0LjUtOUw3IDEzIi8+CjxwYXRoIGQ9Im0xMiAxM0w3IDQgNy41IDEzIi8+Cjwvc3ZnPgo8L3N2Zz4K"
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
                      <strong>選択中:</strong> {getSelectedDogNames}
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

        {/* 右側: 入退場操作（PINは非表示） */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Unlock className="w-5 h-5 text-blue-600 mr-2" />
              入退場操作
            </h2>

            {selectedPark && selectedDogs.length > 0 ? (
              <div className="space-y-5">
                {/* 混雑状況 */}
                <div className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-md p-3">
                  <span className="text-gray-700">現在の入場者数</span>
                  <span className="font-semibold text-gray-900">{occupancy?.current ?? '-'}{occupancy?.max ? ` / ${occupancy.max}` : ''}</span>
                </div>

                {/* 入場/退場切替 */}
                <div className="flex justify-center gap-2">
                  <Button
                    variant={currentAction === 'entry' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setCurrentAction('entry')}
                  >
                    入場
                  </Button>
                  <Button
                    variant={currentAction === 'exit' ? 'danger' : 'secondary'}
                    size="sm"
                    onClick={() => setCurrentAction('exit')}
                  >
                    退場
                  </Button>
                </div>

                {/* 大ボタン */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-label={currentAction === 'entry' ? '入場する' : '退場する'}
                    onClick={handleRoundActionClick}
                    disabled={isGeneratingPin || cooldownRemain > 0}
                    className={`relative w-40 h-40 rounded-full text-white shadow-lg select-none outline-none focus:ring-4 transition active:scale-95 ${
                      (isGeneratingPin || cooldownRemain > 0)
                        ? (currentAction === 'entry' ? 'bg-blue-400' : 'bg-red-400') + ' cursor-not-allowed'
                        : currentAction === 'entry'
                          ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 bg-gradient-to-b focus:ring-blue-300'
                          : 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 bg-gradient-to-b focus:ring-red-300'
                    }`}
                  >
                    {isGeneratingPin ? (
                      <Loader2 className="w-10 h-10 animate-spin mx-auto" />
                    ) : (
                      <Unlock className="w-12 h-12 mx-auto" />
                    )}
                    {isGeneratingPin && (
                      <span className={`absolute inset-0 rounded-full ring-4 animate-ping ${currentAction === 'entry' ? 'ring-blue-300' : 'ring-red-300'}`} />
                    )}
                  </button>
                  <div className="mt-3 text-sm text-gray-700">
                    {isGeneratingPin
                      ? `${currentAction === 'entry' ? '入場' : '退場'}処理中...`
                      : cooldownRemain > 0
                      ? `再試行まで ${cooldownRemain}秒`
                      : `${currentAction === 'entry' ? '入場' : '退場'}（タップで解錠）`}
                  </div>
                  {/* 注意事項 */}
                  <div className="mt-2 text-xs text-gray-600 text-center leading-relaxed">
                    ・解錠ボタンを押した後、数秒時間がかかる場合があります。<br/>
                    ・マナーを守ってお楽しみください。
                  </div>
                  {/* 入場中のステータスと再入場リンク */}
                  {userInside && (
                    <div className="mt-2 text-xs text-red-600">
                      入場中
                      {currentAction === 'exit' && (
                        <button className="ml-2 underline" onClick={() => setCurrentAction('entry')}>入場を再試行</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">利用するには：</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• ワンちゃんを1頭以上選択</li>
                  <li>• 施設を選択</li>
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

