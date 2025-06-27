import { ReactNode, forwardRef } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  border?: boolean;
  hoverEffect?: boolean;
  as?: React.ElementType;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  className = '',
  onClick,
  elevation = 'md',
  rounded = 'lg',
  border = false,
  hoverEffect = false,
  as: Component = 'div',
  ...props
}, ref) => {
  const elevationClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const borderClass = border ? 'border border-gray-200' : '';
  const hoverClass = hoverEffect ? 'hover:shadow-lg transition-shadow duration-300' : '';
  const cursorClass = onClick ? 'cursor-pointer' : '';

  return (
    <Component
      ref={ref}
      className={`bg-white ${elevationClasses[elevation]} ${roundedClasses[rounded]} ${borderClass} ${hoverClass} ${cursorClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

export default Card;