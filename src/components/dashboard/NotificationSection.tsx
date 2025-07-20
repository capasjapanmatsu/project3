import React from 'react';
import { Bell, Check, AlertCircle, X, Calendar, MessageCircle, Building, CheckCircle } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import { NotificationCard } from './NotificationCard';
import type { Notification } from '../../types';

interface NotificationSectionProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({
  notifications,
  onMarkAsRead,
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reservation':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'message':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'park_approval':
        return <Building className="w-4 h-4 text-purple-600" />;
      case 'vaccine_approval':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          通知
          {notifications.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
              {notifications.length}
            </span>
          )}
        </h2>
        {notifications.length > 0 && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              notifications.forEach(notification => {
                onMarkAsRead(notification.id);
              });
            }}
          >
            <Check className="w-4 h-4 mr-2" />
            すべて既読にする
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🔔</div>
          <p className="text-lg font-medium mb-2">新しい通知はありません</p>
          <p className="text-sm">
            最新の情報やお知らせがあるとここに表示されます
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {notification.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(notification.created_at).toLocaleString('ja-JP')}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default NotificationSection; 
