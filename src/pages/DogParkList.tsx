import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { MapPin, Clock, Users, RefreshCw } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';

interface DogPark {
  id: string;
  name: string;
  address: string;
  description?: string;
  capacity: number;
  current_occupancy: number;
  is_open: boolean;
  latitude?: number;
  longitude?: number;
}

// メモ化されたParkCardコンポーネント
const ParkCard = memo(({ park, onDetailClick, onReserveClick }: {
  park: DogPark;
  onDetailClick: (parkId: string) => void;
  onReserveClick: (parkId: string) => void;
}) => {
  const occupancyPercentage = useMemo(() => 
    Math.round((park.current_occupancy / park.capacity) * 100), 
    [park.current_occupancy, park.capacity]
  );

  const statusColor = useMemo(() => 
    park.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
    [park.is_open]
  );

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 line-clamp-1">{park.name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor}`}>
            {park.is_open ? '営業中' : '休業中'}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start text-gray-600">
            <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm line-clamp-2">{park.address}</span>
          </div>

          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <span className="text-sm">
                {park.current_occupancy}/{park.capacity} 匹
              </span>
            </div>
            <div className="text-xs text-gray-500">
              混雑度: {occupancyPercentage}%
            </div>
          </div>

          {/* 混雑度バー */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                occupancyPercentage > 80 ? 'bg-red-500' :
                occupancyPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
            />
          </div>
        </div>

        {park.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {park.description}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onDetailClick(park.id)}
          >
            詳細を見る
          </Button>
          {park.is_open && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onReserveClick(park.id)}
              disabled={park.current_occupancy >= park.capacity}
            >
              {park.current_occupancy >= park.capacity ? '満員' : '予約する'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

ParkCard.displayName = 'ParkCard';

// メモ化されたローディングコンポーネント
const LoadingSkeleton = memo(() => (
  <div className="container mx-auto px-4 py-8">
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// メモ化されたエラーコンポーネント
const ErrorDisplay = memo(({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="container mx-auto px-4 py-8">
    <Card className="p-6 text-center">
      <div className="text-red-600 mb-4">
        <Clock className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
      <Button onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        再試行
      </Button>
    </Card>
  </div>
));

ErrorDisplay.displayName = 'ErrorDisplay';

// メモ化されたEmptyStateコンポーネント
const EmptyState = memo(() => (
  <Card className="p-8 text-center">
    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      ドッグパークが見つかりません
    </h3>
    <p className="text-gray-600">
      現在利用可能なドッグパークがありません。
    </p>
  </Card>
));

EmptyState.displayName = 'EmptyState';

export function DogParkList() {
  const [parks, setParks] = useState<DogPark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchParkData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('dog_parks')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setParks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchParkData();
    setRefreshing(false);
  }, [fetchParkData]);

  // ナビゲーション関数をメモ化
  const handleDetailClick = useCallback((parkId: string) => {
    window.location.href = `/parks/${parkId}`;
  }, []);

  const handleReserveClick = useCallback((parkId: string) => {
    window.location.href = `/parks/${parkId}/reserve`;
  }, []);

  // 統計情報をメモ化
  const parkStats = useMemo(() => {
    const openParks = parks.filter(park => park.is_open).length;
    const totalCapacity = parks.reduce((sum, park) => sum + park.capacity, 0);
    const totalOccupancy = parks.reduce((sum, park) => sum + park.current_occupancy, 0);
    const averageOccupancy = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

    return { openParks, totalCapacity, totalOccupancy, averageOccupancy };
  }, [parks]);

  useEffect(() => {
    fetchParkData();
  }, [fetchParkData]);

  if (loading && !refreshing) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchParkData} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ドッグパーク一覧</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>営業中: {parkStats.openParks}件</span>
            <span>平均混雑度: {parkStats.averageOccupancy}%</span>
            <span>総収容数: {parkStats.totalCapacity}匹</span>
          </div>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '更新中...' : '更新'}
        </Button>
      </div>

      {parks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parks.map((park) => (
            <ParkCard
              key={park.id}
              park={park}
              onDetailClick={handleDetailClick}
              onReserveClick={handleReserveClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(DogParkList);
