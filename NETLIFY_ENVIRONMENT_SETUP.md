# Netlify Supabase Extension 環境変数設定手順

## 1. 開発環境の設定

### .env.local ファイルの作成
プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を設定してください：

```env
# 開発環境用 Supabase 設定
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key

# 管理者機能用（開発環境のみ）
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key

# JWT シークレット（必要に応じて）
VITE_SUPABASE_JWT_SECRET=your-jwt-secret

# その他の環境変数
VITE_STRIPE_PUBLIC_KEY=pk_test_your-stripe-public-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_APP_NAME=DogPark JP
VITE_DEV_MODE=true
VITE_DEBUG_MODE=true
```

## 2. Netlify プロダクション環境の設定

### 2.1 Netlify Supabase Extension により自動設定される環境変数

Netlify Supabase Extension をインストールして Supabase プロジェクトを接続すると、以下の環境変数が自動的に設定されます：

```bash
SUPABASE_DATABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret
```

### 2.2 手動で設定が必要な環境変数

Netlify の **Site settings > Environment variables** で以下を手動追加してください：

#### Supabase 関連（VITE_ プレフィックス付き）
```bash
VITE_SUPABASE_URL=${SUPABASE_DATABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
VITE_SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
```

#### その他のサービス連携
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

#### アプリケーション設定
```bash
VITE_APP_NAME=DogPark JP
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=犬の公園予約システム
VITE_DEV_MODE=false
VITE_DEBUG_MODE=false
```

## 3. 環境変数の設定手順（詳細）

### 3.1 Netlify ダッシュボードでの設定

1. **Netlify ダッシュボード** にログイン
2. 対象のサイトを選択
3. **「Site settings」** をクリック
4. 左メニューから **「Environment variables」** を選択
5. **「Add a variable」** をクリック
6. 以下の形式で環境変数を追加：

```
Key: VITE_SUPABASE_URL
Value: ${SUPABASE_DATABASE_URL}
```

### 3.2 環境変数の動的参照

Netlify では `${VARIABLE_NAME}` の形式で他の環境変数を参照できます。これにより、Supabase Extension で設定された変数を VITE_ プレフィックス付きで使用できます。

### 3.3 設定確認

環境変数を設定後、以下のコマンドでサイトを再デプロイしてください：

```bash
git add .
git commit -m "Netlify Supabase Extension 環境変数設定完了"
git push origin main
```

## 4. 環境変数のテスト

### 4.1 開発環境でのテスト

```bash
npm run dev
```

ブラウザの開発者ツールで以下のコマンドを実行して環境変数を確認：

```javascript
console.log('環境変数確認:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD
});
```

### 4.2 プロダクション環境でのテスト

デプロイ後、本番サイトのブラウザコンソールで同じコードを実行して環境変数が正しく設定されているか確認してください。

## 5. トラブルシューティング

### 5.1 よくある問題

#### 問題: 環境変数が undefined になる
**解決方法:**
- `VITE_` プレフィックスが付いているか確認
- Netlify の環境変数設定で `${SUPABASE_DATABASE_URL}` の形式で参照しているか確認
- サイトを再デプロイ

#### 問題: Supabase 接続エラー
**解決方法:**
- Supabase Extension が正しくインストールされているか確認
- Supabase プロジェクトが正しく接続されているか確認
- 環境変数の値が正しく設定されているか確認

#### 問題: 本番環境で動作しない
**解決方法:**
- `vite.config.ts` の `define` 設定を確認
- 環境変数の大文字小文字を確認
- ブラウザのキャッシュをクリア

### 5.2 デバッグ方法

環境変数の設定状況を確認するには、以下のコードを使用してください：

```javascript
// 開発環境
if (import.meta.env.DEV) {
  console.log('🔍 開発環境の環境変数:', {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    serviceRole: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
    jwtSecret: import.meta.env.VITE_SUPABASE_JWT_SECRET?.substring(0, 20) + '...'
  });
}

// プロダクション環境
if (import.meta.env.PROD) {
  console.log('🔍 プロダクション環境の環境変数:', {
    url: !!import.meta.env.VITE_SUPABASE_URL,
    key: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceRole: !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: !!import.meta.env.VITE_SUPABASE_JWT_SECRET
  });
}
```

## 6. セキュリティ注意事項

### 6.1 環境変数の管理

- **SERVICE_ROLE_KEY** はクライアントサイドで使用しないでください
- 開発環境の `.env.local` ファイルは Git にコミットしないでください
- 本番環境では必ず本番用のキーを使用してください

### 6.2 Netlify の環境変数セキュリティ

- Netlify の環境変数は暗号化されて保存されます
- チームメンバーには必要最小限の権限のみを付与してください
- 定期的にアクセスキーを更新してください

## 7. まとめ

この設定により、Netlify Supabase Extension を使用して：

1. **自動化された環境変数設定**
2. **開発環境との一貫性**
3. **セキュアな本番環境**
4. **簡単なメンテナンス**

が実現されます。

設定完了後は、`git push` するだけで自動的にデプロイされ、Supabase 接続も自動的に設定されます。 