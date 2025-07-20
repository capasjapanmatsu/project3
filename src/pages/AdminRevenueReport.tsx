import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, DollarSign, Building, Search, ChevronLeft, ChevronRight, AlertTriangle, Ban as Bank } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { downloadCSVWithBOM } from '../utils/csvExport';

interface OwnerRevenue {
  owner_id: string;
  owner_name: string;
  park_id: string;
  park_name: string;
  total_revenue: number;
  platform_fee: number;
  owner_payout: number;
  bank_name: string;
  bank_code: string;
  branch_name: string;
  branch_code: string;
  account_type: 'ordinary' | 'checking';
  account_number: string;
  month: number;
  year: number;
}

export function AdminRevenueReport() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [revenueData, setRevenueData] = useState<OwnerRevenue[]>([]);
  const [filteredData, setFilteredData] = useState<OwnerRevenue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPlatformFee, setTotalPlatformFee] = useState(0);
  const [totalOwnerPayout, setTotalOwnerPayout] = useState(0);

  // 月の選択肢
  const months = [
    { value: 0, label: '1月' },
    { value: 1, label: '2月' },
    { value: 2, label: '3月' },
    { value: 3, label: '4月' },
    { value: 4, label: '5月' },
    { value: 5, label: '6月' },
    { value: 6, label: '7月' },
    { value: 7, label: '8月' },
    { value: 8, label: '9月' },
    { value: 9, label: '10月' },
    { value: 10, label: '11月' },
    { value: 11, label: '12月' }
  ];

  // 年の選択肢（現在から3年前まで）
  const years = Array.from({ length: 4 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: `${year}年` };
  });

  useEffect(() => {
    // 管理者権限チェック
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    fetchRevenueData();
  }, [isAdmin, navigate, selectedYear, selectedMonth]);

  useEffect(() => {
    if (revenueData.length > 0) {
      filterData();
    }
  }, [revenueData, searchTerm]);

  const fetchRevenueData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // 選択された年月の月初と月末を計算
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      
      // 日付をISO形式に変換
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // 売上データを取得（実際の実装ではRPCを使用）
      const { data, error } = await supabase.rpc('get_monthly_revenue_by_park', {
        start_date_param: startDateStr,
        end_date_param: endDateStr
      });
      
      if (error) throw error;
      
      // データを整形
      const formattedData: OwnerRevenue[] = (data || []).map((item: OwnerRevenue) => ({
        owner_id: item.owner_id,
        owner_name: item.owner_name,
        park_id: item.park_id,
        park_name: item.park_name,
        total_revenue: item.total_revenue,
        platform_fee: Math.round(item.total_revenue * 0.2), // 20%の手数料
        owner_payout: Math.round(item.total_revenue * 0.8), // 80%のオーナー取り分
        bank_name: item.bank_name || '未設定',
        bank_code: item.bank_code || '未設定',
        branch_name: item.branch_name || '未設定',
        branch_code: item.branch_code || '未設定',
        account_type: item.account_type || 'ordinary',
        account_number: item.account_number || '未設定',
        month: selectedMonth + 1,
        year: selectedYear
      }));
      
      setRevenueData(formattedData);
      
      // 合計を計算
      const totals = formattedData.reduce((acc, item) => {
        acc.totalRevenue += item.total_revenue;
        acc.totalPlatformFee += item.platform_fee;
        acc.totalOwnerPayout += item.owner_payout;
        return acc;
      }, { totalRevenue: 0, totalPlatformFee: 0, totalOwnerPayout: 0 });
      
      setTotalRevenue(totals.totalRevenue);
      setTotalPlatformFee(totals.totalPlatformFee);
      setTotalOwnerPayout(totals.totalOwnerPayout);
      
      // フィルタリング
      filterData();
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setError('売上データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    if (!searchTerm.trim()) {
      setFilteredData(revenueData);
      return;
    }
    
    const filtered = revenueData.filter(item => 
      item.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.park_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredData(filtered);
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // 未来の月は選択できないようにする
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      return;
    }
    
    if (selectedMonth === 11) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const downloadCSV = () => {
    // ヘッダー行
    const headers = [
      'オーナー名',
      'ドッグラン名',
      '売上合計額',
      'プラットフォーム手数料（20%）',
      '振込金額（80%）',
      '銀行名',
      '銀行コード',
      '支店名',
      '支店コード',
      '口座種別',
      '口座番号',
      '年',
      '月'
    ];
    
    // データ行
    const rows = filteredData.map(item => [
      item.owner_name,
      item.park_name,
      item.total_revenue,
      item.platform_fee,
      item.owner_payout,
      item.bank_name,
      item.bank_code,
      item.branch_name,
      item.branch_code,
      item.account_type === 'ordinary' ? '普通' : '当座',
      item.account_number,
      item.year,
      item.month
    ]);
    
    // ファイル名
    const filename = `ドッグラン売上_${selectedYear}年${selectedMonth + 1}月.csv`;
    
    // CSVダウンロード
    downloadCSVWithBOM(headers, rows, filename);
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
        <Link
          to="/admin"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          管理者ダッシュボードに戻る
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <DollarSign className="w-8 h-8 text-green-600 mr-3" />
          ドッグラン売上レポート
        </h1>
        <Button 
          onClick={downloadCSV}
          disabled={filteredData.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          CSV出力
        </Button>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      


      {/* 月選択 */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map(year => (
                  <option key={year.value} value={year.value}>{year.label}</option>
                ))}
              </select>
              
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleNextMonth}
              disabled={
                selectedYear === new Date().getFullYear() && 
                selectedMonth === new Date().getMonth()
              }
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="w-full md:w-64">
            <Input
              label=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="オーナー名・ドッグラン名で検索..."
              icon={<Search className="w-4 h-4 text-gray-500" />}
            />
          </div>
        </div>
      </Card>

      {/* 売上サマリー */}
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
              <p className="text-sm font-medium text-gray-600">プラットフォーム手数料（20%）</p>
              <p className="text-2xl font-bold text-blue-600">¥{totalPlatformFee.toLocaleString()}</p>
            </div>
            <Building className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">オーナー振込額（80%）</p>
              <p className="text-2xl font-bold text-purple-600">¥{totalOwnerPayout.toLocaleString()}</p>
            </div>
            <Bank className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* 売上データテーブル */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">ドッグラン別売上</h2>
        
        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">この月の売上データはありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">オーナー名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ドッグラン名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">売上合計</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手数料（20%）</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">振込金額（80%）</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">振込先</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={`${item.park_id}-${item.month}-${item.year}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.owner_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.park_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      ¥{item.total_revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ¥{item.platform_fee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ¥{item.owner_payout.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.bank_name !== '未設定' ? (
                        <div>
                          <p>{item.bank_name}（{item.bank_code}）</p>
                          <p>{item.branch_name}（{item.branch_code}）</p>
                          <p>{item.account_type === 'ordinary' ? '普通' : '当座'} {item.account_number}</p>
                        </div>
                      ) : (
                        <span className="text-red-600">未設定</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 注意事項 */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Bank className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">振込情報について</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 振込は毎月15日に前月分を一括で行います</p>
              <p>• 振込手数料は当社負担です</p>
              <p>• 振込先情報が未設定のオーナーには振込ができません</p>
              <p>• 振込金額が5,000円未満の場合は翌月に繰り越されます</p>
              <p>• 振込完了後、オーナーに自動でメールが送信されます</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
