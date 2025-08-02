import { X } from 'lucide-react';
import { useState } from 'react';
import Button from './Button';
import Card from './Card';

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
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'welcome',
      title: 'ドッグラン管理へようこそ！',
      message: 'ドッグランの第二審査が承認されました。\n次に重要な設定を行いましょう。',
    },
    {
      id: 'location',
      title: '位置調整',
      message: 'まず、ドッグランの正確な位置を設定しましょう。\n「位置調整」タブをクリックしてください。',
    },
    {
      id: 'pins',
      title: 'PINコード管理',
      message: 'スマートロックのPINコードを設定しましょう。\n「PINコード管理」タブをクリックしてください。',
    }
  ];

  const currentStepData = steps[currentStep];

  if (!currentStepData) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      if (onStepChange) {
        onStepChange(steps[currentStep + 1].id);
      }
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
      <Card className="max-w-md mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">{currentStepData.title}</h3>
          <p className="text-gray-600 mb-6 whitespace-pre-line">
            {currentStepData.message}
          </p>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleSkip}>
              スキップ
            </Button>
            <Button onClick={handleNext}>
              {currentStep < steps.length - 1 ? '次へ' : '完了'}
            </Button>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            {currentStep + 1} / {steps.length}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ParkManagementWalkthrough; 