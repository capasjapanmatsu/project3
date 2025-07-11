import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, FileText, Megaphone, Tag, ArrowRight, WifiOff, RefreshCw } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import type { NewsAnnouncement } from '../../types';

interface NewsSectionProps {
  news: NewsAnnouncement[];
  isOffline: boolean;
  onRetryConnection: () => void;
}

export const NewsSection: React.FC<NewsSectionProps> = ({
  news,
  isOffline,
  onRetryConnection,
}) => {
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

  const OfflineDataIndicator = ({ message }: { message: string }) => (
    <Card className="p-4">
      <div className="text-center text-gray-500">
        <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>{message}</p>
        <Button 
          onClick={onRetryConnection}
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

  return (
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
      
      <div className="space-y-4">
        {!isOffline && news.length > 0 ? (
          news.slice(0, 3).map((item) => (
            <Link key={item.id} to={`/news/${item.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
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
                    <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                    {item.content && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.content}</p>
                    )}
                    <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-4" />
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <OfflineDataIndicator message={isOffline ? "オフライン：新着情報を読み込めません" : "新着情報を読み込み中..."} />
        )}
      </div>
      
      <div className="mt-6 text-center">
        <Link to="/news">
          <Button variant="secondary">
            すべての新着情報を見る
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default NewsSection; 