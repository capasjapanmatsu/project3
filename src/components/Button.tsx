import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
  ...props
}, ref) => {
  const baseStyles = 'rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-400 focus:ring-blue-600',
    secondary: 'bg-white text-blue-700 border border-blue-700 hover:bg-blue-50 disabled:bg-gray-100 focus:ring-blue-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 focus:ring-green-500',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 disabled:bg-yellow-300 focus:ring-yellow-500',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  // bg-*, text-*, hover:bg-* クラスを外部classNameから除去
  const filteredClassName = className
    .split(' ')
    .filter(
      (cls) =>
        !cls.startsWith('bg-') &&
        !cls.startsWith('text-') &&
        !cls.startsWith('hover:bg-')
    )
    .join(' ');

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${filteredClassName} ${isLoading ? 'relative' : ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">読み込み中...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </div>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
