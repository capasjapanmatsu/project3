export interface NotificationOptions {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationInstance {
  id: string;
  options: NotificationOptions;
  createdAt: Date;
}

class NotificationManager {
  private notifications: NotificationInstance[] = [];
  private listeners: Set<(notifications: NotificationInstance[]) => void> = new Set();
  private idCounter = 0;

  show(options: NotificationOptions): string {
    const id = `notification-${++this.idCounter}`;
    const notification: NotificationInstance = {
      id,
      options: {
        type: 'info',
        duration: 4000,
        position: 'top-right',
        closable: true,
        ...options
      },
      createdAt: new Date()
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration
    if (notification.options.duration && notification.options.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, notification.options.duration);
    }

    return id;
  }

  success(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      message,
      type: 'success',
      ...options
    });
  }

  error(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      message,
      type: 'error',
      duration: 6000, // Longer duration for errors
      ...options
    });
  }

  warning(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      message,
      type: 'warning',
      duration: 5000,
      ...options
    });
  }

  info(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      message,
      type: 'info',
      ...options
    });
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  clear(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  getNotifications(): NotificationInstance[] {
    return [...this.notifications];
  }

  subscribe(listener: (notifications: NotificationInstance[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.notifications]);
    });
  }
}

// Create singleton instance
export const notificationManager = new NotificationManager();

// Convenience functions to replace alert()
export const notify = {
  success: (message: string, options?: Partial<NotificationOptions>) => 
    notificationManager.success(message, options),
  
  error: (message: string, options?: Partial<NotificationOptions>) => 
    notificationManager.error(message, options),
  
  warning: (message: string, options?: Partial<NotificationOptions>) => 
    notificationManager.warning(message, options),
  
  info: (message: string, options?: Partial<NotificationOptions>) => 
    notificationManager.info(message, options),
  
  show: (options: NotificationOptions) => 
    notificationManager.show(options)
};

// Replace alert() with modern notification
export const modernAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
  notify[type](message);
};

// Development-only: replace window.alert in development
if (import.meta.env.DEV) {
  const originalAlert = window.alert;
  window.alert = (message: string) => {
    console.warn('⚠️ alert() is deprecated. Use notify() instead.');
    notify.info(message);
    return originalAlert(message);
  };
} 
