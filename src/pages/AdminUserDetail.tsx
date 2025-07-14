import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  Dog,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Crown,
  AlertTriangle
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface UserDetailData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  postal_code?: string;
  address?: string;
  user_type?: string;
  created_at: string;
  is_active: boolean;
  dogs: {
    id: string;
    name: string;
    breed: string;
    age: number;
    gender: string;
    image_url?: string;
  }[];
  reservations: {
    id: string;
    park_name: string;
    date: string;
    time_slot: string;
    total_amount: number;
    status: string;
  }[];
  subscription_status?: 'active' | 'inactive' | 'cancelled';
  total_spent: number;
  last_activity?: string;
}

export function AdminUserDetail() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    if (userId) {
      fetchUserDetail(userId);
    }
  }, [isAdmin, navigate, userId]);

  const fetchUserDetail = async (id: string) => {
    try {
      setIsLoading(true);
      setError('');

      // ユーザー基本情報を取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      // 犬の情報を取得
      const { data: dogs, error: dogsError } = await supabase
        .from('dogs')
        .select('id, name, breed, age, gender, image_url')
        .eq('owner_id', id);

      if (dogsError) {
        console.error('Dogs error:', dogsError);
      }

      // 予約情報を取得
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select(`
          id,
          date,
          time_slot,
          total_amount,
          status,
          dog_parks (
            name
          )
        `)
        .eq('user_id', id)
        .order('date', { ascending: false })
        .limit(20);

      if (reservationsError) {
        console.error('Reservations error:', reservationsError);
      }

      // サブスクリプション情報を無効化（Stripeテーブルが存在しないため）
      const subscription = null; // 一時的に無効化

      // 売上計算
      const totalSpent = (reservations || []).reduce(
        (sum, reservation) => sum + (reservation.total_amount || 0), 0
      );

      // フォールバックメールアドレス
      const actualEmail = `user_${id.slice(0, 8)}@unknown.com`;

      const userDetail: UserDetailData = {
        id: profile.id,
        name: profile.name || 'Unknown',
        email: actualEmail,
        phone: profile.phone_number || '',
        postal_code: profile.postal_code || '',
        address: profile.address || '',
        user_type: profile.user_type || 'user',
        created_at: profile.created_at,
        is_active: true,
        dogs: dogs || [],
        reservations: (reservations || []).map((r: any) => ({
          id: r.id,
          park_name: r.dog_parks?.name || 'Unknown Park',
          date: r.date,
          time_slot: r.time_slot,
          total_amount: r.total_amount || 0,
          status: r.status
        })),
        subscription_status: 'inactive', // Stripe関連を無効化
        total_spent: totalSpent,
        last_activity: reservations?.[0]?.date || ''
      };

      setUser(userDetail);
    } catch (error) {
      console.error('Error fetching user detail:', error);
      setError(error instanceof Error ? error.message : 'ユーザー詳細の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4">
          {error}
        </div>
        <Button
          onClick={() => navigate('/admin/users')}
          className="mt-4"
          variant="secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ユーザー一覧に戻る
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center">
          <p className="text-gray-600">ユーザーが見つかりません</p>
          <Button
            onClick={() => navigate('/admin/users')}
            className="mt-4"
            variant="secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ユーザー一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => navigate('/admin/users')}
          variant="secondary"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ユーザー一覧に戻る
        </Button>
        <div className="flex items-center space-x-2">
          {user.subscription_status === 'active' && (
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium flex items-center">
              <Crown className="w-4 h-4 mr-1" />
              サブスク会員
            </span>
          )}
          {user.is_active ? (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              アクティブ
            </span>
          ) : (
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium flex items-center">
              <XCircle className="w-4 h-4 mr-1" />
              非アクティブ
            </span>
          )}
        </div>
      </div>

      {/* ユーザー基本情報 */}
      <Card className="p-6">
        <div className="flex items-center mb-6">
          <User className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">{user.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center text-gray-600">
              <Mail className="w-5 h-5 mr-3 text-gray-400" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center text-gray-600">
                <Phone className="w-5 h-5 mr-3 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.address && (
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                <span>{user.postal_code} {user.address}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center text-gray-600">
              <Calendar className="w-5 h-5 mr-3 text-gray-400" />
              <span>登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}</span>
            </div>
            {user.last_activity && (
              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-3 text-gray-400" />
                <span>最終活動: {new Date(user.last_activity).toLocaleDateString('ja-JP')}</span>
              </div>
            )}
            <div className="flex items-center text-gray-600">
              <CreditCard className="w-5 h-5 mr-3 text-gray-400" />
              <span>総支払額: ¥{user.total_spent.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">登録犬数</p>
              <p className="text-2xl font-bold text-blue-600">{user.dogs.length}</p>
            </div>
            <Dog className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">予約数</p>
              <p className="text-2xl font-bold text-green-600">{user.reservations.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総支払額</p>
              <p className="text-2xl font-bold text-purple-600">¥{user.total_spent.toLocaleString()}</p>
            </div>
            <CreditCard className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* 登録犬一覧 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Dog className="w-5 h-5 mr-2" />
          登録犬一覧 ({user.dogs.length}匹)
        </h2>
        {user.dogs.length === 0 ? (
          <p className="text-gray-500">登録された犬はありません</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.dogs.map((dog) => (
              <div key={dog.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  {dog.image_url ? (
                    <img
                      src={dog.image_url}
                      alt={dog.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <Dog className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-800">{dog.name}</h3>
                    <p className="text-sm text-gray-600">{dog.breed} • {dog.gender}</p>
                    <p className="text-sm text-gray-500">{dog.age}歳</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 予約履歴 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          予約履歴 ({user.reservations.length}件)
        </h2>
        {user.reservations.length === 0 ? (
          <p className="text-gray-500">予約履歴はありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">ドッグパーク</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">予約日</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">時間</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">金額</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {user.reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{reservation.park_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(reservation.date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{reservation.time_slot}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">¥{reservation.total_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {reservation.status === 'confirmed' ? '確定' :
                         reservation.status === 'cancelled' ? 'キャンセル' : '保留中'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
} 