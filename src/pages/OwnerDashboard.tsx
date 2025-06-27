import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, MapPin, Clock, AlertTriangle, CheckCircle, FileText, QrCode, Eye, Star, DollarSign, TrendingUp, BarChart4, Building, Users, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { DogPark } from '../types';

export function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parks, setParks] = useState<DogPark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalReservations, setTotalReservations] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    async function fetchParks() {
      try {
        const { data, error } = await supabase
          .from('dog_parks')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setParks(data || []);
        
        // 仮のデータを設定（実際の実装ではデータベースから取得）
        setTotalRevenue(25600);
        setTotalReservations(32);
        setTotalUsers(128);
      } catch (error) {
        console.error('Error fetching dog parks:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchParks();
  }, [user, navigate]);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      pending: {
        label: '第一審査中',
        color: 'bg-yellow-100 text-yellow-800',
        icon: FileText,
        description: '基本的な条件の審査中です'
      },
      approved: {
        label: '運営中',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        description: '一般公開中・予約受付中'
      },
      rejected: {
        label: '審査不通過',
        color: 'bg-red-100 text-red-800',
        icon: AlertTriangle,
        description: '審査基準を満たしていません'
      },
      first_stage_passed: {
        label: '第一審査通過',
        color: 'bg-blue-100 text-blue-800',
        icon: CheckCircle,
        description: '詳細情報入力待ち'
      },
      second_stage_review: {
        label: '第二審査中',
        color: 'bg-purple-100 text-purple-800',
        icon: FileText,
        description: '書類審査中（3-5営業日）'
      },
      qr_testing: {
        label: 'QRコード実証検査',
        color: 'bg-orange-100 text-orange-800',
        icon: QrCode,
        description: '実地検査・動作確認中'
      }
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  const handleDeletePark = async (parkId: string) => {
    try {
      setIsDeleting(true);
      setError('');
      
      // First, check if there are any related facility images
      const { data: facilityImages } = await supabase
        .from('dog_park_facility_images')
        .select('id')
        .eq('park_id', parkId);
        
      // If there are facility images, delete them first
      if (facilityImages && facilityImages.length > 0) {
        const { error: deleteImagesError } = await supabase
          .from('dog_park_facility_images')
          .delete()
          .eq('park_id', parkId);
          
        if (deleteImagesError) {
          console.error('Error deleting facility images:', deleteImagesError);
          throw new Error('施設画像の削除に失敗しました。');
        }
      }
      
      // Check for review stages
      const { data: reviewStages } = await supabase
        .from('dog_park_review_stages')
        .select('id')
        .eq('park_id', parkId);
        
      // Delete review stages if they exist
      if (reviewStages && reviewStages.length > 0) {
        const { error: deleteStagesError } = await supabase
          .from('dog_park_review_stages')
          .delete()
          .eq('park_id', parkId);
          
        if (deleteStagesError) {
          console.error('Error deleting review stages:', deleteStagesError);
          throw new Error('審査ステージの削除に失敗しました。');
        }
      }
      
      // Now delete the park
      const { error } = await supabase
        .from('dog_parks')
        .delete()
        .eq('id', parkId)
        .eq('owner_id', user?.id); // Ensure the user owns the park
      
      if (error) throw error;
      
      // Update the parks list
      setParks(prev => prev.filter(park => park.id !== parkId));
      setShowConfirmDelete(null);
      setSuccess('ドッグラン申請を削除しました');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error deleting park:', err);
      setError(err.message || '削除に失敗しました。もう一度お試しください。');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    } finally {
      setIsDeleting(false);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">オーナーダッシュボード</h1>
          <p className="text-gray-600">ドッグランの登録・管理を行います</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/owner-payment-system">
            <Button variant="secondary" className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              収益システム
            </Button>
          </Link>
          <Link to="/register-park">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              ドッグランを登録
            </Button>
          </Link>
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

      {/* 統計カード */}
      {parks.some(park => park.status === 'approved') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今月の収益</p>
                <p className="text-2xl font-bold text-green-600">¥{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600">前月比 +8%</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-3 text-blue-600 text-sm flex items-center">
              <Link to="/owner-payment-system" className="flex items-center">
                <span>詳細を見る</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">今月の予約</p>
                <p className="text-2xl font-bold text-blue-600">{totalReservations}件</p>
                <p className="text-xs text-blue-600">前月比 +12%</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-3 text-blue-600 text-sm flex items-center">
              <span>詳細を見る</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">利用者数</p>
                <p className="text-2xl font-bold text-purple-600">{totalUsers}人</p>
                <p className="text-xs text-purple-600">前月比 +15%</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-3 text-blue-600 text-sm flex items-center">
              <span>詳細を見る</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Card>
        </div>
      )}

      {/* 収益概要カード */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-full">
              <BarChart4 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">収益システム</h2>
              <p className="text-sm opacity-90">
                売上の80%がオーナー様に支払われます
              </p>
            </div>
          </div>
          <Link to="/owner-payment-system">
            <Button className="bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 font-bold">
              <TrendingUp className="w-4 h-4 mr-2" />
              詳細を見る
            </Button>
          </Link>
        </div>
      </Card>

      {/* 審査プロセスの説明 */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">審査プロセス</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-800">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <span>第一審査（基本条件確認）</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span>第二審査（書類審査）</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span>QRコード実証検査</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                <span>掲載・運営開始</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {parks.length === 0 ? (
        <Card className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">まだドッグランが登録されていません</h2>
          <p className="text-gray-600 mb-6">新しいドッグランを登録して、多くの愛犬家に利用してもらいましょう</p>
          <Link to="/register-park">
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              ドッグランを登録する
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parks.map((park) => {
            const statusInfo = getStatusInfo(park.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card key={park.id} className="hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{park.name}</h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${statusInfo.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{statusInfo.description}</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">{park.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="text-sm">{park.address}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="text-sm">24時間営業</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>収容人数: {park.max_capacity}人</div>
                    <div>現在の利用者: {park.current_occupancy}人</div>
                  </div>
                </div>

                {/* 運営中の場合の統計情報 */}
                {park.status === 'approved' && (
                  <div className="bg-green-50 p-3 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>評価: ★{park.average_rating.toFixed(1)}</span>
                      </div>
                      <div>
                        <span>レビュー: {park.review_count}件</span>
                      </div>
                      <div>
                        <span>現在の利用者: {park.current_occupancy}人</span>
                      </div>
                      <div>
                        <span>利用率: {Math.round((park.current_occupancy / park.max_capacity) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ステータス別の案内 */}
                {park.status === 'pending' && (
                  <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">第一審査待ち</p>
                        <p>管理者による審査をお待ちください。通常3-5営業日で結果をお知らせします。</p>
                      </div>
                    </div>
                  </div>
                )}

                {park.status === 'first_stage_passed' && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">第一審査通過！</p>
                        <p>第二審査の詳細情報を入力してください。</p>
                      </div>
                    </div>
                  </div>
                )}

                {park.status === 'second_stage_review' && (
                  <div className="bg-purple-50 p-3 rounded-lg mb-4">
                    <div className="flex items-start space-x-2">
                      <Clock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-purple-800">
                        <p className="font-medium mb-1">第二審査中です</p>
                        <p>審査結果をお待ちください。</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex space-x-2">
                  {park.status === 'approved' && (
                    <div className="flex justify-between w-full">
                      <Link to={`/parks/${park.id}`}>
                        <Button size="sm" variant="secondary">
                          <Eye className="w-4 h-4 mr-1" />
                          公開ページを見る
                        </Button>
                      </Link>
                      <Link to={`/parks/${park.id}/manage`}>
                        <Button size="sm">
                          管理する
                        </Button>
                      </Link>
                    </div>
                  )}
                  {park.status === 'first_stage_passed' && (
                    <Link to={`/parks/${park.id}/second-stage`} className="w-full">
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                        <Camera className="w-4 h-4 mr-1" />
                        施設画像をアップロード
                      </Button>
                    </Link>
                  )}
                  {park.status === 'rejected' && (
                    <div className="flex justify-between w-full">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate('/register-park');
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        再申請する
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowConfirmDelete(park.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除する
                      </Button>
                    </div>
                  )}
                  {park.status !== 'approved' && park.status !== 'first_stage_passed' && park.status !== 'rejected' && (
                    <Link to={`/parks/${park.id}/manage`} className="w-full">
                      <Button size="sm" variant="secondary" className="w-full">
                        詳細を見る
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 運営サポート情報 */}
      <Card className="bg-gray-50">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-gray-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">運営サポート</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• 審査に関するご質問は運営事務局までお問い合わせください</p>
              <p>• QRコードシステムの設置・設定サポートを提供しています</p>
              <p>• 運営開始後も継続的なサポートを行います</p>
              <p>• 📧 サポート窓口: info@dogparkjp.com</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 削除確認モーダル */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">申請を削除しますか？</h3>
            <p className="text-gray-600 mb-6">
              この操作は取り消せません。申請を削除してもよろしいですか？
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmDelete(null)}
              >
                キャンセル
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                isLoading={isDeleting}
                onClick={() => handleDeletePark(showConfirmDelete)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Calendar component for the dashboard
function Calendar({ className }: { className?: string }) {
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
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

// Camera component for the dashboard
function Camera({ className }: { className?: string }) {
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
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}