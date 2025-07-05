import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, Calendar, Building, BarChart4, Download, CheckCircle, AlertTriangle, Ban, FileText, Clock } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface MonthlyPayout {
  id: string;
  park_id: string;
  park_name: string;
  year: number;
  month: number;
  total_revenue: number;
  platform_fee: number;
  owner_payout: number;
  status: 'pending' | 'processing' | 'completed';
  payout_date: string | null;
}

interface BankAccount {
  id?: string;
  bank_name: string;
  bank_code: string;
  branch_name: string;
  branch_code: string;
  account_type: 'ordinary' | 'checking';
  account_number: string;
  account_holder_name: string;
}

export function OwnerPaymentSystem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payouts, setPayouts] = useState<MonthlyPayout[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankFormData, setBankFormData] = useState<BankAccount>({
    bank_name: '',
    bank_code: '',
    branch_name: '',
    branch_code: '',
    account_type: 'ordinary',
    account_number: '',
    account_holder_name: ''
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch monthly payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('monthly_payouts')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (payoutsError) throw payoutsError;
      setPayouts(payoutsData || []);
      
      // Calculate totals
      const totalRev = (payoutsData || []).reduce((sum, payout) => sum + payout.total_revenue, 0);
      const totalPay = (payoutsData || []).reduce((sum, payout) => sum + payout.owner_payout, 0);
      setTotalRevenue(totalRev);
      setTotalPayout(totalPay);
      
      // Fetch bank account information
      const { data: bankData, error: bankError } = await supabase
        .from('owner_bank_accounts')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();
      
      if (bankError && bankError.code !== 'PGRST116') {
        throw bankError;
      }
      
      setBankAccount(bankData);
      
      if (bankData) {
        setBankFormData({
          id: bankData.id,
          bank_name: bankData.bank_name,
          bank_code: bankData.bank_code,
          branch_name: bankData.branch_name,
          branch_code: bankData.branch_code,
          account_type: bankData.account_type,
          account_number: bankData.account_number,
          account_holder_name: bankData.account_holder_name
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError((error as Error).message || 'データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBank(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate bank account information
      if (!bankFormData.bank_name) throw new Error('銀行名を入力してください');
      if (!bankFormData.bank_code) throw new Error('銀行コードを入力してください');
      if (!bankFormData.branch_name) throw new Error('支店名を入力してください');
      if (!bankFormData.branch_code) throw new Error('支店コードを入力してください');
      if (!bankFormData.account_number) throw new Error('口座番号を入力してください');
      if (!bankFormData.account_holder_name) throw new Error('口座名義を入力してください');
      
      // Validate bank code (4 digits)
      if (!/^\d{4}$/.test(bankFormData.bank_code)) {
        throw new Error('銀行コードは4桁の数字で入力してください');
      }
      
      // Validate branch code (3 digits)
      if (!/^\d{3}$/.test(bankFormData.branch_code)) {
        throw new Error('支店コードは3桁の数字で入力してください');
      }
      
      // Validate account number (7 digits)
      if (!/^\d{7}$/.test(bankFormData.account_number)) {
        throw new Error('口座番号は7桁の数字で入力してください');
      }
      
      if (bankAccount) {
        // Update existing bank account
        const { error } = await supabase
          .from('owner_bank_accounts')
          .update({
            bank_name: bankFormData.bank_name,
            bank_code: bankFormData.bank_code,
            branch_name: bankFormData.branch_name,
            branch_code: bankFormData.branch_code,
            account_type: bankFormData.account_type,
            account_number: bankFormData.account_number,
            account_holder_name: bankFormData.account_holder_name
          })
          .eq('id', bankAccount.id);
        
        if (error) throw error;
      } else {
        // Create new bank account
        const { error } = await supabase
          .from('owner_bank_accounts')
          .insert({
            owner_id: user?.id,
            bank_name: bankFormData.bank_name,
            bank_code: bankFormData.bank_code,
            branch_name: bankFormData.branch_name,
            branch_code: bankFormData.branch_code,
            account_type: bankFormData.account_type,
            account_number: bankFormData.account_number,
            account_holder_name: bankFormData.account_holder_name
          });
        
        if (error) throw error;
      }
      
      setSuccess('振込先情報を保存しました');
      setShowBankForm(false);
      
      // Refresh data
      await fetchData();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: unknown) {
      console.error('Error saving bank account:', error);
      setError((error as Error).message || '振込先情報の保存に失敗しました');
    } finally {
      setIsSavingBank(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ];
    return months[month - 1];
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '振込予定',
      processing: '振込処理中',
      completed: '振込完了'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/owner-dashboard" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          オーナーダッシュボードに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <DollarSign className="w-8 h-8 text-green-600 mr-3" />
          収益管理システム
        </h1>
        <p className="text-lg text-gray-600">
          ドッグラン施設の収益と振込情報を管理します
        </p>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* 収益サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">総売上</p>
              <p className="text-2xl font-bold text-green-600">¥{totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">プラットフォーム手数料</p>
              <p className="text-2xl font-bold text-blue-600">¥{(totalRevenue * 0.2).toLocaleString()}</p>
              <p className="text-xs text-blue-600">売上の20%</p>
            </div>
            <Building className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">オーナー取り分</p>
              <p className="text-2xl font-bold text-purple-600">¥{totalPayout.toLocaleString()}</p>
              <p className="text-xs text-purple-600">売上の80%</p>
            </div>
            <Ban className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* 振込先情報 */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Ban className="w-6 h-6 text-blue-600 mr-2" />
            振込先情報
          </h2>
          {bankAccount && !showBankForm ? (
            <Button 
              onClick={() => setShowBankForm(true)}
              size="sm"
            >
              <Edit className="w-4 h-4 mr-2" />
              編集する
            </Button>
          ) : null}
        </div>
        
        {showBankForm ? (
          <form onSubmit={handleSaveBankAccount}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  銀行名 *
                </label>
                <input
                  type="text"
                  value={bankFormData.bank_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：三菱UFJ銀行"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  銀行コード（4桁） *
                </label>
                <input
                  type="text"
                  value={bankFormData.bank_code}
                  onChange={(e) => {
                    // 数字のみ許可
                    const value = e.target.value.replace(/\D/g, '');
                    setBankFormData({ ...bankFormData, bank_code: value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：0005"
                  maxLength={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">4桁の数字で入力してください</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支店名 *
                </label>
                <input
                  type="text"
                  value={bankFormData.branch_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, branch_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：渋谷支店"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  支店コード（3桁） *
                </label>
                <input
                  type="text"
                  value={bankFormData.branch_code}
                  onChange={(e) => {
                    // 数字のみ許可
                    const value = e.target.value.replace(/\D/g, '');
                    setBankFormData({ ...bankFormData, branch_code: value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：135"
                  maxLength={3}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">3桁の数字で入力してください</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  口座種別 *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={bankFormData.account_type === 'ordinary'}
                      onChange={() => setBankFormData({ ...bankFormData, account_type: 'ordinary' })}
                      className="form-radio text-blue-600"
                    />
                    <span>普通</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={bankFormData.account_type === 'checking'}
                      onChange={() => setBankFormData({ ...bankFormData, account_type: 'checking' })}
                      className="form-radio text-blue-600"
                    />
                    <span>当座</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  口座番号（7桁） *
                </label>
                <input
                  type="text"
                  value={bankFormData.account_number}
                  onChange={(e) => {
                    // 数字のみ許可
                    const value = e.target.value.replace(/\D/g, '');
                    setBankFormData({ ...bankFormData, account_number: value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：1234567"
                  maxLength={7}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">7桁の数字で入力してください</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  口座名義（カタカナ） *
                </label>
                <input
                  type="text"
                  value={bankFormData.account_holder_name}
                  onChange={(e) => setBankFormData({ ...bankFormData, account_holder_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：ヤマダ タロウ"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">カタカナで入力してください（姓と名の間にスペース）</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              {bankAccount && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowBankForm(false)}
                >
                  キャンセル
                </Button>
              )}
              <Button
                type="submit"
                isLoading={isSavingBank}
              >
                保存する
              </Button>
            </div>
          </form>
        ) : bankAccount ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">銀行名</p>
                <p className="font-medium">{bankAccount.bank_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">銀行コード</p>
                <p className="font-medium">{bankAccount.bank_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">支店名</p>
                <p className="font-medium">{bankAccount.branch_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">支店コード</p>
                <p className="font-medium">{bankAccount.branch_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">口座種別</p>
                <p className="font-medium">{bankAccount.account_type === 'ordinary' ? '普通' : '当座'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">口座番号</p>
                <p className="font-medium">{bankAccount.account_number}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">口座名義</p>
                <p className="font-medium">{bankAccount.account_holder_name}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Ban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">振込先情報が登録されていません</p>
            <Button onClick={() => setShowBankForm(true)}>
              振込先情報を登録する
            </Button>
          </div>
        )}
      </Card>

      {/* 月別収益 */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <BarChart4 className="w-6 h-6 text-blue-600 mr-2" />
            月別収益
          </h2>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => {
              // CSVダウンロード処理
              alert('CSVダウンロード機能は準備中です');
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV出力
          </Button>
        </div>
        
        {payouts.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">まだ収益データがありません</p>
            <p className="text-sm text-gray-500 mt-2">
              ドッグランの利用があると、ここに収益データが表示されます
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">年月</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">施設名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">売上合計</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手数料（20%）</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">振込金額（80%）</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payout.year}年{getMonthName(payout.month)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payout.park_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{payout.total_revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ¥{payout.platform_fee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ¥{payout.owner_payout.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payout.status)}`}>
                        {getStatusLabel(payout.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 振込スケジュール */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Clock className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">振込スケジュール</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 振込は毎月15日に前月分を一括で行います</p>
              <p>• 振込手数料は当社負担です</p>
              <p>• 振込金額が5,000円未満の場合は翌月に繰り越されます</p>
              <p>• 振込完了後、メールでお知らせします</p>
              <p>• 振込先情報に変更がある場合は、前月末日までに更新してください</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 収益システムについて */}
      <Card className="p-6">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-gray-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">収益システムについて</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• 売上の<span className="font-medium">80%</span>がオーナー様に支払われます</p>
              <p>• 残りの<span className="font-medium">20%</span>は当社の手数料となります</p>
              <p>• 手数料には、決済手数料、システム利用料、保険料などが含まれます</p>
              <p>• 収益は以下の項目から発生します：</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>通常利用（1日券）：800円/日</li>
                <li>施設貸し切り：4,400円/時間</li>
                <li>プライベートブース：5,000円/2時間</li>
              </ul>
              <p>• サブスクリプション収益は利用回数に応じて分配されます</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}



// Edit component for the dashboard
function Edit({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
}