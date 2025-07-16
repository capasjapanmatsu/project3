# バンドルサイズ最適化ガイド

## 🎯 目標
- 初期ロード時間を50%短縮
- メインバンドルサイズを300KB以下に維持
- レイジーロードで必要時のみコンポーネント読み込み

## 📊 分析ツール

### 1. バンドル分析
```bash
# バンドルサイズ分析
npm run analyze:build

# 依存関係チェック
npm run analyze:deps

# 未使用の依存関係検出
npm run analyze:unused

# パッケージサイズ確認
npm run analyze:size
```

### 2. 分析結果の確認
- `dist/stats.html` - 視覚的なバンドル分析
- コンソール出力で不要な依存関係を確認

## 🚀 最適化手法

### 1. Tree-shaking対応
**有効なimport文例:**
```typescript
// ❌ 悪い例 - 全体インポート
import * as lucideReact from 'lucide-react';

// ✅ 良い例 - 名前付きインポート
import { PawPrint, Bell, ShoppingCart } from 'lucide-react';

// ❌ 悪い例 - default + 名前付き混在
import React, { useState } from 'react';

// ✅ 良い例 - 必要な部分のみ
import { useState } from 'react';
```

### 2. 動的インポート（コード分割）
```typescript
// ❌ 静的インポート
import AdminDashboard from './pages/AdminDashboard';

// ✅ 動的インポート
const AdminDashboard = lazy(() => 
  import('./pages/AdminDashboard').then(module => ({ 
    default: module.AdminDashboard 
  }))
);
```

### 3. プリロード戦略
```typescript
// 重要なページの事前読み込み
const preloadCriticalPages = () => {
  if (user?.user_type === 'admin') {
    import('./pages/AdminDashboard');
  }
  
  // ホバー時の事前読み込み
  document.querySelector('[href="/shop"]')?.addEventListener('mouseenter', () => {
    import('./pages/PetShop');
  }, { once: true });
};
```

## 📦 依存関係最適化

### 重い依存関係の代替案
1. **moment.js** → **date-fns** (小さい)
2. **lodash全体** → **lodash/specific** (必要な関数のみ)
3. **react-icons全体** → **lucide-react** (tree-shaking対応)

### 不要な依存関係の削除
```bash
# 定期的な依存関係チェック
npx depcheck

# 未使用パッケージの削除
npm uninstall [package-name]
```

## ⚡ パフォーマンス監視

### 1. バンドルサイズ監視
```bash
# ビルド後のサイズ確認
npm run build
du -sh dist/

# 主要ファイルサイズ確認
ls -lah dist/assets/
```

### 2. ロード時間測定
- Chrome DevTools → Network タブ
- Lighthouse監査
- Web Vitals測定

### 3. 目標値
- **初期HTML**: < 50KB
- **メインJS**: < 300KB (gzip)
- **CSS**: < 100KB (gzip)
- **画像**: WebP形式、< 500KB

## 🔧 継続的最適化

### 定期実行すべきコマンド
```bash
# 週次実行
npm run analyze:deps
npm run analyze:unused

# リリース前実行
npm run build
npm run analyze:build
```

### アラート設定
- CI/CDでバンドルサイズが閾値を超えた場合の警告
- 新しい依存関係追加時のサイズ影響確認

## 📈 測定結果記録
- 最適化前後のサイズ比較
- ページロード時間の改善
- Core Web Vitalsスコア
