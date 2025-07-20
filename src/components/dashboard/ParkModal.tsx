import { BarChart4, CheckCircle, Clock, Edit, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DogPark } from '../../types';
import Button from '../Button';
import { getStatusBadge } from './ParkCard';

interface ParkModalProps {
  park: DogPark;
  onClose: () => void;
}

export function ParkModal({ park, onClose }: ParkModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{park.name}の管理</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* ドッグラン情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold mb-3">基本情報</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">住所:</span> {park.address}</p>
                <p><span className="font-medium">ステータス:</span> {getStatusBadge(park.status)}</p>
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
                    <div className={`w-4 h-4 rounded ${park.facilities[key as keyof typeof park.facilities]
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                      }`} />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 審査ステータスに応じた表示 */}
          {park.status === 'first_stage_passed' && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">第一審査通過</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    おめでとうございます！第一審査に通過しました。次は詳細な施設情報と画像のアップロードが必要です。
                  </p>
                  <Link to={`/parks/${park.id}/second-stage`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      第二審査を進める
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {park.status === 'second_stage_review' && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2">第二審査中</h3>
                  <p className="text-sm text-purple-800">
                    現在、管理者が施設画像を確認しています。審査完了までお待ちください。
                    審査には通常3-5営業日かかります。結果はメールとアプリ内通知でお知らせします。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 統計情報（承認済みの場合のみ表示） */}
          {park.status === 'approved' && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">統計情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
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
            </div>
          )}

          {/* アクションボタン */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {park.status === 'approved' && (
              <Link to={`/parks/${park.id}`}>
                <Button className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-700">
                  <Eye className="w-4 h-4 mr-2" />
                  公開ページを見る
                </Button>
              </Link>
            )}

            {park.status === 'approved' && (
              <Link to="/owner-payment-system">
                <Button className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-700">
                  <BarChart4 className="w-4 h-4 mr-2" />
                  収益レポート
                </Button>
              </Link>
            )}

            {park.status === 'second_stage_review' ? (
              <div className="w-full text-center py-3 text-gray-600 text-sm bg-gray-50 rounded border">
                審査中のため操作できません
              </div>
            ) : (
              <Link to={park.status === 'first_stage_passed' || park.status === 'second_stage_waiting'
                ? `/parks/${park.id}/second-stage`
                : `/parks/${park.id}/manage`}>
                <Button className="w-full">
                  {park.status === 'first_stage_passed' || park.status === 'second_stage_waiting' ? (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      {park.status === 'second_stage_waiting' ? '第二審査を申し込む' : '第二審査を進める'}
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      {park.status === 'approved' ? '設定を編集' : '詳細を見る'}
                    </>
                  )}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// DollarSign component for the dashboard
function DollarSign({ className }: { className?: string }) {
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
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}

// Users component for the dashboard
function Users({ className }: { className?: string }) {
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
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}

// Plus component for the dashboard
function Plus({ className }: { className?: string }) {
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
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
