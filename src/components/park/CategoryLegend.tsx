import Card from '../Card';

export const CategoryLegend: React.FC = () => {
  return (
    <Card className="p-4 bg-purple-50">
      <h3 className="text-lg font-semibold mb-3 text-purple-900">施設アイコンの説明</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🏨</span>
          <span className="text-purple-800">ペットホテル</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">✂️</span>
          <span className="text-purple-800">ペットサロン</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🏥</span>
          <span className="text-purple-800">動物病院</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">☕</span>
          <span className="text-purple-800">ペットカフェ</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🍽️</span>
          <span className="text-purple-800">ペット同伴レストラン</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🛒</span>
          <span className="text-purple-800">ペットショップ</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🏠</span>
          <span className="text-purple-800">ペット同伴宿泊</span>
        </div>
      </div>
    </Card>
  );
}; 