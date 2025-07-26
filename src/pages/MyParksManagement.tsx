import {
    AlertTriangle,
    ArrowLeft,
    Building,
    CheckCircle,
    Clock,
    Edit,
    Eye,
    FileText,
    MapPin,
    Star
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import type { DogPark } from '../types';
import { supabase } from '../utils/supabase';

interface ParkStats {
  current_users: number;
  monthly_revenue: number;
  total_bookings: number;
}

export function MyParksManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ownedParks, setOwnedParks] = useState<DogPark[]>([]);
  const [parkStats, setParkStats] = useState<Record<string, ParkStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOwnedParks = async () => {
      try {
        setLoading(true);
        
        const { data: parks, error } = await supabase
          .from('dog_parks')
          .select(`
            *,
            profiles!dog_parks_owner_id_fkey(display_name, name)
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching owned parks:', error);
          return;
        }

        setOwnedParks(parks || []);
        
        // 統計情報取得を一時的に無効化（400エラー対策）
        // if (parks && parks.length > 0) {
        //   await fetchParkStats(parks);
        // }
        
      } catch (error) {
        console.error('Error in fetchOwnedParks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnedParks();
  }, [user]);

  // 各パークの統計情報を取得
  const fetchParkStats = async (parks: DogPark[]) => {
    const stats: Record<string, ParkStats> = {};
    
    for (const park of parks) {
      try {
        // 今日の日付
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        // デフォルト値を設定
        stats[park.id] = {
          current_users: 0,
          monthly_revenue: 0,
          total_bookings: 0
        };

        // 現在の利用者（今日のアクティブな予約）- より安全なクエリ
        try {
          const { data: currentUsers, error: usersError } = await supabase
            .from('reservations')
            .select('id')
            .eq('dog_park_id', park.id)
            .gte('date', today)
            .lte('date', today)
            .in('status', ['confirmed', 'active']);

          if (!usersError && currentUsers) {
            stats[park.id].current_users = currentUsers.length;
          }
        } catch (error) {
          console.log(`Current users query failed for park ${park.id}:`, error);
        }

        // 今月の収益（より安全なクエリ）
        try {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          
          const { data: monthlyReservations, error: revenueError } = await supabase
            .from('reservations')
            .select('*')
            .eq('dog_park_id', park.id)
            .in('status', ['confirmed', 'completed'])
            .gte('created_at', startOfMonth.toISOString());

          if (!revenueError && monthlyReservations) {
            // 料金計算（price_per_hour * hours または amount フィールドを使用）
            const monthlyRevenue = monthlyReservations.reduce((sum, reservation) => {
              const amount = reservation.total_amount || 
                           reservation.amount || 
                           (reservation.price_per_hour && reservation.hours ? 
                            reservation.price_per_hour * reservation.hours : 0);
              return sum + (amount || 0);
            }, 0);
            
            stats[park.id].monthly_revenue = monthlyRevenue;
          }
        } catch (error) {
          console.log(`Monthly revenue query failed for park ${park.id}:`, error);
        }

        // 総予約数（より安全なクエリ）
        try {
          const { data: totalBookings, error: bookingsError } = await supabase
            .from('reservations')
            .select('id')
            .eq('dog_park_id', park.id);

          if (!bookingsError && totalBookings) {
            stats[park.id].total_bookings = totalBookings.length;
          }
        } catch (error) {
          console.log(`Total bookings query failed for park ${park.id}:`, error);
        }

      } catch (error) {
        console.error(`Error fetching stats for park ${park.id}:`, error);
        // デフォルト値は既に設定済み
      }
    }
    
    setParkStats(stats);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: '公開中',
        icon: CheckCircle 
      },
      pending: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        label: '審査中',
        icon: Clock 
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: '却下',
        icon: AlertTriangle 
      },
      second_stage_waiting: { 
        bg: 'bg-orange-100', 
        text: 'text-orange-800', 
        label: '詳細情報待ち',
        icon: FileText 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${config.bg} ${config.text}`}>
        <IconComponent className="w-4 h-4" />
        <span>{config.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="管理中ドッグラン一覧"
        description="あなたが管理するドッグランの一覧と詳細管理ページです。"
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              ダッシュボードに戻る
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Building className="w-8 h-8 text-green-600 mr-3" />
                管理中ドッグラン一覧
              </h1>
              <p className="text-gray-600 mt-2">
                あなたが管理するドッグラン ({ownedParks.length}施設) の詳細管理
              </p>
            </div>
            
            <Link to="/park-registration">
              <Button className="bg-green-600 hover:bg-green-700">
                <Building className="w-4 h-4 mr-2" />
                新規ドッグラン登録
              </Button>
            </Link>
          </div>
        </div>

        {/* ドッグラン一覧 */}
        {ownedParks.length === 0 ? (
          <Card className="p-12 text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              管理中のドッグランがありません
            </h3>
            <p className="text-gray-600 mb-6">
              まずはドッグランを登録して、運営を開始しましょう。
            </p>
            <Link to="/park-registration">
              <Button className="bg-green-600 hover:bg-green-700">
                <Building className="w-4 h-4 mr-2" />
                ドッグラン登録を始める
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ownedParks.map((park) => (
              <Card key={park.id} className="hover:shadow-lg transition-all duration-200">
                <div className="p-6">
                  {/* ヘッダー部分 */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {park.name}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="text-sm">{park.address}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">
                            {park.average_rating?.toFixed(1) || '0.0'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {park.review_count || 0}件のレビュー
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(park.status)}
                    </div>
                  </div>

                  {/* 詳細情報 - 統計機能一時無効化 */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">料金</div>
                      <div className="font-semibold">¥{(park as any).price_per_hour?.toLocaleString() || '未設定'}/時間</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">収容人数</div>
                      <div className="font-semibold">{(park as any).capacity || '未設定'}人</div>
                    </div>
                    {/* 統計情報を一時的に無効化（400エラー対策） */}
                    {/* 
                    <div>
                      <div className="text-sm text-gray-600">現在の利用者</div>
                      <div className="font-semibold flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {parkStats[park.id]?.current_users || 0}人
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">今月の収益</div>
                      <div className="font-semibold flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        ¥{parkStats[park.id]?.monthly_revenue?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">総予約数</div>
                      <div className="font-semibold">{parkStats[park.id]?.total_bookings || 0}件の予約</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">評価</div>
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="font-semibold">{park.average_rating || '未評価'}</span>
                      </div>
                    </div>
                    */}
                    <div>
                      <div className="text-sm text-gray-600">ステータス</div>
                      <div>{getStatusBadge(park.status || 'pending')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">作成日</div>
                      <div className="font-semibold">
                        {new Date(park.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex space-x-3">
                    {park.status === 'second_stage_waiting' ? (
                      <Link to={`/parks/${park.id}/second-stage`} className="flex-1">
                        <Button className="w-full bg-orange-600 hover:bg-orange-700">
                          <FileText className="w-4 h-4 mr-2" />
                          詳細情報を入力
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/parks/${park.id}/manage`} className="flex-1">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700">
                          <Edit className="w-4 h-4 mr-2" />
                          管理・修正
                        </Button>
                      </Link>
                    )}
                    
                    {park.status === 'approved' && (
                      <Link to={`/parks/${park.id}`}>
                        <Button variant="secondary" className="px-4">
                          <Eye className="w-4 h-4 mr-2" />
                          公開ページ
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
} 