import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    Key,
    PawPrint
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import {
    buttonVariants,
    fadeInUp,
    mobileOptimizedVariants,
    notificationVariants,
    pageTransitionVariants,
    particleVariants,
    paymentSuccessVariants
} from '../utils/animations';
import { triggerPaymentSuccessHaptic } from '../utils/hapticFeedback';

export function PaymentConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'processing'>('processing');
  const [countdown, setCountdown] = useState(5);
  const [showParticles, setShowParticles] = useState(false);
  const [playingSuccessAnimation, setPlayingSuccessAnimation] = useState(false);

  useEffect(() => {
    const initializePaymentStatus = async () => {
      // 迅速な状態判定のため、ローディング時間を最小化
      const status = searchParams.get('status');
      const sessionId = searchParams.get('session_id');
      const canceled = searchParams.get('canceled');
      
      if (status === 'success' && sessionId) {
        setPaymentStatus('success');
        
        // 🎉 決済成功時の演出開始
        setTimeout(async () => {
          setPlayingSuccessAnimation(true);
          
          // バイブレーション実行
          await triggerPaymentSuccessHaptic();
          
          // パーティクルエフェクト表示
          setShowParticles(true);
          
          // 3秒後にパーティクルを非表示
          setTimeout(() => {
            setShowParticles(false);
            setPlayingSuccessAnimation(false);
          }, 3000);
        }, 500);
        
      } else if (status === 'cancel' || canceled === 'true') {
        setPaymentStatus('failed');
      } else {
        setPaymentStatus('processing');
      }
      
      // 決済前の認証状態を確認
      const prePaymentAuthState = localStorage.getItem('pre_payment_auth_state');
      if (prePaymentAuthState) {
        try {
          const authState = JSON.parse(prePaymentAuthState);
          
          // 認証状態を確認し、必要に応じて警告
          if (!user || user.id !== authState.user_id) {
            
            // 決済キャンセル後に認証状態が失われた場合
            if (canceled === 'true') {
              setPaymentStatus('failed');
              // 5秒後にログインページに遷移
              setTimeout(() => {
                navigate('/login');
              }, 5000);
            }
          }
          
          // 決済後なので認証状態情報をクリア
          localStorage.removeItem('pre_payment_auth_state');
        } catch (error) {
          console.error('Failed to parse pre-payment auth state:', error);
        }
      }
      
      setIsLoading(false);
    };

    // 短時間で状態を初期化
    const timeoutId = setTimeout(initializePaymentStatus, 100);
    
    return () => clearTimeout(timeoutId);
  }, [searchParams, user, navigate]);

  useEffect(() => {
    if (paymentStatus === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (paymentStatus === 'success' && countdown === 0) {
      // Auto redirect to access control page after 5 seconds
      navigate('/access-control');
    }
  }, [paymentStatus, countdown, navigate]);

  const handleAccessControl = () => {
    navigate('/access-control');
  };

  if (isLoading) {
    return (
      <motion.div 
        className="flex justify-center items-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="max-w-2xl mx-auto"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransitionVariants}
    >
      <motion.div 
        className="flex items-center mb-6"
        variants={fadeInUp}
      >
        <motion.div
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(-1)}
            className="mr-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </motion.div>
        <h1 className="text-2xl font-bold">決済確認</h1>
      </motion.div>

      <AnimatePresence>
        {paymentStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Card className="text-center p-8 relative overflow-hidden">
              {/* パーティクルエフェクト */}
              <AnimatePresence>
                {showParticles && (
                  <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                        style={{
                          left: '50%',
                          top: '50%',
                        }}
                        variants={particleVariants}
                        initial="initial"
                        animate="animate"
                        exit={{ opacity: 0 }}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>

              {/* メイン成功アイコン */}
              <motion.div
                variants={paymentSuccessVariants}
                initial="initial"
                animate={playingSuccessAnimation ? 'animate' : 'initial'}
                className="relative"
              >
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              </motion.div>

              <motion.h2 
                className="text-2xl font-bold text-green-800 mb-4"
                variants={fadeInUp}
              >
                🎉 決済が完了しました！
              </motion.h2>

              <motion.p 
                className="text-gray-600 mb-6"
                variants={fadeInUp}
              >
                ありがとうございます。決済が正常に処理されました。
              </motion.p>
              
              <motion.div 
                className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6 border border-blue-200"
                variants={fadeInUp}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.6, repeat: 2 }}
                  >
                    <Key className="w-5 h-5 text-blue-600" />
                  </motion.div>
                  <span className="font-semibold text-blue-900">次のステップ</span>
                </div>
                <p className="text-sm text-blue-800">
                  入場にはPINコードが必要です。下のボタンからPINコードを生成してください。
                </p>
              </motion.div>

              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="mb-4"
              >
                <Button 
                  onClick={handleAccessControl}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                >
                  <Key className="w-5 h-5 mr-2" />
                  🚀 PINコードを生成する
                </Button>
              </motion.div>

              <motion.p 
                className="text-sm text-gray-500"
                variants={fadeInUp}
              >
                {countdown > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ⏰ {countdown}秒後に自動的にPINコード生成画面に移動します...
                  </motion.span>
                )}
              </motion.p>
            </Card>
          </motion.div>
        )}

        {paymentStatus === 'failed' && (
          <motion.div
            variants={notificationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Card className="text-center p-8">
              <motion.div
                animate={{ rotate: [-5, 5, -5, 0] }}
                transition={{ duration: 0.6 }}
              >
                <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-red-800 mb-4">決済がキャンセルされました</h2>
              <p className="text-gray-600 mb-6">
                決済がキャンセルまたは失敗しました。{!user ? '認証状態を確認してから' : ''}再度お試しください。
              </p>
              
              {!user && (
                <motion.div 
                  className="bg-orange-50 p-4 rounded-lg mb-6"
                  variants={mobileOptimizedVariants}
                >
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-orange-900">認証状態が失われました</span>
                  </div>
                  <p className="text-sm text-orange-800">
                    セッションが切断されました。3秒後にログインページに移動します。
                  </p>
                </motion.div>
              )}
              
              <motion.div 
                className="bg-yellow-50 p-4 rounded-lg mb-6"
                variants={mobileOptimizedVariants}
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <PawPrint className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-900">ドッグランを利用するには</span>
                </div>
                <p className="text-sm text-yellow-800">
                  入場にはPINコードが必要です。決済完了後にPINコードを生成できます。
                </p>
              </motion.div>

              <div className="space-y-3">
                {user ? (
                  <>
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button 
                        onClick={() => navigate('/parks')}
                        className="w-full"
                      >
                        ドッグラン一覧に戻る
                      </Button>
                    </motion.div>
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button 
                        variant="secondary"
                        onClick={() => navigate('/subscription')}
                        className="w-full"
                      >
                        サブスクリプションを検討する
                      </Button>
                    </motion.div>
                    <motion.div
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button 
                        variant="secondary"
                        onClick={() => navigate('/cart')}
                        className="w-full"
                      >
                        カートを確認する
                      </Button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button 
                      onClick={() => navigate('/login')}
                      className="w-full"
                    >
                      ログインする
                    </Button>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {paymentStatus === 'processing' && (
          <motion.div
            variants={mobileOptimizedVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="text-center p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                <div className="rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              </motion.div>
              
              <h2 className="text-xl font-bold mb-4">決済を処理中...</h2>
              <p className="text-gray-600">
                しばらくお待ちください。決済の処理が完了するまでお時間をいただく場合があります。
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
