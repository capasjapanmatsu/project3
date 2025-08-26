// framer-motionを外して初期TBTを削減。CSSトランジションで代替
import { Loader } from 'lucide-react';
import { ReactNode } from 'react';
// import { buttonVariants } from '../utils/animations';
import { triggerHapticFeedback } from '../utils/hapticFeedback';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  isFullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  enableHaptics?: boolean; // 新機能：ハプティックフィードバック有効/無効
  hapticType?: 'light' | 'medium' | 'heavy'; // 新機能：ハプティックの強さ
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  id?: string;
  name?: string;
  value?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  title?: string;
  tabIndex?: number;
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  isFullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  enableHaptics = true,
  hapticType = 'light',
  onClick,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) => {
  // ベーススタイル
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-lg',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
    'select-none',
    // アニメーション準備
    'transform',
    'active:scale-95'
  ];

  // バリアントスタイル
  const variantClasses = {
    primary: [
      'bg-blue-600',
      'text-white',
      'hover:bg-blue-700',
      'focus:ring-blue-500',
      'shadow-sm',
      'hover:shadow-md'
    ],
    secondary: [
      'bg-gray-600',
      'text-white',
      'hover:bg-gray-700',
      'focus:ring-gray-500',
      'shadow-sm',
      'hover:shadow-md'
    ],
    danger: [
      'bg-red-600',
      'text-white',
      'hover:bg-red-700',
      'focus:ring-red-500',
      'shadow-sm',
      'hover:shadow-md'
    ],
    outline: [
      'bg-transparent',
      'text-gray-700',
      'border-2',
      'border-gray-300',
      'hover:bg-gray-50',
      'hover:border-gray-400',
      'focus:ring-gray-500'
    ],
    ghost: [
      'bg-transparent',
      'text-gray-600',
      'hover:bg-gray-100',
      'hover:text-gray-900',
      'focus:ring-gray-500'
    ]
  };

  // サイズスタイル
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm', 'gap-1.5'],
    md: ['px-4', 'py-2', 'text-sm', 'gap-2'],
    lg: ['px-6', 'py-3', 'text-base', 'gap-2'],
    xl: ['px-8', 'py-4', 'text-lg', 'gap-3']
  };

  // 幅スタイル
  const widthClasses = isFullWidth ? ['w-full'] : [];

  // すべてのクラスを結合
  const buttonClasses = [
    ...baseClasses,
    ...variantClasses[variant],
    ...sizeClasses[size],
    ...widthClasses,
    className
  ].join(' ');

  // ハプティックフィードバック付きクリックハンドラー
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // ハプティックフィードバックの実行
    if (enableHaptics && !disabled && !isLoading) {
      try {
        await triggerHapticFeedback(hapticType);
      } catch (error) {
        // ハプティックフィードバックが失敗してもボタン動作は続行
        console.debug('Haptic feedback failed:', error);
      }
    }

    // 元のクリックハンドラーを呼び出し
    if (onClick && !disabled && !isLoading) {
      onClick(event);
    }
  };

  // ローディング時のコンテンツ
  const loadingContent = (
    <>
      <Loader className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : size === 'xl' ? 24 : 16} />
      {loadingText || 'Loading...'}
    </>
  );

  // 通常時のコンテンツ
  const normalContent = (
    <>
      {leftIcon}
      {children}
      {rightIcon}
    </>
  );

  return (
    <button
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || isLoading}
      type={type}
      {...(props as any)}
    >
      {isLoading ? loadingContent : normalContent}
    </button>
  );
};

export default Button;
