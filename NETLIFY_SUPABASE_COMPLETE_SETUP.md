# Netlify Supabase Extension 完全設定ガイド

## 🎯 概要

このガイドでは、Netlify の Supabase Extension を使用して既存の React + Vite プロジェクトに Supabase 接続を自動設定する完全なプロセスを説明します。

## 📋 完成後の成果物

1. **自動環境変数設定**: Netlify Extension により環境変数が自動設定
2. **フォールバック機能**: 既存設定と新設定の両方をサポート
3. **自動デプロイ**: Git プッシュによる自動デプロイ
4. **デバッグ機能**: 環境変数とSupabase接続の状態確認機能
5. **完全なドキュメント**: 設定手順とトラブルシューティングガイド

## 🛠️ 生成されたファイル一覧

### 1. 設定ファイル
- `src/utils/supabase.ts` - Netlify Extension 対応の Supabase クライアント
- `vite.config.ts` - 環境変数の自動変換設定
- `netlify.toml` - Netlify デプロイ設定
- `package.json` - デプロイ用スクリプト追加

### 2. ドキュメント
- `NETLIFY_SUPABASE_SETUP.md` - 完全な設定手順書
- `NETLIFY_ENVIRONMENT_SETUP.md` - 環境変数設定手順
- `DEPLOY_COMMANDS.md` - デプロイコマンド集

### 3. 自動化スクリプト
- `deploy-netlify-supabase.sh` - 自動設定・デプロイスクリプト

## 🚀 クイックスタートガイド

### Step 1: 自動セットアップスクリプトの実行

Windows環境（PowerShell）：
```powershell
# 実行ポリシーを一時的に変更
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# スクリプトを実行
./deploy-netlify-supabase.sh
```

Unix/Linux/macOS：
```bash
# 実行権限を付与
chmod +x deploy-netlify-supabase.sh

# スクリプトを実行
./deploy-netlify-supabase.sh
```

### Step 2: Netlify で Supabase Extension を設定

1. **Netlify ダッシュボード** にアクセス
2. **Integrations** → **Browse integrations** → **Supabase** をインストール
3. **OAuth 認証** で Supabase プロジェクトを接続
4. **環境変数** が自動設定されることを確認

### Step 3: 追加の環境変数を設定

Netlify の **Site settings** → **Environment variables** で以下を追加：

```bash
VITE_SUPABASE_URL=${SUPABASE_DATABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
VITE_SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
```

### Step 4: デプロイ実行

```bash
# 自動デプロイ
npm run deploy

# または
git add .
git commit -m "Netlify Supabase Extension 設定完了"
git push origin main
```

## 🔧 主要な機能

### 1. 環境変数のフォールバック機能

```typescript
// 既存設定と新設定の両方をサポート
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 
                   import.meta.env.VITE_SUPABASE_DATABASE_URL || 
                   import.meta.env.SUPABASE_DATABASE_URL as string;
```

### 2. 自動デバッグ機能

```typescript
// 開発環境で自動的にSupabase設定を表示
if (import.meta.env.DEV) {
  console.log('🔗 Supabase Netlify Extension 設定:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    netlifyExtensionActive: !!(import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_DATABASE_URL),
    environment: import.meta.env.MODE || 'unknown',
  });
}
```

### 3. 管理者用クライアント

```typescript
// Service Role Key を使用した管理者用クライアント
export const supabaseAdmin = supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}) : null;
```

### 4. エラーハンドリング強化

```typescript
// Netlify Extension 特有のエラーを適切に処理
export const handleSupabaseError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as { message: string; code?: string };
    
    if (err.code === 'PGRST116') {
      return 'データが見つかりません。Netlify の環境変数設定を確認してください。';
    }
    
    if (err.code === 'PGRST301') {
      return 'データベース接続エラー。Netlify Supabase Extension の設定を確認してください。';
    }
    
    // 他のエラーハンドリング...
  }
  
  return '不明なエラーが発生しました';
};
```

## 📦 追加されたNPMスクリプト

```json
{
  "scripts": {
    "deploy": "npm run build && git add . && git commit -m 'Deploy to Netlify' && git push origin main",
    "deploy:preview": "npm run build && netlify deploy",
    "deploy:prod": "npm run build && netlify deploy --prod",
    "netlify:env": "netlify env:list",
    "netlify:status": "netlify status",
    "netlify:open": "netlify open",
    "netlify:logs": "netlify logs",
    "setup:netlify": "npm install -g netlify-cli && netlify login && netlify link",
    "check:env": "echo 'Checking environment variables...' && node -e \"console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || 'Not set'); console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');\""
  }
}
```

## 🔐 セキュリティ考慮事項

### 1. 環境変数の管理
- **SERVICE_ROLE_KEY** はサーバーサイドでのみ使用
- クライアントサイドでは **ANON_KEY** のみ使用
- 開発環境の `.env.local` は Git にコミットしない

### 2. Netlify での環境変数セキュリティ
- 環境変数は暗号化されて保存
- 動的参照（`${VARIABLE_NAME}`）を使用して重複を避ける
- 必要最小限の権限のみを付与

## 🐛 トラブルシューティング

### 1. 環境変数が undefined になる場合
```bash
# 環境変数の確認
npm run check:env

# Netlify の環境変数確認
npm run netlify:env
```

### 2. Supabase 接続エラー
```bash
# デバッグ情報の確認
npm run dev
# ブラウザコンソールでデバッグ情報を確認
```

### 3. デプロイエラー
```bash
# ビルドエラーの確認
npm run build

# Netlify ログの確認
npm run netlify:logs
```

## 🌟 使用例

### 基本的な使用方法

```typescript
import { supabase } from '@/utils/supabase';

// データの取得
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId);

// 認証
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

### デバッグ用の関数

```typescript
import { debugAuth, checkNetlifySupabaseEnv } from '@/utils/supabase';

// 認証状態の確認
await debugAuth();

// 環境変数の確認
checkNetlifySupabaseEnv();
```

## 🎉 完了チェックリスト

- [ ] 自動セットアップスクリプトの実行
- [ ] Netlify で Supabase Extension をインストール
- [ ] OAuth 認証で Supabase プロジェクトを接続
- [ ] 環境変数が自動設定されることを確認
- [ ] `VITE_` プレフィックス付きの環境変数を手動追加
- [ ] サイトを再デプロイ
- [ ] 本番環境での動作確認
- [ ] デバッグ機能の動作確認

## 📞 サポート

このセットアップで問題が発生した場合は、以下のドキュメントを確認してください：

1. **NETLIFY_SUPABASE_SETUP.md** - 詳細な設定手順
2. **NETLIFY_ENVIRONMENT_SETUP.md** - 環境変数の設定方法
3. **DEPLOY_COMMANDS.md** - デプロイコマンド集

---

## 🚀 今すぐ始める

```bash
# 1. リポジトリをクローン（既存の場合はスキップ）
git clone your-repo-url
cd your-project

# 2. 自動セットアップスクリプトを実行
./deploy-netlify-supabase.sh

# 3. Netlify で Supabase Extension を設定
# - Netlify ダッシュボード → Integrations → Supabase
# - OAuth 認証で接続
# - 環境変数を手動追加

# 4. デプロイ
npm run deploy
```

**🎯 5分で完了！** Netlify Supabase Extension の設定が完了し、自動デプロイが開始されます。 