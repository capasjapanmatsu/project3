import { ReactNode, forwardRef, HTMLAttributes, CSSProperties } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

export type AnimationType = 
  | 'fadeIn' 
  | 'slideUp' 
  | 'slideDown' 
  | 'slideLeft' 
  | 'slideRight' 
  | 'scale' 
  | 'bounce'
  | 'pulse'
  | 'spin';

export type AnimationDuration = 'fast' | 'normal' | 'slow';
export type AnimationEasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

interface AnimatedElementProps extends Omit<HTMLAttributes<HTMLElement>, 'style'> {
  children: ReactNode;
  animation?: AnimationType;
  duration?: AnimationDuration;
  easing?: AnimationEasing;
  delay?: number;
  repeat?: boolean | number;
  triggerOnce?: boolean;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
  respectReducedMotion?: boolean;
  fallbackAnimation?: AnimationType;
  style?: CSSProperties;
}

const AnimatedElement = forwardRef<HTMLElement, AnimatedElementProps>(({
  children,
  animation = 'fadeIn',
  duration = 'normal',
  easing = 'ease-out',
  delay = 0,
  repeat = false,
  triggerOnce: _triggerOnce = true,
  threshold: _threshold = 0.1,
  as: Component = 'div',
  respectReducedMotion = true,
  fallbackAnimation = 'fadeIn',
  className = '',
  ...props
}, ref) => {
  const { prefersReducedMotion } = useResponsive();

  // プリファーリデュースモーションが有効な場合の処理
  const shouldReduceMotion = respectReducedMotion && prefersReducedMotion;
  const effectiveAnimation = shouldReduceMotion ? fallbackAnimation : animation;
  
  // アニメーション期間の設定
  const durationClasses = {
    fast: 'duration-200',
    normal: 'duration-500',
    slow: 'duration-1000',
  };

  // イージングの設定
  const easingClasses = {
    linear: 'ease-linear',
    ease: 'ease',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
  };

  // アニメーションタイプの設定
  const animationClasses = {
    fadeIn: shouldReduceMotion 
      ? 'opacity-100 transition-opacity' 
      : 'opacity-0 animate-fade-in',
    slideUp: shouldReduceMotion 
      ? 'transform-none transition-transform' 
      : 'transform translate-y-4 animate-slide-up',
    slideDown: shouldReduceMotion 
      ? 'transform-none transition-transform' 
      : 'transform -translate-y-4 animate-slide-down',
    slideLeft: shouldReduceMotion 
      ? 'transform-none transition-transform' 
      : 'transform translate-x-4 animate-slide-left',
    slideRight: shouldReduceMotion 
      ? 'transform-none transition-transform' 
      : 'transform -translate-x-4 animate-slide-right',
    scale: shouldReduceMotion 
      ? 'transform-none transition-transform' 
      : 'transform scale-95 animate-scale-in',
    bounce: shouldReduceMotion 
      ? 'transform-none' 
      : 'animate-bounce',
    pulse: shouldReduceMotion 
      ? 'opacity-100' 
      : 'animate-pulse',
    spin: shouldReduceMotion 
      ? 'transform-none' 
      : 'animate-spin',
  };

  // リピート設定
  const repeatClass = repeat === true 
    ? 'animation-iteration-count-infinite' 
    : typeof repeat === 'number' 
      ? `animation-iteration-count-${repeat}` 
      : '';

  // 遅延設定
  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  // 最終的なクラス名
  const animationClassName = [
    animationClasses[effectiveAnimation],
    durationClasses[duration],
    easingClasses[easing],
    repeatClass,
    'transition-all',
  ].filter(Boolean).join(' ');

  const finalClassName = `${animationClassName} ${className}`.trim();

  const Element = Component as any;
  
  return (
    <Element
      ref={ref}
      className={finalClassName}
      style={{
        ...delayStyle,
        ...props.style,
      }}
      // アクセシビリティ属性
      aria-hidden={shouldReduceMotion ? undefined : 'false'}
      {...props}
    >
      {children}
    </Element>
  );
});

AnimatedElement.displayName = 'AnimatedElement';

// プリセットアニメーションコンポーネント
export const FadeIn = forwardRef<HTMLElement, Omit<AnimatedElementProps, 'animation'>>((props, ref) => (
  <AnimatedElement ref={ref} animation="fadeIn" {...props} />
));
FadeIn.displayName = 'FadeIn';

export const SlideUp = forwardRef<HTMLElement, Omit<AnimatedElementProps, 'animation'>>((props, ref) => (
  <AnimatedElement ref={ref} animation="slideUp" {...props} />
));
SlideUp.displayName = 'SlideUp';

export const ScaleIn = forwardRef<HTMLElement, Omit<AnimatedElementProps, 'animation'>>((props, ref) => (
  <AnimatedElement ref={ref} animation="scale" {...props} />
));
ScaleIn.displayName = 'ScaleIn';

// カスタムアニメーション用のCSS（globals.cssに追加する）
export const animationCSS = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { 
    opacity: 0; 
    transform: translateY(1rem); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes slide-down {
  from { 
    opacity: 0; 
    transform: translateY(-1rem); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes slide-left {
  from { 
    opacity: 0; 
    transform: translateX(1rem); 
  }
  to { 
    opacity: 1; 
    transform: translateX(0); 
  }
}

@keyframes slide-right {
  from { 
    opacity: 0; 
    transform: translateX(-1rem); 
  }
  to { 
    opacity: 1; 
    transform: translateX(0); 
  }
}

@keyframes scale-in {
  from { 
    opacity: 0; 
    transform: scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

.animate-fade-in { animation: fade-in var(--animation-duration, 0.5s) var(--animation-easing, ease-out); }
.animate-slide-up { animation: slide-up var(--animation-duration, 0.5s) var(--animation-easing, ease-out); }
.animate-slide-down { animation: slide-down var(--animation-duration, 0.5s) var(--animation-easing, ease-out); }
.animate-slide-left { animation: slide-left var(--animation-duration, 0.5s) var(--animation-easing, ease-out); }
.animate-slide-right { animation: slide-right var(--animation-duration, 0.5s) var(--animation-easing, ease-out); }
.animate-scale-in { animation: scale-in var(--animation-duration, 0.5s) var(--animation-easing, ease-out); }

/* プリファーリデュースモーション対応 */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-slide-up,
  .animate-slide-down,
  .animate-slide-left,
  .animate-slide-right,
  .animate-scale-in,
  .animate-bounce,
  .animate-pulse,
  .animate-spin {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
`;

export default AnimatedElement; 