import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Users, Coins, CheckCircle, Heart, Shield, Star, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import type { DogPark, Reservation } from '../types';

export function DogParkList() {
  const [parks, setParks] = useState<DogPark[]>([]);
  const [facilityRentals, setFacilityRentals] = useState<Record<string, Reservation[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

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

  useEffect(() => {
    const fetchParks = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching dog parks...');
        
        const { data, error } = await supabase
          .from('dog_parks')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching dog parks:', error);
          throw error;
        }
        
        console.log('Fetched parks:', data);
        
        // 現在地からの距離でソート
        if (userLocation && data) {
          data.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
            const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
            return distA - distB;
          });
        }
        
        setParks(data || []);

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
          throw rentalsError;
        }
        
        // パークIDごとに予約をグループ化
        const rentalsByParkId: Record<string, Reservation[]> = {};
        (rentalsData || []).forEach(rental => {
          if (!rentalsByParkId[rental.park_id]) {
            rentalsByParkId[rental.park_id] = [];
          }
          rentalsByParkId[rental.park_id].push(rental);
        });
        
        setFacilityRentals(rentalsByParkId);
      } catch (error) {
        console.error('Error fetching dog parks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParks();

    // リアルタイムで混雑状況を更新
    const subscription = supabase
      .channel('dog_parks_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'dog_parks',
      }, payload => {
        setParks(currentParks => 
          currentParks.map(park => 
            park.id === payload.new.id ? { ...park, ...payload.new } : park
          )
        );
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userLocation]);

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
          const status = getOccupancyStatus(park.current_occupancy, park.max_capacity);
          
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
            
            rentalTimes.forEach((time, index) => {
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
                ${park.private_booths ? `<p style="margin: 0 0 4px 0; font-size: 14px;">プライベートブース: ¥5,000/2時間</p>` : ''}
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

  const getOccupancyStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    
    // 4段階で表示
    if (percentage < 25) return { text: '空いています', color: 'text-green-600 bg-green-100' };
    if (percentage < 50) return { text: 'やや空いています', color: 'text-blue-600 bg-blue-100' };
    if (percentage < 75) return { text: 'やや混んでいます', color: 'text-yellow-600 bg-yellow-100' };
    return { text: '混んでいます', color: 'text-red-600 bg-red-100' };
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ドッグラン一覧</h1>
      
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parks.map((park) => {
          const status = getOccupancyStatus(park.current_occupancy, park.max_capacity);
          const distance = userLocation
            ? calculateDistance(userLocation.lat, userLocation.lng, Number(park.latitude), Number(park.longitude))
            : null;
          
          // 施設貸し切り情報
          const rentalTimes = getParkRentals(park.id);
          const hasRentalsToday = rentalTimes && rentalTimes.length > 0;
          
          return (
            <Card key={park.id} className="overflow-hidden">
              {/* Park Image */}
              {park.image_url && (
                <div className="relative h-48 mb-4 -m-6 mb-4">
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
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                  
                  {/* 本日貸し切りありの表示 */}
                  {hasRentalsToday && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 rounded-full text-sm font-medium bg-orange-500 text-white">
                        本日貸し切りあり
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className={park.image_url ? 'px-6 pb-6' : ''}>
                <h3 className="text-lg font-semibold mb-2">{park.name}</h3>
                
                {/* ★評価表示 - 施設名の直下に配置 */}
                <div className="flex items-center space-x-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(park.average_rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm font-medium text-gray-900">
                    {park.average_rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({park.review_count}件)
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">{park.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm truncate">{park.address}</span>
                  </div>
                  {distance !== null && (
                    <p className="text-xs text-gray-500">
                      現在地から約{Math.round(distance * 10) / 10}km
                    </p>
                  )}
                  
                  {/* 本日の貸し切り時間表示 */}
                  {hasRentalsToday && (
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
                      <Users className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {park.current_occupancy}/{park.max_capacity}人
                      </span>
                    </div>
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
                        ¥5,000/2時間（人数制限なし）
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
                      <Button variant="secondary" className="w-full">
                        詳細・レビュー
                      </Button>
                    </Link>
                    <Link to={`/parks/${park.id}/reserve`}>
                      <Button className="w-full">予約する</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}