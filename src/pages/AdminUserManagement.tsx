import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, 
  ArrowLeft, 
  Search, 
  Calendar, 
  Mail, 
  Phone,
  DogIcon as Dog,
  Crown,
  Filter,
  Download,
  Eye,
  UserCheck,
  UserX,
  MoreVertical
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_active: boolean;
  subscription_status?: 'active' | 'inactive' | 'cancelled';
  dog_count: number;
  reservation_count: number;
  total_spent: number;
}

export function AdminUserManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'subscribers'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'last_sign_in_at' | 'total_spent'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, searchTerm, filterStatus, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');

      // ユーザープロファイル情報を取得
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          user_type,
          postal_code,
          address,
          phone_number,
          created_at
        `);

      if (profilesError) {
        console.error('Profiles error:', profilesError);
        throw new Error('プロファイル情報の取得に失敗しました');
      }

      if (!profiles || profiles.length === 0) {
        console.log('No profiles found');
        setUsers([]);
        return;
      }
      
      console.log('Found profiles:', profiles.length);
      console.log('Profile sample:', profiles[0]);

      // 管理者専用関数を使用してauth.usersテーブルからメール情報を取得
      console.log('Calling get_admin_user_data function...');
      const { data: authUsers, error: authError } = await supabase
        .rpc('get_admin_user_data');

      if (authError) {
        console.error('Auth users fetch failed:', authError);
        console.error('Error details:', JSON.stringify(authError, null, 2));
      } else {
        console.log('Successfully fetched auth users:', authUsers?.length || 0);
        console.log('Auth users data:', authUsers);
      }

      // 各ユーザーの関連データを取得
      const userPromises = profiles.map(async (profile) => {
        try {
          // 犬の数を取得
          const { count: dogCount } = await supabase
            .from('dogs')
            .select('id', { count: 'exact' })
            .eq('owner_id', profile.id);

          // 予約数を取得（今月）
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          const { count: reservationCount } = await supabase
            .from('reservations')
            .select('id', { count: 'exact' })
            .eq('user_id', profile.id)
            .gte('created_at', startOfMonth.toISOString());

          // サブスクリプション状況を取得
          const { data: subscription } = await supabase
            .from('stripe_subscriptions')
            .select('status')
            .eq('user_id', profile.id)
            .eq('status', 'active')
            .maybeSingle();

          // 売上情報を取得（予約のみ）
          const { data: reservationPayments } = await supabase
            .from('reservations')
            .select('total_amount')
            .eq('user_id', profile.id)
            .not('total_amount', 'is', null);

          const reservationTotal = (reservationPayments || []).reduce(
            (sum, payment) => sum + (payment.total_amount || 0), 0
          );

          // auth.usersからメール情報を取得（利用可能な場合）
          const authUser = authUsers?.find((u: any) => u.id === profile.id);
          const actualEmail = authUser?.email;
          
          console.log(`Processing user ${profile.id}:`);
          console.log('  Profile name:', profile.name);
          console.log('  Found auth user:', !!authUser);
          console.log('  Auth user email:', actualEmail);
          console.log('  Will use email:', actualEmail || `user_${profile.id.slice(0, 8)}@unknown.com`);

          return {
            id: profile.id,
            name: profile.name || 'Unknown',
            email: actualEmail || `user_${profile.id.slice(0, 8)}@unknown.com`,
            phone: profile.phone_number || '',
            created_at: profile.created_at,
            last_sign_in_at: authUser?.last_sign_in_at,
            is_active: actualEmail ? (!!authUser?.email_confirmed_at && !authUser?.deleted_at) : true,
            subscription_status: subscription?.status || 'inactive',
            dog_count: dogCount || 0,
            reservation_count: reservationCount || 0,
            total_spent: reservationTotal
          } as UserData;
        } catch (err) {
          console.error(`Error fetching data for user ${profile.id}:`, err);
          // エラーが発生した場合もauth.usersからメール情報を取得
          const authUser = authUsers?.find((u: any) => u.id === profile.id);
          const actualEmail = authUser?.email;
          
          console.log(`Error case - Processing user ${profile.id}:`);
          console.log('  Profile name:', profile.name);
          console.log('  Found auth user:', !!authUser);
          console.log('  Auth user email:', actualEmail);
          console.log('  Will use email:', actualEmail || `user_${profile.id.slice(0, 8)}@unknown.com`);
          
          return {
            id: profile.id,
            name: profile.name || 'Unknown',
            email: actualEmail || `user_${profile.id.slice(0, 8)}@unknown.com`,
            phone: profile.phone_number || '',
            created_at: profile.created_at,
            last_sign_in_at: authUser?.last_sign_in_at,
            is_active: actualEmail ? (!!authUser?.email_confirmed_at && !authUser?.deleted_at) : true,
            subscription_status: 'inactive',
            dog_count: 0,
            reservation_count: 0,
            total_spent: 0
          } as UserData;
        }
      });

      const usersData = await Promise.all(userPromises);
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(`ユーザーデータの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ステータスフィルター
    switch (filterStatus) {
      case 'active':
        filtered = filtered.filter(user => user.is_active);
        break;
      case 'inactive':
        filtered = filtered.filter(user => !user.is_active);
        break;
      case 'subscribers':
        filtered = filtered.filter(user => user.subscription_status === 'active');
        break;
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'created_at' || sortBy === 'last_sign_in_at') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  };

  const exportToCSV = () => {
    const headers = ['名前', 'メールアドレス', '電話番号', '登録日', '最終ログイン', 'ステータス', '犬の数', '予約数', '総支払額'];
    const csvData = filteredUsers.map(user => [
      user.name,
      user.email,
      user.phone || '',
      new Date(user.created_at).toLocaleDateString('ja-JP'),
      user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('ja-JP') : '未ログイン',
      user.is_active ? 'アクティブ' : '非アクティブ',
      user.dog_count,
      user.reservation_count,
      `¥${user.total_spent.toLocaleString()}`
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (user: UserData) => {
    if (user.subscription_status === 'active') {
      return (
        <div className="flex items-center space-x-1">
          <Crown className="w-4 h-4 text-purple-600" />
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            サブスク会員
          </span>
        </div>
      );
    }
    
    if (user.is_active) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
          アクティブ
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
        非アクティブ
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/admin" className="flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            ユーザー管理
          </h1>
          <p className="text-gray-600">登録ユーザーの詳細情報と管理</p>
        </div>
        <div className="text-sm text-gray-500">
          総ユーザー数: {users.length}人
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総ユーザー数</p>
              <p className="text-xl font-bold text-blue-600">{users.length}</p>
            </div>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">アクティブユーザー</p>
              <p className="text-xl font-bold text-green-600">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">サブスク会員</p>
              <p className="text-xl font-bold text-purple-600">
                {users.filter(u => u.subscription_status === 'active').length}
              </p>
            </div>
            <Crown className="w-6 h-6 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">今月新規登録</p>
              <p className="text-xl font-bold text-orange-600">
                {users.filter(u => {
                  const createdDate = new Date(u.created_at);
                  const now = new Date();
                  return createdDate.getMonth() === now.getMonth() && 
                         createdDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
            <Calendar className="w-6 h-6 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              label="検索"
              placeholder="名前またはメールアドレスで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-500" />}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="active">アクティブ</option>
              <option value="inactive">非アクティブ</option>
              <option value="subscribers">サブスク会員</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              並び順
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at-desc">登録日（新しい順）</option>
              <option value="created_at-asc">登録日（古い順）</option>
              <option value="name-asc">名前（昇順）</option>
              <option value="name-desc">名前（降順）</option>
              <option value="total_spent-desc">支払額（高い順）</option>
              <option value="total_spent-asc">支払額（低い順）</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-600">
            {filteredUsers.length}件のユーザーが見つかりました
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={exportToCSV}
          >
            <Download className="w-4 h-4 mr-1" />
            CSV出力
          </Button>
        </div>
      </Card>

      {/* ユーザー一覧 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  連絡先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登録日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最終ログイン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  統計
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {user.id.slice(0, 8)}...
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString('ja-JP')
                      : '未ログイン'
                    }
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center text-gray-900">
                        <Dog className="w-4 h-4 mr-1 text-gray-400" />
                        犬: {user.dog_count}匹
                      </div>
                      <div className="text-gray-500">
                        予約: {user.reservation_count}件
                      </div>
                      <div className="text-gray-500">
                        支払: ¥{user.total_spent.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 