import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  Tag, 
  ChevronRight, 
  AlertTriangle, 
  Bell, 
  Megaphone,
  Search,
  MapPin
} from 'lucide-react';
import Card from '../components/Card';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import type { NewsAnnouncement, NewParkOpening } from '../types';

export function News() {
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
  const [newParks, setNewParks] = useState<NewParkOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      
      // 新着情報を取得
      const { data: newsData, error: newsError } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (newsError) throw newsError;
      
      // 新規オープンのドッグランを取得
      const { data: parksData, error: parksError } = await supabase
        .from('new_park_openings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (parksError) throw parksError;
      
      setNews(newsData || []);
      setNewParks(parksData || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('新着情報の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      news: 'お知らせ',
      announcement: '重要なお知らせ',
      sale: 'セール情報'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      news: 'bg-blue-100 text-blue-800',
      announcement: 'bg-red-100 text-red-800',
      sale: 'bg-green-100 text-green-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // フィルタリングされたニュースとパーク
  const filteredNews = news.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const filteredParks = newParks.filter(park => 
    park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    park.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 全てのアイテムを日付順に並べる
  const allItems = [
    ...filteredNews.map(item => ({
      ...item,
      type: 'news' as const,
      date: item.created_at
    })),
    ...filteredParks.map(item => ({
      ...item,
      type: 'park' as const,
      date: item.created_at
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 flex items-center">
        <Bell className="w-8 h-8 text-blue-600 mr-3" />
        新着情報
      </h1>

      {/* 検索・フィルター */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <Input
            label=""
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="タイトル、内容で検索..."
            icon={<Search className="w-4 h-4 text-gray-500" />}
          />
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべてのカテゴリー</option>
            <option value="news">お知らせ</option>
            <option value="announcement">重要なお知らせ</option>
            <option value="sale">セール情報</option>
          </select>
        </div>
      </div>

      {/* カテゴリータブ */}
      <div className="flex space-x-2 overflow-x-auto pb-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>すべて</span>
        </button>
        <button
          onClick={() => setSelectedCategory('news')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === 'news'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>お知らせ</span>
        </button>
        <button
          onClick={() => setSelectedCategory('announcement')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === 'announcement'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>重要なお知らせ</span>
        </button>
        <button
          onClick={() => setSelectedCategory('sale')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === 'sale'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>セール情報</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {allItems.length === 0 ? (
        <Card className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">新着情報はありません</h2>
          <p className="text-gray-500">
            現在、表示できる新着情報はありません。
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {allItems.map((item) => {
            if (item.type === 'news') {
              // ニュース・お知らせの表示
              const newsItem = item as NewsAnnouncement;
              return (
                <Link key={`news-${newsItem.id}`} to={`/news/${newsItem.id}`}>
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getCategoryColor(newsItem.category)}`}>
                            {getCategoryIcon(newsItem.category)}
                            <span>{getCategoryLabel(newsItem.category)}</span>
                          </span>
                          {newsItem.is_important && (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                              重要
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{newsItem.title}</h3>
                        <p className="text-gray-600 line-clamp-2">{newsItem.content}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center text-gray-500 text-sm mb-2">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{formatDate(newsItem.created_at)}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            } else if (item.type === 'park') {
              // 新規オープンの表示
              const parkItem = item as NewParkOpening;
              return (
                <Link key={`park-${parkItem.id}`} to={`/news/park/${parkItem.id}`}>
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>新規オープン</span>
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{parkItem.name}</h3>
                        <p className="text-gray-600 mb-2">{parkItem.address}</p>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>オープン予定: {formatDate(parkItem.opening_date)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center text-gray-500 text-sm mb-2">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{formatDate(parkItem.created_at)}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}