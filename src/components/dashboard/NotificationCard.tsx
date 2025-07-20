import { Bell, UserPlus, UserCheck, Calendar, AlertTriangle } from 'lucide-react';
import type { Notification } from '../../types';

interface NotificationCardProps {
  notification: Notification;
  onRead?: (id: string) => void;
}

export function NotificationCard({ notification, onRead }: NotificationCardProps) {
  const icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type);
  
  return (
    <div 
      className={`p-3 ${notification.read ? '' : 'border-l-4 border-blue-500'} ${color}`}
      onClick={() => !notification.read && onRead && onRead(notification.id)}
    >
      <div className="flex items-start space-x-3">
        {icon}
        <div className="flex-1">
          <h3 className="font-semibold">{notification.title}</h3>
          <p className="text-sm text-gray-700">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(notification.created_at).toLocaleDateString('ja-JP')} {new Date(notification.created_at).toLocaleTimeString('ja-JP')}
          </p>
        </div>
        {!notification.read && (
          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            新着
          </div>
        )}
      </div>
    </div>
  );
}

export function getNotificationIcon(type: string) {
  switch (type) {
    case 'friend_request':
      return <UserPlus className="w-5 h-5 text-blue-600" />;
    case 'friend_accepted':
      return <UserCheck className="w-5 h-5 text-green-600" />;
    case 'friend_at_park':
      return <UserCheck className="w-5 h-5 text-purple-600" />;
    case 'reservation_reminder':
      return <Calendar className="w-5 h-5 text-orange-600" />;
    case 'blacklisted_dog_nearby':
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    default:
      return <Bell className="w-5 h-5 text-gray-600" />;
  }
}

export function getNotificationColor(type: string) {
  switch (type) {
    case 'friend_request':
      return 'bg-blue-50';
    case 'friend_accepted':
      return 'bg-green-50';
    case 'friend_at_park':
      return 'bg-purple-50';
    case 'reservation_reminder':
      return 'bg-orange-50';
    case 'blacklisted_dog_nearby':
      return 'bg-red-50';
    default:
      return 'bg-gray-50';
  }
}
