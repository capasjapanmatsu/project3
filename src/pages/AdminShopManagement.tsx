import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Package, 
  Truck, 
  CheckCircle, 
  X, 
  Eye, 
  AlertTriangle,
  Search,
  Filter,
  Download,
  Edit,
  Save,
  Clock,
  Calendar,
  User,
  CreditCard,
  FileText,
  RefreshCw,
  Bell,
  Megaphone
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { downloadCSVWithBOM } from '../utils/csvExport';
import type { Order, OrderItem, Product, NewsAnnouncement, NewParkOpening } from '../types';

interface OrderWithItems extends Order {
  order_items: (OrderItem & { product: Product })[];
}

export function AdminShopManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'news'>('orders');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
  const [newParks, setNewParks] = useState<NewParkOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsAnnouncement | null>(null);
  const [selectedNewPark, setSelectedNewPark] = useState<NewParkOpening | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    status: '',
    tracking_number: '',
    shipping_carrier: '',
    estimated_delivery_date: '',
    notes: ''
  });
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock_quantity: 0,
    is_active: true,
    brand: '',
    weight: 0,
    size: '',
    ingredients: '',
    age_group: '',
    dog_size: '',
    image_url: ''
  });
  const [newsFormData, setNewsFormData] = useState({
    title: '',
    content: '',
    category: 'news',
    is_important: false,
    image_url: '',
    link_url: '',
    park_id: ''
  });
  const [newParkFormData, setNewParkFormData] = useState({
    name: '',
    address: '',
    image_url: '',
    opening_date: '',
    park_id: ''
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showNewParkModal, setShowNewParkModal] = useState(false);
  const [dogParks, setDogParks] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    // 管理者権限チェック
    if (user?.email !== 'capasjapan@gmail.com') {
      navigate('/');
      return;
    }
    
    fetchData();
    fetchDogParks();
  }, [user, navigate, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (activeTab === 'orders') {
        // 注文一覧を取得
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              product:products(*)
            )
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setOrders(data || []);
      } else if (activeTab === 'products') {
        // 商品一覧を取得
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProducts(data || []);
      } else if (activeTab === 'news') {
        // 新着情報を取得
        const { data: newsData, error: newsError } = await supabase
          .from('news_announcements')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (newsError) throw newsError;
        setNews(newsData || []);
        
        // 新規オープンのドッグランを取得
        const { data: parksData, error: parksError } = await supabase
          .from('new_park_openings')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (parksError) throw parksError;
        setNewParks(parksData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDogParks = async () => {
    try {
      const { data, error } = await supabase
        .from('dog_parks')
        .select('id, name')
        .eq('status', 'approved');
      
      if (error) throw error;
      setDogParks(data || []);
    } catch (error) {
      console.error('Error fetching dog parks:', error);
    }
  };

  const handleOrderSelect = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setOrderFormData({
      status: order.status,
      tracking_number: order.tracking_number || '',
      shipping_carrier: order.shipping_carrier || '',
      estimated_delivery_date: order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toISOString().split('T')[0] : '',
      notes: order.notes || ''
    });
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setProductFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
      brand: product.brand || '',
      weight: product.weight || 0,
      size: product.size || '',
      ingredients: product.ingredients || '',
      age_group: product.age_group || 'all',
      dog_size: product.dog_size || 'all',
      image_url: product.image_url
    });
    setShowProductModal(true);
  };

  const handleNewsSelect = (news: NewsAnnouncement) => {
    setSelectedNews(news);
    setNewsFormData({
      title: news.title,
      content: news.content,
      category: news.category,
      is_important: news.is_important || false,
      image_url: news.image_url || '',
      link_url: news.link_url || '',
      park_id: news.park_id || ''
    });
    setShowNewsModal(true);
  };

  const handleNewParkSelect = (park: NewParkOpening) => {
    setSelectedNewPark(park);
    setNewParkFormData({
      name: park.name,
      address: park.address,
      image_url: park.image_url,
      opening_date: park.opening_date,
      park_id: park.park_id || ''
    });
    setShowNewParkModal(true);
  };

  const handleOrderUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    try {
      setIsUpdating(true);
      setError('');
      setSuccess('');
      
      // 注文ステータスを更新
      const { error } = await supabase
        .from('orders')
        .update({
          status: orderFormData.status,
          tracking_number: orderFormData.tracking_number || null,
          shipping_carrier: orderFormData.shipping_carrier || null,
          estimated_delivery_date: orderFormData.estimated_delivery_date || null,
          notes: orderFormData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);
      
      if (error) throw error;
      
      // 注文が発送済みになった場合は通知を送信
      if (orderFormData.status === 'shipped' && selectedOrder.status !== 'shipped') {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert([{
            user_id: selectedOrder.user_id,
            type: 'order_shipped',
            title: '注文が発送されました',
            message: `注文番号: ${selectedOrder.order_number} の商品が発送されました。${orderFormData.tracking_number ? `追跡番号: ${orderFormData.tracking_number}` : ''}`,
            data: { 
              order_id: selectedOrder.id, 
              order_number: selectedOrder.order_number,
              tracking_number: orderFormData.tracking_number || null
            }
          }]);
        
        if (notifyError) {
          console.error('Error sending notification:', notifyError);
          // 通知エラーは無視して続行
        }
      }
      
      // 注文が配達完了になった場合も通知を送信
      if (orderFormData.status === 'delivered' && selectedOrder.status !== 'delivered') {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert([{
            user_id: selectedOrder.user_id,
            type: 'order_delivered',
            title: '注文が配達されました',
            message: `注文番号: ${selectedOrder.order_number} の商品が配達されました。ご利用ありがとうございました。`,
            data: { 
              order_id: selectedOrder.id, 
              order_number: selectedOrder.order_number
            }
          }]);
        
        if (notifyError) {
          console.error('Error sending notification:', notifyError);
          // 通知エラーは無視して続行
        }
      }
      
      setSuccess('注文情報を更新しました');
      
      // 注文一覧を再取得
      await fetchData();
      
      // 選択中の注文も更新
      const { data: updatedOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products(*)
          )
        `)
        .eq('id', selectedOrder.id)
        .single();
      
      if (!fetchError && updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating order:', error);
      setError('注文の更新に失敗しました: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProductUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    try {
      setIsUpdating(true);
      setError('');
      setSuccess('');
      
      // 商品情報を更新
      const { error } = await supabase
        .from('products')
        .update({
          name: productFormData.name,
          description: productFormData.description,
          price: productFormData.price,
          category: productFormData.category,
          stock_quantity: productFormData.stock_quantity,
          is_active: productFormData.is_active,
          brand: productFormData.brand || null,
          weight: productFormData.weight || null,
          size: productFormData.size || null,
          ingredients: productFormData.ingredients || null,
          age_group: productFormData.age_group || 'all',
          dog_size: productFormData.dog_size || 'all',
          image_url: productFormData.image_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct.id);
      
      if (error) throw error;
      
      setSuccess('商品情報を更新しました');
      
      // 商品一覧を再取得
      await fetchData();
      
      // モーダルを閉じる
      setShowProductModal(false);
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating product:', error);
      setError('商品の更新に失敗しました: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNewsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUpdating(true);
      setError('');
      setSuccess('');
      
      if (selectedNews) {
        // 既存のニュースを更新
        const { error } = await supabase
          .from('news_announcements')
          .update({
            title: newsFormData.title,
            content: newsFormData.content,
            category: newsFormData.category,
            is_important: newsFormData.is_important,
            image_url: newsFormData.image_url || null,
            link_url: newsFormData.link_url || null,
            park_id: newsFormData.park_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNews.id);
        
        if (error) throw error;
        
        setSuccess('新着情報を更新しました');
      } else {
        // 新規ニュースを作成
        const { error } = await supabase
          .from('news_announcements')
          .insert([{
            title: newsFormData.title,
            content: newsFormData.content,
            category: newsFormData.category,
            is_important: newsFormData.is_important,
            image_url: newsFormData.image_url || null,
            link_url: newsFormData.link_url || null,
            park_id: newsFormData.park_id || null,
            created_by: user?.id
          }]);
        
        if (error) throw error;
        
        setSuccess('新着情報を作成しました');
      }
      
      // 新着情報一覧を再取得
      await fetchData();
      
      // モーダルを閉じる
      setShowNewsModal(false);
      setSelectedNews(null);
      setNewsFormData({
        title: '',
        content: '',
        category: 'news',
        is_important: false,
        image_url: '',
        link_url: '',
        park_id: ''
      });
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating news:', error);
      setError('新着情報の更新に失敗しました: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNewParkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUpdating(true);
      setError('');
      setSuccess('');
      
      if (selectedNewPark) {
        // 既存の新規オープン情報を更新
        const { error } = await supabase
          .from('new_park_openings')
          .update({
            name: newParkFormData.name,
            address: newParkFormData.address,
            image_url: newParkFormData.image_url,
            opening_date: newParkFormData.opening_date,
            park_id: newParkFormData.park_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNewPark.id);
        
        if (error) throw error;
        
        setSuccess('新規オープン情報を更新しました');
      } else {
        // 新規オープン情報を作成
        const { error } = await supabase
          .from('new_park_openings')
          .insert([{
            name: newParkFormData.name,
            address: newParkFormData.address,
            image_url: newParkFormData.image_url,
            opening_date: newParkFormData.opening_date,
            park_id: newParkFormData.park_id || null
          }]);
        
        if (error) throw error;
        
        setSuccess('新規オープン情報を作成しました');
      }
      
      // 新規オープン情報一覧を再取得
      await fetchData();
      
      // モーダルを閉じる
      setShowNewParkModal(false);
      setSelectedNewPark(null);
      setNewParkFormData({
        name: '',
        address: '',
        image_url: '',
        opening_date: '',
        park_id: ''
      });
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error updating new park:', error);
      setError('新規オープン情報の更新に失敗しました: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('この新着情報を削除してもよろしいですか？')) return;
    
    try {
      setIsUpdating(true);
      setError('');
      
      const { error } = await supabase
        .from('news_announcements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess('新着情報を削除しました');
      
      // 新着情報一覧を再取得
      await fetchData();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting news:', error);
      setError('新着情報の削除に失敗しました: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNewPark = async (id: string) => {
    if (!confirm('この新規オープン情報を削除してもよろしいですか？')) return;
    
    try {
      setIsUpdating(true);
      setError('');
      
      const { error } = await supabase
        .from('new_park_openings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSuccess('新規オープン情報を削除しました');
      
      // 新規オープン情報一覧を再取得
      await fetchData();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting new park:', error);
      setError('新規オープン情報の削除に失敗しました: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: '注文受付中',
      confirmed: '注文確定',
      processing: '準備中',
      shipped: '発送済み',
      delivered: '配達完了',
      cancelled: 'キャンセル',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      credit_card: 'クレジットカード',
      bank_transfer: '銀行振込',
      cod: '代金引換',
      paypay: 'PayPay',
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getPaymentStatusLabel = (status: string) => {
    const labels = {
      pending: '未決済',
      completed: '決済完了',
      failed: '決済失敗',
      cancelled: 'キャンセル',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      news: 'お知らせ',
      announcement: '重要なお知らせ',
      sale: 'セール情報'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      news: 'bg-blue-100 text-blue-800',
      announcement: 'bg-red-100 text-red-800',
      sale: 'bg-green-100 text-green-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const downloadOrdersCSV = () => {
    if (orders.length === 0) return;
    
    // CSVヘッダー
    const headers = [
      '注文番号',
      '注文日',
      'ステータス',
      '支払い方法',
      '支払いステータス',
      '合計金額',
      '割引額',
      '送料',
      '最終金額',
      '配送先氏名',
      '配送先郵便番号',
      '配送先住所',
      '配送先電話番号',
      '配送予定日',
      '追跡番号',
      '配送業者',
      '備考'
    ];
    
    // CSVデータ行
    const rows = orders.map(order => [
      order.order_number,
      new Date(order.created_at).toLocaleDateString('ja-JP'),
      getStatusLabel(order.status),
      getPaymentMethodLabel(order.payment_method),
      getPaymentStatusLabel(order.payment_status),
      order.total_amount,
      order.discount_amount,
      order.shipping_fee,
      order.final_amount,
      order.shipping_name,
      order.shipping_postal_code,
      order.shipping_address,
      order.shipping_phone,
      order.estimated_delivery_date ? new Date(order.estimated_delivery_date).toLocaleDateString('ja-JP') : '',
      order.tracking_number || '',
      order.shipping_carrier || '',
      order.notes || ''
    ]);
    
    // CSVファイルをダウンロード
    downloadCSVWithBOM(headers, rows, `注文一覧_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shipping_address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredNews = news.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNewParks = newParks.filter(park => 
    park.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    park.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <ShoppingBag className="w-8 h-8 text-green-600 mr-3" />
          ショップ管理
        </h1>
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

      {/* タブナビゲーション */}
      <div className="flex space-x-4 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'orders'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('orders')}
        >
          <Package className="w-4 h-4 inline mr-2" />
          注文管理
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'products'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('products')}
        >
          <ShoppingBag className="w-4 h-4 inline mr-2" />
          商品管理
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'news'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('news')}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          新着情報管理
        </button>
      </div>

      {/* 注文管理タブ */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* 検索・フィルター */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label=""
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="注文番号、顧客名、住所で検索..."
                icon={<Search className="w-4 h-4 text-gray-500" />}
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">すべてのステータス</option>
                <option value="pending">注文受付中</option>
                <option value="confirmed">注文確定</option>
                <option value="processing">準備中</option>
                <option value="shipped">発送済み</option>
                <option value="delivered">配達完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
          </div>

          {/* CSV出力ボタン */}
          <div className="flex justify-end">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={downloadOrdersCSV}
              disabled={orders.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV出力
            </Button>
          </div>

          {/* 注文一覧 */}
          {filteredOrders.length === 0 ? (
            <Card className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">注文がありません</h2>
              <p className="text-gray-500">該当する注文が見つかりませんでした</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文番号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文日</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">支払い</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.shipping_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ¥{order.final_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">{getPaymentMethodLabel(order.payment_method)}</span>
                          <span className={`mt-1 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                            {getPaymentStatusLabel(order.payment_status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOrderSelect(order)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          詳細
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 商品管理タブ */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Input
              label=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="商品名、説明で検索..."
              icon={<Search className="w-4 h-4 text-gray-500" />}
              className="w-64"
            />
            <Button onClick={() => {
              setSelectedProduct(null);
              setProductFormData({
                name: '',
                description: '',
                price: 0,
                category: '',
                stock_quantity: 0,
                is_active: true,
                brand: '',
                weight: 0,
                size: '',
                ingredients: '',
                age_group: 'all',
                dog_size: 'all',
                image_url: ''
              });
              setShowProductModal(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              新規商品登録
            </Button>
          </div>

          {/* 商品一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {product.image_url && (
                  <div className="h-48 -m-6 mb-4">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                      }}
                    />
                  </div>
                )}
                <div className="px-6 pb-6">
                  <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-bold text-green-600">¥{product.price.toLocaleString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${product.stock_quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      在庫: {product.stock_quantity}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => handleProductSelect(product)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    編集
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 新着情報管理タブ */}
      {activeTab === 'news' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Input
              label=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="タイトル、内容で検索..."
              icon={<Search className="w-4 h-4 text-gray-500" />}
              className="w-64"
            />
            <div className="flex space-x-3">
              <Button onClick={() => {
                setSelectedNews(null);
                setNewsFormData({
                  title: '',
                  content: '',
                  category: 'news',
                  is_important: false,
                  image_url: '',
                  link_url: '',
                  park_id: ''
                });
                setShowNewsModal(true);
              }}>
                <Bell className="w-4 h-4 mr-2" />
                新着情報を追加
              </Button>
              <Button onClick={() => {
                setSelectedNewPark(null);
                setNewParkFormData({
                  name: '',
                  address: '',
                  image_url: '',
                  opening_date: '',
                  park_id: ''
                });
                setShowNewParkModal(true);
              }}>
                <Building className="w-4 h-4 mr-2" />
                新規オープン情報を追加
              </Button>
            </div>
          </div>

          {/* 新着情報一覧 */}
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Bell className="w-6 h-6 text-blue-600 mr-2" />
            新着情報
          </h2>
          
          {filteredNews.length === 0 ? (
            <Card className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">新着情報がありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNews.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                          {getCategoryLabel(item.category)}
                        </span>
                        {item.is_important && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                            重要
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.content}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleNewsSelect(item)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteNews(item.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 新規オープン情報一覧 */}
          <h2 className="text-xl font-semibold mb-4 flex items-center mt-8">
            <Building className="w-6 h-6 text-purple-600 mr-2" />
            新規オープン情報
          </h2>
          
          {filteredNewParks.length === 0 ? (
            <Card className="text-center py-8">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">新規オープン情報がありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNewParks.map((park) => (
                <Card key={park.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          新規オープン
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(park.created_at).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <h3 className="font-semibold">{park.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{park.address}</p>
                      <p className="text-sm text-blue-600 mt-1">オープン日: {park.opening_date}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleNewParkSelect(park)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteNewPark(park.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 注文詳細モーダル */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">注文詳細</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3">注文情報</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">注文番号:</span> {selectedOrder.order_number}</p>
                    <p><span className="font-medium">注文日:</span> {new Date(selectedOrder.created_at).toLocaleDateString('ja-JP')}</p>
                    <p>
                      <span className="font-medium">ステータス:</span>{' '}
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusLabel(selectedOrder.status)}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">支払い方法:</span>{' '}
                      {getPaymentMethodLabel(selectedOrder.payment_method)}
                    </p>
                    <p>
                      <span className="font-medium">支払いステータス:</span>{' '}
                      <span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(selectedOrder.payment_status)}`}>
                        {getPaymentStatusLabel(selectedOrder.payment_status)}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">配送先</h3>
                  <div className="text-sm">
                    <p className="font-medium">{selectedOrder.shipping_name}</p>
                    <p>〒{selectedOrder.shipping_postal_code}</p>
                    <p>{selectedOrder.shipping_address}</p>
                    <p>{selectedOrder.shipping_phone}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">注文商品</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">単価</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">小計</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.order_items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={item.product.image_url}
                                  alt={item.product.name}
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                                  }}
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                                <div className="text-sm text-gray-500">{item.product.sku || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ¥{item.unit_price.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ¥{item.total_price.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3">料金詳細</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>商品小計</span>
                        <span>¥{selectedOrder.total_amount.toLocaleString()}</span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-purple-600">
                          <span>割引</span>
                          <span>-¥{selectedOrder.discount_amount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>送料</span>
                        <span>
                          {selectedOrder.shipping_fee === 0 ? '無料' : `¥${selectedOrder.shipping_fee.toLocaleString()}`}
                        </span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold">
                        <span>合計</span>
                        <span className="text-green-600">¥{selectedOrder.final_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleOrderUpdate}>
                  <h3 className="font-semibold mb-3">注文ステータス更新</h3>
                  <div className="space-y-4">
                    <Select
                      label="ステータス"
                      options={[
                        { value: 'pending', label: '注文受付中' },
                        { value: 'confirmed', label: '注文確定' },
                        { value: 'processing', label: '準備中' },
                        { value: 'shipped', label: '発送済み' },
                        { value: 'delivered', label: '配達完了' },
                        { value: 'cancelled', label: 'キャンセル' },
                      ]}
                      value={orderFormData.status}
                      onChange={(e) => setOrderFormData({ ...orderFormData, status: e.target.value })}
                      required
                    />
                    
                    <Input
                      label="追跡番号"
                      value={orderFormData.tracking_number}
                      onChange={(e) => setOrderFormData({ ...orderFormData, tracking_number: e.target.value })}
                      placeholder="追跡番号を入力"
                      icon={<Truck className="w-4 h-4 text-gray-500" />}
                    />
                    
                    <Input
                      label="配送業者"
                      value={orderFormData.shipping_carrier}
                      onChange={(e) => setOrderFormData({ ...orderFormData, shipping_carrier: e.target.value })}
                      placeholder="配送業者名を入力"
                      icon={<Truck className="w-4 h-4 text-gray-500" />}
                    />
                    
                    <Input
                      label="お届け予定日"
                      type="date"
                      value={orderFormData.estimated_delivery_date}
                      onChange={(e) => setOrderFormData({ ...orderFormData, estimated_delivery_date: e.target.value })}
                      icon={<Calendar className="w-4 h-4 text-gray-500" />}
                    />
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        備考
                      </label>
                      <textarea
                        value={orderFormData.notes}
                        onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={3}
                        placeholder="備考を入力"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      isLoading={isUpdating}
                      className="w-full"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      更新する
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 商品編集モーダル */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{selectedProduct ? '商品編集' : '新規商品登録'}</h2>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleProductUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Input
                    label="商品名 *"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    required
                  />
                  
                  <Input
                    label="価格 (円) *"
                    type="number"
                    value={productFormData.price.toString()}
                    onChange={(e) => setProductFormData({ ...productFormData, price: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      商品説明 *
                    </label>
                    <textarea
                      value={productFormData.description}
                      onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={4}
                      required
                    />
                  </div>
                  
                  <Select
                    label="カテゴリー *"
                    options={[
                      { value: 'food', label: 'ドッグフード' },
                      { value: 'treats', label: 'おやつ' },
                      { value: 'toys', label: 'おもちゃ' },
                      { value: 'accessories', label: 'アクセサリー' },
                      { value: 'health', label: 'ヘルスケア' },
                      { value: 'sheets', label: 'ペットシーツ' },
                    ]}
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    required
                  />
                  
                  <Input
                    label="在庫数 *"
                    type="number"
                    value={productFormData.stock_quantity.toString()}
                    onChange={(e) => setProductFormData({ ...productFormData, stock_quantity: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                  
                  <Input
                    label="ブランド"
                    value={productFormData.brand}
                    onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                  />
                  
                  <Input
                    label="重量 (g)"
                    type="number"
                    value={productFormData.weight.toString()}
                    onChange={(e) => setProductFormData({ ...productFormData, weight: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  
                  <Input
                    label="サイズ"
                    value={productFormData.size}
                    onChange={(e) => setProductFormData({ ...productFormData, size: e.target.value })}
                    placeholder="例: S, M, L, XL"
                  />
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      原材料
                    </label>
                    <textarea
                      value={productFormData.ingredients}
                      onChange={(e) => setProductFormData({ ...productFormData, ingredients: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                      placeholder="原材料を入力（フードやおやつの場合）"
                    />
                  </div>
                  
                  <Select
                    label="対象年齢"
                    options={[
                      { value: 'all', label: '全年齢' },
                      { value: 'puppy', label: '子犬' },
                      { value: 'adult', label: '成犬' },
                      { value: 'senior', label: 'シニア犬' },
                    ]}
                    value={productFormData.age_group}
                    onChange={(e) => setProductFormData({ ...productFormData, age_group: e.target.value })}
                  />
                  
                  <Select
                    label="対象サイズ"
                    options={[
                      { value: 'all', label: '全サイズ' },
                      { value: 'small', label: '小型犬' },
                      { value: 'medium', label: '中型犬' },
                      { value: 'large', label: '大型犬' },
                    ]}
                    value={productFormData.dog_size}
                    onChange={(e) => setProductFormData({ ...productFormData, dog_size: e.target.value })}
                  />
                  
                  <Input
                    label="画像URL *"
                    value={productFormData.image_url}
                    onChange={(e) => setProductFormData({ ...productFormData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={productFormData.is_active}
                      onChange={(e) => setProductFormData({ ...productFormData, is_active: e.target.checked })}
                      className="rounded text-green-600"
                    />
                    <label htmlFor="is_active" className="text-sm text-gray-700">
                      商品を有効にする（オンにすると商品が表示されます）
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowProductModal(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isUpdating}
                  >
                    {selectedProduct ? '更新する' : '登録する'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 新着情報編集モーダル */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{selectedNews ? '新着情報を編集' : '新着情報を追加'}</h2>
                <button
                  onClick={() => setShowNewsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleNewsUpdate}>
                <div className="space-y-4">
                  <Input
                    label="タイトル *"
                    value={newsFormData.title}
                    onChange={(e) => setNewsFormData({ ...newsFormData, title: e.target.value })}
                    required
                  />
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      内容 *
                    </label>
                    <textarea
                      value={newsFormData.content}
                      onChange={(e) => setNewsFormData({ ...newsFormData, content: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="カテゴリー *"
                      options={[
                        { value: 'news', label: 'お知らせ' },
                        { value: 'announcement', label: '重要なお知らせ' },
                        { value: 'sale', label: 'セール情報' },
                      ]}
                      value={newsFormData.category}
                      onChange={(e) => setNewsFormData({ ...newsFormData, category: e.target.value })}
                      required
                    />
                    
                    <div className="flex items-center space-x-2 mt-8">
                      <input
                        type="checkbox"
                        id="is_important"
                        checked={newsFormData.is_important}
                        onChange={(e) => setNewsFormData({ ...newsFormData, is_important: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <label htmlFor="is_important" className="text-sm text-gray-700">
                        重要なお知らせとして表示する
                      </label>
                    </div>
                  </div>
                  
                  <Input
                    label="画像URL"
                    value={newsFormData.image_url}
                    onChange={(e) => setNewsFormData({ ...newsFormData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                  
                  <Input
                    label="リンクURL"
                    value={newsFormData.link_url}
                    onChange={(e) => setNewsFormData({ ...newsFormData, link_url: e.target.value })}
                    placeholder="https://example.com/page"
                  />
                  
                  <Select
                    label="関連ドッグラン"
                    options={[
                      { value: '', label: '関連ドッグランなし' },
                      ...dogParks.map(park => ({ value: park.id, label: park.name }))
                    ]}
                    value={newsFormData.park_id}
                    onChange={(e) => setNewsFormData({ ...newsFormData, park_id: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowNewsModal(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isUpdating}
                  >
                    {selectedNews ? '更新する' : '追加する'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 新規オープン情報編集モーダル */}
      {showNewParkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">{selectedNewPark ? '新規オープン情報を編集' : '新規オープン情報を追加'}</h2>
                <button
                  onClick={() => setShowNewParkModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleNewParkUpdate}>
                <div className="space-y-4">
                  <Input
                    label="施設名 *"
                    value={newParkFormData.name}
                    onChange={(e) => setNewParkFormData({ ...newParkFormData, name: e.target.value })}
                    required
                  />
                  
                  <Input
                    label="住所 *"
                    value={newParkFormData.address}
                    onChange={(e) => setNewParkFormData({ ...newParkFormData, address: e.target.value })}
                    required
                  />
                  
                  <Input
                    label="画像URL *"
                    value={newParkFormData.image_url}
                    onChange={(e) => setNewParkFormData({ ...newParkFormData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                  
                  <Input
                    label="オープン日 *"
                    value={newParkFormData.opening_date}
                    onChange={(e) => setNewParkFormData({ ...newParkFormData, opening_date: e.target.value })}
                    placeholder="2025年7月1日"
                    required
                  />
                  
                  <Select
                    label="関連ドッグラン"
                    options={[
                      { value: '', label: '関連ドッグランなし' },
                      ...dogParks.map(park => ({ value: park.id, label: park.name }))
                    ]}
                    value={newParkFormData.park_id}
                    onChange={(e) => setNewParkFormData({ ...newParkFormData, park_id: e.target.value })}
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowNewParkModal(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isUpdating}
                  >
                    {selectedNewPark ? '更新する' : '追加する'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Plus component for the dashboard
function Plus({ className }: { className?: string }) {
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
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}