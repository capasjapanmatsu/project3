# Netlify Supabase Extension 完全設定ガイド

## 1. Netlify ダッシュボードで Supabase Extension をインストールする手順

### 1.1 Netlify ダッシュボードにアクセス
1. [Netlify ダッシュボード](https://app.netlify.com/) にログイン
2. 対象のサイトを選択
3. サイトの設定メニューから **「Integrations」** をクリック

### 1.2 Supabase Extension をインストール
1. **「Browse integrations」** をクリック
2. 検索バーで **「Supabase」** を検索
3. **「Supabase」** の integration を選択
4. **「Install」** ボタンをクリック
5. インストール確認画面で **「Install」** を再度クリック

## 2. OAuth 認証で Supabase アカウントを接続し、対象プロジェクトを選択する手順

### 2.1 Supabase アカウント認証
1. Supabase Extension インストール後、自動的に認証画面が表示されます
2. **「Connect to Supabase」** をクリック
3. Supabase の OAuth 認証画面で、GitHubアカウントでログイン
4. 権限の許可画面で **「Authorize」** をクリック

### 2.2 Supabase プロジェクト選択
1. 認証完了後、Organization とプロジェクトの選択画面が表示されます
2. 対象の **Organization** を選択
3. 接続したい **Supabase プロジェクト** を選択
4. **「Connect project」** をクリック

## 3. 自動的に環境変数を Netlify サイトの設定に追加する方法

### 3.1 環境変数の自動設定確認
接続完了後、以下の環境変数が自動的に Netlify サイトに追加されます：

```bash
# Netlify の Site settings > Environment variables で確認可能
SUPABASE_DATABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-key
```

### 3.2 環境変数の確認方法
1. Netlify ダッシュボードで対象サイトを選択
2. **「Site settings」** → **「Environment variables」** をクリック
3. 上記の4つの環境変数が追加されていることを確認

## 4. Vite プロジェクトで環境変数を使用する設定

### 4.1 Vite 環境変数の特徴
- Vite では `VITE_` プレフィックスが必要
- Netlify Extension は `SUPABASE_` プレフィックスで変数を作成
- 手動で `VITE_` プレフィックス付きの変数を追加する必要があります

### 4.2 追加の環境変数設定
Netlify の Environment variables で以下を手動追加：

```bash
VITE_SUPABASE_URL=${SUPABASE_DATABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
VITE_SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
VITE_SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
```

## 5. デプロイとテスト

### 5.1 サイトの再デプロイ
```bash
# Git 経由でのデプロイ
git add .
git commit -m "Netlify Supabase Extension 設定完了"
git push origin main

# または Netlify CLI を使用
npm install -g netlify-cli
netlify deploy --prod
```

### 5.2 動作確認
1. デプロイ完了後、サイトにアクセス
2. ブラウザの開発者ツールでコンソールを確認
3. Supabase 接続の成功ログを確認

## 6. トラブルシューティング

### 6.1 よくある問題と解決方法
- **環境変数が認識されない**: `VITE_` プレフィックスが付いているかチェック
- **認証エラー**: Supabase プロジェクトの RLS 設定を確認
- **CORS エラー**: Supabase ダッシュボードでドメインを許可リストに追加

### 6.2 デバッグ方法
```javascript
// ブラウザコンソールでの確認
console.log('環境変数確認:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
  mode: import.meta.env.MODE
});
```

---

## 完了チェックリスト

- [ ] Netlify で Supabase Extension をインストール
- [ ] Supabase アカウントを OAuth 認証で接続
- [ ] 対象プロジェクトを選択
- [ ] 環境変数が自動追加されることを確認
- [ ] `VITE_` プレフィックス付きの環境変数を手動追加
- [ ] コードを更新して新しい環境変数を使用
- [ ] サイトを再デプロイ
- [ ] 動作確認を実施

この手順に従って設定すれば、Netlify と Supabase の連携が完全に自動化されます。 