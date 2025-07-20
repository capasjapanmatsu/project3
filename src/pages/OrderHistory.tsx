import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  X,
  Eye,
  Download,
  Star,
  ArrowLeft,
  User,
  CreditCard,
  History,
  ShoppingBag,
  AlertTriangle
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import type { Order, OrderItem } from '../types';

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  can_cancel: boolean | null;
  time_left?: string;
}

export function OrderHistory() {
  const { user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
      
      // 1分ごとにキャンセル可能時間を更新
      const interval = setInterval(() => {
        updateCancellationTimes();
      }, 60000);
      
      return () => clearInterval(interval);
    }

    // 注文完了後のリダイレクトの場合
    if (location.state?.orderSuccess) {
      setShowOrderSuccess(true);
      setTimeout(() => setShowOrderSuccess(false), 5000);
    }
  }, [user, location]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:products (*)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // 各注文のキャンセル可能状態を計算
      const ordersWithCancellation = (data || []).map(order => {
        const cancellableUntil = order.cancellable_until ? new Date(order.cancellable_until) : null;
        const now = new Date();
        const canCancel = 
          cancellableUntil && 
          now < cancellableUntil && 
          ['pending', 'confirmed'].includes(order.status);
        
        let timeLeft;
        if (canCancel && cancellableUntil) {
          const diffMs = cancellableUntil.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          timeLeft = `${diffMins}分${diffSecs}秒`;
        }
        
        return {
          ...order,
          can_cancel: canCancel,
          time_left: timeLeft
        };
      });
      
      setOrders(ordersWithCancellation);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCancellationTimes = () => {
    const now = new Date();
    
    setOrders(prevOrders => 
      prevOrders.map(order => {
        const cancellableUntil = order.cancellable_until ? new Date(order.cancellable_until) : null;
        const canCancel = 
          cancellableUntil && 
          now < cancellableUntil && 
          ['pending', 'confirmed'].includes(order.status);
        
        let timeLeft;
        if (canCancel && cancellableUntil) {
          const diffMs = cancellableUntil.getTime() - now.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          timeLeft = `${diffMins}分${diffSecs}秒`;
        }
        
        return {
          ...order,
          can_cancel: canCancel,
          time_left: timeLeft
        };
      })
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'processing':
        return <Package className="w-5 h-5 text-purple-600" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-orange-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
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
      pending: 'text-yellow-600 bg-yellow-100',
      confirmed: 'text-blue-600 bg-blue-100',
      processing: 'text-purple-600 bg-purple-100',
      shipped: 'text-orange-600 bg-orange-100',
      delivered: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      credit_card: 'クレジットカード',
      bank_transfer: '銀行振込',
      cod: '代金引換',
  
    };
    return labels[method as keyof typeof labels] || method;
  };

  // CSV出力用の関数
  const downloadCSV = () => {
    if (orders.length === 0) return;
    
    // UTF-8 BOMを追加（Excelで文字化けを防ぐため）
    const BOM = '\uFEFF';
    
    // CSVヘッダー
    const headers = [
      '注文番号',
      '注文日',
      'ステータス',
      '商品名',
      '数量',
      '単価',
      '小計',
      '割引',
      '送料',
      '合計金額',
      '支払い方法',
      '配送先氏名',
      '配送先住所',
      '配送先電話番号'
    ].join(',');
    
    // CSVデータ行
    const rows: string[] = [];
    
    orders.forEach(order => {
      // 注文の基本情報
      const orderDate = new Date(order.created_at).toLocaleDateString('ja-JP');
      const status = getStatusLabel(order.status);
      const paymentMethod = getPaymentMethodLabel(order.payment_method);
      
      // 各注文商品ごとに行を作成
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach((item, index) => {
          const row = [
            order.order_number,
            orderDate,
            status,
            `"${item.product.name.replace(/"/g, '""')}"`, // ダブルクォートをエスケープ
            item.quantity,
            item.unit_price,
            item.total_price,
            index === 0 ? order.discount_amount : '', // 最初の商品行にのみ表示
            index === 0 ? order.shipping_fee : '', // 最初の商品行にのみ表示
            index === 0 ? order.final_amount : '', // 最初の商品行にのみ表示
            index === 0 ? paymentMethod : '', // 最初の商品行にのみ表示
            index === 0 ? `"${order.shipping_name.replace(/"/g, '""')}"` : '', // 最初の商品行にのみ表示
            index === 0 ? `"${order.shipping_address.replace(/"/g, '""')}"` : '', // 最初の商品行にのみ表示
            index === 0 ? order.shipping_phone : '' // 最初の商品行にのみ表示
          ].join(',');
          
          rows.push(row);
        });
      } else {
        // 注文商品がない場合でも注文情報だけは出力
        const row = [
          order.order_number,
          orderDate,
          status,
          '商品なし',
          '',
          '',
          '',
          order.discount_amount,
          order.shipping_fee,
          order.final_amount,
          paymentMethod,
          `"${order.shipping_name.replace(/"/g, '""')}"`,
          `"${order.shipping_address.replace(/"/g, '""')}"`,
          order.shipping_phone
        ].join(',');
        
        rows.push(row);
      }
    });
    
    // CSVデータを作成（BOMを先頭に追加）
    const csvContent = BOM + [headers, ...rows].join('\n');
    
    // CSVファイルをダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `注文履歴_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setIsCancelling(true);
      setCancelError(null);
      setCancelSuccess(null);
      
      const { data, error } = await supabase.rpc('cancel_order', {
        order_id: orderId,
        user_id: user?.id
      });
      
      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.message || 'キャンセルに失敗しました');
      }
      
      setCancelSuccess('注文をキャンセルしました');
      setShowCancelConfirm(null);
      
      // 注文一覧を更新
      await fetchOrders();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setCancelSuccess(null);
      }, 3000);
    } catch (error: unknown) {
      console.error('Error cancelling order:', error);
      setCancelError('注文のキャンセルに失敗しました。');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8 flex items-center">
        <Package className="w-8 h-8 text-green-600 mr-3" />
        注文履歴
      </h1>
      
      {/* クイックリンク */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Link to="/profile-settings">
          <Button variant="secondary" size="sm">
            <User className="w-4 h-4 mr-2" />
            プロフィール編集
          </Button>
        </Link>
        <Link to="/payment-method-settings">
          <Button variant="secondary" size="sm">
            <CreditCard className="w-4 h-4 mr-2" />
            支払い方法
          </Button>
        </Link>
        <Link to="/dogpark-history">
          <Button variant="secondary" size="sm">
            <History className="w-4 h-4 mr-2" />
            ドッグラン利用履歴
          </Button>
        </Link>
        <Link to="/shop">
          <Button variant="secondary" size="sm">
            <ShoppingBag className="w-4 h-4 mr-2" />
            ショップに戻る
          </Button>
        </Link>
      </div>

      {/* 注文完了メッセージ */}
      {showOrderSuccess && location.state?.orderNumber && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">ご注文ありがとうございます！</span>
          </div>
          <p className="text-green-700 mt-1">
            注文番号: {location.state.orderNumber} のご注文を承りました。
          </p>
        </div>
      )}

      {/* キャンセル成功メッセージ */}
      {cancelSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">{cancelSuccess}</span>
          </div>
        </div>
      )}

      {/* キャンセルエラーメッセージ */}
      {cancelError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">エラー</span>
          </div>
          <p className="text-red-700 mt-1">{cancelError}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">注文履歴がありません</h2>
          <p className="text-gray-500 mb-6">まだ商品をご注文いただいていません</p>
          <Button onClick={() => window.location.href = '/shop'}>
            ショッピングを始める
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* CSV出力ボタン */}
          <div className="flex justify-end mb-4">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={downloadCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV出力
            </Button>
          </div>
          
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold">注文番号: {order.order_number}</h3>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span>{getStatusLabel(order.status)}</span>
                    </div>
                    
                    {/* キャンセル可能時間の表示 */}
                    {order.can_cancel && (
                      <div className="text-xs text-orange-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        キャンセル可能: あと{order.time_left}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">
                    注文日: {new Date(order.created_at).toLocaleDateString('ja-JP')}
                  </p>
                  {order.estimated_delivery_date && (
                    <p className="text-gray-600 text-sm">
                      お届け予定日: {new Date(order.estimated_delivery_date).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    ¥{order.final_amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getPaymentMethodLabel(order.payment_method)}
                  </p>
                </div>
              </div>

              {/* 注文商品一覧（最初の3つのみ表示） */}
              <div className="space-y-3 mb-4">
                {order.order_items.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.name}</h4>
                      <p className="text-sm text-gray-600">
                        数量: {item.quantity} × ¥{item.unit_price.toLocaleString()}
                      </p>
                    </div>
                    <p className="font-medium">¥{item.total_price.toLocaleString()}</p>
                  </div>
                ))}
                
                {order.order_items.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    他 {order.order_items.length - 3} 点
                  </p>
                )}
              </div>

              {/* 配送先情報 */}
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <h4 className="font-semibold text-blue-900 mb-1">配送先</h4>
                <p className="text-sm text-blue-800">
                  {order.shipping_name}<br />
                  〒{order.shipping_postal_code}<br />
                  {order.shipping_address}<br />
                  {order.shipping_phone}
                </p>
              </div>

              {/* 追跡番号 */}
              {order.tracking_number && (
                <div className="bg-orange-50 p-3 rounded-lg mb-4">
                  <h4 className="font-semibold text-orange-900 mb-1">配送追跡</h4>
                  <p className="text-sm text-orange-800">
                    追跡番号: {order.tracking_number}
                  </p>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    詳細を見る
                  </Button>
                  
                  {order.status === 'delivered' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // レビュー機能は後で実装
                        alert('レビュー機能は準備中です');
                      }}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      レビューを書く
                    </Button>
                  )}
                </div>

                {/* キャンセルボタン - 注文から15分以内かつ pending/confirmed 状態の場合のみ表示 */}
                {order.can_cancel && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setShowCancelConfirm(order.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    キャンセル
                  </Button>
                )}
              </div>
            </Card>
          ))}
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

              {/* 注文情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3">注文情報</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">注文番号:</span> {selectedOrder.order_number}</p>
                    <p><span className="font-medium">注文日:</span> {new Date(selectedOrder.created_at).toLocaleDateString('ja-JP')}</p>
                    <p><span className="font-medium">ステータス:</span> {getStatusLabel(selectedOrder.status)}</p>
                    <p><span className="font-medium">支払い方法:</span> {getPaymentMethodLabel(selectedOrder.payment_method)}</p>
                    {selectedOrder.estimated_delivery_date && (
                      <p><span className="font-medium">お届け予定日:</span> {new Date(selectedOrder.estimated_delivery_date).toLocaleDateString('ja-JP')}</p>
                    )}
                    
                    {/* キャンセル可能時間の表示 */}
                    {selectedOrder.can_cancel && (
                      <div className="mt-2 p-2 bg-orange-50 rounded-lg">
                        <p className="text-orange-800 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>キャンセル可能時間: あと{selectedOrder.time_left}</span>
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          注文から15分以内はキャンセル可能です
                        </p>
                      </div>
                    )}
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

              {/* 注文商品 */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">注文商品</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 border-b pb-3">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          ¥{item.unit_price.toLocaleString()} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">¥{item.total_price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 料金詳細 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">料金詳細</h3>
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
                  <div className="flex justify-between font-bold text-lg">
                    <span>合計</span>
                    <span className="text-green-600">¥{selectedOrder.final_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* キャンセルボタン */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  閉じる
                </Button>
                
                {selectedOrder.can_cancel && (
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      setSelectedOrder(null);
                      setShowCancelConfirm(selectedOrder.id);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    注文をキャンセル
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* キャンセル確認モーダル */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">注文をキャンセルしますか？</h2>
              <p className="text-gray-600">
                この操作は取り消せません。本当にキャンセルしますか？
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(null)}
              >
                戻る
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                isLoading={isCancelling}
                onClick={() => handleCancelOrder(showCancelConfirm)}
              >
                キャンセルする
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
