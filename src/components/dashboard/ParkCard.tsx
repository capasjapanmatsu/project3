import { AlertTriangle, CheckCircle, Clock, Edit, FileText, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DogPark } from '../../types';
import Button from '../Button';

interface ParkCardProps {
  park: DogPark;
  onSelect: (park: DogPark) => void;
}

export function ParkCard({ park, onSelect }: ParkCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // 詳細ボタンをクリックした場合は、カードのクリックイベントを無効化
    if ((e.target as HTMLElement).closest('.detail-button')) {
      return;
    }
    onSelect(park);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={handleCardClick}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold">{park.name}</h3>
          <p className="text-sm text-gray-600">{park.address}</p>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm">{park.average_rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-gray-500">
              {park.review_count}件のレビュー
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(park.status)}

          {park.status === 'second_stage_waiting' ? (
            <Link to={`/parks/${park.id}/second-stage`} className="detail-button">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                <FileText className="w-4 h-4 mr-1" />
                申し込み
              </Button>
            </Link>
          ) : park.status === 'approved' ? (
            <Link to={`/parks/${park.id}/manage`} className="detail-button">
              <Button size="sm" className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-0">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Button size="sm" className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-0 detail-button">
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>料金: ¥{park.price}/日</div>
        <div>収容人数: {park.max_capacity}人</div>
        <div>現在の利用者: {park.current_occupancy}人</div>
        <div>レビュー: ★{park.average_rating.toFixed(1)}</div>
      </div>
      {park.status === 'pending' && (
        <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          管理者による承認をお待ちください
        </div>
      )}
      {park.status === 'first_stage_passed' && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          第一審査通過！第二審査の詳細情報を入力してください
        </div>
      )}
      {park.status === 'second_stage_review' && (
        <div className="mt-3 p-2 bg-purple-50 rounded text-sm text-purple-800">
          <Clock className="w-4 h-4 inline mr-1" />
          第二審査中です。審査完了までお待ちください
        </div>
      )}
      {park.status === 'second_stage_waiting' && (
        <div className="mt-3 p-2 bg-orange-50 rounded text-sm text-orange-800">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          第一審査通過！第二審査の申し込みが可能です
        </div>
      )}
    </div>
  );
}

export function getStatusBadge(status: string) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    confirmed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
    first_stage_passed: 'bg-blue-100 text-blue-800',
    second_stage_waiting: 'bg-orange-100 text-orange-800',
    second_stage_review: 'bg-purple-100 text-purple-800',
    qr_testing: 'bg-orange-100 text-orange-800',
  };
  const labels = {
    pending: '承認待ち',
    approved: '承認済み',
    rejected: '却下',
    confirmed: '確定',
    cancelled: 'キャンセル',
    first_stage_passed: '第一審査通過',
    second_stage_waiting: '二次審査申し込み',
    second_stage_review: '第二審査中',
    qr_testing: 'QR検査中',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
