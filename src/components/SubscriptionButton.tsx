import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import Button from './Button';
import { useStripe } from '../hooks/useStripe';
import { products } from '../stripe-config';

interface SubscriptionButtonProps {
  hasSubscription?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export function SubscriptionButton({ 
  hasSubscription = false, 
  className = '',
  variant = 'primary',
  size = 'md'
}: SubscriptionButtonProps) {
  const { createCheckoutSession, loading, error } = useStripe();
  const [showError, setShowError] = useState(false);

  const handleSubscribe = async () => {
    setShowError(false);
    const subscriptionProduct = products.find(p => p.mode === 'subscription');
    
    if (!subscriptionProduct) {
      console.error('Subscription product not found');
      return;
    }

    try {
      await createCheckoutSession({
        priceId: subscriptionProduct.priceId,
        mode: 'subscription',
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/dashboard?canceled=true`,
      });
    } catch (err) {
      setShowError(true);
    }
  };

  if (hasSubscription) {
    return (
      <Link to="/subscription">
        <Button 
          variant={variant} 
          size={size}
          className={`flex items-center ${className}`}
        >
          <Crown className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
          サブスク管理
        </Button>
      </Link>
    );
  }

  return (
    <div>
      <Button 
        onClick={handleSubscribe}
        isLoading={loading}
        variant="primary"
        size={size}
        className={`flex items-center bg-purple-600 hover:bg-purple-700 text-white ${className}`}
      >
        <Crown className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
        サブスクに加入
      </Button>
      
      {showError && error && (
        <div className="text-xs text-red-600 mt-1">{error}</div>
      )}
    </div>
  );
}