# WebP画像最適化ガイド

## 📌 概要

本システムでは、画像アップロード時に自動的にWebP形式に変換し、ファイルサイズを削減して表示速度を向上させています。

## 🎯 対象箇所

### 実装済み
- ✅ ワンちゃんのプロフィール画像（`src/pages/DogRegistration.tsx`）
- ✅ ワクチン証明書画像（`src/utils/vaccineUpload.ts`）
- ✅ ドッグラン施設画像（`src/pages/ParkManagement.tsx`）

### 実装予定
- ⏳ その他施設画像（`src/pages/FacilityEdit.tsx`, `src/pages/FacilityDetail.tsx`）
- ⏳ イベント画像
- ⏳ ユーザー投稿画像

## 🛠️ 技術仕様

### Edge Function（`supabase/functions/convert-to-webp/`）
- **ライブラリ**: ImageScript（Deno対応）
- **入力形式**: JPEG, PNG
- **出力形式**: WebP
- **品質設定**: 80%（デフォルト、調整可能）
- **サムネイル**: 300x300px（自動生成）

### 変換プロセス
1. 元画像をSupabase Storageにアップロード
2. Edge FunctionでWebP変換を実行
3. WebP画像とサムネイルを保存
4. オリジナル画像を削除（設定による）

## 📂 ファイル構成

```
元画像: dog-images/profile_123.jpg
WebP画像: dog-images/profile_123.webp
サムネイル: dog-images/profile_123_thumb.webp
```

## 🔧 使用方法

### 基本的な使用例

```typescript
import { uploadAndConvertToWebP } from '../utils/webpConverter';

const result = await uploadAndConvertToWebP(
  'dog-images',     // バケット名
  file,             // Fileオブジェクト
  'path/to/image',  // 保存パス
  {
    quality: 80,              // WebP品質（0-100）
    generateThumbnail: true,  // サムネイル生成
    thumbnailSize: 300,       // サムネイルサイズ
    keepOriginal: false       // オリジナル保持
  }
);

if (result.success) {
  console.log('WebP URL:', result.webpUrl);
  console.log('サムネイル URL:', result.thumbnailUrl);
}
```

### 画像表示コンポーネント

```typescript
import { OptimizedImage } from '../components/OptimizedImage';

<OptimizedImage
  src={originalUrl}      // 元画像URL（フォールバック用）
  webpSrc={webpUrl}       // WebP画像URL
  thumbnailSrc={thumbUrl} // サムネイルURL
  alt="画像の説明"
  className="w-full h-auto"
  loading="lazy"
/>
```

## 📊 パフォーマンス改善

### ファイルサイズ削減例
- JPEG（1MB）→ WebP（300KB）: **70%削減**
- PNG（2MB）→ WebP（400KB）: **80%削減**

### 表示速度改善
- 初回表示: サムネイル表示により**3倍高速化**
- 遅延読み込み: `loading="lazy"`により必要時のみ読み込み

## 🔍 ブラウザ対応

- **WebP対応**: Chrome, Firefox, Edge, Safari 14+
- **非対応ブラウザ**: 自動的に元画像（JPEG/PNG）を表示

## 📝 設定オプション

### Edge Function環境変数
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### WebP変換オプション
| オプション | デフォルト値 | 説明 |
|-----------|------------|------|
| quality | 80 | WebP品質（0-100） |
| generateThumbnail | true | サムネイル生成 |
| thumbnailSize | 300 | サムネイルサイズ（px） |
| keepOriginal | false | オリジナル画像保持 |

## 🚀 デプロイ

### Edge Functionのデプロイ
```bash
supabase functions deploy convert-to-webp
```

### 権限設定
Edge Functionがストレージにアクセスできるよう、サービスロールキーを設定してください。

## ⚠️ 注意事項

1. **ファイルサイズ制限**: 10MB以下の画像のみ対応
2. **処理時間**: 大きな画像は変換に時間がかかる場合があります
3. **ストレージ容量**: サムネイル生成により使用容量が増加します

## 📈 今後の改善予定

- [ ] 複数サイズのレスポンシブ画像生成
- [ ] AVIF形式への対応
- [ ] バッチ処理による既存画像の一括変換
- [ ] CDN統合による配信最適化

## 🔗 関連ファイル

- `/supabase/functions/convert-to-webp/index.ts` - Edge Function
- `/src/utils/webpConverter.ts` - 変換ユーティリティ
- `/src/components/OptimizedImage.tsx` - 表示コンポーネント
- `/src/utils/helpers.ts` - 汎用アップロード関数