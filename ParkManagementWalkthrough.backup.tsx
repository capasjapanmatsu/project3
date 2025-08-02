import { ArrowDown, ArrowRight, CheckCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
        // 少し待ってからスクロール
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
        // 少し待ってからスクロール
        setTimeout(() => {
          scrollToTop();
        }, 300);
      }
    },
    {
      id: 'setup-smartlock',
      title: '🔒 スマートロック設定',
      message: 'ドッグランの入退場管理には「スマートロックを設定する」ボタンをタップしてください。',
      targetSelector: '[data-walkthrough="setup-smartlock-button"]',
      position: 'top',
      showArrow: true,
      arrowBlinkCount: 3
    },
    {
      id: 'completion',
      title: '✨ チュートリアル完了！',
      message: 'チュートリアルが完了しました。以上を適切に設定していよいよ運営開始です。準備が整いましたら公開設定を非公開から公開へ変更してください。',
      targetSelector: '',
      position: 'bottom'
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
  const scrollToTarget = (element: HTMLElement) => {
    console.log('📜 ターゲット要素にスクロール');
    const rect = element.getBoundingClientRect();
    const offsetTop = window.pageYOffset + rect.top;
    
    // ステップに応じてスクロール位置を調整
    let scrollOffset = 0;
    
    if (currentStepData.id === 'map-explanation') {
      // マップ表示位置まで下げる
      scrollOffset = offsetTop - 150;
    } else if (currentStepData.id === 'setup-smartlock') {
      // スマートロック設定ボタンを画面中央付近に
      scrollOffset = offsetTop - window.innerHeight / 2 + 50;
    } else if (currentStepData.id === 'save-location') {
      // 保存ボタンが画面中央に見えるように
      scrollOffset = offsetTop - window.innerHeight / 2 + 100;
    } else {
      // その他は要素が見える位置に
      scrollOffset = offsetTop - 150;
    }
    
    window.scrollTo({
      top: Math.max(0, scrollOffset),
      behavior: 'smooth'
    });
  };

  // デバッグログ追加
  useEffect(() => {
    console.log('🎯 ウォークスルー開始:', {
      currentStep,
      stepData: currentStepData,
      user: user?.email
    });
  }, []);

  useEffect(() => {
    console.log('📍 ステップ変更:', {
      step: currentStep,
      id: currentStepData.id,
      targetSelector: currentStepData.targetSelector,
      targetElement: !!targetElement
    });
  }, [currentStep, currentStepData, targetElement]);

  // チャット風にメッセージをタイピング
  useEffect(() => {
    if (!currentStepData) return;
    
    console.log('💬 メッセージタイピング開始:', currentStepData.message);
    setIsTyping(true);
    setMessageText('');
    
    const message = currentStepData.message;
    let index = 0;
    
    const typeMessage = () => {
      if (index < message.length) {
        setMessageText(message.substring(0, index + 1)); // substring使用で文字欠けを防止
        index++;
        typingTimeoutRef.current = setTimeout(typeMessage, 30); // 30ms間隔でタイピング
      } else {
        setIsTyping(false);
        console.log('💬 タイピング完了');
        // タイピング完了後に矢印を表示
        if (currentStepData.showArrow) {
          setShowArrow(true);
          startArrowBlinking();
        }
      }
    };
    
    typeMessage();
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentStep]);

  // 矢印の点滅アニメーション
  const startArrowBlinking = () => {
    if (!currentStepData.arrowBlinkCount) return;
    
    console.log('🔄 矢印点滅開始');
    let count = 0;
    const blinkInterval = setInterval(() => {
      setArrowBlinkCount(prev => prev + 1);
      count++;
      
      if (count >= currentStepData.arrowBlinkCount! * 2) { // 点滅は表示/非表示で2回カウント
        clearInterval(blinkInterval);
        setArrowBlinkCount(0);
        console.log('🔄 矢印点滅完了');
      }
    }, 500); // 500ms間隔で点滅
  };

  // ターゲット要素の検索と位置計算
  useEffect(() => {
    if (!currentStepData.targetSelector) {
      console.log('🎯 ターゲットセレクタなし（初期ステップ）');
      setTargetElement(null);
      return;
    }
    
    const findTarget = () => {
      console.log('🔍 ターゲット要素検索:', currentStepData.targetSelector);
      const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
      if (element) {
        console.log('✅ ターゲット要素発見:', element);
        setTargetElement(element);
        
        // ターゲット要素が見つかったらスクロール
        setTimeout(() => {
          scrollToTarget(element);
        }, 200);
        
        return true;
      }
      console.log('❌ ターゲット要素が見つかりません');
      return false;
    };
    
    // 最初に即座に検索
    if (!findTarget()) {
      // 見つからない場合は少し待ってから再検索
      const timeout = setTimeout(() => {
        console.log('🔄 ターゲット要素再検索');
        findTarget();
      }, 800); // 待機時間をさらに増やす
      
      return () => clearTimeout(timeout);
    }
  }, [currentStepData.targetSelector]);

  // ツールチップの位置計算
  const getTooltipPosition = () => {
    if (!tooltipRef.current) {
      console.log('❌ tooltipRef.currentがnull');
      return {};
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    // ターゲット要素がない場合は画面中央に表示
    if (!targetElement) {
      console.log('🎯 画面中央にツールチップ表示');
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      return {
        top: (windowHeight - tooltipRect.height) / 2,
        left: (windowWidth - tooltipRect.width) / 2
      };
    }
    
    const targetRect = targetElement.getBoundingClientRect();
    const margin = 20;
    
    let top = 0;
    let left = 0;
    
    switch (currentStepData.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - margin;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + margin;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - margin;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + margin;
        break;
    }
    
    // 画面外に出ないように調整
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    if (left < 0) left = 10;
    if (left + tooltipRect.width > windowWidth) left = windowWidth - tooltipRect.width - 10;
    if (top < 0) top = 10;
    if (top + tooltipRect.height > windowHeight) top = windowHeight - tooltipRect.height - 10;
    
    console.log('📍 ツールチップ位置:', { top, left });
    return { top, left };
  };

  // 次のステップへ
  const nextStep = () => {
    console.log('⏭️ 次のステップへ:', currentStep + 1);
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setShowArrow(false);
      setArrowBlinkCount(0);
      
      // アクションがある場合は実行
      const step = steps[currentStep + 1];
      if (step.action) {
        console.log('🎬 アクション実行:', step.id);
        setTimeout(() => {
          step.action!();
        }, 100);
      }
    } else {
      console.log('🎉 チュートリアル完了');
      handleComplete();
    }
  };

  // ウォークスルー完了処理
  const handleComplete = async () => {
    if (!user?.id) return;
    
    try {
      console.log('💾 チュートリアル完了をデータベースに保存');
      await supabase
        .from('profiles')
        .update({ park_management_walkthrough_completed: true })
        .eq('id', user.id);
      
      console.log('✅ チュートリアル完了保存成功');
      onComplete();
    } catch (error) {
      console.error('❌ チュートリアル完了保存エラー:', error);
      onComplete(); // エラーでも完了扱いにする
    }
  };

  // スキップ処理
  const handleSkip = async () => {
    if (!user?.id) return;
    
    try {
      console.log('⏭️ チュートリアルスキップ');
      await supabase
        .from('profiles')
        .update({ park_management_walkthrough_completed: true })
        .eq('id', user.id);
      
      console.log('✅ スキップ保存成功');
      onClose();
    } catch (error) {
      console.error('❌ スキップ保存エラー:', error);
      onClose(); // エラーでもクローズ
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {/* オーバーレイ（全体を暗くする） */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-[9998]" />

      {/* ハイライト用の明るい穴 */}
      {targetElement && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: targetElement.getBoundingClientRect().top - 8,
            left: targetElement.getBoundingClientRect().left - 8,
            width: targetElement.getBoundingClientRect().width + 16,
            height: targetElement.getBoundingClientRect().height + 16,
            backgroundColor: 'transparent',
            border: '4px solid #3B82F6',
            borderRadius: '8px',
            boxShadow: `
              0 0 0 9999px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(59, 130, 246, 1.0),
              inset 0 0 30px rgba(59, 130, 246, 0.5)
            `
          }}
        />
      )}
      
      {/* 矢印 */}
      {targetElement && showArrow && (
        <div
          className={`fixed z-[10000] text-blue-500 ${
            arrowBlinkCount % 2 === 1 ? 'opacity-30' : 'opacity-100'
          } transition-opacity duration-200`}
          style={{
            top: currentStepData.position === 'top' 
              ? targetElement.getBoundingClientRect().top - 40
              : currentStepData.position === 'bottom'
              ? targetElement.getBoundingClientRect().bottom + 10
              : targetElement.getBoundingClientRect().top + targetElement.getBoundingClientRect().height / 2 - 12,
            left: currentStepData.position === 'left'
              ? targetElement.getBoundingClientRect().left - 40
              : currentStepData.position === 'right'
              ? targetElement.getBoundingClientRect().right + 10
              : targetElement.getBoundingClientRect().left + targetElement.getBoundingClientRect().width / 2 - 12
          }}
        >
          {currentStepData.position === 'top' && <ArrowDown className="w-6 h-6" />}
          {currentStepData.position === 'bottom' && <ArrowDown className="w-6 h-6 rotate-180" />}
          {currentStepData.position === 'left' && <ArrowRight className="w-6 h-6 rotate-180" />}
          {currentStepData.position === 'right' && <ArrowRight className="w-6 h-6" />}
        </div>
      )}

      {/* ツールチップ */}
      <div
        ref={tooltipRef}
        className="fixed z-[10001] max-w-md"
        style={tooltipPosition}
      >
        <Card className="p-6 bg-white shadow-2xl border-2 border-blue-500">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">
              {currentStepData.title}
            </h3>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="min-h-[60px] mb-6">
            <p className="text-gray-700 leading-relaxed">
              {messageText}
              {isTyping && <span className="animate-pulse">|</span>}
            </p>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="text-sm"
              >
                スキップ
              </Button>
              <Button
                onClick={nextStep}
                disabled={isTyping}
                className="text-sm min-w-[80px]"
              >
                {currentStep === steps.length - 1 ? (
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    完了
                  </div>
                ) : (
                  '次へ'
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
} 