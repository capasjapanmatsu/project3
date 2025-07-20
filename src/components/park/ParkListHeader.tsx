import { RefreshCw } from 'lucide-react';
import Button from '../Button';

interface ParkListHeaderProps {
  activeView: 'dogparks' | 'facilities';
  onRefresh: () => void;
}

export function ParkListHeader({ activeView, onRefresh }: ParkListHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeView === 'dogparks' ? 'ドッグパーク一覧' : 'ペット施設一覧'}
            </h1>
            <p className="text-gray-600 mt-1">
              {activeView === 'dogparks' 
                ? 'お近くのドッグパークを見つけましょう' 
                : 'ペットと一緒に利用できる施設を探しましょう'}
            </p>
          </div>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
        </div>
      </div>
    </div>
  );
} 