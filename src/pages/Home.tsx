import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Heart, 
  Shield, 
  CheckCircle, 
  Coins, 
  Key, 
  ShoppingBag, 
  FileText, 
  Star, 
  Building, 
  Crown, 
  ArrowRight, 
  Plus, 
  Mail,
  Bell,
  Megaphone,
  PawPrint,
  AlertCircle,
  Wifi,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, handleSupabaseError, testSupabaseConnection, safeSupabaseQuery } from '../utils/supabase';
import Card from '../components/Card';
import Button from '../components/Button';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionButton } from '../components/SubscriptionButton';
import type { DogPark, NewsAnnouncement, NewParkOpening, Dog } from '../types';

export function Home() {
  const { user, profile } = useAuth();
  const [parks, setParks] = useState<DogPark[]>([]);
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
  const [newParks, setNewParks] = useState<NewParkOpening[]>([]);
  const [recentDogs, setRecentDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { isActive: hasSubscription } = useSubscription();

  // Test Supabase connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await testSupabaseConnection();
      setConnectionTested(true);
      if (!isConnected) {
        setNetworkError('Supabaseサーバーに接続できません。ネットワーク接続とSupabaseサービスの状態を確認してください。');
        setIsOffline(true);
      }
    };
    
    checkConnection();
  }, []);

  useEffect(() => {
    if (user) {
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
    }
  }, [user]);

  useEffect(() => {
    if (user && userLocation && connectionTested && !isOffline) {
      fetchNearbyParks();
    }
  }, [user, userLocation, connectionTested, isOffline]);

  useEffect(() => {
    if (connectionTested && !isOffline) {
      fetchNews();
      fetchRecentDogs();
    }
  }, [connectionTested, isOffline]);

  const fetchNearbyParks = async () => {
    setIsLoading(true);
    setNetworkError(null);
    
    const { data, error, isOffline: queryOffline } = await safeSupabaseQuery(
      () => supabase
        .from('dog_parks')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(6),
      []
    );

    if (queryOffline) {
      setIsOffline(true);
      setNetworkError('オフラインモードです。ネットワーク接続を確認してください。');
    } else if (error) {
      const errorMessage = handleSupabaseError(error);
      setNetworkError(errorMessage);
    } else if (data) {
      // 現在地からの距離でソート
      data.sort((a, b) => {
        const distA = calculateDistance(userLocation!.lat, userLocation!.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation!.lat, userLocation!.lng, b.latitude, b.longitude);
        return distA - distB;
      });
      setParks(data);
    }
    
    setIsLoading(false);
  };

  const fetchNews = async () => {
    setNetworkError(null);
    
    // 新着情報を取得
    const { data: newsData, error: newsError, isOffline: newsOffline } = await safeSupabaseQuery(
      () => supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3),
      []
    );
    
    // 新規オープンのドッグランを取得
    const { data: parksData, error: parksError, isOffline: parksOffline } = await safeSupabaseQuery(
      () => supabase
        .from('new_park_openings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3),
      []
    );
    
    if (newsOffline || parksOffline) {
      setIsOffline(true);
      setNetworkError('オフラインモードです。ネットワーク接続を確認してください。');
    } else {
      if (newsError) {
        const errorMessage = handleSupabaseError(newsError);
        setNetworkError(errorMessage);
      }
      if (parksError) {
        const errorMessage = handleSupabaseError(parksError);
        setNetworkError(errorMessage);
      }
    }
    
    setNews(newsData || []);
    setNewParks(parksData || []);
  };

  const fetchRecentDogs = async () => {
    setNetworkError(null);
    
    const { data, error, isOffline: queryOffline } = await safeSupabaseQuery(
      () => supabase
        .from('dogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5),
      []
    );
    
    if (queryOffline) {
      setIsOffline(true);
      setNetworkError('オフラインモードです。ネットワーク接続を確認してください。');
    } else if (error) {
      const errorMessage = handleSupabaseError(error);
      setNetworkError(errorMessage);
    } else {
      setRecentDogs(data || []);
    }
  };

  const retryConnection = async () => {
    setNetworkError(null);
    setIsOffline(false);
    setConnectionTested(false);
    
    // Test connection again
    const isConnected = await testSupabaseConnection();
    setConnectionTested(true);
    
    if (isConnected) {
      setIsOffline(false);
      // Retry fetching data
      fetchNews();
      fetchRecentDogs();
      if (user && userLocation) {
        fetchNearbyParks();
      }
    } else {
      setIsOffline(true);
      setNetworkError('Supabaseサーバーに接続できません。以下をご確認ください：\n• インターネット接続\n• ファイアウォール設定\n• Supabaseサービスの状態');
    }
  };

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'news':
        return <FileText className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      case 'sale':
        return <Tag className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      news: 'bg-blue-100 text-blue-800',
      announcement: 'bg-red-100 text-red-800',
      sale: 'bg-green-100 text-green-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      news: 'お知らせ',
      announcement: '重要なお知らせ',
      sale: 'セール情報'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Network error component
  const NetworkErrorBanner = () => (
    <div className={`border rounded-lg p-4 mb-6 ${isOffline ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isOffline ? (
            <WifiOff className="w-6 h-6 text-orange-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <h3 className={`font-medium ${isOffline ? 'text-orange-800' : 'text-red-800'}`}>
              {isOffline ? 'オフラインモード' : '接続エラー'}
            </h3>
            <p className={`text-sm whitespace-pre-line ${isOffline ? 'text-orange-700' : 'text-red-700'}`}>
              {networkError}
            </p>
          </div>
        </div>
        <Button 
          onClick={retryConnection}
          size="sm"
          className={`${isOffline ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          再接続
        </Button>
      </div>
    </div>
  );

  // Offline indicator for data sections
  const OfflineDataIndicator = ({ message }: { message: string }) => (
    <Card className="p-4">
      <div className="text-center text-gray-500">
        <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{message}</p>
        <Button 
          onClick={retryConnection}
          size="sm"
          variant="secondary"
          className="mt-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          再接続
        </Button>
      </div>
    </Card>
  );

  if (!user) {
    // 未ログインユーザー向けの表示
    return (
      <div className="space-y-12">
        {networkError && <NetworkErrorBanner />}
        
        <section className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            愛犬とのお散歩を、もっと楽しく
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            近くのドッグランを見つけて、新しい出会いを見つけましょう
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/register"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              無料で始める
            </Link>
            <Link
              to="/magic-link"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Magic Linkで簡単ログイン
            </Link>
          </div>
        </section>

        {/* 最近登録されたワンちゃん */}
        <section className="bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <div className="relative">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <PawPrint className="w-6 h-6 text-blue-600 mr-2" />
                最近仲間入りしました！
              </h2>
              <div className="absolute -top-10 -left-16">
                <div className="bg-yellow-100 rounded-full px-4 py-2 text-yellow-800 font-bold transform -rotate-12">
                  New
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {!isOffline && recentDogs.length > 0 ? (
              recentDogs.map((dog, index) => (
                <div key={dog.id} className="text-center">
                  <div className="bg-white rounded-lg overflow-hidden shadow-md mb-2">
                    <img 
                      src={dog.image_url || `https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=300`} 
                      alt={dog.name} 
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/58997/pexels-photo-58997.jpeg?auto=compress&cs=tinysrgb&w=300';
                      }}
                    />
                  </div>
                  <p className="font-medium text-gray-900">{dog.breed}</p>
                </div>
              ))
            ) : (
              // Fallback content when data can't be loaded or offline
              Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white rounded-lg overflow-hidden shadow-md mb-2">
                    <img 
                      src={`https://images.pexels.com/photos/${[58997, 5731866, 45170, 1805164, 2023384][index]}/pexels-photo-${[58997, 5731866, 45170, 1805164, 2023384][index]}.jpeg?auto=compress&cs=tinysrgb&w=300`}
                      alt={['ポメラニアン', 'トイ・プードル', 'スコティッシュストレート', 'ミニチュア・シュナウザー', 'MIX（ハーフ）'][index]}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                  <p className="font-medium text-gray-900">{['ポメラニアン', 'トイ・プードル', 'スコティッシュストレート', 'ミニチュア・シュナウザー', 'MIX（ハーフ）'][index]}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 新着情報セクション */}
        <section className="bg-blue-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Bell className="w-6 h-6 text-blue-600 mr-2" />
              新着情報
            </h2>
            <Link to="/news" className="text-blue-600 hover:text-blue-800 flex items-center">
              すべて見る
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 新着情報 */}
            <div className="space-y-4">
              {!isOffline && news.length > 0 ? (
                news.slice(0, 2).map((item) => (
                  <Link key={item.id} to={`/news/${item.id}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getCategoryColor(item.category)}`}>
                              {getCategoryIcon(item.category)}
                              <span className="ml-1">{getCategoryLabel(item.category)}</span>
                            </span>
                            {item.is_important && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                重要
                              </span>
                            )}
                          </div>
                          <h3 className="font-medium line-clamp-1">{item.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(item.created_at)}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                <OfflineDataIndicator message={isOffline ? "オフライン：新着情報を読み込めません" : "新着情報を読み込み中..."} />
              )}
            </div>
            
            {/* 新規オープン */}
            <div className="space-y-4">
              {!isOffline && newParks.length > 0 ? (
                newParks.slice(0, 2).map((park) => (
                  <Link key={park.id} to={`/news/park/${park.id}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                              <Building className="w-3 h-3 mr-1" />
                              新規オープン
                            </span>
                          </div>
                          <h3 className="font-medium line-clamp-1">{park.name}がオープンしました</h3>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(park.created_at)}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Card>
                  </Link>
                ))
              ) : (
                <OfflineDataIndicator message={isOffline ? "オフライン：新規オープン情報を読み込めません" : "新規オープン情報を読み込み中..."} />
              )}
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Link to="/news">
              <Button variant="secondary">
                すべての新着情報を見る
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        {/* ドッグランオーナー募集バナー（未ログインユーザー向け） */}
        <section className="relative overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white p-8 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Building className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center">
                    <Crown className="w-6 h-6 mr-2" />
                    ドッグランオーナー募集中！
                  </h2>
                  <p className="text-lg opacity-90">
                    あなたの土地をドッグランとして活用しませんか？収益化のチャンスです
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Link to="/register">
                  <Button className="bg-white hover:bg-gray-100 text-purple-700 font-bold px-6 py-3 text-lg shadow-md">
                    <Plus className="w-5 h-5 mr-2" />
                    オーナー登録
                  </Button>
                </Link>
                <p className="text-sm opacity-80 mt-2">初期費用無料・サポート充実</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          </div>
        </section>

        {/* 利用ルールへのリンク */}
        <section className="bg-blue-50 p-6 rounded-lg">
          <div className="text-center">
            <h2 className="text-xl font-bold text-blue-900 mb-4">ご利用前に必ずお読みください</h2>
            <p className="text-blue-800 mb-4">
              安全で楽しいドッグラン利用のため、利用ルールをご確認ください
            </p>
            <Link to="/parks/rules">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" />
                ドッグラン利用ルールを確認
              </Button>
            </Link>
          </div>
        </section>

        {/* 料金体系の説明 */}
        <section className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">料金体系</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-white rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">通常利用</h3>
              <p className="text-2xl font-bold text-blue-600 mb-2">¥800</p>
              <p className="text-sm text-gray-600">1日利用（時間制限なし）</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border-2 border-blue-500">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">サブスクリプション</h3>
              <p className="text-2xl font-bold text-blue-600 mb-2">¥3,800</p>
              <p className="text-sm text-gray-600">月額（どこでも使い放題）</p>
              <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">おすすめ</span>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">施設貸し切り</h3>
              <p className="text-2xl font-bold text-blue-600 mb-2">¥4,400</p>
              <p className="text-sm text-gray-600">1時間（人数制限なし）</p>
              <p className="text-xs text-blue-600">※前日までの予約が必要</p>
            </div>
          </div>
        </section>

        {/* ボーダーコリーが走っている背景セクション */}
        <section 
          className="py-16 rounded-lg overflow-hidden" 
          style={{
            backgroundImage: "url('https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            position: "relative"
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="relative z-10 text-center text-white max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold mb-4">愛犬と一緒に最高の時間を</h2>
            <p className="text-xl mb-8">
              全国のドッグランが使い放題のサブスクリプションで、いつでもどこでも愛犬と楽しい時間を過ごしましょう
            </p>
            <Link to="/register">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3">
                今すぐ始める
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-8 mt-12">
          <Link to="/parks" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
            <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-2">簡単検索</h3>
            <p className="text-gray-600">
              お近くのドッグランを簡単に見つけることができます
            </p>
          </Link>
          <Link to="/login" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
            <Users className="h-12 w-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-2">コミュニティ</h3>
            <p className="text-gray-600">
              愛犬家同士で交流を深めることができます
            </p>
          </Link>
          <Link to="/login" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
            <Calendar className="h-12 w-12 text-orange-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-2">予約管理</h3>
            <p className="text-gray-600">
              施設の予約をオンラインで簡単に管理
            </p>
          </Link>
          <Link to="/login" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
            <ShoppingBag className="h-12 w-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-semibold mb-2">ペットショップ</h3>
            <p className="text-gray-600">
              ペット用品をワンタッチで簡単注文
            </p>
          </Link>
        </section>

        {/* Magic Link説明セクション */}
        <section className="bg-purple-50 p-6 rounded-lg">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-6">
              <h2 className="text-2xl font-bold text-purple-900 mb-4">Magic Linkで簡単ログイン</h2>
              <p className="text-purple-800 mb-4">
                パスワードを覚える必要なし！メールに届くリンクをクリックするだけで、安全・簡単にログインできます。
              </p>
              <ul className="text-purple-700 space-y-2 mb-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>パスワード不要でセキュリティ向上</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>メールアドレスだけで簡単ログイン</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>パスワードを忘れる心配なし</span>
                </li>
              </ul>
              <Link to="/magic-link">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Magic Linkでログイン
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md w-full md:w-1/3">
              <div className="text-center">
                <Mail className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">簡単3ステップ</h3>
                <ol className="text-left text-gray-700 space-y-3">
                  <li className="flex items-center">
                    <span className="w-6 h-6 bg-purple-100 rounded-full text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">1</span>
                    <span>メールアドレスを入力</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-6 h-6 bg-purple-100 rounded-full text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">2</span>
                    <span>メールに届いたリンクをクリック</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-6 h-6 bg-purple-100 rounded-full text-purple-600 flex items-center justify-center mr-2 flex-shrink-0">3</span>
                    <span>自動的にログイン完了！</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ログインユーザー向けの表示
  return (
    <div className="space-y-8">
      {networkError && <NetworkErrorBanner />}
      
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            こんにちは、{profile?.name || 'ユーザー'}さん
          </h1>
          <p className="text-gray-600">ドッグパークJPへようこそ</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/access-control">
            <Button className="bg-green-600 hover:bg-green-700">
              <Key className="w-4 h-4 mr-2" />
              入退場
            </Button>
          </Link>
        </div>
      </div>

      {/* サブスクリプション状況 */}
      {hasSubscription ? (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-semibold">サブスクリプション会員</h3>
                <p className="text-sm opacity-90">全国のドッグラン使い放題 + ペットショップ10%OFF</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">月額</p>
              <p className="text-2xl font-bold">¥3,800</p>
              <Link to="/subscription">
                <Button size="sm" className="mt-2 bg-white text-purple-600 hover:bg-gray-100 hover:text-gray-900">
                  詳細を見る
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-semibold">サブスクリプションでもっとお得に！</h3>
                <p className="text-sm opacity-90">月額3,800円で全国のドッグラン使い放題</p>
              </div>
            </div>
            <SubscriptionButton hasSubscription={hasSubscription} className="bg-white text-purple-600 hover:bg-gray-100" />
          </div>
        </Card>
      )}

      {/* 最近登録されたワンちゃん */}
      <section className="bg-gray-50 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <PawPrint className="w-6 h-6 text-blue-600 mr-2" />
              最近仲間入りしました！
            </h2>
            <div className="absolute -top-10 -left-16">
              <div className="bg-yellow-100 rounded-full px-4 py-2 text-yellow-800 font-bold transform -rotate-12">
                New
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="bg-white rounded-lg overflow-hidden shadow-md mb-2">
              <img 
                src="/image.png" 
                alt="ポメラニアン" 
                className="w-full h-40 object-cover"
              />
            </div>
            <p className="font-medium text-gray-900">ポメラニアン</p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-lg overflow-hidden shadow-md mb-2">
              <img 
                src="https://images.pexels.com/photos/5731866/pexels-photo-5731866.jpeg?auto=compress&cs=tinysrgb&w=300" 
                alt="トイ・プードル" 
                className="w-full h-40 object-cover"
              />
            </div>
            <p className="font-medium text-gray-900">トイ・プードル</p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-lg overflow-hidden shadow-md mb-2">
              <img 
                src="https://images.pexels.com/photos/45170/kittens-cat-cat-puppy-rush-45170.jpeg?auto=compress&cs=tinysrgb&w=300" 
                alt="スコティッシュストレート" 
                className="w-full h-40 object-cover"
              />
            </div>
            <p className="font-medium text-gray-900">スコティッシュストレート</p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-lg overflow-hidden shadow-md mb-2">
              <img 
                src="https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?auto=compress&cs=tinysrgb&w=300" 
                alt="ミニチュア・シュナウザー" 
                className="w-full h-40 object-cover"
              />
            </div>
            <p className="font-medium text-gray-900">ミニチュア・シュナウザー</p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-lg overflow-hidden shadow-md mb-2">
              <img 
                src="https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg?auto=compress&cs=tinysrgb&w=300" 
                alt="MIX（ハーフ）" 
                className="w-full h-40 object-cover"
              />
            </div>
            <p className="font-medium text-gray-900">MIX（ハーフ）</p>
          </div>
        </div>
      </section>

      {/* 新着情報セクション */}
      <section className="bg-blue-50 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Bell className="w-6 h-6 text-blue-600 mr-2" />
            新着情報
          </h2>
          <Link to="/news" className="text-blue-600 hover:text-blue-800 flex items-center">
            すべて見る
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 新着情報 */}
          <div className="space-y-4">
            {!isOffline && news.length > 0 ? (
              news.slice(0, 2).map((item) => (
                <Link key={item.id} to={`/news/${item.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getCategoryColor(item.category)}`}>
                            {getCategoryIcon(item.category)}
                            <span className="ml-1">{getCategoryLabel(item.category)}</span>
                          </span>
                          {item.is_important && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              重要
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium line-clamp-1">{item.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(item.created_at)}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <OfflineDataIndicator message={isOffline ? "オフライン：新着情報を読み込めません" : "新着情報を読み込み中..."} />
            )}
          </div>
          
          {/* 新規オープン */}
          <div className="space-y-4">
            {!isOffline && newParks.length > 0 ? (
              newParks.slice(0, 2).map((park) => (
                <Link key={park.id} to={`/news/park/${park.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <Building className="w-3 h-3 mr-1" />
                            新規オープン
                          </span>
                        </div>
                        <h3 className="font-medium line-clamp-1">{park.name}がオープンしました</h3>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(park.created_at)}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <OfflineDataIndicator message={isOffline ? "オフライン：新規オープン情報を読み込めません" : "新規オープン情報を読み込み中..."} />
            )}
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <Link to="/news">
            <Button variant="secondary">
              すべての新着情報を見る
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ドッグランオーナー募集バナー（ログインユーザー向け） */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white p-8 rounded-xl shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Building className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <Crown className="w-6 h-6 mr-2" />
                  ドッグランオーナー募集中！
                </h2>
                <p className="text-lg opacity-90">
                  あなたの土地をドッグランとして活用しませんか？収益化のチャンスです
                </p>
              </div>
            </div>
            <div className="text-right">
              <Link to="/register-park">
                <Button className="bg-white text-purple-700 hover:bg-gray-100 hover:text-gray-900 font-bold px-6 py-3 shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  ドッグラン登録
                </Button>
              </Link>
              <p className="text-sm opacity-80 mt-2">初期費用無料</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        </div>
      </section>

      {/* ボーダーコリーが走っている背景セクション */}
      <section 
        className="py-16 rounded-lg overflow-hidden" 
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          position: "relative"
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 text-center text-white max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">愛犬と一緒に最高の時間を</h2>
          <p className="text-xl mb-8">
            全国のドッグランが使い放題のサブスクリプションで、いつでもどこでも愛犬と楽しい時間を過ごしましょう
          </p>
          <SubscriptionButton 
            hasSubscription={hasSubscription}
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
          />
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-8 mt-12">
        <Link to="/parks" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
          <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold mb-2">簡単検索</h3>
          <p className="text-gray-600">
            お近くのドッグランを簡単に見つけることができます
          </p>
        </Link>
        <Link to="/community" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
          <Users className="h-12 w-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold mb-2">コミュニティ</h3>
          <p className="text-gray-600">
            愛犬家同士で交流を深めることができます
          </p>
        </Link>
        <Link to="/dashboard" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
          <Calendar className="h-12 w-12 text-orange-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold mb-2">予約管理</h3>
          <p className="text-gray-600">
            施設の予約をオンラインで簡単に管理
          </p>
        </Link>
        <Link to="/shop" className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
          <ShoppingBag className="h-12 w-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold mb-2">ペットショップ</h3>
          <p className="text-gray-600">
            ペット用品をワンタッチで簡単注文
          </p>
        </Link>
      </section>
    </div>
  );
}

function Tag({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
      <line x1="7" y1="7" x2="7.01" y2="7"></line>
    </svg>
  );
}