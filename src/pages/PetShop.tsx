import {
    Crown,
    Gift,
    Heart,
    Minus,
    Package,
    Plus,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Star,
    Truck
} from 'lucide-react';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { SubscriptionButton } from '../components/SubscriptionButton';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import type { CartItem, Product } from '../types';
import { supabase } from '../utils/supabase';

export function PetShop() {
  const { user, lineUser, effectiveUserId } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');
  const { isActive: hasSubscription } = useSubscription();

  // ✨ React 18 Concurrent Features
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredCategory = useDeferredValue(selectedCategory);
  const deferredSortBy = useDeferredValue(sortBy);

  const categories = [
    { value: 'all', label: 'すべて', icon: ShoppingBag },
    { value: 'food', label: 'ドッグフード', icon: Package },
    { value: 'treats', label: 'おやつ', icon: Heart },
    { value: 'toys', label: 'おもちゃ', icon: Star },
    { value: 'accessories', label: 'アクセサリー', icon: Crown },
    { value: 'health', label: 'ヘルスケア', icon: Plus },
    { value: 'sheets', label: 'ペットシーツ', icon: Package },
    { value: 'business', label: '業務用品', icon: Package },
  ];

  useEffect(() => {
    fetchData();
  }, [user, lineUser, effectiveUserId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchProducts(),
        user ? fetchCartItems() : Promise.resolve()
      ]);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setProducts(data || []);
  };

  const fetchCartItems = async () => {
    const uid = user?.id || lineUser?.app_user_id || lineUser?.id || effectiveUserId;
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', uid as any);

    if (error) throw error;
    setCartItems(data || []);
  };

  // 追加: カート投入アニメーション（楽天風）
  const animateAddToCartByProductId = (productId: string) => {
    const img = document.querySelector(`img[data-product-id="${productId}"]`) as HTMLImageElement | null;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    // オーバーレイ（最前面・非干渉）
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '9999',
      contain: 'paint', backfaceVisibility: 'hidden'
    } as CSSStyleDeclaration);
    document.body.appendChild(overlay);

    const clone = new Image();
    clone.src = (img as HTMLImageElement).src;
    // スクロールを一時的に完全固定（position: fixed + padding-rightでシフト防止）
    const scrollY = window.scrollY || window.pageYOffset;
    const prev = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      bodyPaddingRight: document.body.style.paddingRight,
    };
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    // フォーカスによるスクロールを防止
    try { (document.activeElement as HTMLElement)?.blur(); } catch {}
    const startScale = 0.8;
    Object.assign(clone.style, {
      position: 'absolute',
      transformOrigin: 'top left',
      opacity: '0.9',
      borderRadius: '8px',
      pointerEvents: 'none',
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
      boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
      transform: `translate3d(${rect.left}px, ${rect.top}px, 0) scale(${startScale}, ${startScale})`
    } as CSSStyleDeclaration);
    overlay.appendChild(clone);

    // ヘッダーカートの位置へ移動
    const cartIcon = document.querySelector('[data-cart-target="true"]') as HTMLElement | null;
    const cartRect = cartIcon ? cartIcon.getBoundingClientRect() : { left: window.innerWidth - 40, top: 20, width: 20, height: 20 } as DOMRect as any;
    const centerX = window.innerWidth / 2 - rect.width * startScale / 2;
    const centerY = window.innerHeight / 2 - rect.height * startScale / 2;
    const dx = cartRect.left + cartRect.width / 2 - (rect.left + rect.width * startScale / 2);
    const dy = cartRect.top + cartRect.height / 2 - (rect.top + rect.height * startScale / 2);

    const start = () => {
      const anim = (clone as any).animate(
        [
          { transform: `translate3d(${rect.left}px, ${rect.top}px, 0) scale(${startScale}, ${startScale})`, opacity: 0.9 },
          { transform: `translate3d(${centerX}px, ${centerY}px, 0) scale(${startScale}, ${startScale})`, opacity: 0.85, offset: 0.5 },
          { transform: `translate3d(${rect.left + dx}px, ${rect.top + dy}px, 0) scale(0.2, 0.2)`, opacity: 0 }
        ],
        { duration: 3000, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)', fill: 'forwards' }
      );
      anim.addEventListener('finish', () => {
        overlay.remove();
        // スクロール固定を解除
        document.documentElement.style.overflow = prev.htmlOverflow;
        document.body.style.position = prev.bodyPosition;
        document.body.style.top = prev.bodyTop;
        document.body.style.width = prev.bodyWidth;
        document.body.style.paddingRight = prev.bodyPaddingRight;
        window.scrollTo(0, scrollY);
      });
    };
    if (clone.complete) {
      start();
    } else {
      clone.onload = () => start();
    }
  };

  const addToCart = async (productId: string, quantity: number = 1) => {
    const uid = user?.id || lineUser?.app_user_id || lineUser?.id || effectiveUserId;
    if (!uid) {
      navigate('/login');
      return;
    }

    try {
      // 既存のカートアイテムをチェック
      const existingItem = cartItems.find(item => item.product_id === productId);

      if (existingItem) {
        // 数量を更新
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // 新しいアイテムを追加
        const { error } = await supabase
          .from('cart_items')
          .insert([{
            user_id: uid,
            product_id: productId,
            quantity: quantity,
          }]);

        if (error) throw error;
      }

      await fetchData();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const updateCartQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      // アイテムを削除
      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', cartItemId);

        if (error) throw error;
        await fetchData();
      } catch (error) {
        console.error('Error removing from cart:', error);
      }
    } else {
      // 数量を更新
      try {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', cartItemId);

        if (error) throw error;
        await fetchData();
      } catch (error) {
        console.error('Error updating cart:', error);
      }
    }
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cartItems.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const getDiscountedPrice = (price: number) => {
    return hasSubscription ? Math.round(price * 0.9) : price; // 10%割引
  };

  // ✨ Optimized filtering with useMemo and deferred values
  const filteredProducts = useMemo(() => {
    // Use deferred values for non-urgent updates
    const filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
                           (product.brand && product.brand.toLowerCase().includes(deferredSearchTerm.toLowerCase()));
      
      const matchesCategory = deferredCategory === 'all' || product.category === deferredCategory;
      
      return matchesSearch && matchesCategory;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (deferredSortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return getDiscountedPrice(a.price) - getDiscountedPrice(b.price);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [products, deferredSearchTerm, deferredCategory, deferredSortBy]);

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

  // ✨ Optimized search handler with startTransition
  const handleSearchChange = (value: string) => {
    setSearchTerm(value); // Immediate update for input responsiveness
    
    // Mark filtering as non-urgent
    startTransition(() => {
      // This will be processed with lower priority
    });
  };

  const handleCategoryChange = (category: string) => {
    startTransition(() => {
      setSelectedCategory(category);
    });
  };

  const handleSortChange = (sort: 'name' | 'price' | 'category') => {
    startTransition(() => {
      setSortBy(sort);
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <ShoppingBag className="w-8 h-8 text-green-600 mr-3" />
            ペットショップ
          </h1>
          <p className="text-gray-600">愛犬のための厳選商品をお届け</p>
        </div>
        <Link to="/cart">
          <Button className="bg-green-600 hover:bg-green-700">
            <ShoppingCart className="w-4 h-4 mr-2" />
            カート ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
          </Button>
        </Link>
      </div>

      {/* サブスクリプション特典の大きなバナー */}
      <div className="relative overflow-hidden">
        {hasSubscription ? (
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white p-8 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Crown className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center">
                    <Sparkles className="w-6 h-6 mr-2" />
                    サブスクリプション会員特典適用中！
                  </h2>
                  <p className="text-lg opacity-90">
                    全商品10%OFF + 送料無料でお買い物をお楽しみください
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/20 px-6 py-3 rounded-lg">
                  <p className="text-sm opacity-80">今月の節約額</p>
                  <p className="text-2xl font-bold">¥1,200+</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white p-8 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Gift className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center">
                    <Crown className="w-6 h-6 mr-2" />
                    サブスク会員は全品10％OFF & 送料無料！
                  </h2>
                  <p className="text-lg opacity-90">
                    月額3,800円でどこでも使い放題 + ドッグラン使い放題
                  </p>
                </div>
              </div>
              <div className="text-right">
                <SubscriptionButton 
                  hasSubscription={hasSubscription}
                  className="font-bold px-6 py-3 text-lg"
                />
                <p className="text-sm opacity-80 mt-2">初月無料キャンペーン中</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          </div>
        )}
      </div>

      {/* 検索・フィルター */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Input
            label=""
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="商品名、ブランド名で検索..."
          />
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as 'name' | 'price' | 'category')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="popular">人気順</option>
            <option value="name">名前順</option>
            <option value="price">価格の安い順</option>
            <option value="category">カテゴリー順</option>
          </select>
        </div>
      </div>

      {/* カテゴリ（アコーディオン・2段表示） */}
      <details className="bg-gray-50 rounded-lg p-3">
        <summary className="cursor-pointer select-none text-gray-800 font-semibold">
          カテゴリを表示
        </summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.value}
                onClick={() => handleCategoryChange(category.value)}
                className={`flex items-center justify-start space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{category.label}</span>
              </button>
            );
          })}
        </div>
      </details>

      {/* 商品一覧（カテゴリフィルタ対応） */}
      {filteredProducts.length === 0 ? (
        <Card className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">該当する商品が見つかりませんでした</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts
            .filter(p => deferredCategory === 'all' ? true : p.category === deferredCategory)
            .map((product) => {
            const cartQuantity = getCartItemQuantity(product.id);
            const originalPrice = product.price;
            const discountedPrice = getDiscountedPrice(originalPrice);
            const hasDiscount = hasSubscription && discountedPrice < originalPrice;

            return (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* 商品画像 */}
                <div className="relative h-48 mb-4 -m-6 mb-4">
                  <img
                    data-product-id={product.id}
                    src={getFirstImageUrl(product.image_url)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
                    }}
                  />
                  {/* 複数画像の場合に画像枚数を表示 */}
                  {getAllImageUrls(product.image_url).length > 1 && (
                    <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      📸 {getAllImageUrls(product.image_url).length}枚
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                        <Crown className="w-3 h-3 mr-1" />
                        10%OFF
                      </span>
                    </div>
                  )}
                  {product.stock_quantity <= 5 && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        残り{product.stock_quantity}個
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="px-6 pb-6">
                  <div className="mb-2">
                    {product.brand && (
                      <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
                    )}
                    <h3 className="text-lg font-semibold line-clamp-2">{product.name}</h3>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  
                  {/* 商品詳細 */}
                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    {product.weight && (
                      <p>内容量: {product.weight}g</p>
                    )}
                    {product.size && (
                      <p>サイズ: {product.size}</p>
                    )}
                    {product.age_group && product.age_group !== 'all' && (
                      <p>対象年齢: {product.age_group === 'puppy' ? '子犬' : product.age_group === 'adult' ? '成犬' : 'シニア犬'}</p>
                    )}
                    {product.dog_size && product.dog_size !== 'all' && (
                      <p>対象サイズ: {product.dog_size === 'small' ? '小型犬' : product.dog_size === 'medium' ? '中型犬' : '大型犬'}</p>
                    )}
                  </div>

                  {/* 価格 */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-green-600">
                        ¥{discountedPrice.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-gray-500 line-through">
                          ¥{originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {hasSubscription && (
                      <p className="text-xs text-purple-600 flex items-center">
                        <Crown className="w-3 h-3 mr-1" />
                        サブスク会員価格
                      </p>
                    )}
                  </div>

                  {/* カート操作 */}
                  <div className="space-y-2">
                    {cartQuantity > 0 ? (
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <button
                          onClick={() => {
                            const cartItem = cartItems.find(item => item.product_id === product.id);
                            if (cartItem) {
                              updateCartQuantity(cartItem.id, cartQuantity - 1);
                            }
                          }}
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-medium">{cartQuantity}</span>
                        <button
                          onClick={() => {
                            const cartItem = cartItems.find(item => item.product_id === product.id);
                            if (cartItem) {
                              updateCartQuantity(cartItem.id, cartQuantity + 1);
                            }
                          }}
                          className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => { addToCart(product.id); animateAddToCartByProductId(product.id); }}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={product.stock_quantity === 0}
                      >
                        {product.stock_quantity === 0 ? (
                          '在庫切れ'
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            カートに追加
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Link to={`/products/${product.id}`}>
                      <Button variant="secondary" className="w-full">
                        詳細を見る
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 配送情報 */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Truck className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">配送について</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• 送料：全国一律¥690</p>
              <p>• ¥5,000以上のご注文で<span className="font-medium">送料無料</span></p>
              <p>• サブスク会員は<span className="font-medium">常に送料無料</span></p>
              <p>• 平日14時までのご注文で翌日お届け</p>
              <p>• 土日祝日も配送いたします</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
