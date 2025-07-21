import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Camera,
    CheckCircle,
    Download,
    Edit,
    Eye,
    Package,
    Save,
    Search,
    ShoppingBag,
    Truck,
    Upload,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import useAuth from '../context/AuthContext';
import type { Order, OrderItem, Product } from '../types';
import { downloadCSVWithBOM } from '../utils/csvExport';
import { supabase } from '../utils/supabase';

interface OrderWithItems extends Order {
  order_items: (OrderItem & { product: Product })[];
}

export function AdminShopManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 画像アップロード用のstate
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
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
    image_url: '',
    delivery_days: 3, // お届けまでの目安（日）
    has_variations: false, // バリエーションがあるか
    variation_type: '', // バリエーションの種類（例: サイズ、色など）
    variations: [{ name: '', sku: '' }] as Array<{ name: string; sku: string }> // バリエーション詳細
  });
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    // 管理者権限チェック
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    fetchData();
  }, [isAdmin, navigate, activeTab]);

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
      }
    } catch (error) {
      setError((error as Error).message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };



  const handleOrderSelect = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setOrderFormData({
      status: order.status,
      tracking_number: order.tracking_number || '',
      shipping_carrier: order.shipping_carrier || '',
      estimated_delivery_date: order.estimated_delivery_date && typeof order.estimated_delivery_date === 'string' 
        ? new Date(order.estimated_delivery_date).toISOString().split('T')[0] 
        : '',
      notes: order.notes || ''
    });
  };

  // 商品選択機能
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    
    // 複数画像データを処理
    const imageUrls = getAllImageUrls(product.image_url || '');
    
    // プレビュー用のURLを設定
    setImagePreviews(imageUrls);
    
    // フォームデータに設定
    setProductFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
      image_url: product.image_url || '',
      // バリエーション機能を有効化
      delivery_days: (product as any).delivery_days || 3,
      has_variations: (product as any).has_variations || false,
      variation_type: (product as any).variation_type || '',
      variations: (product as any).variations || []
    });
    setShowProductModal(true);
    
    console.log('商品編集:', product.name, '- 画像数:', imageUrls.length);
  };

  // 商品削除機能
  const handleProductDelete = async () => {
    if (!selectedProduct) return;
    
    const confirmDelete = window.confirm(`商品「${selectedProduct.name}」を削除してもよろしいですか？\nこの操作は取り消せません。`);
    
    if (!confirmDelete) return;
    
    try {
      setIsUpdating(true);
      setError('');
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', selectedProduct.id);
      
      if (error) throw error;
      
      setSuccess('商品を削除しました');
      
      // 商品一覧を再取得
      await fetchData();
      
      // モーダルを閉じる
      setShowProductModal(false);
      setSelectedProduct(null);
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('商品の削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
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
    } catch (error) {
      console.error('Error updating order:', error);
      setError('注文の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProductUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsUpdating(true);
      setIsUploading(true);
      setError('');
      setSuccess('');
      
      // 画像アップロード処理
      let imageUrl: string = productFormData.image_url || ''; // デフォルトはフォームのURL
      let hasNewImages = selectedFiles.length > 0;
      
      console.log('画像処理開始:', {
        hasNewImages,
        selectedFilesCount: selectedFiles.length,
        existingImageUrl: productFormData.image_url ? 'あり' : 'なし',
        isEditing: selectedProduct ? true : false
      });
      
      if (hasNewImages) {
        // 新しい画像が選択された場合の処理
        console.log(`${selectedFiles.length}枚の新しい画像が選択されています。すべて処理します。`);
        try {
          const processedImages: string[] = [];
          
          // すべての選択画像を処理（最大10枚）
          for (let i = 0; i < Math.min(selectedFiles.length, 10); i++) {
            const file = selectedFiles[i];
            console.log(`画像${i + 1}/${selectedFiles.length}を処理中...`);
            
            // 画像をリサイズ・圧縮（431エラー対策でサイズを極限まで削減）
            const resizedFile = await resizeImage(file, 200, 150); // 200x150に更に縮小
            const compressedFile = await compressImage(resizedFile, 0.2); // 品質を0.2に更に下げる
            
            // Base64エンコード
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
              reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                  resolve(result);
                } else {
                  reject(new Error('Base64変換エラー'));
                }
              };
              reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
              reader.readAsDataURL(compressedFile);
            });
            
            processedImages.push(base64Data);
            console.log(`画像${i + 1}処理完了。サイズ:`, Math.round(base64Data.length / 1024), 'KB');
          }
          
          // 複数画像をJSON配列として保存
          imageUrl = JSON.stringify(processedImages);
          console.log(`全${processedImages.length}枚の画像処理完了。総サイズ:`, Math.round(imageUrl.length / 1024), 'KB');
          
        } catch (error) {
          console.error('画像処理エラー:', error);
          setError('画像の処理中にエラーが発生しました');
          return;
        }
      } else {
        // 新しい画像が選択されていない場合
        if (selectedProduct && productFormData.image_url) {
          // 編集時：既存画像を保持
          imageUrl = productFormData.image_url;
          console.log('既存画像を保持:', imageUrl ? `データあり(${Math.round(imageUrl.length / 1024)}KB)` : 'データなし');
        } else {
          // 新規作成時：空文字列
          imageUrl = '';
          console.log('新規作成：画像なし');
        }
      }

      if (selectedProduct) {
        // 既存商品の更新
        const { error } = await supabase
          .from('products')
          .update({
            name: productFormData.name,
            description: productFormData.description,
            price: productFormData.price,
            category: productFormData.category,
            stock_quantity: productFormData.stock_quantity,
            is_active: productFormData.is_active,
            image_url: imageUrl,
            // バリエーション機能を有効化
            delivery_days: productFormData.delivery_days,
            has_variations: productFormData.has_variations,
            variation_type: productFormData.has_variations ? productFormData.variation_type : null,
            variations: productFormData.has_variations ? productFormData.variations : [],
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedProduct.id);
        
        if (error) throw error;
        setSuccess('商品情報を更新しました');
      } else {
        // 新規商品の作成
        let insertResult;
        try {
          // 通常の方法で挿入を試行
          insertResult = await supabase
            .from('products')
            .insert([{
              name: productFormData.name,
              description: productFormData.description,
              price: productFormData.price,
              category: productFormData.category,
              stock_quantity: productFormData.stock_quantity,
              is_active: productFormData.is_active,
              image_url: imageUrl,
              // バリエーション機能を有効化
              delivery_days: productFormData.delivery_days,
              has_variations: productFormData.has_variations,
              variation_type: productFormData.has_variations ? productFormData.variation_type : null,
              variations: productFormData.has_variations ? productFormData.variations : []
            }]);
        } catch (firstError) {
          console.log('通常の挿入でエラー、service_role で再試行:', firstError);
          
          // RLSエラーの場合、service_roleキーでの直接挿入を試行
          try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/products`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                name: productFormData.name,
                description: productFormData.description,
                price: productFormData.price,
                category: productFormData.category,
                stock_quantity: productFormData.stock_quantity,
                is_active: productFormData.is_active,
                image_url: imageUrl,
                // バリエーション機能を有効化
                delivery_days: productFormData.delivery_days,
                has_variations: productFormData.has_variations,
                variation_type: productFormData.has_variations ? productFormData.variation_type : null,
                variations: productFormData.has_variations ? productFormData.variations : []
              })
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            insertResult = { error: null };
            console.log('service_role経由での挿入成功');
          } catch (secondError) {
            console.error('service_role経由でも失敗:', secondError);
            insertResult = { error: secondError };
          }
        }
        
        if (insertResult.error) throw insertResult.error;
        setSuccess('新規商品を登録しました');
      }
      
      // 商品一覧を再取得
      await fetchData();
      
      // モーダルを閉じる
      setShowProductModal(false);
      setSelectedFiles([]); // 画像ファイルをクリア
      setImagePreviews([]); // 画像プレビューをクリア
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error updating product:', error);
      
      // 詳細なエラーメッセージを表示
      let errorMessage = '商品の更新に失敗しました';
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage += ': ' + error.message;
        }
        if ('code' in error) {
          errorMessage += ' (コード: ' + error.code + ')';
        }
        if ('hint' in error) {
          errorMessage += ' ヒント: ' + error.hint;
        }
        if ('details' in error) {
          errorMessage += ' 詳細: ' + error.details;
        }
      }
      
      setError(errorMessage);
      console.log('完全なエラーオブジェクト:', JSON.stringify(error, null, 2));
    } finally {
      setIsUpdating(false);
    }
  };

  // 画像リサイズ関数
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // アスペクト比を保持してリサイズ
        const { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file); // フォールバック
          }
        }, file.type);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // 画像圧縮関数
  const compressImage = (file: File, quality: number): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg', // JPEGで圧縮
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // フォールバック
          }
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // 複数画像ファイル選択処理
  const handleMultipleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    if (selectedFiles.length + files.length > 10) {
      const remaining = 10 - selectedFiles.length;
      setError(`画像は最大10枚まで選択できます。現在${selectedFiles.length}枚選択中のため、あと${remaining}枚まで追加可能です。`);
      return;
    }
    
    try {
      setError('');
      setIsUploading(true);
      
      const processedFiles: File[] = [];
      const newPreviews: string[] = [];
      
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} のファイルサイズは10MB以下にしてください`);
          continue;
        }
        
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} は画像ファイルではありません`);
          continue;
        }
        
        // 画像をリサイズ・圧縮（431エラー対策でサイズを極限まで削減）
        const resizedFile = await resizeImage(file, 200, 150); // 200x150に更に縮小
        const compressedFile = await compressImage(resizedFile, 0.2); // 品質を0.2に更に下げる
        processedFiles.push(compressedFile);
        
        const previewUrl = URL.createObjectURL(compressedFile);
        newPreviews.push(previewUrl);
      }
      
      setSelectedFiles(prev => [...prev, ...processedFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
      
    } catch (error) {
      console.error('画像処理エラー:', error);
      setError('画像の処理中にエラーが発生しました');
    } finally {
      setIsUploading(false);
    }
  };

  // 個別画像削除
  const removeImageByIndex = (index: number) => {
    // プレビューURLを解放
    const previewUrl = imagePreviews[index];
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    // 指定されたインデックスの画像を削除
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 全画像削除
  const clearAllImages = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setImagePreviews([]);
    
    const fileInput = document.getElementById('product-images') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // バリエーション追加
  const addVariation = () => {
    setProductFormData(prev => ({
      ...prev,
      variations: [...prev.variations, { name: '', sku: '' }]
    }));
  };

  // バリエーション削除
  const removeVariation = (index: number) => {
    setProductFormData(prev => ({
      ...prev,
      variations: prev.variations.filter((_, i) => i !== index)
    }));
  };

  // バリエーション更新
  const updateVariation = (index: number, field: 'name' | 'sku', value: string) => {
    setProductFormData(prev => ({
      ...prev,
      variations: prev.variations.map((variation, i) => 
        i === index ? { ...variation, [field]: value } : variation
      )
    }));
  };

  // モーダルを閉じる時の処理
  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    clearAllImages();
    setProductFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      stock_quantity: 0,
      is_active: true,
      image_url: '',
      delivery_days: 3,
      has_variations: false,
      variation_type: '',
      variations: [{ name: '', sku: '' }]
    });
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
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 画像URL処理のヘルパー関数
  const getFirstImageUrl = (imageData: string): string => {
    if (!imageData) return '';
    
    // JSON配列形式の場合
    try {
      const parsedImages = JSON.parse(imageData);
      if (Array.isArray(parsedImages) && parsedImages.length > 0) {
        return parsedImages[0];
      }
    } catch (error) {
      // JSONパースに失敗した場合は、単一画像URLとして扱う
    }
    
    // 単一画像URLの場合
    return imageData;
  };

  // 複数画像取得のヘルパー関数
  const getAllImageUrls = (imageData: string): string[] => {
    if (!imageData) return [];
    
    // JSON配列形式の場合
    try {
      const parsedImages = JSON.parse(imageData);
      if (Array.isArray(parsedImages)) {
        return parsedImages;
      }
    } catch (error) {
      // JSONパースに失敗した場合は、単一画像URLとして扱う
    }
    
    // 単一画像URLの場合
    return [imageData];
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
                image_url: '',
                delivery_days: 3,
                has_variations: false,
                variation_type: '',
                variations: []
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
                  <div className="h-48 -m-6 mb-4 relative">
                    <img
                      src={getFirstImageUrl(product.image_url)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                      }}
                    />
                    {/* 複数画像の場合に画像枚数を表示 */}
                    {getAllImageUrls(product.image_url).length > 1 && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        📸 {getAllImageUrls(product.image_url).length}枚
                      </div>
                    )}
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
                  onClick={closeProductModal}
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
                      { value: 'business', label: '業務用品' },
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
                  

                  {/* 画像アップロード */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      商品画像 *
                    </label>
                    
                    {/* 複数画像プレビュー（最大10枚） */}
                    {(imagePreviews.length > 0 || productFormData.image_url) && (
                      <div className="mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {/* 既存のURLの画像 */}
                          {productFormData.image_url && imagePreviews.length === 0 && (
                            <div className="relative group">
                              <img
                                src={productFormData.image_url}
                                alt="メイン画像"
                                className="w-full h-32 object-cover rounded-lg border"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => setProductFormData({...productFormData, image_url: ''})}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                URL画像
                              </div>
                            </div>
                          )}
                          
                          {/* アップロードされた画像 */}
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`商品画像 ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border"
                              />
                              <button
                                type="button"
                                onClick={() => removeImageByIndex(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                                {index + 1}/10
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* 画像枚数表示 */}
                        <div className="mt-2 text-sm text-gray-600">
                          選択中: {imagePreviews.length + (productFormData.image_url && imagePreviews.length === 0 ? 1 : 0)}枚 / 最大10枚
                        </div>
                      </div>
                    )}
                    
                    {/* ファイル選択ボタン */}
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <input
                          id="product-images"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleMultipleFileSelect}
                          className="hidden"
                          multiple // 複数ファイル選択を許可
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => document.getElementById('product-images')?.click()}
                          className="w-full"
                          disabled={imagePreviews.length >= 10}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {imagePreviews.length >= 10 
                            ? '上限達成(10枚)' 
                            : imagePreviews.length > 0 
                              ? `画像を追加 (${imagePreviews.length}/10)`
                              : 'ファイルを選択 (最大10枚)'
                          }
                        </Button>
                      </div>
                      
                      <div className="flex-1">
                        <input
                          id="product-camera"
                          type="file"
                          accept="image/*"
                          capture="user"
                          onChange={handleMultipleFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => document.getElementById('product-camera')?.click()}
                          className="w-full"
                          disabled={imagePreviews.length >= 10}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {imagePreviews.length >= 10 ? '上限達成' : '写真を撮る'}
                        </Button>
                      </div>
                    </div>
                    
                    {/* URLでの入力も可能 */}
                    <div className="mt-3">
                      <Input
                        label="または画像URL"
                        value={productFormData.image_url}
                        onChange={(e) => setProductFormData({ ...productFormData, image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    
                    {/* ファイル選択状態の表示 */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-green-600">
                          選択中: {selectedFiles.length}枚のファイル
                        </p>
                        {selectedFiles.length >= 5 && (
                          <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                            {selectedFiles.map((f, index) => (
                              <div key={index}>• {f.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 10枚制限の警告 */}
                    {imagePreviews.length >= 8 && imagePreviews.length < 10 && (
                      <p className="text-sm text-yellow-600 mt-2">
                        📎 残り{10 - imagePreviews.length}枚まで追加できます
                      </p>
                    )}
                    
                    {imagePreviews.length >= 10 && (
                      <p className="text-sm text-red-600 mt-2">
                        ⚠️ 画像は最大10枚までです。追加したい場合は既存の画像を削除してください。
                      </p>
                    )}
                  </div>
                  
                  {/* バリエーション機能を有効化 */}
                  <Input
                    label="お届けまでの目安（日）"
                    type="number"
                    value={productFormData.delivery_days.toString()}
                    onChange={(e) => setProductFormData({ ...productFormData, delivery_days: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  
                  <div className="flex items-center space-x-3">
                    <label htmlFor="has_variations" className="text-sm font-medium text-gray-700">
                      バリエーション
                    </label>
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="has_variations"
                        checked={productFormData.has_variations}
                        onChange={(e) => setProductFormData({ ...productFormData, has_variations: e.target.checked })}
                        className="sr-only"
                      />
                      <label 
                        htmlFor="has_variations" 
                        className={`flex items-center cursor-pointer select-none w-14 h-8 rounded-full p-1 ${
                          productFormData.has_variations ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
                          productFormData.has_variations ? 'translate-x-6' : ''
                        }`}></div>
                      </label>
                    </div>
                    <span className="text-sm text-gray-600">
                      {productFormData.has_variations ? 'あり' : 'なし'}
                    </span>
                  </div>
                  
                  {/* 商品有効化チェックボックスを復元 */}
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
                  
                  {/* バリエーション設定フォーム */}
                  {productFormData.has_variations && (
                    <>
                      <Input
                        label="バリエーションの種類（例：カラー、サイズ）"
                        value={productFormData.variation_type}
                        onChange={(e) => setProductFormData({ ...productFormData, variation_type: e.target.value })}
                        placeholder="カラー"
                      />
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          バリエーション設定
                        </label>
                        <div className="space-y-3">
                          {productFormData.variations.map((variation, index) => (
                            <div key={index} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                              <div className="flex-1">
                                <Input
                                  label={`${productFormData.variation_type || 'バリエーション'}${index + 1}`}
                                  value={variation.name}
                                  onChange={(e) => updateVariation(index, 'name', e.target.value)}
                                  placeholder="ブルー"
                                />
                              </div>
                              <div className="flex-1">
                                <Input
                                  label="SKU"
                                  value={variation.sku}
                                  onChange={(e) => updateVariation(index, 'sku', e.target.value)}
                                  placeholder="A000001"
                                />
                              </div>
                              {productFormData.variations.length > 1 && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => removeVariation(index)}
                                  className="mt-6 bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                                >
                                  削除
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={addVariation}
                            className="w-full bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                          >
                            + バリエーションを追加
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-between">
                  {/* 左側：削除ボタン（既存商品編集時のみ表示） */}
                  <div>
                    {selectedProduct && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleProductDelete}
                        isLoading={isUpdating}
                        className="bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                      >
                        商品を削除
                      </Button>
                    )}
                  </div>
                  
                  {/* 右側：キャンセル・更新ボタン */}
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={closeProductModal}
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
