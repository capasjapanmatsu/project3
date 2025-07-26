import { motion } from 'framer-motion';
import React from 'react';

// ✨ Skeleton Loading Components
export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-scale-in">
    <div className="animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  </div>
);

// 🏠 ページ全体のSkeleton UI
export const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 animate-fade-in">
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー部分 */}
      <div className="mb-8 animate-slide-up">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      
      {/* メインコンテンツ */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-scale-in" style={{ animationDelay: `${i * 100}ms` }}>
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 🛒 ショップ専用Skeleton UI
export const ShopSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 animate-fade-in">
    <div className="container mx-auto px-4 py-6">
      {/* ショップヘッダー */}
      <div className="mb-6 animate-slide-up">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      
      {/* 商品グリッド */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-scale-in" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 🔐 ダッシュボード専用Skeleton UI
export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 animate-fade-in">
    <div className="container mx-auto px-4 py-6">
      {/* ダッシュボードヘッダー */}
      <div className="mb-8 animate-slide-up">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      
      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-scale-in" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-12 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* メインコンテンツ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-scale-in" style={{ animationDelay: `${(i + 3) * 120}ms` }}>
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ✨ Progressive Loading with animations
export const ProgressiveLoader: React.FC<{ 
  message?: string; 
  progress?: number;
  showProgress?: boolean;
}> = ({ 
  message = 'データを読み込み中...', 
  progress = 0, 
  showProgress = false 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="min-h-[200px] flex items-center justify-center"
  >
    <div className="text-center max-w-md mx-auto">
      {/* Animated Loading Icon */}
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 2, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.5, repeat: Infinity }
        }}
        className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
      />
      
      {/* Message */}
      <motion.h3 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-lg font-medium text-gray-800 mb-2"
      >
        {message}
      </motion.h3>
      
      {/* Progress Bar */}
      {showProgress && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5 }}
            className="bg-blue-600 h-full rounded-full"
          />
        </motion.div>
      )}
      
      {/* Loading Dots */}
      <motion.div 
        className="flex justify-center space-x-1 mt-4"
        initial="initial"
        animate="animate"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-blue-600 rounded-full"
            variants={{
              initial: { y: 0 },
              animate: {
                y: [-4, 0],
                transition: {
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.2
                }
              }
            }}
          />
        ))}
      </motion.div>
    </div>
  </motion.div>
);

// ✨ Smart Error States
export const SmartErrorState: React.FC<{
  error: string;
  onRetry?: () => void;
  showDetails?: boolean;
}> = ({ error, onRetry, showDetails = false }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="min-h-[300px] flex items-center justify-center p-6"
  >
    <div className="text-center max-w-md">
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </motion.div>
      
      {/* Error Message */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-medium text-gray-800 mb-2"
      >
        エラーが発生しました
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 mb-6"
      >
        {showDetails ? error : '申し訳ありませんが、問題が発生しました。'}
      </motion.p>
      
      {/* Action Buttons */}
      {onRetry && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          再試行する
        </motion.button>
      )}
    </div>
  </motion.div>
);

// ✨ Empty State with call-to-action
export const EmptyState: React.FC<{
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, message, actionLabel, onAction, icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="min-h-[400px] flex items-center justify-center p-6"
  >
    <div className="text-center max-w-md">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        {icon || (
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </motion.div>
      
      {/* Title & Message */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-medium text-gray-800 mb-2"
      >
        {title}
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 mb-6"
      >
        {message}
      </motion.p>
      
      {/* Action Button */}
      {actionLabel && onAction && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center space-x-2"
        >
          <span>{actionLabel}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </motion.button>
      )}
    </div>
  </motion.div>
);

export default {
  SkeletonCard,
  PageSkeleton,
  DashboardSkeleton,
  ShopSkeleton,
  ProgressiveLoader,
  SmartErrorState,
  EmptyState
}; 
