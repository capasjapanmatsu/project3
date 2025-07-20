import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/Button';
import { CategoryLegend } from '../components/park/CategoryLegend';
import { DogParkCard } from '../components/park/DogParkCard';
import { EmptyState } from '../components/park/EmptyState';
import { FacilityCard } from '../components/park/FacilityCard';
import { MapView } from '../components/park/MapView';
import { ViewTabs } from '../components/park/ViewTabs';
import { useFacilityData, useParkData } from '../hooks/useParkData';

const CATEGORY_LABELS: { [key: string]: string } = {
  'pet_hotel': 'ペットホテル',
  'pet_salon': 'ペットサロン',
  'veterinary': '動物病院',
  'pet_cafe': 'ペットカフェ',
  'pet_restaurant': 'ペット同伴レストラン',
  'pet_shop': 'ペットショップ',
  'pet_accommodation': 'ペット同伴宿泊'
};

export function DogParkList() {
  const [activeView, setActiveView] = useState<'dogparks' | 'facilities'>('dogparks');
  
  // カスタムフックを使用してデータ管理
  const { parks, isLoading, error, fetchParkData } = useParkData();
  const { facilities, facilitiesLoading, error: facilityError, fetchFacilities } = useFacilityData();

  useEffect(() => {
    if (activeView === 'dogparks') {
      fetchParkData();
    } else {
      fetchFacilities();
    }
  }, [activeView, fetchParkData, fetchFacilities]);

  // 手動更新
  const handleManualUpdate = () => {
    if (activeView === 'dogparks') {
      fetchParkData();
    } else {
      fetchFacilities();
    }
  };

  // ローディング状態
  const isCurrentlyLoading = activeView === 'dogparks' ? isLoading : facilitiesLoading;
  const currentError = activeView === 'dogparks' ? error : facilityError;

  if (isCurrentlyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (currentError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{currentError}</p>
          <Button onClick={handleManualUpdate} className="inline-flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            再試行
          </Button>
        </div>
      </div>
    );
  }

  const currentData = activeView === 'dogparks' ? parks : facilities;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
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
            <Button onClick={handleManualUpdate} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              更新
            </Button>
          </div>
        </div>
      </div>

      {/* ビュー切り替えタブ */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ViewTabs activeView={activeView} onViewChange={setActiveView} />
        </div>
      </div>

      {/* カテゴリ凡例（施設ビューの場合） */}
      {activeView === 'facilities' && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <CategoryLegend categories={CATEGORY_LABELS} />
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* リストビュー */}
          <div className="lg:col-span-2">
            {currentData.length === 0 ? (
              <EmptyState 
                title={activeView === 'dogparks' ? 'ドッグパークが見つかりません' : '施設が見つかりません'}
                description={activeView === 'dogparks' 
                  ? '近くにドッグパークがないか、現在準備中です。'
                  : '近くにペット施設がないか、現在準備中です。'
                }
              />
            ) : (
              <div className="space-y-6">
                {activeView === 'dogparks' 
                  ? parks.map((park) => (
                      <DogParkCard key={park.id} park={park} />
                    ))
                  : facilities.map((facility) => (
                      <FacilityCard key={facility.id} facility={facility} />
                    ))
                }
              </div>
            )}
          </div>

          {/* マップビュー */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <MapView 
                parks={activeView === 'dogparks' ? parks : []}
                facilities={activeView === 'facilities' ? facilities : []}
                activeView={activeView}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
        console.error('Error updating occupancy data:', error);
        return;
      }

      if (!data) return;

      // パークの混雑状況を更新
      setParks(currentParks =>
        currentParks.map(park => {
          const updatedPark = data.find(p => p.id === park.id);
          if (updatedPark) {
            // 履歴に追加
            const history = occupancyHistory[park.id] || [];
            const newHistory = [
              ...history,
              {
                timestamp: new Date().toISOString(),
                occupancy: updatedPark.current_occupancy ?? 0,
                maxCapacity: updatedPark.max_capacity ?? 0,
              },
            ].slice(-20); // 最新20件を保持

            setOccupancyHistory(prev => ({
              ...prev,
              [park.id]: newHistory,
            }));

            return { 
              ...park, 
              current_occupancy: updatedPark.current_occupancy ?? park.current_occupancy,
              max_capacity: updatedPark.max_capacity ?? park.max_capacity
            };
          }
          return park;
        })
      );
    } catch (error) {
      console.error('Error updating occupancy data:', error);
    }
  }, [occupancyHistory]);

  useEffect(() => {
    const fetchParks = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        // console.log('🔄 Fetching dog parks...');

        const { data, error } = await supabase
          .from('dog_parks')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        // console.log('📡 Supabase response:', { data, error });

        if (error) {
          console.error('❌ Error fetching dog parks:', error);
          setError(
            `データ取得エラー: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`
          );
          setIsLoading(false);
          return;
        }

        // console.log('✅ Fetched parks:', data?.length || 0, 'parks');
        // console.log('🏞️ Parks data:', data);

        // 現在地からの距離でソート
        if (userLocation && data) {
          // console.log('📍 Sorting by distance from user location:', userLocation);
          data.sort((a, b) => {
            const distA = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              Number(a.latitude) || 0,
              Number(a.longitude) || 0
            );
            const distB = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              Number(b.latitude) || 0,
              Number(b.longitude) || 0
            );
            return distA - distB;
          });
        }

        setParks(data || []);
        // console.log('🎯 Parks state updated:', data?.length || 0, 'parks');

        if (!data || data.length === 0) {
          // console.log('⚠️ No parks found in database');
          setError('表示できるドッグランがありません。データベースの内容を確認してください。');
        } else {
          // console.log('✅ Successfully loaded parks');
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
        }

        // パークIDごとに予約をグループ化
        const rentalsByParkId: Record<string, Reservation[]> = {};
        (rentalsData || []).forEach((rental) => {
          if (rental && typeof rental === 'object' && 'park_id' in rental && rental.park_id) {
            const parkId = rental.park_id as string;
            if (!rentalsByParkId[parkId]) {
              rentalsByParkId[parkId] = [];
            }
            rentalsByParkId[parkId].push(rental as Reservation);
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
          // console.log('Fetched maintenance:', maintenanceData);
          const maintenanceByParkId: Record<string, MaintenanceInfo> = {};
          (maintenanceData || []).forEach(maintenance => {
            if (!maintenance || typeof maintenance !== 'object') return;
            
            // 現在進行中のメンテナンスまたは最も近い今後のメンテナンスを優先
            const now = new Date();
            const startDate = new Date(maintenance.start_date as string);
            const endDate = new Date(maintenance.end_date as string);

            // 現在進行中または今後のメンテナンス
            if (endDate > now && maintenance.park_id) {
              const parkId = maintenance.park_id as string;
              // 既存のメンテナンス情報がない場合、または現在進行中のメンテナンスの場合は上書き
              if (
                !maintenanceByParkId[parkId] ||
                (startDate <= now && endDate > now)
              ) {
                maintenanceByParkId[parkId] = {
                  id: parkId,
                  title: maintenance.title as string || '',
                  description: maintenance.description as string || '',
                  start_date: maintenance.start_date as string,
                  end_date: maintenance.end_date as string,
                  is_emergency: Boolean(maintenance.is_emergency),
                };
              }
            }
          });
          setMaintenanceInfo(maintenanceByParkId);
        }
      } catch (error) {
        console.error('Error in fetchParks:', error);
        console.error('Error details:', error);
        setError(`データ取得エラー: ${(error as Error).message || 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchParks();
    void fetchPetFacilities();

    // リアルタイムで混雑状況を更新（Supabase Realtime）
    const subscription = supabase
      .channel('dog_parks_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dog_parks',
        },
        payload => {
          // console.log('Real-time update received:', payload);
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            setParks(currentParks =>
              currentParks.map(park =>
                park.id === payload.new.id ? { 
                  ...park, 
                  current_occupancy: payload.new.current_occupancy ?? park.current_occupancy,
                  max_capacity: payload.new.max_capacity ?? park.max_capacity
                } : park
              )
            );

            // 履歴に追加
            const now = new Date();
            setOccupancyHistory(prev => {
              const parkId = payload.new.id as string;
              const history = prev[parkId] || [];
              const newHistory = [
                ...history,
                {
                  timestamp: now.toISOString(),
                  occupancy: payload.new.current_occupancy ?? 0,
                  maxCapacity: payload.new.max_capacity ?? 0,
              },
            ].slice(-20);

              return {
                ...prev,
                [parkId]: newHistory,
              };
            });
          }
        }
      )
      .subscribe();

    // 定期的な更新を開始
    updateIntervalRef.current = setInterval(() => {
      void updateOccupancyData();
    }, UPDATE_INTERVAL);

    return () => {
      void subscription.unsubscribe();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [userLocation, updateOccupancyData]);

  // 手動更新は必要に応じて追加可能
  // const _handleManualUpdate = () => {
  //   void updateOccupancyData();
  // };

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
    if (percentage < 25)
      return {
        text: '空いています',
        color: 'text-green-600 bg-green-100',
        barColor: 'bg-green-500',
        description: '快適に利用できます',
        emoji: '😊',
      };
    if (percentage < 50)
      return {
        text: 'やや空いています',
        color: 'text-blue-600 bg-blue-100',
        barColor: 'bg-blue-500',
        description: '適度な混雑です',
        emoji: '🙂',
      };
    if (percentage < 75)
      return {
        text: 'やや混んでいます',
        color: 'text-yellow-600 bg-yellow-100',
        barColor: 'bg-yellow-500',
        description: '少し混雑しています',
        emoji: '😐',
      };
    return {
      text: '混んでいます',
      color: 'text-red-600 bg-red-100',
      barColor: 'bg-red-500',
      description: '大変混雑しています',
      emoji: '😰',
    };
  };

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    const initMap = async () => {
      // Google Maps APIキーの確認
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

      if (!apiKey) {
        setMapError(
          'Google Maps APIキーが設定されていません。環境変数VITE_GOOGLE_MAPS_API_KEYを設定してください。'
        );
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
            position: { lat: Number(park.latitude || 0), lng: Number(park.longitude || 0) },
            map,
            title: park.name,
            icon: {
              url: `https://maps.google.com/mapfiles/ms/icons/${markerColor}-dot.png`,
            },
          });

          // 星評価のHTML生成
          const starsHtml = Array.from(
            { length: 5 },
            (_, i) =>
              `<span style="color: ${
                i < Math.round(park.average_rating || 0) ? '#fbbf24' : '#d1d5db'
              };">★</span>`
          ).join('');

          // 施設貸し切り情報
          const parkRentals = facilityRentals[park.id] || [];
          let rentalInfoHtml = '';
          if (parkRentals.length > 0) {
            rentalInfoHtml = `
              <div style="margin-top: 8px; padding: 8px; background-color: #fef3c7; border-radius: 4px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: bold;">🔒 本日の施設貸し切り</p>
                ${parkRentals
                  .map(
                    rental => `
                  <p style="margin: 0; font-size: 12px; color: #92400e;">
                    ${rental.start_time} - ${rental.end_time}
                  </p>
                `
                  )
                  .join('')}
              </div>
            `;
          }

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; max-width: 300px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${park.name}</h3>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                  ${starsHtml}
                  <span style="margin-left: 4px; font-size: 12px; color: #666;">${(
                    park.average_rating || 0
                  ).toFixed(1)} (${park.review_count || 0}件)</span>
                </div>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">${park.address}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;">通常利用: ¥800/日</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;">施設貸し切り: ¥4,400/時間</p>
                ${
                  park.private_booths
                    ? `<p style="margin: 0 0 4px 0; font-size: 14px;">プライベートブース: サブスク使い放題・1日券でも利用可能</p>`
                    : ''
                }
                <p style="margin: 0 0 8px 0; font-size: 14px;">${status.text} (${
              park.current_occupancy || 0
            }/${park.max_capacity || 0})</p>
                ${rentalInfoHtml}
                <a href="/parks/${
                  park.id
                }" style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; margin-top: 8px;">詳細を見る</a>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // ペット関連施設のマーカーを表示
        petFacilities.forEach(facility => {
          // 座標が設定されている施設のみ表示
          if (!facility.latitude || !facility.longitude) return;

          const categoryInfo =
            FACILITY_LUCIDE_ICONS[facility.category as keyof typeof FACILITY_LUCIDE_ICONS] ||
            FACILITY_LUCIDE_ICONS.other;

          // Tailwindカラークラスを実際のカラーコードに変換
          const getColorCode = (colorClass: string) => {
            if (colorClass.includes('red')) return '#dc2626';
            if (colorClass.includes('amber')) return '#d97706';
            if (colorClass.includes('orange')) return '#ea580c';
            if (colorClass.includes('blue')) return '#2563eb';
            if (colorClass.includes('green')) return '#16a34a';
            return '#6b7280'; // gray fallback
          };

          // カテゴリ別のマーカーアイコンを設定
          let markerIcon;
          switch (facility.category) {
            case 'veterinary':
              markerIcon = {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              };
              break;
            case 'pet_cafe':
              markerIcon = {
                url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
              };
              break;
            case 'pet_restaurant':
              markerIcon = {
                url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
              };
              break;
            case 'pet_shop':
              markerIcon = {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              };
              break;
            case 'pet_accommodation':
              markerIcon = {
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              };
              break;
            default:
              markerIcon = {
                url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
              };
          }

          const facilityMarker = new google.maps.Marker({
            position: { lat: Number(facility.latitude || 0), lng: Number(facility.longitude || 0) },
            map,
            title: facility.name,
            icon: markerIcon,
          });

          const facilityInfoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; max-width: 300px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${
                  facility.name
                }</h3>
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; background-color: ${getColorCode(
                    categoryInfo.color
                  )}"></span>
                  <span style="font-size: 14px; color: #666;">${categoryInfo.label}</span>
                </div>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">${facility.address}</p>
                ${
                  facility.phone
                    ? `<p style="margin: 0 0 4px 0; font-size: 14px;">📞 ${facility.phone}</p>`
                    : ''
                }
                ${
                  facility.website
                    ? `<p style="margin: 0 0 4px 0; font-size: 14px;"><a href="${facility.website}" target="_blank" style="color: #2563eb;">🌐 公式サイト</a></p>`
                    : ''
                }
                ${
                  facility.description
                    ? `<p style="margin: 8px 0; font-size: 13px; color: #555; max-height: 60px; overflow: hidden;">${facility.description}</p>`
                    : ''
                }
                <a href="/facilities/${
                  facility.id
                }" style="display: inline-block; padding: 8px 16px; background-color: ${getColorCode(
              categoryInfo.color
            )}; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; margin-top: 8px;">詳細を見る</a>
              </div>
            `,
          });

          facilityMarker.addListener('click', () => {
            facilityInfoWindow.open(map, facilityMarker);
          });

          markersRef.current.push(facilityMarker);
        });

        setMapError('');
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapError(
          'Google Mapsの読み込みに失敗しました。APIキーが正しく設定されているか確認してください。'
        );
      }
    };

    void initMap();
  }, [userLocation, parks, facilityRentals, petFacilities]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 地球の半径（km）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 施設貸し切り予約の表示用に整形
  const getParkRentals = (parkId: string) => {
    const rentals = facilityRentals[parkId] || [];
    if (rentals.length === 0) return null;

    // 時間帯ごとにグループ化
    const rentalTimes: { start: string; end: string }[] = [];
    rentals.forEach(rental => {
      const startHour = parseInt(rental.start_time);
      const endHour = startHour + rental.duration;
      rentalTimes.push({
        start: `${startHour.toString().padStart(2, '0')}:00`,
        end: `${endHour.toString().padStart(2, '0')}:00`,
      });
    });

    return rentalTimes;
  };

  useEffect(() => {
    // タイムアウト（10秒）
    const timeout = setTimeout(() => {
      if (isLoading) {
        setTimedOut(true);
        setError(
          'タイムアウト: サーバーから応答がありません。ネットワークやRLS設定を再確認してください。'
        );
        setIsLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  // ペット関連施設を取得する関数
  const fetchPetFacilities = async () => {
    try {
      // console.log('Fetching pet facilities...');

      const { data, error } = await supabase
        .from('pet_facilities')
        .select(
          `
          *,
          facility_categories(name, name_ja)
        `
        )
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pet facilities:', error);
        throw error;
      }

      // console.log('Fetched pet facilities:', data);
      // console.log('Number of pet facilities:', data?.length || 0);

      // カテゴリ情報を正規化
      const facilitiesWithCategory =
        data?.map(facility => {
          // category_idからカテゴリタイプを決定
          let categoryType = 'other';
          if (facility && typeof facility === 'object' && 'category_id' in facility && facility.category_id) {
            // カテゴリIDに基づいてタイプを決定（実際のスキーマに合わせて調整）
            const categoryId = String(facility.category_id);
            switch (categoryId) {
              case 'veterinary':
              case '1':
                categoryType = 'veterinary';
                break;
              case 'pet_cafe':
              case '2':
                categoryType = 'pet_cafe';
                break;
              case 'pet_restaurant':
              case '3':
                categoryType = 'pet_restaurant';
                break;
              case 'pet_shop':
              case '4':
                categoryType = 'pet_shop';
                break;
              case 'pet_accommodation':
              case '5':
                categoryType = 'pet_accommodation';
                break;
              default:
                categoryType = 'other';
            }
          }

          return {
            ...facility,
            category: categoryType,
          };
        }) || [];

      setPetFacilities(facilitiesWithCategory);
    } catch (error) {
      console.error('Error in fetchPetFacilities:', error);
    }
  };

  // Googleマップリンクを生成する関数
  const generateGoogleMapsLink = (address: string, name: string) => {
    const encodedQuery = encodeURIComponent(`${name} ${address}`);
    return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  };

  // 開発環境でのみデバッグ情報を出力
  if (import.meta.env.DEV) {
    console.warn('DogParkList render - states:', { isLoading, error, timedOut });
  }

  if (isLoading && !timedOut) {
    // 開発環境でのみデバッグ情報を出力
    if (import.meta.env.DEV) {
      console.warn('🔄 Showing loading screen');
    }
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
    // 開発環境でのみデバッグ情報を出力
    if (import.meta.env.DEV) {
      console.warn('❌ Showing error screen:', error);
    }
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
            <p>
              <strong>考えられる原因:</strong>
            </p>
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
              onClick={() => {
                setError(null);
                setIsLoading(true);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 開発環境でのみデバッグ情報を出力
  if (import.meta.env.DEV) {
    console.warn(
      '✅ Showing main content with parks:',
      parks.length,
      'facilities:',
      petFacilities.length
    );
  }

  return (
    <div className="space-y-6">
      {/* タブナビゲーション */}
      <div className="bg-white border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('dogparks')}
            className={`py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'dogparks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            ドッグラン一覧
          </button>
          <button
            onClick={() => setActiveTab('facilities')}
            className={`py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'facilities'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            その他施設
          </button>
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'dogparks' && (
        <>
          {/* ドッグラン利用案内 */}
          {/* <Card className="bg-green-50 border-green-200">
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-green-900 mb-2">
                🐕 ドッグランをご利用いただけます
              </h2>
              <p className="text-green-800 mb-3">
                以下のドッグランは審査を通過し、安全にご利用いただけます。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-sm font-medium text-green-800">ドッグランを選択</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-sm font-medium text-green-800">混雑状況を確認</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <span className="text-sm font-medium text-green-800">予約・決済</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <span className="text-sm font-medium text-green-800">ドッグランで遊ぶ</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">リアルタイム混雑情報</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">地図で場所を確認</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">利用者レビュー</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card> */}

          {/* <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">承認済みドッグラン一覧</h1>

        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
          </div>
          <button
            onClick={handleManualUpdate}
            disabled={isUpdating}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isUpdating
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? '更新中...' : '更新'}</span>
          </button>
        </div>
      </div> */}

          {/* <div className="bg-blue-50 p-4 rounded-lg">
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
      </div> */}

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
            {/* マップ凡例 */}
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">マップ凡例</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* 現在地 */}
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-400 rounded-full border-2 border-white shadow"></div>
                  <span>現在地</span>
                </div>
                {/* ドッグラン凡例 */}
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>ドッグラン（空いている）</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>ドッグラン（やや空いている）</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>ドッグラン（やや混んでいる）</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>ドッグラン（混んでいる）</span>
                </div>
                {/* ペット施設凡例 */}
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span>動物病院</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>ペットカフェ・レストラン</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span>ペットショップ</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <span>ペット同伴宿泊</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <span>その他施設</span>
                </div>
              </div>
            </div>

            {mapError ? (
              <div className="w-full h-[400px] bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
                <div className="text-center p-6">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">地図を表示できません</p>
                  <p className="text-sm text-red-600">{mapError}</p>
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-left">
                    <p className="text-sm text-yellow-800">
                      <strong>解決方法:</strong>
                      <br />
                      1. .envファイルにVITE_GOOGLE_MAPS_API_KEY=your_api_keyを追加
                      <br />
                      2. Google Cloud ConsoleでMaps JavaScript APIを有効化
                      <br />
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
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  ドッグランが見つかりません
                </h3>
                <p className="text-yellow-700 mb-4">現在表示できるドッグランがありません。</p>

                <div className="space-y-2 text-sm text-yellow-600">
                  <p>
                    <strong>考えられる原因:</strong>
                  </p>
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
              {parks.map(park => {
                const status = getDetailedOccupancyStatus(
                  park.current_occupancy,
                  park.max_capacity
                );
                const trend = getOccupancyTrend(park.id);
                const distance = userLocation
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      Number(park.latitude || 0),
                      Number(park.longitude || 0)
                    )
                  : null;

                // 施設貸し切り情報
                const rentalTimes = getParkRentals(park.id);
                const hasRentalsToday = rentalTimes && rentalTimes.length > 0;

                // メンテナンス情報
                const maintenance = maintenanceInfo[park.id];
                const _isUnderMaintenance = maintenance !== undefined;

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
                      <div className="relative h-56 -m-6 mb-4">
                        <img
                          src={park.image_url}
                          alt={park.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={e => {
                            // より安全なフォールバック画像を設定
                            console.warn('Image loading failed for:', park.image_url);
                            e.currentTarget.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTI1SDIyNVYxNzVIMTc1VjEyNVoiIGZpbGw9IiNkMWQ1ZGIiLz4KPHBhdGggZD0iTTE4NyAxMzdIMjEzVjE0OUgxODdWMTM3WiIgZmlsbD0iIzllYTNhOCIvPgo8L3N2Zz4K';
                          }}
                        />

                        {/* 混雑状況 - 画像下側中央に配置 */}
                        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
                          <span
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </div>

                        {/* メンテナンス情報の表示 */}
                        {maintenanceStatus && maintenance && (
                          <div className="absolute top-2 left-2">
                            <span
                              className={`px-3 py-1.5 rounded-full text-sm font-semibold text-white shadow-lg ${
                                maintenanceStatus === 'active'
                                  ? maintenance.is_emergency
                                    ? 'bg-red-600'
                                    : 'bg-orange-600'
                                  : 'bg-blue-600'
                              }`}
                            >
                              {maintenanceStatus === 'active'
                                ? maintenance.is_emergency
                                  ? '緊急メンテナンス中'
                                  : 'メンテナンス中'
                                : 'メンテナンス予定'}
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
                            {trend === 'increasing'
                              ? '混雑傾向'
                              : trend === 'decreasing'
                              ? '空いてきています'
                              : ''}
                          </span>
                        </div>
                      )}

                      {/* 現在の利用者数（リアルタイム） */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm text-gray-600">現在の利用者数</p>
                          <p className="text-lg font-semibold">
                            {park.current_occupancy || 0}/{park.max_capacity || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              (park.current_occupancy || 0) / (park.max_capacity || 1) > 0.8
                                ? 'bg-red-100 text-red-800'
                                : (park.current_occupancy || 0) / (park.max_capacity || 1) > 0.6
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {park.current_occupancy || 0}/{park.max_capacity || 0}
                          </div>
                        </div>
                      </div>

                      {/* メンテナンス情報の詳細表示 */}
                      {maintenanceStatus && maintenance && (
                        <div className="bg-red-50 p-3 rounded-lg mb-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-800">
                              {maintenance.title}
                            </span>
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
                                  minute: '2-digit',
                                })}
                                〜
                                {new Date(maintenance.end_date).toLocaleDateString('ja-JP', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                          <p
                            className={`text-xs ${
                              maintenanceStatus === 'active'
                                ? maintenance.is_emergency
                                  ? 'text-red-600'
                                  : 'text-orange-600'
                                : 'text-blue-600'
                            } mt-2`}
                          >
                            {maintenanceStatus === 'active'
                              ? '※メンテナンス期間中は利用できません'
                              : '※メンテナンス期間中は利用できません'}
                          </p>
                        </div>
                      )}

                      {/* 本日の貸し切り時間表示 */}
                      {!maintenanceStatus && hasRentalsToday && (
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">
                              本日の貸し切り時間
                            </span>
                          </div>
                          <div className="space-y-1">
                            {rentalTimes.map((time, index) => (
                              <div
                                key={index}
                                className="flex items-center text-xs text-orange-700"
                              >
                                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span>
                                  {time.start}〜{time.end}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-orange-600 mt-2">
                            ※貸し切り時間中は通常利用できません
                          </p>
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
                        }).map(
                          ([key, label]) =>
                            park.facilities[key as keyof typeof park.facilities] && (
                              <div key={key} className="flex items-center text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 mr-1 text-green-600 flex-shrink-0" />
                                <span>{label}</span>
                              </div>
                            )
                        )}
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
                              borderColor: '#d1d5db',
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
        </>
      )}

      {/* ペット関連施設タブ */}
      {activeTab === 'facilities' && (
        <>
          {/* 施設カテゴリーアイコン説明 */}
          <Card className="mb-6">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">施設カテゴリー</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(FACILITY_LUCIDE_ICONS).map(
                  ([category, { icon: Icon, label, color }]) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Icon className={`w-5 h-5 ${color}`} />
                      <span className="text-sm text-gray-700">{label}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </Card>

          {/* ペット関連施設一覧 */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {petFacilities.map(facility => {
              const categoryInfo =
                FACILITY_LUCIDE_ICONS[facility.category as keyof typeof FACILITY_LUCIDE_ICONS] ||
                FACILITY_LUCIDE_ICONS.other;
              const Icon = categoryInfo.icon;

              return (
                <Card
                  key={facility.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-6 h-6 ${categoryInfo.color}`} />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{facility.name}</h3>
                          <span className={`text-sm ${categoryInfo.color} font-medium`}>
                            {categoryInfo.label}
                          </span>
                        </div>
                      </div>
                      <a
                        href={generateGoogleMapsLink(facility.address, facility.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
                        title="Googleマップで表示"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm">MAP</span>
                      </a>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{facility.address}</span>
                      </div>

                      {facility.phone && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">📞</span>
                          <span className="text-sm text-gray-600">{facility.phone}</span>
                        </div>
                      )}

                      {facility.website && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">🌐</span>
                          <a
                            href={facility.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 underline"
                          >
                            公式サイト
                          </a>
                        </div>
                      )}

                      {facility.description && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600 line-clamp-3">
                            {facility.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {petFacilities.length === 0 && (
            <Card className="p-6 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ペット関連施設がありません
              </h3>
              <p className="text-gray-600">現在登録されているペット関連施設はありません。</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
