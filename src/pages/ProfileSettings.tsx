import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    CreditCard,
    Crown,
    History,
    Home,
    Key,
    Loader,
    Lock,
    Mail,
    MapPin,
    Package,
    Pause,
    Phone,
    Play,
    Save,
    Shield,
    Trash2,
    User,
    UserX,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { formatAddress, lookupPostalCode } from '../utils/postalCodeLookup';
import { supabase } from '../utils/supabase';


export function ProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription, loading: subscriptionLoading, isActive: hasSubscription } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    postal_code: '',
    address: '',
    phone_number: '',
    email: '',
  });
  const [originalData, setOriginalData] = useState({
    name: '',
    nickname: '',
    postal_code: '',
    address: '',
    phone_number: '',
    email: '',
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isLookingUpPostalCode, setIsLookingUpPostalCode] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState('');
  
  // サブスクリプション管理関連のstate
  const [subscriptionAction, setSubscriptionAction] = useState<'pause' | 'resume' | 'cancel' | null>(null);
  const [isProcessingSubscription, setIsProcessingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionSuccess, setSubscriptionSuccess] = useState('');
  
  // 2FA関連のstateは一時的にコメントアウト
  // const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  // const [mfaStatus, setMfaStatus] = useState<'enabled' | 'disabled' | 'loading'>('loading');

  useEffect(() => {
    if (user) {
      fetchProfile();
      // fetchMFAStatus(); // 一時的に無効化
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      const profileData = {
        name: data.name || '',
        nickname: data.nickname || '',
        postal_code: data.postal_code || '',
        address: data.address || '',
        phone_number: data.phone_number || '',
        email: user?.email || '',
      };
      
      setFormData(profileData);
      setOriginalData(profileData); // 元のデータを保存
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError((err as Error).message || 'プロフィールの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 2FA関連の関数は一時的に無効化
  const fetchMFAStatus = async () => {
    console.log('2FA機能は現在メンテナンス中です');
    // 関数は存在するが何もしない
  };

  const handleEnable2FA = async () => {
    setError('2FA機能は現在メンテナンス中です。しばらくお待ちください。');
  };

  const handleDisable2FA = async (factorId: string) => {
    setError('2FA機能は現在メンテナンス中です。しばらくお待ちください。');
  };



  // 郵便番号の自動フォーマット（123-4567）
  const formatPostalCode = (value: string) => {
    // 数字のみを抽出
    const numbers = value.replace(/\D/g, '');
    
    // 7桁まで制限
    if (numbers.length <= 7) {
      // 3桁目の後にハイフンを挿入
      if (numbers.length > 3) {
        return numbers.slice(0, 3) + '-' + numbers.slice(3);
      }
      return numbers;
    }
    
    return formData.postal_code; // 7桁を超える場合は変更しない
  };

  // 郵便番号から住所を取得
  const handlePostalCodeChange = async (value: string) => {
    const formatted = formatPostalCode(value);
    setFormData({ ...formData, postal_code: formatted });
    
    // 7桁の数字が入力された場合に住所を検索
    if (formatted.replace(/-/g, '').length === 7) {
      setIsLookingUpPostalCode(true);
      setPostalCodeError('');
      
      try {
        const result = await lookupPostalCode(formatted);
        
        if (result.success && result.results && result.results.length > 0 && result.results[0]) {
          const address = formatAddress(result.results[0]);
          setFormData(prev => ({ ...prev, address }));
        } else {
          setPostalCodeError(result.message || '住所が見つかりませんでした');
        }
      } catch (error) {
        console.error('Error looking up postal code:', error);
        setPostalCodeError('住所の検索中にエラーが発生しました');
      } finally {
        setIsLookingUpPostalCode(false);
      }
    }
  };

  // 電話番号の自動フォーマット（090-1234-5678）
  const formatPhoneNumber = (value: string) => {
    // 数字のみを抽出
    const numbers = value.replace(/\D/g, '');
    
    // 11桁まで制限
    if (numbers.length <= 11) {
      if (numbers.length > 7) {
        // 090-1234-5678 形式
        return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7);
      } else if (numbers.length > 3) {
        // 090-1234 形式
        return numbers.slice(0, 3) + '-' + numbers.slice(3);
      }
      return numbers;
    }
    
    return formData.phone_number; // 11桁を超える場合は変更しない
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // 入力値の検証
      if (!formData.name.trim()) {
        throw new Error('お名前を入力してください');
      }

      // 郵便番号の形式チェック（ハイフンありの形式）
      if (formData.postal_code && !formData.postal_code.match(/^\d{3}-\d{4}$/)) {
        throw new Error('郵便番号は正しい形式で入力してください（例：123-4567）');
      }

      // 電話番号の形式チェック（ハイフンありの形式）
      if (formData.phone_number && !formData.phone_number.match(/^0\d{2,3}-\d{1,4}-\d{4}$/)) {
        throw new Error('電話番号は正しい形式で入力してください（例：090-1234-5678）');
      }

      // 住所変更の検出
      const addressChanged = (
        originalData.postal_code !== formData.postal_code ||
        originalData.address !== formData.address
      );

      // 本人確認済みユーザーの住所変更チェック
      let identityResetRequired = false;
      if (addressChanged) {
        const { data: ownerVerification, error: verificationError } = await supabase
          .from('owner_verifications')
          .select('id, status')
          .eq('user_id', user?.id)
          .eq('status', 'verified')
          .single();

        if (verificationError && verificationError.code !== 'PGRST116') {
          // エラーが発生した場合はログに記録するが、処理は続行
          console.error('Error checking owner verification:', verificationError);
        }

        if (ownerVerification) {
          identityResetRequired = true;
        }
      }

      // プロフィール更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          nickname: formData.nickname,
          postal_code: formData.postal_code,
          address: formData.address,
          phone_number: formData.phone_number,
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // 本人確認ステータスの再設定
      if (identityResetRequired) {
        const { error: resetError } = await supabase
          .from('owner_verifications')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);

        if (resetError) {
          console.error('Error resetting identity verification:', resetError);
        }

        // 通知の作成
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            user_id: user?.id,
            type: 'identity_verification',
            title: '住所変更により本人確認が必要です',
            message: '住所を変更されたため、本人確認書類を再度提出する必要があります。ドッグラン施設の登録を継続される場合は、本人確認書類をアップロードしてください。',
            data: { reason: 'address_change' }
          }]);

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }

      // メールアドレス更新（変更があれば）
      if (user?.email !== formData.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (emailError) throw emailError;
      }

      // 元のデータを更新
      setOriginalData(formData);

      let successMessage = 'プロフィールを更新しました';
      if (identityResetRequired) {
        successMessage += '\n\n住所変更により本人確認が必要になりました。ドッグラン施設の登録を継続される場合は、本人確認書類を再度アップロードしてください。';
      }

      setSuccess(successMessage);
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError((err as Error).message || 'プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      // 入力値の検証
      if (!passwordData.currentPassword) {
        throw new Error('現在のパスワードを入力してください');
      }

      if (!passwordData.newPassword) {
        throw new Error('新しいパスワードを入力してください');
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error('パスワードは6文字以上で入力してください');
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('新しいパスワードと確認用パスワードが一致しません');
      }

      // 現在のパスワードで認証
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) {
        throw new Error('現在のパスワードが正しくありません');
      }

      // パスワード更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      setPasswordSuccess('パスワードを変更しました');
      
      // フォームをリセット
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // 3秒後にモーダルを閉じる
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError((err as Error).message || 'パスワードの変更に失敗しました');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // サブスクリプション管理ハンドラー
  const handlePauseSubscription = async () => {
    if (!subscription?.subscription_id) return;
    
    setIsProcessingSubscription(true);
    setSubscriptionError('');
    setSubscriptionSuccess('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-pause-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subscription_id: subscription.subscription_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サブスクリプションの一時停止に失敗しました');
      }

      setSubscriptionSuccess('サブスクリプションを一時停止しました。再開はいつでも可能です。');
      setSubscriptionAction(null);
      
      // データを再取得
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error pausing subscription:', error);
      setSubscriptionError(error instanceof Error ? error.message : 'サブスクリプションの一時停止に失敗しました');
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription?.subscription_id) return;
    
    setIsProcessingSubscription(true);
    setSubscriptionError('');
    setSubscriptionSuccess('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-resume-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subscription_id: subscription.subscription_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サブスクリプションの再開に失敗しました');
      }

      setSubscriptionSuccess('サブスクリプションを再開しました。');
      setSubscriptionAction(null);
      
      // データを再取得
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error resuming subscription:', error);
      setSubscriptionError(error instanceof Error ? error.message : 'サブスクリプションの再開に失敗しました');
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.subscription_id) return;
    
    setIsProcessingSubscription(true);
    setSubscriptionError('');
    setSubscriptionSuccess('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          subscription_id: subscription.subscription_id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サブスクリプションの退会に失敗しました');
      }

      setSubscriptionSuccess('サブスクリプションを退会しました。現在の期間終了まで利用可能です。');
      setSubscriptionAction(null);
      
      // データを再取得
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setSubscriptionError(error instanceof Error ? error.message : 'サブスクリプションの退会に失敗しました');
    } finally {
      setIsProcessingSubscription(false);
    }
  };

  const handleAccountDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setDeleteError('');

    try {
      // 確認文字列のチェック
      if (deleteConfirmation !== 'delete') {
        throw new Error('確認のため「delete」と入力してください');
      }

      // アカウント削除
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');

      if (error) throw error;

      // ログアウト
      await supabase.auth.signOut();
      
      // ホームページにリダイレクト
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Error deleting account:', err);
      setDeleteError((err as Error).message || 'アカウントの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          マイページに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <User className="w-8 h-8 text-blue-600 mr-3" />
          プロフィール設定
        </h1>
        <p className="text-lg text-gray-600">
          アカウント情報を管理します
        </p>
      </div>

      {/* クイックリンク */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <Link to="/payment-method-settings">
          <Button variant="secondary" size="sm">
            <CreditCard className="w-4 h-4 mr-2" />
            支払い方法
          </Button>
        </Link>
        <Link to="/dogpark-history">
          <Button variant="secondary" size="sm">
            <History className="w-4 h-4 mr-2" />
            利用履歴
          </Button>
        </Link>
        <Link to="/order-history">
          <Button variant="secondary" size="sm">
            <Package className="w-4 h-4 mr-2" />
            注文履歴
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">基本情報</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="お名前 *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                icon={<User className="w-4 h-4 text-gray-500" />}
              />

              <Input
                label="ニックネーム"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="表示名やニックネームを入力（任意）"
                icon={<User className="w-4 h-4 text-gray-500" />}
              />
              
              <Input
                label="メールアドレス *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                icon={<Mail className="w-4 h-4 text-gray-500" />}
              />
            </div>

            <div className="flex items-center space-x-3 mb-6 mt-8">
              <Home className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">住所情報</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  郵便番号 <span className="text-xs text-blue-600">(入力すると住所が自動入力されます)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    className={`w-full pl-10 pr-10 py-2 border ${postalCodeError ? 'border-red-500' : 'border-gray-300'} rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="123-4567（数字のみ入力）"
                    maxLength={8}
                  />
                  {isLookingUpPostalCode && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
                {postalCodeError && (
                  <p className="mt-1 text-sm text-red-600">{postalCodeError}</p>
                )}
              </div>
              
              <Input
                label="電話番号"
                value={formData.phone_number}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setFormData({ ...formData, phone_number: formatted });
                }}
                placeholder="090-1234-5678"
                maxLength={13}
                icon={<Phone className="w-4 h-4 text-gray-500" />}
              />
            </div>

            <div className="col-span-2">
              <Input
                label="住所"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="東京都渋谷区渋谷1-1-1"
                icon={<Home className="w-4 h-4 text-gray-500" />}
              />
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">※ 入力のヒント</span><br />
                • 郵便番号：数字のみ入力（例：1234567）<br />
                • 電話番号：数字のみ入力（例：09012345678）<br />
                ハイフンは自動で挿入されます。
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                保存する
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Card className="p-6 bg-gray-50">
        <div className="flex items-center space-x-3 mb-6">
          <Lock className="w-6 h-6 text-yellow-600" />
          <h2 className="text-xl font-semibold">アカウント設定</h2>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2">パスワード変更</h3>
            <p className="text-sm text-gray-600 mb-3">
              アカウントのセキュリティを保つため、定期的にパスワードを変更することをおすすめします。
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowPasswordModal(true)}
            >
              <Key className="w-4 h-4 mr-2" />
              パスワードを変更
            </Button>
          </div>

          {/* サブスクリプション管理セクション */}        
          <div className="p-4 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center mb-3">
              <Crown className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="font-semibold">サブスクリプション管理</h3>
            </div>
            
            {subscriptionLoading ? (
              <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600">読み込み中...</span>
              </div>
            ) : hasSubscription && subscription ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p>現在のプラン: <span className="font-medium text-purple-600">月額サブスクリプション</span></p>
                  <p>ステータス: <span className={`font-medium ${
                    subscription.subscription_status === 'active' ? 'text-green-600' : 
                    subscription.subscription_status === 'paused' ? 'text-yellow-600' : 
                    'text-red-600'
                  }`}>
                    {subscription.subscription_status === 'active' ? '利用中' : 
                     subscription.subscription_status === 'paused' ? '一時停止中' : 
                     subscription.subscription_status === 'canceled' ? '退会済み' : subscription.subscription_status}
                  </span></p>
                  {subscription.current_period_end && (
                    <p>次回更新日: {new Date(subscription.current_period_end * 1000).toLocaleDateString()}</p>
                  )}
                </div>

                {subscriptionError && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-800">{subscriptionError}</p>
                    </div>
                  </div>
                )}

                {subscriptionSuccess && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                      <p className="text-sm text-green-800">{subscriptionSuccess}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {subscription.subscription_status === 'active' && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => setSubscriptionAction('pause')}
                        disabled={isProcessingSubscription}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        利用を一時停止
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                        onClick={() => setSubscriptionAction('cancel')}
                        disabled={isProcessingSubscription}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        退会する
                      </Button>
                    </>
                  )}
                  
                  {subscription.subscription_status === 'paused' && (
                    <Button 
                      variant="secondary" 
                      size="sm"
                      className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                      onClick={() => setSubscriptionAction('resume')}
                      disabled={isProcessingSubscription}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      利用を再開
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  現在サブスクリプションに加入していません。
                </p>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 border-purple-300 hover:border-purple-400"
                  onClick={() => navigate('/subscription-intro')}
                >
                  <Crown className="w-4 h-4 mr-1" />
                  サブスクリプションに加入
                </Button>
              </div>
            )}
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2">アカウント削除</h3>
            <p className="text-sm text-gray-600 mb-3">
              アカウントを削除すると、すべてのデータが完全に削除され、復元できなくなります。
            </p>
            <Button 
              variant="secondary" 
              size="sm"
              className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              アカウントを削除
            </Button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2 text-gray-600">2ファクタ認証（2FA）</h3>
            <p className="text-sm text-gray-600 mb-3">
              2ファクタ認証機能は現在メンテナンス中です。しばらくお待ちください。
            </p>
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">サービス準備中</span>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              disabled
              className="mt-3 opacity-50 cursor-not-allowed"
            >
              <Shield className="w-4 h-4 mr-2" />
              2FAを有効化（準備中）
            </Button>
          </div>
        </div>
      </Card>

      {/* パスワード変更モーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">パスワード変更</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{passwordError}</p>
                </div>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-sm text-green-800">{passwordSuccess}</p>
                </div>
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
                <Input
                  label="現在のパスワード *"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />

                <Input
                  label="新しいパスワード *"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />

                <Input
                  label="新しいパスワード（確認） *"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">パスワードの要件</span><br />
                    • 6文字以上<br />
                    • 英数字を含めることをおすすめします<br />
                    • 以前使用したパスワードと異なるものを使用してください
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordError('');
                      setPasswordSuccess('');
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isChangingPassword}
                  >
                    パスワードを変更
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* アカウント削除モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-600">アカウント削除</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                  setDeleteConfirmation('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-800">{deleteError}</p>
                </div>
              </div>
            )}

            <div className="p-4 bg-red-50 rounded-lg mb-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 mb-1">警告: この操作は取り消せません</p>
                  <p className="text-sm text-red-700">
                    アカウントを削除すると、以下のデータがすべて完全に削除されます：
                  </p>
                  <ul className="text-sm text-red-700 list-disc list-inside mt-2 space-y-1">
                    <li>プロフィール情報</li>
                    <li>登録したワンちゃんの情報</li>
                    <li>予約履歴</li>
                    <li>支払い情報</li>
                    <li>友達リストとメッセージ</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleAccountDelete}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    確認のため「delete」と入力してください *
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteError('');
                      setDeleteConfirmation('');
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={deleteConfirmation !== 'delete'}
                  >
                    アカウントを削除
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* サブスクリプション管理モーダル */}
      {subscriptionAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-purple-600">
                {subscriptionAction === 'pause' && 'サブスクリプション一時停止'}
                {subscriptionAction === 'resume' && 'サブスクリプション再開'}
                {subscriptionAction === 'cancel' && 'サブスクリプション退会'}
              </h3>
              <button
                onClick={() => {
                  setSubscriptionAction(null);
                  setSubscriptionError('');
                  setSubscriptionSuccess('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {subscriptionAction === 'pause' && (
                <>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Pause className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800 mb-1">一時停止について</p>
                        <p className="text-sm text-yellow-700">
                          サブスクリプションを一時停止すると、次回の請求が停止されます。
                          いつでも再開することができます。
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    一時停止中も現在の期間終了まではサービスをご利用いただけます。
                  </p>
                </>
              )}

              {subscriptionAction === 'resume' && (
                <>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Play className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800 mb-1">再開について</p>
                        <p className="text-sm text-green-700">
                          サブスクリプションを再開すると、通常の請求サイクルが復活します。
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    再開後は全ての機能をご利用いただけます。
                  </p>
                </>
              )}

              {subscriptionAction === 'cancel' && (
                <>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 mb-1">退会について</p>
                        <p className="text-sm text-red-700">
                          退会すると、現在の期間終了後にサブスクリプションが終了します。
                          いつでも再度加入することができます。
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    退会後も現在の期間終了まではサービスをご利用いただけます。
                  </p>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSubscriptionAction(null);
                    setSubscriptionError('');
                    setSubscriptionSuccess('');
                  }}
                  disabled={isProcessingSubscription}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  isLoading={isProcessingSubscription}
                  className={
                    subscriptionAction === 'cancel' 
                      ? "bg-red-600 hover:bg-red-700" 
                      : subscriptionAction === 'resume'
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-yellow-600 hover:bg-yellow-700"
                  }
                  onClick={() => {
                    if (subscriptionAction === 'pause') {
                      void handlePauseSubscription();
                    } else if (subscriptionAction === 'resume') {
                      void handleResumeSubscription();
                    } else if (subscriptionAction === 'cancel') {
                      void handleCancelSubscription();
                    }
                  }}
                >
                  {subscriptionAction === 'pause' && '一時停止する'}
                  {subscriptionAction === 'resume' && '再開する'}
                  {subscriptionAction === 'cancel' && '退会する'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
