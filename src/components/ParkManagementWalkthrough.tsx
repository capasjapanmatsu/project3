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
  
  const steps: WalkthroughStep[] = [
    {
      id: 'welcome',
      title: '🎉 第二審査承認おめでとうございます！',
      message: 'いよいよドッグランオープンの準備です！まずは位置情報を正確に設定しましょう。',
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
      position: 'top'
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
    setIsTyping(true);
    setMessageText('');
    
    let charIndex = 0;
    const typeChar = () => {
      if (charIndex < message.length) {
        setMessageText(prev => prev + message[charIndex]);
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeChar, 30);
      } else {
        setIsTyping(false);
      }
    };
    
    typeChar();
  }, []);

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
      scrollToTarget(element);
      
      if (currentStepData.showArrow) {
        setShowArrow(true);
        setArrowBlinkCount(currentStepData.arrowBlinkCount || 0);
      }
    } else {
      console.log('❌ ターゲット要素が見つかりません:', currentStepData.targetSelector);
      setTargetElement(null);
    }
  }, [currentStepData, scrollToTarget]);

  // ステップ変更時の処理
  useEffect(() => {
    if (!currentStepData) return;
    
    console.log('🎯 ステップ変更:', currentStepData.id);
    
    // タイピングアニメーション開始
    typeMessage(currentStepData.message);
    
    // アクションがある場合は実行
    if (currentStepData.action) {
      currentStepData.action();
    }
    
    // ターゲット要素の設定
    setTimeout(() => {
      findAndSetTarget();
    }, currentStepData.action ? 500 : 100);
    
  }, [currentStep, currentStepData, typeMessage, findAndSetTarget]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
    void handleComplete();
  };

  if (!currentStepData) {
    return null;
  }

  return (
    <>
      {/* オーバーレイ - 他の要素を暗くする */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40" />
      
      {/* ターゲット要素のハイライト */}
      {targetElement && (
        <div
          className="fixed pointer-events-none z-50 ring-4 ring-blue-500 ring-opacity-75 rounded-lg"
          style={{
            top: `${targetElement.getBoundingClientRect().top + window.pageYOffset - 4}px`,
            left: `${targetElement.getBoundingClientRect().left + window.pageXOffset - 4}px`,
            width: `${targetElement.getBoundingClientRect().width + 8}px`,
            height: `${targetElement.getBoundingClientRect().height + 8}px`,
            background: 'rgba(59, 130, 246, 0.1)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
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
        className="fixed z-50 w-80 max-w-sm"
        style={{
          top: targetElement && currentStepData.position === 'top' 
            ? `${targetElement.getBoundingClientRect().top + window.pageYOffset - 200}px`
            : targetElement && currentStepData.position === 'bottom'
            ? `${targetElement.getBoundingClientRect().bottom + window.pageYOffset + 60}px`
            : '50%',
          left: targetElement 
            ? `${Math.max(16, Math.min(window.innerWidth - 336, targetElement.getBoundingClientRect().left + window.pageXOffset + (targetElement.getBoundingClientRect().width / 2) - 160))}px`
            : '50%',
          transform: !targetElement ? 'translate(-50%, -50%)' : 'none'
        }}
      >
        <Card className="relative shadow-2xl border-blue-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 pr-8">{currentStepData.title}</h3>
            <div className="text-gray-600 mb-6 min-h-[3em] whitespace-pre-line">
              {messageText}
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