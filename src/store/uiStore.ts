import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface Modal {
  id: string;
  type: 'confirm' | 'info' | 'custom';
  title: string;
  content: string | React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIState {
  // Loading states
  isGlobalLoading: boolean;
  loadingTasks: Set<string>;
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  activeModal: Modal | null;
  
  // Navigation
  isMenuOpen: boolean;
  activeTab: string;
  
  // Theme
  theme: 'light' | 'dark';
  
  // Device info
  isMobile: boolean;
  isTablet: boolean;
  
  // Actions
  setGlobalLoading: (loading: boolean) => void;
  addLoadingTask: (taskId: string) => void;
  removeLoadingTask: (taskId: string) => void;
  
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  showModal: (modal: Omit<Modal, 'id'>) => void;
  hideModal: () => void;
  
  setMenuOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  setDeviceType: (isMobile: boolean, isTablet: boolean) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isGlobalLoading: false,
      loadingTasks: new Set(),
      notifications: [],
      activeModal: null,
      isMenuOpen: false,
      activeTab: '',
      theme: 'light',
      isMobile: false,
      isTablet: false,

      // Loading management
      setGlobalLoading: (loading) =>
        set({ isGlobalLoading: loading }, false, 'setGlobalLoading'),

      addLoadingTask: (taskId) =>
        set(
          (state) => ({
            loadingTasks: new Set([...state.loadingTasks, taskId]),
            isGlobalLoading: true,
          }),
          false,
          'addLoadingTask'
        ),

      removeLoadingTask: (taskId) =>
        set(
          (state) => {
            const newTasks = new Set(state.loadingTasks);
            newTasks.delete(taskId);
            return {
              loadingTasks: newTasks,
              isGlobalLoading: newTasks.size > 0,
            };
          },
          false,
          'removeLoadingTask'
        ),

      // Notification management
      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification = { ...notification, id };

        set(
          (state) => ({
            notifications: [...state.notifications, newNotification],
          }),
          false,
          'addNotification'
        );

        // Auto-remove notification after duration
        const duration = notification.duration || 5000;
        setTimeout(() => {
          get().removeNotification(id);
        }, duration);
      },

      removeNotification: (id) =>
        set(
          (state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          }),
          false,
          'removeNotification'
        ),

      clearNotifications: () =>
        set({ notifications: [] }, false, 'clearNotifications'),

      // Modal management
      showModal: (modal) => {
        const id = Date.now().toString();
        set(
          { activeModal: { ...modal, id } },
          false,
          'showModal'
        );
      },

      hideModal: () =>
        set({ activeModal: null }, false, 'hideModal'),

      // Navigation
      setMenuOpen: (open) =>
        set({ isMenuOpen: open }, false, 'setMenuOpen'),

      setActiveTab: (tab) =>
        set({ activeTab: tab }, false, 'setActiveTab'),

      // Theme management
      setTheme: (theme) => {
        set({ theme }, false, 'setTheme');
        // Apply theme to document
        document.documentElement.className = theme;
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Device detection
      setDeviceType: (isMobile, isTablet) =>
        set({ isMobile, isTablet }, false, 'setDeviceType'),
    }),
    { name: 'ui-store' }
  )
);

// Helper functions for common notifications
export const useNotifications = () => {
  const addNotification = useUIStore((state) => state.addNotification);

  return {
    success: (title: string, message: string) =>
      addNotification({ type: 'success', title, message }),
    
    error: (title: string, message: string) =>
      addNotification({ type: 'error', title, message, duration: 8000 }),
    
    warning: (title: string, message: string) =>
      addNotification({ type: 'warning', title, message, duration: 6000 }),
    
    info: (title: string, message: string) =>
      addNotification({ type: 'info', title, message }),
  };
};

// Helper hook for loading states
export const useLoading = () => {
  const addLoadingTask = useUIStore((state) => state.addLoadingTask);
  const removeLoadingTask = useUIStore((state) => state.removeLoadingTask);

  return {
    withLoading: async <T>(taskId: string, asyncFn: () => Promise<T>): Promise<T> => {
      addLoadingTask(taskId);
      try {
        const result = await asyncFn();
        return result;
      } finally {
        removeLoadingTask(taskId);
      }
    },
  };
}; 