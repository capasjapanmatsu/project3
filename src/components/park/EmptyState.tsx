import Card from '../Card';

interface EmptyStateProps {
  type: 'dogparks' | 'facilities';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  if (type === 'dogparks') {
    return (
      <Card className="text-center py-12">
        <div className="text-4xl mb-4">🐕</div>
        <p className="text-gray-600">承認済みのドッグランが見つかりませんでした</p>
      </Card>
    );
  }

  return (
    <Card className="text-center py-12">
      <div className="text-4xl mb-4">🏪</div>
      <p className="text-gray-600">掲載中のペット関連施設が見つかりませんでした</p>
    </Card>
  );
}; 