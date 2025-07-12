import { ButtonHTMLAttributes, forwardRef, useId } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  tooltip?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  leftIcon,
  rightIcon,
  loadingText,
  ariaLabel,
  ariaDescribedBy,
  tooltip,
  ...props
}, ref) => {
  const loadingId = useId();
  
  const baseStyles = [
    'inline-flex items-center justify-center',
    'rounded-lg font-medium',
    'transition-all duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'active:scale-95',
    // レスポンシブ：タッチターゲットサイズを確保
    'min-h-[44px] sm:min-h-[40px]',
    // ダークモード対応の準備
    'dark:focus:ring-offset-gray-800'
  ].join(' ');
  
  const variants = {
    primary: [
      'bg-white text-blue-700 border-2 border-blue-700',
      'hover:bg-blue-50 disabled:bg-gray-100',
      'focus:ring-blue-600',
      'dark:bg-white dark:text-blue-700 dark:border-blue-700 dark:hover:bg-blue-50'
    ].join(' '),
    secondary: [
      'bg-gray-100 text-gray-700 border border-gray-300',
      'hover:bg-gray-200 disabled:bg-gray-50',
      'focus:ring-gray-500',
      'dark:bg-gray-100 dark:text-gray-700 dark:border-gray-300 dark:hover:bg-gray-200'
    ].join(' '),
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700 disabled:bg-red-400',
      'focus:ring-red-500',
      'dark:bg-red-600 dark:hover:bg-red-700'
    ].join(' '),
    success: [
      'bg-green-600 text-white',
      'hover:bg-green-700 disabled:bg-green-400',
      'focus:ring-green-500',
      'dark:bg-green-600 dark:hover:bg-green-700'
    ].join(' '),
    warning: [
      'bg-yellow-500 text-white',
      'hover:bg-yellow-600 disabled:bg-yellow-300',
      'focus:ring-yellow-500',
      'dark:bg-yellow-600 dark:hover:bg-yellow-700'
    ].join(' '),
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  // bg-*, text-*, hover:bg-* クラスを外部classNameから除去
  const filteredClassName = className
    .split(' ')
    .filter(
      (cls) =>
        !cls.startsWith('bg-') &&
        !cls.startsWith('text-') &&
        !cls.startsWith('hover:bg-') &&
        !cls.startsWith('focus:ring-')
    )
    .join(' ');

  // アクセシビリティ属性
  const accessibilityProps = {
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-busy': isLoading,
    'aria-live': isLoading ? 'polite' as const : undefined,
    title: tooltip,
  };

  // ローディング状態での読み上げテキスト
  const loadingAnnouncement = loadingText || `${typeof children === 'string' ? children : 'ボタン'}を処理中...`;

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${filteredClassName}`}
      disabled={isLoading || props.disabled}
      {...accessibilityProps}
      {...props}
    >
      {isLoading ? (
        <>
          <div 
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">
            {loadingText || children}
          </span>
          <span className="sr-only" aria-live="polite" id={loadingId}>
            {loadingAnnouncement}
          </span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <span className="truncate">{children}</span>
          {rightIcon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
