import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    CreditCard,
    Crown,
    DogIcon as Dog,
    DollarSign,
    Eye,
    Monitor,
    Phone,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Users,
    Wifi,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import useAuth from '../context/AuthContext';
import { UserFraudDetails, getUserFraudDetails } from '../utils/adminFraudDetection';
import { supabase } from '../utils/supabase';

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
  // 不正検知情報
  fraud_risk_score?: number;
  fraud_risk_level?: 'low' | 'medium' | 'high';
  fraud_detection_count?: number;
}

export function AdminUserManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'subscribers' | 'high_risk' | 'medium_risk'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'last_sign_in_at' | 'total_spent' | 'fraud_risk_score'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 不正検知関連のstate
  const [showFraudModal, setShowFraudModal] = useState(false);
  const [selectedUserFraud, setSelectedUserFraud] = useState<UserFraudDetails | null>(null);
  const [fraudModalLoading, setFraudModalLoading] = useState(false);

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
        setUsers([]);
        return;
      }

      // 不正検知情報を取得
      const { data: fraudLogs, error: fraudError } = await supabase
        .from('fraud_detection_logs')
        .select(`
          user_id,
          risk_score,
          detection_type,
          created_at
        `)
        .order('created_at', { ascending: false });

      // ユーザーごとの不正検知情報をマップ化
      const fraudMap = new Map<string, { maxRiskScore: number; detectionCount: number }>();
      
      if (fraudLogs && !fraudError) {
        fraudLogs.forEach(log => {
          const existing = fraudMap.get(log.user_id);
          if (!existing) {
            fraudMap.set(log.user_id, {
              maxRiskScore: log.risk_score,
              detectionCount: 1
            });
          } else {
            fraudMap.set(log.user_id, {
              maxRiskScore: Math.max(existing.maxRiskScore, log.risk_score),
              detectionCount: existing.detectionCount + 1
            });
          }
        });
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

          // サブスクリプション情報を取得
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', profile.id)
            .eq('status', 'active')
            .single();

          // 支払い合計額を取得
          const { data: payments } = await supabase
            .from('reservations')
            .select('total_amount')
            .eq('user_id', profile.id)
            .eq('status', 'confirmed');

          const totalSpent = payments?.reduce((sum, payment) => sum + (payment.total_amount || 0), 0) || 0;

          // 不正検知情報を取得
          const fraudInfo = fraudMap.get(profile.id);
          let fraudRiskLevel: 'low' | 'medium' | 'high' = 'low';
          
          if (fraudInfo) {
            if (fraudInfo.maxRiskScore >= 70) fraudRiskLevel = 'high';
            else if (fraudInfo.maxRiskScore >= 50) fraudRiskLevel = 'medium';
          }

          return {
            id: profile.id,
            name: profile.name || 'Unknown',
            email: 'N/A', // メール情報は後で取得
            phone: profile.phone_number,
            created_at: profile.created_at,
            last_sign_in_at: undefined,
            is_active: true,
            subscription_status: subscription ? 'active' : 'inactive',
            dog_count: dogCount || 0,
            reservation_count: reservationCount || 0,
            total_spent: totalSpent,
            fraud_risk_score: fraudInfo?.maxRiskScore || 0,
            fraud_risk_level: fraudRiskLevel,
            fraud_detection_count: fraudInfo?.detectionCount || 0
          } as UserData;

        } catch (userError) {
          console.error(`Error fetching data for user ${profile.id}:`, userError);
          return null;
        }
      });

      const resolvedUsers = await Promise.allSettled(userPromises);
      const validUsers = resolvedUsers
        .filter((result): result is PromiseFulfilledResult<UserData> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      setUsers(validUsers);

    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'ユーザー情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = (() => {
        switch (filterStatus) {
          case 'active':
            return user.is_active;
          case 'inactive':
            return !user.is_active;
          case 'subscribers':
            return user.subscription_status === 'active';
          case 'high_risk':
            return user.fraud_risk_level === 'high';
          case 'medium_risk':
            return user.fraud_risk_level === 'medium';
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });

    // ソート
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'last_sign_in_at':
          aValue = a.last_sign_in_at ? new Date(a.last_sign_in_at) : new Date(0);
          bValue = b.last_sign_in_at ? new Date(b.last_sign_in_at) : new Date(0);
          break;
        case 'total_spent':
          aValue = a.total_spent;
          bValue = b.total_spent;
          break;
        case 'fraud_risk_score':
          aValue = a.fraud_risk_score || 0;
          bValue = b.fraud_risk_score || 0;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  const handleShowFraudDetails = async (userId: string) => {
    setFraudModalLoading(true);
    setShowFraudModal(true);
    
    try {
      const details = await getUserFraudDetails(userId);
      setSelectedUserFraud(details);
    } catch (error) {
      console.error('Error fetching fraud details:', error);
    } finally {
      setFraudModalLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string, riskScore: number, detectionCount: number) => {
    if (detectionCount === 0) return null;
    
    switch (riskLevel) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            <ShieldAlert className="w-3 h-3 mr-1" />
            高リスク ({riskScore})
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <AlertTriangle className="w-3 h-3 mr-1" />
            中リスク ({riskScore})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <ShieldCheck className="w-3 h-3 mr-1" />
            低リスク ({riskScore})
          </span>
        );
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス拒否</h1>
          <p className="text-gray-600">管理者権限が必要です。</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/admin">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  管理者ダッシュボード
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Users className="w-8 h-8 text-blue-600 mr-3" />
                  ユーザー管理
                </h1>
                <p className="text-gray-600">ユーザー情報と不正検知状況の管理</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 mb-6">
            <AlertTriangle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
        )}

        {/* 検索・フィルター */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="名前またはメールで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">フィルター</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="active">アクティブ</option>
                <option value="inactive">非アクティブ</option>
                <option value="subscribers">サブスクリプション</option>
                <option value="high_risk">高リスクユーザー</option>
                <option value="medium_risk">中リスクユーザー</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ソート</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at">登録日</option>
                <option value="name">名前</option>
                <option value="total_spent">支払い合計</option>
                <option value="fraud_risk_score">リスクスコア</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">順序</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ユーザー一覧 */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      登録情報
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      利用状況
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      不正検知
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                            {new Date(user.created_at).toLocaleDateString('ja-JP')}
                          </div>
                          {user.phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 text-gray-400 mr-1" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Dog className="w-4 h-4 text-gray-400 mr-1" />
                            {user.dog_count}匹
                          </div>
                          <div className="flex items-center mb-1">
                            <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                            {user.reservation_count}件
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                            ¥{user.total_spent.toLocaleString()}
                          </div>
                        </div>
                        {user.subscription_status === 'active' && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-1">
                            <Crown className="w-3 h-3 mr-1" />
                            サブスクリプション
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getRiskBadge(user.fraud_risk_level || 'low', user.fraud_risk_score || 0, user.fraud_detection_count || 0)}
                          {(user.fraud_detection_count || 0) > 0 && (
                            <div className="text-xs text-gray-500">
                              検知回数: {user.fraud_detection_count}回
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link to={`/admin/users/${user.id}`}>
                            <Button variant="secondary" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              詳細
                            </Button>
                          </Link>
                          {(user.fraud_detection_count || 0) > 0 && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleShowFraudDetails(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              不正検知
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">ユーザーが見つかりません</h3>
                  <p className="text-gray-600">検索条件を変更してお試しください。</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 不正検知詳細モーダル */}
        {showFraudModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Shield className="w-6 h-6 text-red-600 mr-2" />
                  不正検知詳細情報
                </h3>
                <button
                  onClick={() => setShowFraudModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {fraudModalLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedUserFraud ? (
                <div className="space-y-6">
                  {/* デバイス情報 */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <Monitor className="w-5 h-5 text-blue-600 mr-2" />
                      デバイス情報
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedUserFraud.deviceFingerprints.length > 0 ? (
                        <div className="space-y-3">
                          {selectedUserFraud.deviceFingerprints.slice(0, 3).map((device, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">フィンガープリント: {device.fingerprint.substring(0, 16)}...</div>
                              <div className="text-gray-600">IP: {device.ipAddress}</div>
                              <div className="text-gray-600">ユーザーエージェント: {device.userAgent.substring(0, 50)}...</div>
                              <div className="text-gray-600">日時: {new Date(device.createdAt).toLocaleString('ja-JP')}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">デバイス情報がありません</p>
                      )}
                    </div>
                  </div>

                  {/* 不正検知ログ */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                      不正検知ログ
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedUserFraud.fraudLogs.length > 0 ? (
                        <div className="space-y-3">
                          {selectedUserFraud.fraudLogs.map((log, index) => (
                            <div key={index} className="text-sm border-b border-gray-200 pb-2 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-red-600">{log.detectionType}</span>
                                <span className="text-gray-600">リスクスコア: {log.riskScore}</span>
                              </div>
                              <div className="text-gray-600">対応: {log.actionTaken}</div>
                              <div className="text-gray-600">日時: {new Date(log.createdAt).toLocaleString('ja-JP')}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">不正検知ログがありません</p>
                      )}
                    </div>
                  </div>

                  {/* カード使用履歴 */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                      カード使用履歴
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {selectedUserFraud.cardUsage.length > 0 ? (
                        <div className="space-y-3">
                          {selectedUserFraud.cardUsage.map((card, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">カード: {card.cardFingerprint.substring(0, 16)}...</div>
                              <div className="text-gray-600">
                                トライアル利用: {card.trialUsed ? 'あり' : 'なし'}
                                {card.trialUsed && card.trialUsedAt && (
                                  <span className="ml-2">({new Date(card.trialUsedAt).toLocaleDateString('ja-JP')})</span>
                                )}
                              </div>
                              <div className="text-gray-600">登録日: {new Date(card.createdAt).toLocaleString('ja-JP')}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">カード使用履歴がありません</p>
                      )}
                    </div>
                  </div>

                  {/* 重複ユーザー情報 */}
                  {(selectedUserFraud.duplicateDeviceUsers.length > 0 || selectedUserFraud.duplicateIpUsers.length > 0) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <Wifi className="w-5 h-5 text-purple-600 mr-2" />
                        重複検知
                      </h4>
                      <div className="bg-red-50 rounded-lg p-4">
                        {selectedUserFraud.duplicateDeviceUsers.length > 0 && (
                          <div className="mb-3">
                            <div className="font-medium text-red-800">同一デバイス使用者:</div>
                            <div className="text-sm text-red-700">
                              {selectedUserFraud.duplicateDeviceUsers.length}人のユーザーが同じデバイスを使用
                            </div>
                          </div>
                        )}
                        {selectedUserFraud.duplicateIpUsers.length > 0 && (
                          <div>
                            <div className="font-medium text-red-800">同一IP使用者:</div>
                            <div className="text-sm text-red-700">
                              {selectedUserFraud.duplicateIpUsers.length}人のユーザーが同じIPアドレスを使用
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">不正検知情報の取得に失敗しました</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowFraudModal(false)}>
                  閉じる
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
