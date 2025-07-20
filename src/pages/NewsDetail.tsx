import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Tag, 
  AlertTriangle, 
  FileText, 
  Megaphone,
  ExternalLink,
  MapPin,
  Building
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import type { NewsAnnouncement } from '../types';

export function NewsDetail() {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsAnnouncement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (newsId) {
      fetchNewsDetail();
    }
  }, [newsId]);

  const fetchNewsDetail = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('news_announcements')
        .select('*')
        .eq('id', newsId)
        .single();
      
      if (error) throw error;
      
      setNews(data);
    } catch (error) {
      console.error('Error fetching news detail:', error);
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
        return <FileText className="w-4 h-4" />;
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/news" className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            新着情報一覧に戻る
          </Link>
        </div>
        
        <Card className="p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-4">
            {error || 'お知らせが見つかりませんでした'}
          </h2>
          <Button onClick={() => navigate('/news')}>
            新着情報一覧に戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/news" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          新着情報一覧に戻る
        </Link>
      </div>
      
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getCategoryColor(news.category)}`}>
            {getCategoryIcon(news.category)}
            <span className="ml-1">{getCategoryLabel(news.category)}</span>
          </span>
          {news.is_important && (
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              重要
            </span>
          )}
          <div className="flex items-center text-gray-500 text-sm ml-auto">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(news.created_at)}</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-6">{news.title}</h1>
        
        {news.image_url && (
          <div className="mb-6">
            <img 
              src={news.image_url} 
              alt={news.title} 
              className="w-full h-auto rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
              }}
            />
          </div>
        )}
        
        <div className="prose max-w-none mb-6">
          {news.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4">{paragraph}</p>
          ))}
        </div>
        
        {news.link_url && (
          <div className="mt-6">
            <a 
              href={news.link_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
              詳細を見る
              <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </div>
        )}
        
        {news.park_id && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <Building className="w-5 h-5 text-blue-600 mr-2" />
              関連施設
            </h3>
            <Link 
              to={`/parks/${news.park_id}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mt-2"
            >
              <MapPin className="w-4 h-4 mr-1" />
              施設詳細を見る
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
