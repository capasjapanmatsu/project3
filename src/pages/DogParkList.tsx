import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Coins, CheckCircle, Heart, Shield, Star, Clock, AlertTriangle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import type { DogPark, Reservation } from '../types';

interface OccupancyHistory {
  timestamp: string;
  occupancy: number;
  maxCapacity: number;
}

interface MaintenanceInfo {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_emergency: boolean;
}

export function DogParkList() {
  const [parks, setParks] = useState<DogPark[]>([]);
  const [facilityRentals, setFacilityRentals] = useState<Record<string, Reservation[]>>({});
  const [maintenanceInfo, setMaintenanceInfo] = useState<Record<string, MaintenanceInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [occupancyHistory, setOccupancyHistory] = useState<Record<string, OccupancyHistory[]>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // リアルタイム更新の間隔（30秒）
  const UPDATE_INTERVAL = 30000;

  useEffect(() => {
    // ユーザーの現在位置を取得
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        // デフォルトの位置（東京）
        setUserLocation({ lat: 35.6812, lng: 139.7671 });
      }
    );
  }, []);

  // リアルタイム更新関数
  const updateOccupancyData = async () => {
    try {
      setIsUpdating(true);
      console.log('Updating occupancy data...');
      
      const { data, error } = await supabase
        .from('dog_parks')
        .select('id, current_occupancy, max_capacity')
        .eq('status', 'approved');

      if (error) {
        console.error('Error updating occupancy data:', error);
        return;
      }

      // 現在時刻
      const now = new Date();
      setLastUpdated(now);

      // パークの混雑状況を更新
      setParks(currentParks => 
        currentParks.map(park => {
          const updatedPark = data?.find(p => p.id === park.id);
          if (updatedPark && data) {
            // 履歴に追加
            const history = occupancyHistory[park.id] || [];
            const newHistory = [
              ...history,
              {
                timestamp: now.toISOString(),
                occupancy: updatedPark.current_occupancy,
                maxCapacity: updatedPark.max_capacity
              }
            ].slice(-20); // 最新20件を保持

            setOccupancyHistory(prev => ({
              ...prev,
              [park.id]: newHistory
            }));

            return { ...park, ...updatedPark };
          }
          return park;
        })
      );

      console.log('Occupancy data updated successfully');
    } catch (error) {
      console.error('Error updating occupancy data:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const fetchParks = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching dog parks...');
        
        const { data, error } = await supabase
          .from('dog_parks')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching dog parks:', error);
          setError(`データ取得エラー: ${error.message || 'Unknown error'}`);
          throw error;
        }
        
        console.log('Fetched parks:', data);
        console.log('Number of parks:', data?.length || 0);
        
        // 現在地からの距離でソート
        if (userLocation && data) {
          data.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
            const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
            return distA - distB;
          });
        }
        
        setParks(data || []);
        if (!data || data.length === 0) {
          setError('表示できるドッグランがありません。データベースの内容を確認してください。');
          console.log('No parks found in database');
        }

        // 本日の施設貸し切り予約を取得（今後の予約）
        const today = new Date().toISOString().split('T')[0];
        const { data: rentalsData, error: rentalsError } = await supabase
          .from('reservations')
          .select('*')
          .eq('reservation_type', 'whole_facility')
          .eq('status', 'confirmed')
          .eq('date', today);

        if (rentalsError) {
          console.error('Error fetching facility rentals:', rentalsError);
          // 予約情報の取得エラーは致命的ではないので、ログのみ
        } else {
          console.log('Fetched rentals:', rentalsData);
        }
        
        // パークIDごとに予約をグループ化
        const rentalsByParkId: Record<string, Reservation[]> = {};
        (rentalsData || []).forEach(rental => {
          if (rental && rental.park_id) {
            const parkId = rental.park_id;
            if (!rentalsByParkId[parkId]) {
              rentalsByParkId[parkId] = [];
            }
            rentalsByParkId[parkId].push(rental);
          }
        });
        
        setFacilityRentals(rentalsByParkId);

        // メンテナンス情報を取得（現在進行中または今後のメンテナンス）
        const { data: maintenanceData, error: maintenanceError } = await supabase
          .from('park_maintenance')
          .select('park_id, title, description, start_date, end_date, is_emergency, status')
          .in('status', ['scheduled', 'active'])
          .gte('end_date', new Date().toISOString());

        if (maintenanceError) {
          console.error('Error fetching maintenance info:', maintenanceError);
          // メンテナンス情報の取得エラーは致命的ではないので、エラーログのみ
        } else {
          console.log('Fetched maintenance:', maintenanceData);
          const maintenanceByParkId: Record<string, MaintenanceInfo> = {};
          (maintenanceData || []).forEach(maintenance => {
            // 現在進行中のメンテナンスまたは最も近い今後のメンテナンスを優先
            const now = new Date();
            const startDate = new Date(maintenance.start_date);
            const endDate = new Date(maintenance.end_date);
            
            // 現在進行中または今後のメンテナンス
            if (endDate > now) {
              // 既存のメンテナンス情報がない場合、または現在進行中のメンテナンスの場合は上書き
              if (!maintenanceByParkId[maintenance.park_id] || 
                  (startDate <= now && endDate > now)) {
                maintenanceByParkId[maintenance.park_id] = {
                  id: maintenance.park_id,
                  title: maintenance.title,
                  description: maintenance.description,
                  start_date: maintenance.start_date,
                  end_date: maintenance.end_date,
                  is_emergency: maintenance.is_emergency
                };
              }
            }
          });
          setMaintenanceInfo(maintenanceByParkId);
        }
      } catch (error) {
        console.error('Error fetching dog parks:', error);
        setError(`データ取得エラー: ${(error as Error).message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParks();

    // リアルタイムで混雑状況を更新（Supabase Realtime）
    const subscription = supabase
      .channel('dog_parks_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dog_parks',
      }, payload => {
        console.log('Real-time update received:', payload);
        setParks(currentParks => 
          currentParks.map(park => 
            park.id === payload.new.id ? { ...park, ...payload.new } : park
          )
        );
        
        // 履歴に追加
        const now = new Date();
        setOccupancyHistory(prev => {
          const history = prev[payload.new.id] || [];
          const newHistory = [
            ...history,
            {
              timestamp: now.toISOString(),
              occupancy: payload.new.current_occupancy,
              maxCapacity: payload.new.max_capacity
            }
          ].slice(-20);

          return {
            ...prev,
            [payload.new.id]: newHistory
          };
        });
      })
      .subscribe();

    // 定期的な更新を開始
    updateIntervalRef.current = setInterval(updateOccupancyData, UPDATE_INTERVAL);

    return () => {
      subscription.unsubscribe();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [userLocation]);

  // 手動更新ボタン
  const handleManualUpdate = () => {
    updateOccupancyData();
  };

  // 混雑状況の傾向を計算
  const getOccupancyTrend = (parkId: string) => {
    const history = occupancyHistory[parkId] || [];
    if (history.length < 2) return 'stable';

    const recent = history.slice(-3);
    const older = history.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, h) => sum + h.occupancy, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.occupancy, 0) / older.length;

    if (recentAvg > olderAvg + 1) return 'increasing';
    if (recentAvg < olderAvg - 1) return 'decreasing';
    return 'stable';
  };

  // 混雑状況の詳細表示
  const getDetailedOccupancyStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    
    // 4段階で表示
    if (percentage < 25) return { 
      text: '空いています', 
      color: 'text-green-600 bg-green-100',
      barColor: 'bg-green-500',
      description: '快適に利用できます',
      emoji: '😊'
    };
    if (percentage < 50) return { 
      text: 'やや空いています', 
      color: 'text-blue-600 bg-blue-100',
      barColor: 'bg-blue-500',
      description: '適度な混雑です',
      emoji: '🙂'
    };
    if (percentage < 75) return { 
      text: 'やや混んでいます', 
      color: 'text-yellow-600 bg-yellow-100',
      barColor: 'bg-yellow-500',
      description: '少し混雑しています',
      emoji: '😐'
    };
    return { 
      text: '混んでいます', 
      color: 'text-red-600 bg-red-100',
      barColor: 'bg-red-500',
      description: '大変混雑しています',
      emoji: '😰'
    };
  };

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    const initMap = async () => {
      // Google Maps APIキーの確認
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setMapError('Google Maps APIキーが設定されていません。環境変数VITE_GOOGLE_MAPS_API_KEYを設定してください。');
        return;
      }

      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'],
        });

        const google = await loader.load();
        
        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: userLocation,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        googleMapRef.current = map;

        // 既存のマーカーをクリア
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // ユーザーの現在位置にマーカーを表示
        const userMarker = new google.maps.Marker({
          position: userLocation,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
          },
          title: '現在地',
        });

        markersRef.current.push(userMarker);

        // ドッグランのマーカーを表示
        parks.forEach(park => {
          const status = getDetailedOccupancyStatus(park.current_occupancy, park.max_capacity);
          
          // マーカーの色を決定
          let markerColor = 'red';
          if (status.color.includes('green')) markerColor = 'green';
          else if (status.color.includes('blue')) markerColor = 'blue';
          else if (status.color.includes('yellow')) markerColor = 'yellow';
          
          const marker = new google.maps.Marker({
            position: { lat: Number(park.latitude), lng: Number(park.longitude) },
            map,
            title: park.name,
            icon: {
              url: `https://maps.google.com/mapfiles/ms/icons/${markerColor}-dot.png`,
            },
          });

          // 星評価のHTML生成
          const starsHtml = Array.from({ length: 5 }, (_, i) => 
            `<span style="color: ${i < Math.round(park.average_rating) ? '#fbbf24' : '#d1d5db'};">★</span>`
          ).join('');

          // 施設貸し切り情報
          const parkRentals = facilityRentals[park.id] || [];
          let rentalInfoHtml = '';
          
          if (parkRentals.length > 0) {
            // 時間帯ごとにグループ化
            const rentalTimes: {start: string, end: string}[] = [];
            parkRentals.forEach(rental => {
              const startHour = parseInt(rental.start_time);
              const endHour = startHour + rental.duration;
              rentalTimes.push({
                start: `${startHour.toString().padStart(2, '0')}:00`,
                end: `${endHour.toString().padStart(2, '0')}:00`
              });
            });
            
            rentalInfoHtml = `
              <div style="margin-top: 8px; padding: 8px; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px;">
                <p style="font-weight: 500; color: #9a3412; margin-bottom: 4px; font-size: 12px;">本日の貸し切り時間</p>
            `;
            
            rentalTimes.forEach((time) => {
              rentalInfoHtml += `<p style="font-size: 11px; color: #9a3412; margin: 2px 0;">${time.start}〜${time.end}</p>`;
            });
            
            rentalInfoHtml += `</div>`;
          }

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; max-width: 300px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${park.name}</h3>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  ${starsHtml}
                  <span style="margin-left: 4px; font-size: 12px; color: #666;">${park.average_rating.toFixed(1)} (${park.review_count}件)</span>
                </div>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">${park.address}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;">通常利用: ¥800/日</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;">施設貸し切り: ¥4,400/時間</p>
                ${park.private_booths ? `<p style="margin: 0 0 4px 0; font-size: 14px;">プライベートブース: サブスク使い放題・1日券でも利用可能</p>` : ''}
                <p style="margin: 0 0 8px 0; font-size: 14px;">${status.text} (${park.current_occupancy}/${park.max_capacity})</p>
                ${rentalInfoHtml}
                <a href="/parks/${park.id}" style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; margin-top: 8px;">詳細を見る</a>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        setMapError('');
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapError('Google Mapsの読み込みに失敗しました。APIキーが正しく設定されているか確認してください。');
      }
    };

    initMap();
  }, [userLocation, parks, facilityRentals]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 施設貸し切り予約の表示用に整形
  const getParkRentals = (parkId: string) => {
    const rentals = facilityRentals[parkId] || [];
    if (rentals.length === 0) return null;
    
    // 時間帯ごとにグループ化
    const rentalTimes: {start: string, end: string}[] = [];
    rentals.forEach(rental => {
      const startHour = parseInt(rental.start_time);
      const endHour = startHour + rental.duration;
      rentalTimes.push({
        start: `${startHour.toString().padStart(2, '0')}:00`,
        end: `${endHour.toString().padStart(2, '0')}:00`
      });
    });
    
    return rentalTimes;
  };

  useEffect(() => {
    // タイムアウト（10秒）
    const timeout = setTimeout(() => {
      if (isLoading) {
        setTimedOut(true);
        setError('タイムアウト: サーバーから応答がありません。ネットワークやRLS設定を再確認してください。');
        setIsLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">ドッグラン情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ドッグラン一覧</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-red-800">エラーが発生しました</h2>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          
          <div className="space-y-2 text-sm text-red-600">
            <p><strong>考えられる原因:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>データベースの接続エラー</li>
              <li>ドッグランデータが登録されていない</li>
              <li>RLS（Row Level Security）の設定問題</li>
              <li>ネットワーク接続の問題</li>
            </ul>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              再読み込み
            </button>
            <button
              onClick={() => {setError(null); setIsLoading(true);}}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ドッグラン一覧</h1>
        
        {/* リアルタイム更新コントロール */}
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
          </div>
          <button
            onClick={handleManualUpdate}
            disabled={isUpdating}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isUpdating
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? '更新中...' : '更新'}</span>
          </button>
        </div>
      </div>
      
      {/* リアルタイム更新状況の表示 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-sm font-medium text-blue-900">
              {isUpdating ? 'リアルタイム更新中...' : 'リアルタイム更新中'}
            </span>
          </div>
          <div className="text-xs text-blue-700">
            30秒ごとに自動更新
          </div>
        </div>
      </div>
      
      {/* 料金体系の説明 */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="font-semibold text-blue-900 mb-2">料金体系</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <h3 className="font-medium">通常利用</h3>
            <p>1日800円（時間制限なし）</p>
          </div>
          <div>
            <h3 className="font-medium">サブスクリプション</h3>
            <p>月額3,800円（全国共通）</p>
          </div>
          <div>
            <h3 className="font-medium">施設貸し切り</h3>
            <p>4,400円/時間（人数制限なし）</p>
            <p className="text-xs text-blue-600">※前日までの予約が必要</p>
          </div>
        </div>
      </div>
      
      {/* Google Maps */}
      <div className="relative">
        {mapError ? (
          <div className="w-full h-[400px] bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
            <div className="text-center p-6">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">地図を表示できません</p>
              <p className="text-sm text-red-600">{mapError}</p>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-left">
                <p className="text-sm text-yellow-800">
                  <strong>解決方法:</strong><br />
                  1. .envファイルにVITE_GOOGLE_MAPS_API_KEY=your_api_keyを追加<br />
                  2. Google Cloud ConsoleでMaps JavaScript APIを有効化<br />
                  3. APIキーの制限設定を確認
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-[400px] rounded-lg shadow-md" />
        )}
      </div>

      {parks.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">ドッグランが見つかりません</h3>
            <p className="text-yellow-700 mb-4">現在表示できるドッグランがありません。</p>
            
            <div className="space-y-2 text-sm text-yellow-600">
              <p><strong>考えられる原因:</strong></p>
              <ul className="list-disc pl-5 space-y-1 text-left inline-block">
                <li>データベースにドッグランデータが登録されていない</li>
                <li>承認済み（status='approved'）のドッグランがない</li>
                <li>RLS（Row Level Security）の設定により表示されない</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {parks.map((park) => {
            const status = getDetailedOccupancyStatus(park.current_occupancy, park.max_capacity);
            const trend = getOccupancyTrend(park.id);
            const distance = userLocation
              ? calculateDistance(userLocation.lat, userLocation.lng, Number(park.latitude), Number(park.longitude))
              : null;
            
            // 施設貸し切り情報
            const rentalTimes = getParkRentals(park.id);
            const hasRentalsToday = rentalTimes && rentalTimes.length > 0;
            
            // メンテナンス情報
            const maintenance = maintenanceInfo[park.id];
            const isUnderMaintenance = maintenance !== undefined;
            
            // メンテナンス状態を判定
            let maintenanceStatus = null;
            if (maintenance) {
              const now = new Date();
              const startDate = new Date(maintenance.start_date);
              const endDate = new Date(maintenance.end_date);
              
              if (now >= startDate && now < endDate) {
                maintenanceStatus = 'active'; // 現在メンテナンス中
              } else if (now < startDate) {
                maintenanceStatus = 'scheduled'; // 今後のメンテナンス予定
              }
            }
            
            return (
              <Card key={park.id} className="overflow-hidden">
                {/* Park Image */}
                {park.image_url && (
                  <div className="relative h-56 mb-4 -m-6 mb-4">
                    <img
                      src={park.image_url}
                      alt={park.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // フォールバック画像を設定
                        e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                      }}
                    />
                    
                    {/* 混雑状況 - 画像下側中央に配置 */}
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    
                    {/* メンテナンス情報の表示 */}
                    {maintenanceStatus && maintenance && (
                      <div className="absolute top-2 left-2">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold text-white shadow-lg ${
                          maintenanceStatus === 'active' 
                            ? (maintenance.is_emergency ? 'bg-red-600' : 'bg-orange-600')
                            : 'bg-blue-600'
                        }`}>
                          {maintenanceStatus === 'active' 
                            ? (maintenance.is_emergency ? '緊急メンテナンス中' : 'メンテナンス中')
                            : 'メンテナンス予定'
                          }
                        </span>
                      </div>
                    )}
                    
                    {/* 本日貸し切りありの表示 */}
                    {!maintenanceStatus && hasRentalsToday && (
                      <div className="absolute top-2 left-2">
                        <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-orange-500 text-white shadow-lg">
                          本日貸し切りあり
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className={park.image_url ? 'px-6 pb-6' : ''}>
                  <h3 className="text-lg font-semibold mb-2">{park.name}</h3>
                  
                  {/* 距離表示 */}
                  {distance && (
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{distance.toFixed(1)}km</span>
                    </div>
                  )}
                  
                  {/* 混雑状況トレンド */}
                  {trend && (
                    <div className="flex items-center text-sm mb-3">
                      {trend === 'increasing' ? (
                        <TrendingUp className="w-4 h-4 mr-1 text-orange-500" />
                      ) : trend === 'decreasing' ? (
                        <TrendingDown className="w-4 h-4 mr-1 text-green-500" />
                      ) : null}
                      <span className="text-gray-600">
                        {trend === 'increasing' ? '混雑傾向' : 
                         trend === 'decreasing' ? '空いてきています' : ''}
                      </span>
                    </div>
                  )}
                  
                  {/* 現在の利用者数（リアルタイム） */}
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1 text-blue-600" />
                      <span className="text-gray-600">現在の利用者数</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`font-semibold ${
                        (park.current_occupancy / park.max_capacity) > 0.8 ? 'text-red-600' :
                        (park.current_occupancy / park.max_capacity) > 0.6 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {park.current_occupancy}/{park.max_capacity}
                      </span>
                    </div>
                  </div>
                  
                  {/* メンテナンス情報の詳細表示 */}
                  {maintenanceStatus && maintenance && (
                    <div className="bg-red-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">{maintenance.title}</span>
                      </div>
                      {maintenance.description && (
                        <p className="text-sm text-red-700 mb-2">{maintenance.description}</p>
                      )}
                      <div className="text-xs text-red-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(maintenance.start_date).toLocaleDateString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            〜
                            {new Date(maintenance.end_date).toLocaleDateString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs ${
                        maintenanceStatus === 'active'
                          ? (maintenance.is_emergency ? 'text-red-600' : 'text-orange-600')
                          : 'text-blue-600'
                      } mt-2`}>
                        {maintenanceStatus === 'active' 
                          ? '※メンテナンス期間中は利用できません'
                          : '※メンテナンス期間中は利用できません'
                        }
                      </p>
                    </div>
                  )}
                  
                  {/* 本日の貸し切り時間表示 */}
                  {!maintenanceStatus && hasRentalsToday && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">本日の貸し切り時間</span>
                      </div>
                      <div className="space-y-1">
                        {rentalTimes.map((time, index) => (
                          <div key={index} className="flex items-center text-xs text-orange-700">
                            <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span>{time.start}〜{time.end}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-orange-600 mt-2">※貸し切り時間中は通常利用できません</p>
                    </div>
                  )}
                  
                  {/* Dog Size Areas */}
                  <div className="flex items-center space-x-4">
                    {park.large_dog_area && (
                      <div className="flex items-center text-sm text-blue-600">
                        <Shield className="w-4 h-4 mr-1" />
                        <span>大型犬OK</span>
                      </div>
                    )}
                    {park.small_dog_area && (
                      <div className="flex items-center text-sm text-pink-600">
                        <Heart className="w-4 h-4 mr-1" />
                        <span>小型犬OK</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600">
                      <Coins className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">¥800/日</span>
                    </div>
                  </div>

                  {/* Private Booths */}
                  {park.private_booths && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-800">
                          プライベートブース
                        </span>
                        <span className="text-sm text-purple-600">
                          {park.private_booth_count}室
                        </span>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">
                        サブスク使い放題・1日券でも利用可能（追加料金なし）
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                      parking: '駐車場',
                      shower: 'シャワー設備',
                      restroom: 'トイレ',
                      agility: 'アジリティ設備',
                      rest_area: '休憩スペース',
                      water_station: '給水設備',
                    }).map(([key, label]) => (
                      park.facilities[key as keyof typeof park.facilities] && (
                        <div key={key} className="flex items-center text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 mr-1 text-green-600 flex-shrink-0" />
                          <span>{label}</span>
                        </div>
                      )
                    ))}
                  </div>

                  {park.facility_details && (
                    <p className="text-sm text-gray-600 border-t pt-3 line-clamp-2">
                      {park.facility_details}
                    </p>
                  )}

                  {/* ボタンを2列に配置 */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`/parks/${park.id}`}>
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        style={{
                          backgroundColor: 'white',
                          color: '#2563eb',
                          borderColor: '#d1d5db'
                        }}
                      >
                        詳細・レビュー
                      </Button>
                    </Link>
                    {maintenanceStatus === 'active' ? (
                      <Button 
                        className="w-full bg-gray-400 cursor-not-allowed" 
                        disabled
                        title="メンテナンス中のため予約できません"
                      >
                        予約不可
                      </Button>
                    ) : (
                      <Link to={`/parks/${park.id}/reserve`}>
                        <Button className="w-full">予約する</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}