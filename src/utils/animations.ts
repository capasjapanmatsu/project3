import { Variants } from 'framer-motion';

// 🎨 ページ遷移アニメーション
export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1],
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1]
    }
  }
};

// 💫 ボタンアニメーション
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10
    }
  }
};

// 🎯 決済成功アニメーション
export const paymentSuccessVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
    rotate: -180
  },
  animate: {
    scale: [0, 1.2, 1],
    opacity: [0, 1, 1],
    rotate: [180, 0, 0],
    transition: {
      duration: 0.8,
      ease: 'easeOut',
      times: [0, 0.6, 1]
    }
  }
};

// 🔑 PIN発行成功アニメーション
export const pinSuccessVariants: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0,
    y: 50
  },
  animate: {
    scale: [0.8, 1.1, 1],
    opacity: [0, 1, 1],
    y: [50, -10, 0],
    transition: {
      duration: 0.7,
      ease: 'easeOut',
      times: [0, 0.5, 1]
    }
  }
};

// 🔔 通知アニメーション
export const notificationVariants: Variants = {
  initial: {
    opacity: 0,
    x: 100,
    scale: 0.9
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20
    }
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.9,
    transition: {
      duration: 0.3
    }
  }
};

// ❌ エラーシェイクアニメーション
export const errorShakeVariants: Variants = {
  initial: { x: 0 },
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.6,
      ease: 'easeInOut'
    }
  }
};

// ⏳ ローディングアニメーション
export const loadingVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// 🌟 スケールイン（汎用）
export const scaleInVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20
    }
  }
};

// 🎪 スタッガー（順次表示）
export const staggerVariants: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const childVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4
    }
  }
};

// 💎 カードホバーエフェクト
export const cardHoverVariants: Variants = {
  initial: { y: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  hover: {
    y: -8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20
    }
  }
};

// 🎊 成功パーティクル
export const particleVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0
  },
  animate: {
    scale: [0, 1, 0],
    opacity: [0, 1, 0],
    y: [0, -100, -200],
    x: [0, Math.random() * 40 - 20, Math.random() * 80 - 40],
    transition: {
      duration: 2,
      ease: 'easeOut'
    }
  }
};

// 🔄 フリップアニメーション
export const flipVariants: Variants = {
  initial: {
    rotateY: 0
  },
  flip: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: 'easeInOut'
    }
  }
};

// ⚡ パルス（強調）アニメーション
export const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

// 🎨 グラデーション背景アニメーション
export const gradientVariants: Variants = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};

// 🚀 スライドイン方向
export const slideInFromLeft: Variants = {
  initial: { x: -100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

export const slideInFromRight: Variants = {
  initial: { x: 100, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

export const slideInFromTop: Variants = {
  initial: { y: -100, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

export const slideInFromBottom: Variants = {
  initial: { y: 100, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  }
};

// ✨ フェードイン・ アウト
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 60 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

export const fadeOut: Variants = {
  exit: {
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

// 🎯 特殊効果：タイプライター
export const typewriterVariants: Variants = {
  initial: { width: 0 },
  animate: {
    width: '100%',
    transition: {
      duration: 2,
      ease: 'easeInOut'
    }
  }
};

// 📱 モバイル最適化アニメーション
export const mobileOptimizedVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

// アニメーション設定オブジェクト
export const animationConfig = {
  // 決済成功時のコンボアニメーション
  paymentSuccess: {
    variants: paymentSuccessVariants,
    duration: 0.8,
    delay: 0.2
  },
  
  // PIN発行成功時のアニメーション
  pinGeneration: {
    variants: pinSuccessVariants,
    duration: 0.7,
    delay: 0.1
  },
  
  // エラー時のシェイク
  error: {
    variants: errorShakeVariants,
    trigger: 'shake'
  },
  
  // 通知表示
  notification: {
    variants: notificationVariants,
    duration: 0.4
  },
  
  // ページ遷移
  pageTransition: {
    variants: pageTransitionVariants,
    duration: 0.4
  }
};

// デフォルトエクスポート
export default {
  // メインバリアント
  pageTransitionVariants,
  buttonVariants,
  paymentSuccessVariants,
  pinSuccessVariants,
  notificationVariants,
  errorShakeVariants,
  loadingVariants,
  
  // ユーティリティバリアント
  scaleInVariants,
  cardHoverVariants,
  particleVariants,
  flipVariants,
  pulseVariants,
  
  // スライドバリアント
  slideInFromLeft,
  slideInFromRight,
  slideInFromTop,
  slideInFromBottom,
  
  // フェードバリアント
  fadeInUp,
  fadeOut,
  
  // 設定
  animationConfig
}; 