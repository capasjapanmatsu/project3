import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  PawPrint, 
  Search,
  Download,
  CheckCircle,
  QrCode,
  Building,
  Users,
  Heart,
  Star,
  X,
  AlertTriangle
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import type { Reservation, Dog, DogPark } from '../types';

interface ReservationWithDetails extends Reservation {
  dog_park: DogPark;
  dog: Dog;
}

export function DogParkHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDog, setSelectedDog] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [uniqueParks, setUniqueParks] = useState(0);
  const [mostVisitedPark, setMostVisitedPark] = useState<string>('');
  const [favoriteParks, setFavoriteParks] = useState<{id: string, name: string, visits: number}[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 予約履歴を取得
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          *,
          dog_park:dog_parks(*),
          dog:dogs(*)
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(50); // 最大50件に制限
      
      if (reservationsError) throw reservationsError;
      
      // ユーザーの犬を取得
      const { data: dogsData, error: dogsError } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', user?.id);
      
      if (dogsError) throw dogsError;
      
      setReservations(reservationsData || []);
      setUserDogs(dogsData || []);
      
      // 統計情報を計算
      if (reservationsData) {
        setTotalVisits(reservationsData.length);
        
        // ユニークなドッグパークの数を計算
        const parkIds = new Set(reservationsData.map(r => r.park_id));
        setUniqueParks(parkIds.size);
        
        // 最も訪問したドッグパークを計算
        const parkCounts: Record<string, { count: number, name: string, id: string }> = {};
        reservationsData.forEach(r => {
          const parkId = r.park_id;
          if (!parkCounts[parkId]) {
            parkCounts[parkId] = { count: 0, name: r.dog_park.name, id: parkId };
          }
          parkCounts[parkId].count++;
        });
        
        // お気に入りパークのリストを作成（訪問回数順）
        const favParks = Object.values(parkCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(park => ({
            id: park.id,
            name: park.name,
            visits: park.count
          }));
        
        setFavoriteParks(favParks);
        
        if (favParks.length > 0) {
          setMostVisitedPark(favParks[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching reservation history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    return months[month - 1];
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 2; i--) {
      years.push({ value: i.toString(), label: `${i}年` });
    }
    return years;
  };

  const getMonthOptions = () => {
    const options = [{ value: 'all', label: 'すべての月' }];
    for (let i = 1; i <= 12; i++) {
      options.push({ value: i.toString(), label: getMonthName(i) });
    }
    return options;
  };

  // メモ化してフィルタリングの再計算を防止
  const filteredReservations = useMemo(() => reservations.filter(reservation => {
    const matchesSearch = 
      reservation.dog_park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.dog_park.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.dog.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDog = selectedDog === 'all' || reservation.dog_id === selectedDog;
    
    const reservationDate = new Date(reservation.date);
    const matchesYear = selectedYear === 'all' || reservationDate.getFullYear().toString() === selectedYear;
    const matchesMonth = selectedMonth === 'all' || (reservationDate.getMonth() + 1).toString() === selectedMonth;
    
    return matchesSearch && matchesDog && matchesYear && matchesMonth;
  }), [reservations, searchTerm, selectedDog, selectedYear, selectedMonth]);

  const downloadCSV = () => {
    if (filteredReservations.length === 0) return;
    
    // UTF-8 BOMを追加（Excelで文字化けを防ぐため）
    const BOM = '\uFEFF';
    
    // CSVヘッダー
    const headers = [
      '日付', 
      '時間', 
      'ドッグラン名', 
      '住所', 
      'ワンちゃん', 
      '料金', 
      '予約タイプ'
    ].join(',');
    
    // CSVデータ行
    const rows = filteredReservations.map(r => [
      new Date(r.date).toLocaleDateString('ja-JP'),
      `${r.start_time}〜${parseInt(r.start_time) + r.duration}:00`,
      `"${r.dog_park.name.replace(/"/g, '""')}"`, // ダブルクォートをエスケープ
      `"${r.dog_park.address.replace(/"/g, '""')}"`, // ダブルクォートをエスケープ
      `"${r.dog.name.replace(/"/g, '""')}"`, // ダブルクォートをエスケープ
      `¥${r.total_amount}`,
      r.reservation_type === 'regular' ? '通常利用' : 
      r.reservation_type === 'private_booth' ? 'プライベートブース' : '施設貸し切り'
    ].join(','));
    
    // CSVデータを作成（BOMを先頭に追加）
    const csvContent = BOM + [headers, ...rows].join('\n');
    
    // CSVファイルをダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dogpark_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 予約ごとにキャンセル可否を判定
  const canCancelReservation = async (reservation: ReservationWithDetails) => {
    const isFacilityRental = reservation.reservation_type === 'whole_facility';
    const now = new Date();
    const reservationDate = new Date(reservation.date);
    const oneDayBefore = new Date(reservationDate);
    oneDayBefore.setDate(reservationDate.getDate() - 1);
    if (isFacilityRental) {
      return now < oneDayBefore;
    } else {
      // 通常予約はPIN未使用時のみ
      const { data: entryLogs } = await supabase
        .from('user_entry_exit_logs')
        .select('*')
        .eq('user_id', reservation.user_id)
        .eq('park_id', reservation.park_id)
        .eq('action', 'entry')
        .gte('timestamp', reservation.date);
      return !entryLogs || entryLogs.length === 0;
    }
  };

  // キャンセル処理
  const handleCancel = async (reservation: ReservationWithDetails) => {
    setCancellingId(reservation.id);
    setCancelError(null);
    setCancelSuccess(null);
    try {
      // SupabaseのRPC（cancel_reservation関数）を呼び出す
      const { data, error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: reservation.id,
        p_user_id: reservation.user_id
      });
      if (error || !data?.success) {
        setCancelError((data && data.message) || error?.message || 'キャンセルに失敗しました');
        return;
      }
      setCancelSuccess('予約をキャンセルしました');
      setShowCancelConfirm(null);
      // 予約一覧を再取得
      await fetchData();
      setTimeout(() => setCancelSuccess(null), 3000);
    } catch (e) {
      setCancelError((e as Error).message || 'キャンセルに失敗しました');
    } finally {
      setCancellingId(null);
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-blue-600 mr-3" />
          ドッグラン利用履歴
        </h1>
        <p className="text-lg text-gray-600">
          これまでのドッグラン利用記録を確認できます
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-900">{totalVisits}</p>
          <p className="text-gray-600">総利用回数</p>
        </Card>
        
        <Card className="p-6 text-center">
          <Building className="w-12 h-12 text-green-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-gray-900">{uniqueParks}</p>
          <p className="text-gray-600">訪問したドッグラン数</p>
        </Card>
        
        <Card className="p-6 text-center">
          <MapPin className="w-12 h-12 text-purple-600 mx-auto mb-2" />
          <p className="text-xl font-bold text-gray-900 mb-1">{mostVisitedPark || '-'}</p>
          <p className="text-gray-600">最も訪問したドッグラン</p>
        </Card>
      </div>

      {/* お気に入りドッグラン */}
      {favoriteParks.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Heart className="w-6 h-6 text-pink-600 mr-2" />
            よく行くドッグラン
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favoriteParks.map((park, index) => (
              <div key={park.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold">{park.name}</h3>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-600">{park.visits}回利用</span>
                  </div>
                  <Link to={`/parks/${park.id}`}>
                    <Button size="sm" variant="secondary">
                      詳細
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 検索・フィルター */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Input
            label=""
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ドッグラン名、住所で検索..."
            icon={<Search className="w-4 h-4 text-gray-500" />}
          />
        </div>
        
        <div>
          <select
            value={selectedDog}
            onChange={(e) => setSelectedDog(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべてのワンちゃん</option>
            {userDogs.map(dog => (
              <option key={dog.id} value={dog.id}>{dog.name}ちゃん</option>
            ))}
          </select>
        </div>
        
        <div className="flex space-x-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべての年</option>
            {getYearOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getMonthOptions().map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* エクスポートボタン */}
      <div className="flex justify-end">
        <Button 
          variant="secondary" 
          size="sm"
          onClick={downloadCSV}
        >
          <Download className="w-4 h-4 mr-2" />
          CSV出力
        </Button>
      </div>

      {/* 利用履歴一覧 */}
      {filteredReservations.length === 0 ? (
        <Card className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">利用履歴がありません</h2>
          <p className="text-gray-500 mb-6">まだドッグランを利用していないようです</p>
          <Link to="/parks">
            <Button>
              ドッグランを予約する
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredReservations.map((reservation) => {
            const reservationDate = new Date(reservation.date);
            const formattedDate = reservationDate.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            });
            
            const startTime = reservation.start_time;
            const endTime = `${parseInt(startTime) + reservation.duration}:00`;
            
            const reservationType = 
              reservation.reservation_type === 'regular' ? '通常利用' : 
              reservation.reservation_type === 'private_booth' ? 'プライベートブース' : 
              '施設貸し切り';
            
            return (
              <Card key={reservation.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                  {/* 左側：日付と時間 */}
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-100 rounded-lg p-3 text-center min-w-[80px]">
                      <p className="text-sm text-blue-800">{reservationDate.getFullYear()}</p>
                      <p className="text-xl font-bold text-blue-600">{reservationDate.getDate()}</p>
                      <p className="text-sm text-blue-800">{getMonthName(reservationDate.getMonth() + 1)}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold">{reservation.dog_park.name}</h3>
                      <div className="flex items-center text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-sm">{reservation.dog_park.address}</span>
                      </div>
                      <div className="flex items-center text-gray-600 mt-1">
                        <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-sm">{startTime} 〜 {endTime}</span>
                      </div>
                      <div className="flex items-center text-gray-600 mt-1">
                        <PawPrint className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="text-sm">
                          {reservation.dog.name}ちゃん（{reservation.dog.breed}）
                        </span>
                      </div>
                      
                      {/* 評価表示（サンプル） */}
                      {Math.random() > 0.5 && (
                        <div className="flex items-center mt-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-4 h-4 ${
                                star <= Math.floor(3 + Math.random() * 2) 
                                  ? 'text-yellow-400 fill-current' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 右側：料金と予約タイプ */}
                  <div className="flex flex-col items-end">
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">
                        ¥{reservation.total_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        reservation.reservation_type === 'regular' 
                          ? 'bg-blue-100 text-blue-800' 
                          : reservation.reservation_type === 'private_booth'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {reservationType}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        reservation.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {reservation.status === 'confirmed' ? '利用済み' : 'キャンセル'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 下部：アクションボタン */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {formattedDate}
                  </div>
                  <div className="flex space-x-2">
                    <Link to={`/parks/${reservation.park_id}`}>
                      <Button size="sm" variant="secondary">
                        <Building className="w-4 h-4 mr-1" />
                        施設詳細
                      </Button>
                    </Link>
                    <Link to={`/parks/${reservation.park_id}/reserve`}>
                      <Button size="sm">
                        <Calendar className="w-4 h-4 mr-1" />
                        再予約
                      </Button>
                    </Link>
                    {/* キャンセルボタン */}
                    {reservation.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700"
                        isLoading={cancellingId === reservation.id}
                        onClick={async () => {
                          // キャンセル可否を判定
                          const canCancel = await canCancelReservation(reservation);
                          if (canCancel) {
                            setShowCancelConfirm(reservation.id);
                          } else {
                            setCancelError('この予約はキャンセルできません（貸し切りは1日前まで、通常予約はPIN未使用時のみ）');
                          }
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        キャンセル
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 利用履歴がある場合の追加情報 */}
      {filteredReservations.length > 0 && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Users className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">コミュニティ機能</h3>
              <p className="text-sm text-blue-800 mb-3">
                同じドッグランを利用した他のワンちゃんとの出会いを「コミュニティ」ページで確認できます。
                友達申請を送ったり、次回の予約を調整したりして、ワンちゃん同士の交流を深めましょう。
              </p>
              <Link to="/community">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Users className="w-4 h-4 mr-2" />
                  コミュニティを見る
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* キャンセル確認モーダル */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">予約をキャンセルしますか？</h2>
              <p className="text-gray-600">
                この操作は取り消せません。本当にキャンセルしますか？
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(null)}
              >
                戻る
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                isLoading={cancellingId === showCancelConfirm}
                onClick={() => {
                  const reservation = filteredReservations.find(r => r.id === showCancelConfirm);
                  if (reservation) handleCancel(reservation);
                }}
              >
                キャンセルする
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* キャンセル成功・エラー表示 */}
      {cancelSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">{cancelSuccess}</span>
          </div>
        </div>
      )}
      {cancelError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">エラー</span>
          </div>
          <p className="text-red-700 mt-1">{cancelError}</p>
        </div>
      )}
    </div>
  );
}
