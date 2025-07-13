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
  Wrench,
  Plus,
  X
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { PinCodeGenerator } from '../components/PinCodeGenerator';
import { supabase } from '../utils/supabase';
import type { DogPark, SmartLock, Dog } from '../types';
import VaccineBadge, { getVaccineStatusFromDog } from '../components/VaccineBadge';

interface MaintenanceSchedule {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  is_emergency: boolean;
  notify_users: boolean;
  created_at: string;
}

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
  
  // メンテナンス関連のstate
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>([]);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    is_emergency: false,
    notify_users: true
  });
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);

  // 編集関連のstate
  const [showEditForm, setShowEditForm] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    max_capacity: 0,
    facilities: {
      parking: false,
      shower: false,
      restroom: false,
      agility: false,
      rest_area: false,
      water_station: false,
    },
    large_dog_area: false,
    small_dog_area: false,
    private_booths: false,
    private_booth_count: 0,
    facility_details: '',
    description: ''
  });

  const MAX_DOGS = 3; // 最大3頭まで選択可能

  useEffect(() => {
    if (!user || !parkId) {
      navigate('/owner-dashboard');
      return;
    }
    
    fetchParkData();
  }, [user, parkId, navigate]);

  useEffect(() => {
    const fetchDogs = async () => {
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
      } catch (error) {
        console.error('Error fetching dogs:', error);
      }
    };

    fetchDogs();
  }, [user]);

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
      
      // 編集フォームに現在の値を設定
      setEditForm({
        max_capacity: parkData.max_capacity || 0,
        facilities: parkData.facilities || {
          parking: false,
          shower: false,
          restroom: false,
          agility: false,
          rest_area: false,
          water_station: false,
        },
        large_dog_area: parkData.large_dog_area || false,
        small_dog_area: parkData.small_dog_area || false,
        private_booths: parkData.private_booths || false,
        private_booth_count: parkData.private_booth_count || 0,
        facility_details: parkData.facility_details || '',
        description: parkData.description || ''
      });
      
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
      
      // Fetch maintenance schedules
      await fetchMaintenanceSchedules();
      
    } catch (error) {
      console.error('Error fetching park data:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // メンテナンススケジュールを取得
  const fetchMaintenanceSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('park_maintenance')
        .select('*')
        .eq('park_id', parkId)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      setMaintenanceSchedules(data || []);
    } catch (error) {
      console.error('Error fetching maintenance schedules:', error);
    }
  };

  // メンテナンススケジュールを作成
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !parkId) return;

    setIsMaintenanceLoading(true);
    try {
      // バリデーション
      if (!maintenanceForm.title || !maintenanceForm.start_date || !maintenanceForm.end_date) {
        throw new Error('必須項目を入力してください。');
      }

      const startDate = new Date(maintenanceForm.start_date);
      const endDate = new Date(maintenanceForm.end_date);
      
      if (endDate <= startDate) {
        throw new Error('終了日時は開始日時より後に設定してください。');
      }

      if (startDate < new Date()) {
        throw new Error('開始日時は現在時刻より後に設定してください。');
      }

      const { error } = await supabase
        .from('park_maintenance')
        .insert({
          park_id: parkId,
          title: maintenanceForm.title,
          description: maintenanceForm.description,
          start_date: maintenanceForm.start_date,
          end_date: maintenanceForm.end_date,
          is_emergency: maintenanceForm.is_emergency,
          notify_users: maintenanceForm.notify_users,
          created_by: user.id
        });

      if (error) throw error;

      setSuccess('メンテナンススケジュールを作成しました。');
      setShowMaintenanceForm(false);
      setMaintenanceForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        is_emergency: false,
        notify_users: true
      });
      
      await fetchMaintenanceSchedules();
      
    } catch (error) {
      console.error('Error creating maintenance:', error);
      setError(error instanceof Error ? error.message : 'メンテナンススケジュールの作成に失敗しました。');
    } finally {
      setIsMaintenanceLoading(false);
    }
  };

  // メンテナンススケジュールを削除
  const handleDeleteMaintenance = async (maintenanceId: string) => {
    if (!window.confirm('このメンテナンススケジュールを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('park_maintenance')
        .delete()
        .eq('id', maintenanceId);

      if (error) throw error;

      setSuccess('メンテナンススケジュールを削除しました。');
      await fetchMaintenanceSchedules();
    } catch (error) {
      console.error('Error deleting maintenance:', error);
      setError('メンテナンススケジュールの削除に失敗しました。');
    }
  };

  // メンテナンス状態を取得
  const getMaintenanceStatus = (maintenance: MaintenanceSchedule) => {
    const now = new Date();
    const start = new Date(maintenance.start_date);
    const end = new Date(maintenance.end_date);

    if (maintenance.status === 'cancelled') return { status: 'cancelled', label: 'キャンセル済み', color: 'bg-gray-500' };
    if (maintenance.status === 'completed') return { status: 'completed', label: '完了', color: 'bg-gray-500' };
    if (now >= start && now < end) return { status: 'active', label: 'メンテナンス中', color: 'bg-red-500' };
    if (now < start) return { status: 'scheduled', label: '予定', color: 'bg-yellow-500' };
    return { status: 'completed', label: '完了', color: 'bg-gray-500' };
  };

  // パーク情報編集処理
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!park || !user) return;

    setIsEditLoading(true);
    try {
      // バリデーション
      if (editForm.max_capacity < 1) {
        throw new Error('収容人数は1人以上で入力してください。');
      }

      if (editForm.private_booths && editForm.private_booth_count < 1) {
        throw new Error('プライベートブースがある場合は、部屋数を1以上で入力してください。');
      }

      const { error } = await supabase
        .from('dog_parks')
        .update({
          max_capacity: editForm.max_capacity,
          facilities: editForm.facilities,
          large_dog_area: editForm.large_dog_area,
          small_dog_area: editForm.small_dog_area,
          private_booths: editForm.private_booths,
          private_booth_count: editForm.private_booths ? editForm.private_booth_count : 0,
          facility_details: editForm.facility_details,
          description: editForm.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', park.id);

      if (error) throw error;

      setSuccess('施設情報を更新しました。');
      setShowEditForm(false);
      
      // データを再取得
      await fetchParkData();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error('Error updating park:', error);
      setError(error instanceof Error ? error.message : '施設情報の更新に失敗しました。');
      
      // 5秒後にエラーメッセージを消す
      setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setIsEditLoading(false);
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
          <Button onClick={() => setShowEditForm(true)}>
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
                <ArrowLeft className="w-5 h-5" />
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
                <ArrowLeft className="w-5 h-5 rotate-180" />
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
                              <div className="w-6 h-6 text-gray-500">🐾</div>
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
              <Key className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">PINコードについて</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• 利用者はPINコードを使用して入退場します</p>
                  <p>• PINコードは5分間有効で、利用者が支払い後に発行されます</p>
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
          {/* 編集フォーム */}
          {showEditForm && (
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-blue-900">施設情報の編集</h3>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                {/* 変更不可情報の表示 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">変更不可項目</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">住所:</span> {park.address}
                    </div>
                    <div>
                      <span className="font-medium">料金:</span> ¥{park.price}/日（全国統一料金）
                    </div>
                  </div>
                </div>

                {/* 基本情報 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大収容人数 *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editForm.max_capacity}
                      onChange={(e) => setEditForm(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明文
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="施設の特徴や利用案内など"
                    />
                  </div>
                </div>

                {/* エリア設定 */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">エリア設定</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.large_dog_area}
                        onChange={(e) => setEditForm(prev => ({ ...prev, large_dog_area: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">大型犬エリア</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.small_dog_area}
                        onChange={(e) => setEditForm(prev => ({ ...prev, small_dog_area: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">小型犬エリア</span>
                    </label>
                  </div>
                </div>

                {/* プライベートブース設定 */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">プライベートブース</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.private_booths}
                        onChange={(e) => setEditForm(prev => ({ ...prev, private_booths: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">プライベートブースあり</span>
                    </label>

                    {editForm.private_booths && (
                      <div className="ml-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          部屋数
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editForm.private_booth_count}
                          onChange={(e) => setEditForm(prev => ({ ...prev, private_booth_count: parseInt(e.target.value) || 0 }))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 設備情報 */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">設備情報</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries({
                      parking: '駐車場',
                      shower: 'シャワー設備',
                      restroom: 'トイレ',
                      agility: 'アジリティ設備',
                      rest_area: '休憩スペース',
                      water_station: '給水設備',
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editForm.facilities[key as keyof typeof editForm.facilities]}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            facilities: {
                              ...prev.facilities,
                              [key]: e.target.checked
                            }
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 設備詳細 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    設備詳細説明
                  </label>
                  <textarea
                    value={editForm.facility_details}
                    onChange={(e) => setEditForm(prev => ({ ...prev, facility_details: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="設備の詳細説明や利用案内など"
                  />
                </div>

                {/* ボタン */}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowEditForm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isEditLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    更新
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Settings className="w-6 h-6 text-blue-600 mr-2" />
              施設設定
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">基本設定</h3>
                <p className="text-sm text-blue-800 mb-3">
                  施設の基本情報や設備情報を編集できます。住所と料金は変更できません。
                </p>
                <Button size="sm" onClick={() => setShowEditForm(true)}>
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
                  <li>• プライベートブース: サブスク使い放題・1日券でも利用可能（追加料金なし）</li>
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

          {/* メンテナンス管理 */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Wrench className="w-6 h-6 text-blue-600 mr-2" />
                メンテナンス管理
              </h2>
              <Button
                onClick={() => setShowMaintenanceForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                メンテナンス予定を追加
              </Button>
            </div>

            {/* メンテナンス作成フォーム */}
            {showMaintenanceForm && (
              <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-blue-900">新しいメンテナンス予定</h3>
                  <button
                    onClick={() => setShowMaintenanceForm(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateMaintenance} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メンテナンス内容 *
                      </label>
                      <input
                        type="text"
                        value={maintenanceForm.title}
                        onChange={(e) => setMaintenanceForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例：設備点検・清掃作業"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        開始日時 *
                      </label>
                      <input
                        type="datetime-local"
                        value={maintenanceForm.start_date}
                        onChange={(e) => setMaintenanceForm(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        終了日時 *
                      </label>
                      <input
                        type="datetime-local"
                        value={maintenanceForm.end_date}
                        onChange={(e) => setMaintenanceForm(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      詳細説明
                    </label>
                    <textarea
                      value={maintenanceForm.description}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="メンテナンス内容の詳細説明（任意）"
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={maintenanceForm.is_emergency}
                        onChange={(e) => setMaintenanceForm(prev => ({ ...prev, is_emergency: e.target.checked }))}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">緊急メンテナンス</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={maintenanceForm.notify_users}
                        onChange={(e) => setMaintenanceForm(prev => ({ ...prev, notify_users: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">ユーザーに通知</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowMaintenanceForm(false)}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isMaintenanceLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      作成
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* メンテナンススケジュール一覧 */}
            <div className="space-y-4">
              {maintenanceSchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">メンテナンス予定がありません</p>
                  <p className="text-sm">施設のメンテナンス予定を追加してください</p>
                </div>
              ) : (
                maintenanceSchedules.map((maintenance) => {
                  const status = getMaintenanceStatus(maintenance);
                  return (
                    <Card key={maintenance.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg">{maintenance.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${status.color}`}>
                              {status.label}
                            </span>
                            {maintenance.is_emergency && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                緊急
                              </span>
                            )}
                          </div>
                          
                          {maintenance.description && (
                            <p className="text-gray-600 mb-3">{maintenance.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">開始:</span>{' '}
                              {new Date(maintenance.start_date).toLocaleString('ja-JP')}
                            </div>
                            <div>
                              <span className="font-medium">終了:</span>{' '}
                              {new Date(maintenance.end_date).toLocaleString('ja-JP')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {maintenance.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDeleteMaintenance(maintenance.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">メンテナンス機能について</p>
                  <ul className="space-y-1">
                    <li>• メンテナンス中は新規予約を受け付けません</li>
                    <li>• 既存の予約がある場合は事前に利用者に連絡してください</li>
                    <li>• 緊急メンテナンスの場合は即座に施設が利用停止になります</li>
                    <li>• ユーザー通知を有効にすると、利用者にメール通知が送信されます</li>
                  </ul>
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

