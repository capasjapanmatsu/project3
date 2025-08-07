import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, Calendar, MapPin, Users } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import Card from '../Card';

interface DogParkStat {
  id: string;
  dog_id: string;
  dog_run_id: string;
  visit_count: number;
  total_duration: number;
  last_visit_at: string;
  first_visit_at: string;
  dog_run?: {
    name: string;
    address: string;
  };
}

interface SharedAccess {
  id: string;
  user2_id: string;
  dog2_id: string;
  overlap_start: string;
  dog_run?: {
    name: string;
  };
  other_user?: {
    nickname?: string;
  };
  other_dog?: {
    name: string;
  };
}

interface DogParkStatsProps {
  dogId: string;
  dogName?: string;
}

/**
 * ワンちゃんのドッグラン利用統計を表示
 */
export const DogParkStats: React.FC<DogParkStatsProps> = ({ dogId, dogName }) => {
  const [stats, setStats] = useState<DogParkStat[]>([]);
  const [sharedAccess, setSharedAccess] = useState<SharedAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!dogId) return;
    fetchStats();
  }, [dogId]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);

      // 訪問統計を取得
      const { data: statsData, error: statsError } = await supabase
        .from('dog_park_stats')
        .select(`
          *,
          dog_run:dog_parks(name, address)
        `)
        .eq('dog_id', dogId)
        .order('visit_count', { ascending: false })
        .limit(5);

      if (statsError) throw statsError;
      setStats(statsData || []);

      // 最近一緒に遊んだ記録を取得
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_access_logs')
        .select(`
          *,
          dog_run:dog_parks(name),
          other_user:user2_id(nickname),
          other_dog:dog2_id(name)
        `)
        .or(`dog1_id.eq.${dogId},dog2_id.eq.${dogId}`)
        .order('overlap_start', { ascending: false })
        .limit(10);

      if (sharedError) throw sharedError;
      setSharedAccess(sharedData || []);

    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded"></div>
            <div className="h-4 bg-gray-100 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* よく行くドッグラン */}
      {stats.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                {dogName ? `${dogName}の` : ''}お気に入りドッグラン
              </h3>
            </div>

            <div className="space-y-3">
              {stats.map((stat, index) => (
                <div 
                  key={stat.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-gray-300'}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {stat.dog_run?.name || 'ドッグラン'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {stat.dog_run?.address || '住所不明'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {stat.visit_count}回訪問
                    </div>
                    <div className="text-xs text-gray-500">
                      {stat.total_duration > 0 && (
                        <>
                          <Clock className="w-3 h-3 inline mr-1" />
                          計{formatDuration(stat.total_duration)}
                        </>
                      )}
                    </div>
                    {stat.last_visit_at && (
                      <div className="text-xs text-gray-400 mt-1">
                        最終: {formatDate(stat.last_visit_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 最近一緒に遊んだお友達 */}
      {sharedAccess.length > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                最近一緒に遊んだお友達
              </h3>
            </div>

            <div className="space-y-2">
              {sharedAccess.slice(0, 5).map((access) => (
                <div 
                  key={access.id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {access.other_dog?.name || 'ワンちゃん'}
                      </div>
                      <div className="text-xs text-gray-600">
                        飼い主: {access.other_user?.nickname || '名前未設定'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-gray-600">
                      {access.dog_run?.name || 'ドッグラン'}
                    </div>
                    <div className="text-xs text-gray-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(access.overlap_start)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sharedAccess.length > 5 && (
              <div className="mt-4 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  もっと見る ({sharedAccess.length - 5}件)
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* データがない場合 */}
      {stats.length === 0 && sharedAccess.length === 0 && (
        <Card>
          <div className="p-6 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              まだドッグランの利用記録がありません
            </p>
            <p className="text-sm text-gray-400 mt-1">
              ドッグランを利用すると統計が表示されます
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DogParkStats;
