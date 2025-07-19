import Card from '../Card';

interface ViewTabsProps {
  activeView: 'dogparks' | 'facilities';
  onViewChange: (view: 'dogparks' | 'facilities') => void;
}

export const ViewTabs: React.FC<ViewTabsProps> = ({ activeView, onViewChange }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-center space-x-6">
        <button
          onClick={() => onViewChange('dogparks')}
          className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-colors ${
            activeView === 'dogparks' 
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="text-3xl">🐕</div>
          <span className="font-semibold">ドッグラン</span>
          <span className="text-xs text-center">承認済みドッグラン施設</span>
        </button>
        <button
          onClick={() => onViewChange('facilities')}
          className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-colors ${
            activeView === 'facilities' 
              ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="text-3xl">🏪</div>
          <span className="font-semibold">その他の施設</span>
          <span className="text-xs text-center">ペット関連施設</span>
        </button>
      </div>
    </Card>
  );
}; 