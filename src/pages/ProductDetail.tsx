import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Heart,
  Package,
  Truck,
  Shield,
  Crown,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import type { Product, CartItem } from '../types';

interface ProductImage {
  id: string;
  url: string;
}

export function ProductDetail() {
  const { productId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { isActive: hasSubscription } = useSubscription();
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId, user]);

  const fetchProductData = async () => {
    try {
      const [productResponse, cartResponse, imagesResponse] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('is_active', true)
          .single(),
        
        user ? supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('user_id', user.id) : Promise.resolve({ data: [] }),
          
        supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true })
      ]);

      if (productResponse.error) {
        console.error('Product not found:', productResponse.error);
        navigate('/shop');
        return;
      }

      setProduct(productResponse.data);
      setCartItems(cartResponse.data || []);
      
      // 商品画像の設定
      const images: ProductImage[] = [];
      
      // メイン画像を追加
      if (productResponse.data.image_url) {
        images.push({
          id: 'main',
          url: productResponse.data.image_url
        });
      }
      
      // 追加画像を追加
      if (!imagesResponse.error && imagesResponse.data) {
        imagesResponse.data.forEach(img => {
          images.push({
            id: img.id,
            url: img.image_url
          });
        });
      }
      
      setProductImages(images);
    } catch (error) {
      console.error('Error fetching product data:', error);
      navigate('/shop');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async () => {
    if (!user || !product) {
      navigate('/login');
      return;
    }

    try {
      const existingItem = cartItems.find(item => item.product_id === product.id);

      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert([{
            user_id: user.id,
            product_id: product.id,
            quantity: quantity,
          }]);

        if (error) throw error;
      }

      await fetchProductData();
      
      // カートに追加完了のフィードバック
      alert('カートに追加しました！');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('カートへの追加に失敗しました。');
    }
  };

  const buyNow = async () => {
    await addToCart();
    navigate('/cart');
  };

  const getDiscountedPrice = (price: number) => {
    return hasSubscription ? Math.round(price * 0.9) : price;
  };

  const getCartItemQuantity = () => {
    const item = cartItems.find(item => item.product_id === product?.id);
    return item ? item.quantity : 0;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      food: 'ドッグフード',
      treats: 'おやつ',
      toys: 'おもちゃ',
      accessories: 'アクセサリー',
      health: 'ヘルスケア',
      sheets: 'ペットシーツ',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getAgeGroupLabel = (age: string) => {
    const labels = {
      puppy: '子犬',
      adult: '成犬',
      senior: 'シニア犬',
      all: '全年齢',
    };
    return labels[age as keyof typeof labels] || age;
  };

  const getDogSizeLabel = (size: string) => {
    const labels = {
      small: '小型犬',
      medium: '中型犬',
      large: '大型犬',
      all: '全サイズ',
    };
    return labels[size as keyof typeof labels] || size;
  };
  
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">商品が見つかりませんでした</p>
        <Button onClick={() => navigate('/shop')} className="mt-4">
          ショップに戻る
        </Button>
      </div>
    );
  }

  const originalPrice = product.price;
  const discountedPrice = getDiscountedPrice(originalPrice);
  const hasDiscount = hasSubscription && discountedPrice < originalPrice;
  const cartQuantity = getCartItemQuantity();

  return (
    <div className="max-w-6xl mx-auto">
      {/* パンくずナビ */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/shop')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ショップに戻る
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 商品画像 */}
        <div className="space-y-4">
          <div className="relative">
            {productImages.length > 0 ? (
              <img
                src={productImages[currentImageIndex].url}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg shadow-lg cursor-pointer"
                onClick={() => openImageModal(currentImageIndex)}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                }}
              />
            ) : (
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-400" />
              </div>
            )}
            
            {hasDiscount && (
              <div className="absolute top-4 left-4">
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <Crown className="w-4 h-4 mr-1" />
                  10%OFF
                </span>
              </div>
            )}
            
            {product.stock_quantity <= 5 && (
              <div className="absolute top-4 right-4">
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  残り{product.stock_quantity}個
                </span>
              </div>
            )}
            
            {productImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-75 rounded-full p-2 hover:bg-opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-800" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-75 rounded-full p-2 hover:bg-opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                </button>
              </>
            )}
          </div>
          
          {/* サムネイル画像 */}
          {productImages.length > 1 && (
            <div className="grid grid-cols-6 gap-2">
              {productImages.map((image, index) => (
                <div 
                  key={index}
                  className={`h-16 rounded-lg overflow-hidden cursor-pointer border-2 ${
                    index === currentImageIndex ? 'border-green-500' : 'border-transparent'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img
                    src={image.url}
                    alt={`${product.name} - サムネイル ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 商品情報 */}
        <div className="space-y-6">
          {/* サブスクリプション特典 */}
          {hasSubscription && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5" />
                <span className="font-semibold">サブスク会員特典: 10%OFF</span>
              </div>
            </div>
          )}

          {/* 基本情報 */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                {getCategoryLabel(product.category)}
              </span>
              {product.brand && (
                <span className="text-gray-500 text-sm">{product.brand}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{product.name}</h1>
            
            {/* 価格 */}
            <div className="mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-bold text-green-600">
                  ¥{discountedPrice.toLocaleString()}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-gray-500 line-through">
                    ¥{originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
              {hasSubscription && (
                <p className="text-sm text-purple-600 mt-1">サブスク会員価格</p>
              )}
            </div>

            {/* 商品詳細 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {product.weight && (
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">内容量: {product.weight}g</span>
                </div>
              )}
              {product.size && (
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">サイズ: {product.size}</span>
                </div>
              )}
              {product.age_group && product.age_group !== 'all' && (
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">対象年齢: {getAgeGroupLabel(product.age_group)}</span>
                </div>
              )}
              {product.dog_size && product.dog_size !== 'all' && (
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">対象サイズ: {getDogSizeLabel(product.dog_size)}</span>
                </div>
              )}
            </div>

            {/* 在庫状況 */}
            <div className="mb-6">
              {product.stock_quantity > 0 ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">在庫あり</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-red-600">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-medium">在庫切れ</span>
                </div>
              )}
            </div>

            {/* 数量選択 */}
            {product.stock_quantity > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数量
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-medium w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {cartQuantity > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    カートに{cartQuantity}個入っています
                  </p>
                )}
              </div>
            )}

            {/* アクションボタン */}
            <div className="space-y-3">
              {product.stock_quantity > 0 ? (
                <>
                  <Button
                    onClick={buyNow}
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                  >
                    今すぐ購入
                  </Button>
                  <Button
                    onClick={addToCart}
                    variant="secondary"
                    className="w-full text-lg py-3"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    カートに追加
                  </Button>
                </>
              ) : (
                <Button disabled className="w-full text-lg py-3">
                  在庫切れ
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 商品説明 */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">商品説明</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
            
            {product.ingredients && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">原材料</h3>
                <p className="text-gray-700 text-sm">{product.ingredients}</p>
              </div>
            )}
          </Card>
        </div>

        {/* 配送・サービス情報 */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-start space-x-3">
              <Truck className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">配送について</h3>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• 送料：全国一律¥690</p>
                  <p>• ¥5,000以上のご注文で<span className="font-medium">送料無料</span></p>
                  <p>• サブスク会員は<span className="font-medium">常に送料無料</span></p>
                  <p>• 平日14時までのご注文で翌日お届け</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">品質保証</h3>
                <div className="text-sm text-green-800 space-y-1">
                  <p>• 厳選された安全な原材料のみ使用</p>
                  <p>• 品質に問題がある場合は返品・交換対応</p>
                  <p>• 愛犬の健康を第一に考えた商品選定</p>
                </div>
              </div>
            </div>
          </Card>

          {hasSubscription ? (
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-start space-x-3">
                <Crown className="w-5 h-5 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">会員特典</h3>
                  <div className="text-sm text-purple-800 space-y-1">
                    <p>• 全商品10%OFF</p>
                    <p>• 送料無料</p>
                    <p>• 優先カスタマーサポート</p>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-start space-x-3">
                <Crown className="w-5 h-5 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">サブスク会員になると</h3>
                  <div className="text-sm text-purple-800 space-y-1 mb-3">
                    <p>• 全商品10%OFF</p>
                    <p>• 送料無料</p>
                    <p>• ドッグラン使い放題</p>
                  </div>
                  <Link to="/subscription">
                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                      <Crown className="w-3 h-3 mr-1" />
                      詳細を見る
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 画像モーダル */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-opacity"
          >
            <X className="w-6 h-6" />
          </button>
          
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-opacity"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          
          <img
            src={productImages[currentImageIndex].url}
            alt={product.name}
            className="max-h-[80vh] max-w-full"
          />
          
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white text-sm">
              {currentImageIndex + 1} / {productImages.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}