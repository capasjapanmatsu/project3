import { ArrowDown, ArrowRight, CheckCircle, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import Button from './Button';
import Card from './Card';

interface WalkthroughStep {
  id: string;
  title: string;
  message: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  showArrow?: boolean;
  arrowBlinkCount?: number;
  action?: () => void;
}

interface ParkManagementWalkthroughProps {
  onComplete: () => void;
  onClose: () => void;
  onStepChange?: (stepId: string) => void;
}

export function ParkManagementWalkthrough({ 
  onComplete, 
  onClose, 
  onStepChange 
}: ParkManagementWalkthroughProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [showArrow, setShowArrow] = useState(false);
  const [arrowBlinkCount, setArrowBlinkCount] = useState(0);
  
  const tooltipRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false); // タイピング状態をrefで管理
  
  const steps: WalkthroughStep[] = [
    {
      id: 'welcome',
      title: '🎉 審査通過おめでとうございます！',
      message: 'いよいよオープンです。次に案内する設定を見直しオープンしましょう。',
      targetSelector: '',
      position: 'bottom'
    },
    {
      id: 'location-tab',
      title: '📍 位置調整を開始',
      message: '「位置調整」タブをタップして、ドッグランの正確な位置を設定してください。',
      targetSelector: '[data-walkthrough="location-tab"]',
      position: 'bottom',
      showArrow: true,
      arrowBlinkCount: 3,
      action: () => {
        onStepChange?.('location');
        setTimeout(() => {
          scrollToTop();
        }, 300);
      }
    },
    {
      id: 'map-explanation',
      title: '🗺️ マップで位置を確認',
      message: 'マップ上の赤いマーカーをドラッグして、実際のドッグランの位置に調整してください。正確な位置は利用者が見つけやすくするために重要です！',
      targetSelector: '[data-walkthrough="location-map"]',
      position: 'top',
      action: () => {
        // ポップオーバーとマップが両方見えるよう調整
        setTimeout(() => {
          const mapElement = document.querySelector('[data-walkthrough="location-map"]');
          if (mapElement) {
            const rect = mapElement.getBoundingClientRect();
            // ポップオーバー（80px + 高さ約300px = 380px）の下にマップが一部見えるようスクロール
            const scrollTop = window.pageYOffset + rect.top - 420; 
            window.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          } else {
            // マップ要素が見つからない場合は、位置調整セクション上部にスクロール
            window.scrollTo({
              top: 500,
              behavior: 'smooth'
            });
          }
        }, 400); // アニメーションとハイライト効果の完了を待つ
      }
    },
    {
      id: 'save-location',
      title: '💾 位置を保存',
      message: '位置の調整が完了したら、「位置を保存」ボタンをタップして座標を保存してください。',
      targetSelector: '[data-walkthrough="save-location-button"]',
      position: 'top',
      showArrow: true,
      arrowBlinkCount: 3
    },
    {
      id: 'pins-tab',
      title: '🔑 PINコード管理へ',
      message: '次に、スマートロックの設定を行います。「PINコード管理」タブをタップしてください。',
      targetSelector: '[data-walkthrough="pins-tab"]',
      position: 'bottom',
      showArrow: true,
      arrowBlinkCount: 3,
      action: () => {
        onStepChange?.('pins');
        setTimeout(() => {
          scrollToTop();
        }, 300);
      }
    },
    {
      id: 'setup-smartlock',
      title: '🔒 スマートロック設定',
      message: '「スマートロックを設定する」ボタンをタップして、入退場管理システムを設定してください。',
      targetSelector: '[data-walkthrough="setup-smartlock-button"]',
      position: 'top',
      showArrow: true,
      arrowBlinkCount: 3
    },
    {
      id: 'overview-tab-final',
      title: '🏢 概要・メンテナンスタブへ',
      message: '最後に、公開設定を行います。「概要・メンテナンス」タブをタップしてください。',
      targetSelector: '[data-walkthrough="overview-tab"]',
      position: 'bottom',
      showArrow: true,
      arrowBlinkCount: 3,
      action: () => {
        onStepChange?.('overview');
        // タブ切り替え後、公開設定がある位置までスクロール
        setTimeout(() => {
          const publicToggle = document.querySelector('[data-walkthrough="public-toggle"]');
          if (publicToggle) {
            const rect = publicToggle.getBoundingClientRect();
            const scrollTop = window.pageYOffset + rect.top - 300;
            window.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          } else {
            // トグルが見つからない場合はページ下部へ
            window.scrollTo({
              top: document.body.scrollHeight / 3,
              behavior: 'smooth'
            });
          }
        }, 500);
      }
    },
    {
      id: 'public-setting',
      title: '🌐 公開設定',
      message: 'すべての準備が整ったら、「ドッグラーン一覧に表示」をオンにしてください。これであなたのドッグランが公開されます！',
      targetSelector: '[data-walkthrough="public-toggle"]',
      position: 'top',
      showArrow: true,
      arrowBlinkCount: 3,
      action: () => {
        // 公開設定トグルが見える位置にスクロール
        setTimeout(() => {
          const toggleElement = document.querySelector('[data-walkthrough="public-toggle"]');
          if (toggleElement) {
            toggleElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center'
            });
          }
        }, 100);
      }
    }
  ];

  const currentStepData = steps[currentStep];
  
  // ページトップにスクロール
  const scrollToTop = () => {
    console.log('📜 ページトップにスクロール');
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // ターゲット要素にスクロール
  const scrollToTarget = useCallback((element: HTMLElement) => {
    console.log('📜 ターゲット要素にスクロール');
    const rect = element.getBoundingClientRect();
    const offsetTop = window.pageYOffset + rect.top;
    const windowHeight = window.innerHeight;
    const elementHeight = rect.height;
    const scrollPosition = offsetTop - (windowHeight / 2) + (elementHeight / 2);
    
    window.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });
  }, []);

  // タイピングアニメーション
  const typeMessage = useCallback((message: string) => {
    console.log('⌨️ タイピング開始:', message);
    
    // メッセージが無効な場合はスキップ
    if (!message || typeof message !== 'string' || message.trim() === '') {
      console.log('⚠️ 無効なメッセージのため、タイピングをスキップ');
      setIsTyping(false);
      setMessageText('');
      return;
    }
    
    // 既にタイピング中の場合は実行しない
    if (isTyping) {
      console.log('⚠️ 既にタイピング中のため、新しいタイピングをスキップ');
      return;
    }
    
    // 前のタイピングをクリア
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setIsTyping(true);
    setMessageText(''); // 明示的にクリア
    
    const cleanMessage = String(message).trim(); // 文字列として確実に変換
    let charIndex = 0;
    
    const typeChar = () => {
      if (charIndex < cleanMessage.length) {
        const char = cleanMessage[charIndex];
        if (char && char !== 'undefined') { // undefinedが文字列として混入することを防ぐ
          setMessageText(prev => {
            const newText = (prev || '') + char;
            console.log('📝 文字追加:', char, '現在のテキスト:', newText);
            return newText;
          });
        }
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeChar, 50);
      } else {
        console.log('⌨️ タイピング完了');
        setIsTyping(false);
      }
    };
    
    typeChar();
  }, [isTyping]);

  // ターゲット要素の検索と設定
  const findAndSetTarget = useCallback(() => {
    if (!currentStepData?.targetSelector) {
      setTargetElement(null);
      return;
    }
    
    const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
    if (element) {
      console.log('🎯 ターゲット要素を発見:', currentStepData.targetSelector);
      setTargetElement(element);
      
      // より明るいスポットライト効果を適用
      highlightElement(element, currentStepData.targetSelector);
      
      if (currentStepData.showArrow) {
        setShowArrow(true);
        setArrowBlinkCount(currentStepData.arrowBlinkCount || 0);
      }
    } else {
      console.log('❌ ターゲット要素が見つかりません:', currentStepData.targetSelector);
      setTargetElement(null);
    }
  }, [currentStepData]);

  // スポットライト効果を適用する関数
  const highlightElement = useCallback((element: HTMLElement, selector: string) => {
    console.log('💡 スポットライト効果を適用:', selector);
    
    // スムーズスクロール
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'center'
    });
    
    // 既存のスポットライト効果をクリア
    document.querySelectorAll('[data-walkthrough-spotlight]').forEach(el => {
      if ((el as any).__walkthroughCleanup) {
        (el as any).__walkthroughCleanup();
      }
    });
    
    // より明るいスポットライト効果を適用
    element.setAttribute('data-walkthrough-spotlight', 'true');
    const originalZIndex = element.style.zIndex;
    const originalPosition = element.style.position;
    const originalBoxShadow = element.style.boxShadow;
    const originalTransform = element.style.transform;
    const originalBackgroundColor = element.style.backgroundColor;
    
    // ボタンかどうかを判定
    const isButton = selector.includes('button') || element.tagName.toLowerCase() === 'button' || element.getAttribute('role') === 'button';
    const isTab = selector.includes('tab');
    
    if (isTab) {
      // タブの場合：より強いハイライト効果
      element.style.cssText += `
        position: relative !important;
        z-index: 9999 !important;
        background-color: #3B82F6 !important;
        color: white !important;
        box-shadow: 0 0 0 4px #3B82F6, 0 0 0 8px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 1.0), 0 0 80px rgba(59, 130, 246, 0.6) !important;
        transform: scale(1.1) !important;
        transition: all 0.3s ease-in-out !important;
        border-radius: 8px !important;
        filter: brightness(1.2) contrast(1.1) !important;
      `;
    } else if (isButton) {
      // ボタンの場合：背景色は変更せず、強いグロー効果とスケールアップで目立たせる
      element.style.cssText += `
        position: relative !important;
        z-index: 9999 !important;
        box-shadow: 0 0 0 4px #3B82F6, 0 0 0 8px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 1.0), 0 0 80px rgba(59, 130, 246, 0.6) !important;
        transform: scale(1.05) !important;
        transition: all 0.3s ease-in-out !important;
        border-radius: 8px !important;
        filter: brightness(1.1) contrast(1.1) !important;
      `;
    } else {
      // その他の要素：従来通りの背景色変更も含める
      element.style.cssText += `
        position: relative !important;
        z-index: 9999 !important;
        box-shadow: 0 0 0 4px #3B82F6, 0 0 0 8px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4) !important;
        transform: scale(1.02) !important;
        transition: all 0.3s ease-in-out !important;
        background-color: rgba(255, 255, 255, 0.95) !important;
        border-radius: 8px !important;
      `;
    }
    
    // クリーンアップ関数を保存
    (element as HTMLElement & { __walkthroughCleanup?: () => void }).__walkthroughCleanup = () => {
      element.removeAttribute('data-walkthrough-spotlight');
      element.style.zIndex = originalZIndex;
      element.style.position = originalPosition;
      element.style.boxShadow = originalBoxShadow;
      element.style.transform = originalTransform;
      element.style.backgroundColor = originalBackgroundColor;
      element.style.color = ''; // 文字色をリセット
      element.style.borderRadius = '';
      element.style.transition = '';
      element.style.filter = '';
    };
  }, []);

  // ステップ変更時の処理
  useEffect(() => {
    if (!currentStepData) return;
    
    console.log('🎯 ステップ変更:', currentStepData.id);
    
    // messageTextを明示的にクリア
    setMessageText('');
    setIsTyping(false);
    
    // 少し待ってからタイピングアニメーション開始（UIの安定化のため）
    setTimeout(() => {
      if (currentStepData.message && typeof currentStepData.message === 'string') {
        typeMessage(currentStepData.message);
      } else {
        console.error('無効なメッセージ:', currentStepData.message);
        setMessageText('メッセージを読み込めませんでした。');
        setIsTyping(false);
      }
    }, 100);
    
    // アクションがある場合は実行
    if (currentStepData.action) {
      currentStepData.action();
    }
    
    // ターゲット要素の設定
    setTimeout(() => {
      findAndSetTarget();
    }, currentStepData.action ? 600 : 200);
    
  }, [currentStep]); // 依存関係配列をcurrentStepのみに変更

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // スポットライト効果をクリーンアップ
      document.querySelectorAll('[data-walkthrough-spotlight]').forEach(el => {
        const element = el as HTMLElement & { __walkthroughCleanup?: () => void };
        if (element.__walkthroughCleanup) {
          element.__walkthroughCleanup();
        }
      });
    };
  }, []);

  // 次のステップ
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowArrow(false);
    } else {
      handleComplete();
    }
  };

  // ウォークスルー完了
  const handleComplete = async () => {
    // クリーンアップ処理を実行
    document.querySelectorAll('[data-walkthrough-spotlight]').forEach(el => {
      if ((el as any).__walkthroughCleanup) {
        (el as any).__walkthroughCleanup();
      }
    });
    
    try {
      if (user) {
        await supabase
          .from('profiles')
          .update({ park_management_walkthrough_completed: true })
          .eq('id', user.id);
      }
      onComplete();
    } catch (error) {
      console.error('ウォークスルー完了保存エラー:', error);
      onComplete();
    }
  };

  // スキップ
  const handleSkip = () => {
    // クリーンアップ処理を実行
    document.querySelectorAll('[data-walkthrough-spotlight]').forEach(el => {
      if ((el as any).__walkthroughCleanup) {
        (el as any).__walkthroughCleanup();
      }
    });
    void handleComplete();
  };

  if (!currentStepData) {
    return null;
  }

  return (
    <>
      {/* オーバーレイ - 他の要素を暗くする（少し明るく調整） */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 ${
        currentStepData.id === 'map-explanation' || currentStepData.id === 'setup-smartlock' 
          ? 'z-[10000]' 
          : 'z-40'
      }`} />
      
      {/* ターゲット要素のハイライト - FAB風に目立たせる */}
      {targetElement && (
        <div
          className="fixed pointer-events-none z-50 rounded-lg shadow-2xl animate-pulse"
          style={{
            top: `${targetElement.getBoundingClientRect().top + window.pageYOffset - 8}px`,
            left: `${targetElement.getBoundingClientRect().left + window.pageXOffset - 8}px`,
            width: `${targetElement.getBoundingClientRect().width + 16}px`,
            height: `${targetElement.getBoundingClientRect().height + 16}px`,
            background: 'rgba(59, 130, 246, 0.2)',
            border: '4px solid #3B82F6',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 30px rgba(59, 130, 246, 0.6), 0 0 0 9999px rgba(0, 0, 0, 0.4)',
          }}
        />
      )}

      {/* 点滅する矢印 */}
      {showArrow && targetElement && (
        <div
          className={`fixed z-50 text-blue-500 ${arrowBlinkCount > 0 ? 'animate-pulse' : ''}`}
          style={{
            top: currentStepData.position === 'top' 
              ? `${targetElement.getBoundingClientRect().top + window.pageYOffset - 40}px`
              : `${targetElement.getBoundingClientRect().bottom + window.pageYOffset + 10}px`,
            left: `${targetElement.getBoundingClientRect().left + window.pageXOffset + (targetElement.getBoundingClientRect().width / 2) - 12}px`,
          }}
        >
          {currentStepData.position === 'top' ? (
            <ArrowDown size={24} className="animate-bounce" />
          ) : (
            <ArrowDown size={24} className="animate-bounce rotate-180" />
          )}
        </div>
      )}

      {/* ツールチップ */}
      <div 
        ref={tooltipRef}
        className={`fixed transition-opacity duration-300 ${
          currentStepData.id === 'map-explanation' 
            ? 'w-96 max-w-lg animate-expand z-[10001]' // マップステップでは最前面
            : currentStepData.id === 'setup-smartlock'
            ? 'w-80 max-w-sm z-[10001]' // スマートロック設定ステップも最前面
            : 'w-80 max-w-sm z-50'
        }`}
        style={{
          top: currentStepData.id === 'map-explanation'
            ? '80px' // マップステップでは上部固定（少し上に調整）
            : currentStepData.id === 'save-location'
            ? '200px' // 位置を保存ステップでは固定位置（中央上部）
            : currentStepData.id === 'setup-smartlock'
            ? '120px' // スマートロック設定ステップでは上部固定
            : currentStepData.id === 'public-setting'
            ? `${targetElement ? targetElement.getBoundingClientRect().top - 280 : 200}px` // 公開設定ステップではより上に配置
            : targetElement && currentStepData.position === 'top' 
            ? `${targetElement.getBoundingClientRect().top - 200}px`
            : targetElement && currentStepData.position === 'bottom'
            ? `${targetElement.getBoundingClientRect().bottom + 60}px`
            : '50%',
          left: currentStepData.id === 'map-explanation'
            ? '50%' // マップステップでは中央に配置
            : currentStepData.id === 'save-location'
            ? '50%' // 位置を保存ステップでは中央に配置
            : currentStepData.id === 'setup-smartlock'
            ? '50%' // スマートロック設定ステップでは中央に配置
            : targetElement 
            ? `${Math.max(16, Math.min(window.innerWidth - (currentStepData.id === 'map-explanation' ? 400 : 336), targetElement.getBoundingClientRect().left + window.pageXOffset + (targetElement.getBoundingClientRect().width / 2) - (currentStepData.id === 'map-explanation' ? 200 : 160)))}px`
            : '50%',
          transform: currentStepData.id === 'map-explanation' || currentStepData.id === 'save-location' || currentStepData.id === 'setup-smartlock'
            ? 'translateX(-50%)' // マップステップ、位置保存ステップ、スマートロック設定ステップでは中央揃え
            : !targetElement ? 'translate(-50%, -50%)' : 'none'
        }}
      >
        <Card className="relative shadow-2xl border-blue-200">
          <button
            onClick={() => {
              // クリーンアップ処理を実行
              document.querySelectorAll('[data-walkthrough-spotlight]').forEach(el => {
                if ((el as any).__walkthroughCleanup) {
                  (el as any).__walkthroughCleanup();
                }
              });
              onClose();
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 pr-8">{currentStepData.title}</h3>
            <div className="text-gray-600 mb-6 min-h-[3em] whitespace-pre-line">
              {messageText || ''}
              {isTyping && <span className="animate-pulse">|</span>}
            </div>
            
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={handleSkip}>
                スキップ
              </Button>
              
              <div className="text-sm text-gray-500">
                {currentStep + 1} / {steps.length}
              </div>
              
              <Button 
                onClick={handleNext}
                disabled={isTyping}
                className="flex items-center gap-2"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    次へ
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    完了
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export default ParkManagementWalkthrough;

// CSS-in-JSアニメーション用のスタイル
const style = document.createElement('style');
style.textContent = `
  @keyframes expand {
    0% {
      width: 320px;
      height: 160px;
      opacity: 0.8;
    }
    100% {
      width: 384px;
      height: auto;
      opacity: 1;
    }
  }
  
  .animate-expand {
    animation: expand 0.5s ease-out forwards;
  }
`;

if (!document.head.querySelector('style[data-walkthrough]')) {
  style.setAttribute('data-walkthrough', 'true');
  document.head.appendChild(style);
} 