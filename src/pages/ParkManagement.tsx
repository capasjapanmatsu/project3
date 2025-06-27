import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building, 
  MapPin, 
  Users, 
  Star, 
  Settings, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Edit,
  Eye,
  Key,
  QrCode,
  FileText,
  Image as ImageIcon,
  X,
  LogIn,
  LogOut
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Select from '../components/Select';
import { useAuth } from '../context/AuthContext';
import { PinCodeGenerator } from '../components/PinCodeGenerator';
import type { DogPark, SmartLock, Dog } from '../types';

export function ParkManagement() {
  const { parkId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [park, setPark] = useState<DogPark | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'settings' | 'pins'>('overview');
  const [smartLocks, setSmartLocks] = useState<SmartLock[]>([]);
  const [selectedLock, setSelectedLock] = useState<SmartLock | null>(null);
  const [pinPurpose, setPinPurpose] = useState<'entry' | 'exit'>('entry');
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]);

  const MAX_DOGS = 3; // 最大3頭まで選択可能

  useEffect(() => {
    if (!user || !parkId) {
      navigate('/owner-dashboard');
      return;
    }
    
    fetchParkData();
  }, [user, parkId, navigate]);

  const fetchParkData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch park data
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', parkId)
        .eq('owner_id', user?.id)
        .single();
      
      if (parkError) throw parkError;
      if (!parkData) {
        navigate('/owner-dashboard');
        return;
      }
      
      setPark(parkData);
      
      // Fetch smart locks for this park
      const { data: locksData, error: locksError } = await supabase
        .from('smart_locks')
        .select('*')
        .eq('park_id', parkId);
      
      if (locksError) throw locksError;
      setSmartLocks(locksData || []);
      
      // Set the first lock as selected by default
      if (locksData && locksData.length > 0) {
        setSelectedLock(locksData[0]);
      }

      // Fetch dogs with approved vaccine certifications
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
      
    } catch (error) {
      console.error('Error fetching park data:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!park) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">ドッグランが見つかりません</h2>
        <p className="text-gray-600 mb-6">指定されたドッグランが見つからないか、アクセス権限がありません。</p>
        <Link to="/owner-dashboard">
          <Button>ダッシュボードに戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/owner-dashboard" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <Building className="w-8 h-8 text-blue-600 mr-3" />
            {park.name}の管理
          </h1>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <p className="text-gray-600">{park.address}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link to={`/parks/${park.id}`}>
            <Button variant="secondary">
              <Eye className="w-4 h-4 mr-2" />
              公開ページを見る
            </Button>
          </Link>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            設定を編集
          </Button>
        </div>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="flex space-x-4 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          <Building className="w-4 h-4 inline mr-2" />
          概要
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'stats'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('stats')}
        >
          <Star className="w-4 h-4 inline mr-2" />
          統計・収益
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'pins'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pins')}
        >
          <Key className="w-4 h-4 inline mr-2" />
          PINコード管理
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'settings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          設定
        </button>
      </div>

      {/* 概要タブ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 基本情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              基本情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">施設情報</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">住所:</span> {park.address}</p>
                  <p><span className="font-medium">ステータス:</span> {park.status === 'approved' ? '運営中' : '審査中'}</p>
                  <p><span className="font-medium">料金:</span> ¥{park.price}/日</p>
                  <p><span className="font-medium">最大収容人数:</span> {park.max_capacity}人</p>
                  <p><span className="font-medium">現在の利用者数:</span> {park.current_occupancy}人</p>
                  <p><span className="font-medium">評価:</span> ★{park.average_rating.toFixed(1)} ({park.review_count}件)</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">設備情報</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries({
                    parking: '駐車場',
                    shower: 'シャワー設備',
                    restroom: 'トイレ',
                    agility: 'アジリティ設備',
                    rest_area: '休憩スペース',
                    water_station: '給水設備',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded ${
                        park.facilities[key as keyof typeof park.facilities] 
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                      }`} />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2">
                  <p><span className="font-medium">大型犬エリア:</span> {park.large_dog_area ? 'あり' : 'なし'}</p>
                  <p><span className="font-medium">小型犬エリア:</span> {park.small_dog_area ? 'あり' : 'なし'}</p>
                  <p><span className="font-medium">プライベートブース:</span> {park.private_booths ? `${park.private_booth_count}室` : 'なし'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 今日の統計 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Calendar className="w-6 h-6 text-blue-600 mr-2" />
              今日の統計
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">今日の予約</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600">5件</p>
                <p className="text-xs text-blue-700 mt-1">前日比 +2件</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-900">今日の収益</h4>
                </div>
                <p className="text-2xl font-bold text-green-600">¥4,000</p>
                <p className="text-xs text-green-700 mt-1">前日比 +¥1,600</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">利用者数</h4>
                </div>
                <p className="text-2xl font-bold text-purple-600">{park.current_occupancy}人</p>
                <p className="text-xs text-purple-700 mt-1">最大: {park.max_capacity}人</p>
              </div>
            </div>
          </Card>

          {/* 施設画像 */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <ImageIcon className="w-6 h-6 text-blue-600 mr-2" />
                施設画像
              </h2>
              <Link to={`/parks/${park.id}/second-stage`}>
                <Button size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  画像を管理
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {park.image_url ? (
                <div className="h-48 rounded-lg overflow-hidden">
                  <img 
                    src={park.image_url} 
                    alt={`${park.name} - メイン画像`} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                </div>
              ) : (
                <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">メイン画像なし</p>
                </div>
              )}
              
              {park.cover_image_url ? (
                <div className="h-48 rounded-lg overflow-hidden">
                  <img 
                    src={park.cover_image_url} 
                    alt={`${park.name} - カバー画像`} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                </div>
              ) : (
                <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">カバー画像なし</p>
                </div>
              )}
              
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <Link to={`/parks/${park.id}/second-stage`} className="text-blue-600 hover:text-blue-800 flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <p>その他の画像を管理</p>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 統計・収益タブ */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Star className="w-6 h-6 text-blue-600 mr-2" />
              利用統計
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">今月の予約</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600">32件</p>
                <p className="text-xs text-blue-700 mt-1">前月比 +12%</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-900">今月の収益</h4>
                </div>
                <p className="text-2xl font-bold text-green-600">¥25,600</p>
                <p className="text-xs text-green-700 mt-1">前月比 +8%</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">利用者数</h4>
                </div>
                <p className="text-2xl font-bold text-purple-600">128人</p>
                <p className="text-xs text-purple-700 mt-1">前月比 +15%</p>
              </div>
            </div>
            
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">利用統計グラフ（実装予定）</p>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
              収益情報
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">収益配分</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-800 mb-1">オーナー取り分（80%）</p>
                    <p className="text-2xl font-bold text-blue-600">¥20,480</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 mb-1">プラットフォーム手数料（20%）</p>
                    <p className="text-2xl font-bold text-blue-600">¥5,120</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">収益内訳</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-green-800 mb-1">通常利用</p>
                    <p className="text-xl font-bold text-green-600">¥12,800</p>
                    <p className="text-xs text-green-700">16件</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-800 mb-1">施設貸し切り</p>
                    <p className="text-xl font-bold text-green-600">¥8,800</p>
                    <p className="text-xs text-green-700">2件</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-800 mb-1">プライベートブース</p>
                    <p className="text-xl font-bold text-green-600">¥4,000</p>
                    <p className="text-xs text-green-700">2件</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-3">振込情報</h3>
                <p className="text-sm text-purple-800 mb-2">
                  振込は毎月15日に前月分を一括で行います。振込手数料は当社負担です。
                </p>
                <Link to="/owner-payment-system">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <DollarSign className="w-4 h-4 mr-2" />
                    振込情報を確認
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PINコード管理タブ */}
      {activeTab === 'pins' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Key className="w-6 h-6 text-blue-600 mr-2" />
              オーナー用PINコード発行
            </h2>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">オーナー特権</p>
                  <p>オーナーは決済不要でPINコードを発行できます。施設の管理やメンテナンスに使用してください。</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>PINコードは5分間有効です</li>
                    <li>入場・退場それぞれでPINコードが必要です</li>
                    <li>スタッフと共有することもできます</li>
                    <li>入場する犬を選択してください</li>
                  </ul>
                </div>
              </div>
            </div>
            
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
            
            {/* スマートロック選択 */}
            {smartLocks.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  スマートロックを選択
                </label>
                <select
                  value={selectedLock?.id || ''}
                  onChange={(e) => {
                    const lock = smartLocks.find(l => l.id === e.target.value);
                    setSelectedLock(lock || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {smartLocks.map(lock => (
                    <option key={lock.id} value={lock.id}>
                      {lock.lock_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 犬選択 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                入場するワンちゃんを選択（最大{MAX_DOGS}頭）
              </label>
              
              {dogs.length === 0 ? (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-yellow-800">
                    ワクチン接種証明書が承認されたワンちゃんがいません。
                    <Link to="/register-dog" className="text-blue-600 hover:underline ml-1">
                      ワンちゃんを登録する
                    </Link>
                  </p>
                </div>
              ) : (
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
              )}
              
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
            
            {/* PINコードジェネレーター */}
            {selectedLock ? (
              <div className="mt-6">
                {selectedDogs.length > 0 ? (
                  <PinCodeGenerator
                    lockId={selectedLock.lock_id}
                    parkName={park.name}
                    purpose={pinPurpose}
                    onSuccess={handlePinSuccess}
                    onError={handlePinError}
                  />
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-yellow-800 font-medium">ワンちゃんを1頭以上選択してください</p>
                    <p className="text-sm text-yellow-700 mt-1">PINコードを発行するには、入場するワンちゃんを選択する必要があります</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">スマートロックが設定されていません</p>
                <Button onClick={() => setActiveTab('settings')}>
                  スマートロックを設定する
                </Button>
              </div>
            )}
          </Card>
          
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <QrCode className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">QRコードとPINコードについて</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• 利用者はQRコードまたはPINコードを使用して入退場します</p>
                  <p>• QRコードは24時間有効で、利用者が支払い後に発行されます</p>
                  <p>• PINコードは5分間有効で、スマートロックのキーパッドで入力します</p>
                  <p>• オーナーは決済不要でPINコードを発行できます</p>
                  <p>• 施設貸し切りの場合、利用者は友達にPINコードを共有できます</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 設定タブ */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Settings className="w-6 h-6 text-blue-600 mr-2" />
              施設設定
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">基本設定</h3>
                <p className="text-sm text-blue-800 mb-3">
                  施設の基本情報や設備情報を編集できます。
                </p>
                <Button size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  基本情報を編集
                </Button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">料金設定</h3>
                <p className="text-sm text-green-800 mb-3">
                  料金体系は全国統一です。変更はできません。
                </p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• 通常利用: ¥800/日（固定）</li>
                  <li>• 施設貸し切り: ¥4,400/時間（固定）</li>
                  <li>• プライベートブース: ¥5,000/2時間（固定）</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-3">スマートロック設定</h3>
                <p className="text-sm text-purple-800 mb-3">
                  スマートロックの設定を管理します。
                </p>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Key className="w-4 h-4 mr-2" />
                  スマートロックを管理
                </Button>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-3">営業時間設定</h3>
                <p className="text-sm text-orange-800 mb-3">
                  営業時間は24時間です。変更はできません。
                </p>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">24時間営業</span>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-gray-50">
            <div className="flex items-start space-x-3">
              <FileText className="w-6 h-6 text-gray-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">運営サポート</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• 設定に関するご質問は運営事務局までお問い合わせください</p>
                  <p>• QRコードシステムの設置・設定サポートを提供しています</p>
                  <p>• 運営開始後も継続的なサポートを行います</p>
                  <p>• 📧 サポート窓口: info@dogparkjp.com</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// LogIn component for the dashboard
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

// LogOut component for the dashboard
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

function PawPrint({ className }: { className?: string }) {
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
      <path d="M13 8a3 3 0 0 0-3-3 1 1 0 0 0-2 0 3 3 0 0 0-3 3 6 6 0 0 0 8 0"></path>
      <path d="M10 8v1"></path>
      <path d="M7 8v1"></path>
      <path d="M13 8v1"></path>
      <path d="M16 8v1"></path>
      <path d="M19.5 9.5 21 11l-1.5 1.5"></path>
      <path d="M19.5 14.5 21 16l-1.5 1.5"></path>
      <path d="M19.5 19.5 21 21l-1.5 1.5"></path>
      <path d="M4.5 9.5 3 11l1.5 1.5"></path>
      <path d="M4.5 14.5 3 16l1.5 1.5"></path>
      <path d="M4.5 19.5 3 21l1.5 1.5"></path>
    </svg>
  );
}