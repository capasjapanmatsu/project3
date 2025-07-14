# Netlify Supabase Extension デプロイコマンド集

## 1. 基本的なデプロイコマンド

### 1.1 Git 経由でのデプロイ（推奨）

```bash
# 変更をステージング
git add .

# コミット
git commit -m "Netlify Supabase Extension 設定完了"

# リモートリポジトリにプッシュ（自動デプロイ）
git push origin main
```

### 1.2 Netlify CLI を使用したデプロイ

```bash
# Netlify CLI のインストール（グローバル）
npm install -g netlify-cli

# Netlify にログイン
netlify login

# プロジェクトを Netlify サイトにリンク
netlify link

# プレビューデプロイ
netlify deploy

# プロダクションデプロイ
netlify deploy --prod
```

## 2. 環境別デプロイコマンド

### 2.1 開発環境でのテスト

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# 開発環境での動作確認
# ブラウザで http://localhost:3000 にアクセス
```

### 2.2 プロダクションビルドのテスト

```bash
# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# または、ローカルでプロダクションビルドを確認
npx serve dist
```

## 3. Netlify Supabase Extension 設定後の初回デプロイ

### 3.1 完全な設定手順

```bash
# 1. 依存関係の更新
npm install

# 2. 環境変数の確認（開発環境）
echo "VITE_SUPABASE_URL: $(grep VITE_SUPABASE_URL .env.local | cut -d '=' -f2)"
echo "VITE_SUPABASE_ANON_KEY: $(grep VITE_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2 | head -c 20)..."

# 3. 開発環境でのテスト
npm run dev

# 4. プロダクションビルドのテスト
npm run build

# 5. 変更をコミット
git add .
git commit -m "Netlify Supabase Extension 設定完了

- Supabase クライアントを Netlify Extension 対応に更新
- 環境変数のフォールバック機能を追加
- vite.config.ts で環境変数の自動変換を設定
- netlify.toml でデプロイ設定を最適化"

# 6. デプロイ実行
git push origin main
```

### 3.2 デプロイ後の確認

```bash
# Netlify CLI でデプロイ状況を確認
netlify status

# サイトを開く
netlify open

# デプロイログを確認
netlify logs
```

## 4. 環境変数設定のためのコマンド

### 4.1 Netlify CLI での環境変数設定

```bash
# 環境変数の一覧表示
netlify env:list

# 環境変数の設定
netlify env:set VITE_SUPABASE_URL "https://your-project-id.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 環境変数の確認
netlify env:get VITE_SUPABASE_URL
```

### 4.2 一括環境変数設定スクリプト

```bash
#!/bin/bash
# netlify-env-setup.sh

echo "🔧 Netlify 環境変数を設定中..."

# Supabase 環境変数の設定
netlify env:set VITE_SUPABASE_URL "\${SUPABASE_DATABASE_URL}"
netlify env:set VITE_SUPABASE_ANON_KEY "\${SUPABASE_ANON_KEY}"
netlify env:set VITE_SUPABASE_SERVICE_ROLE_KEY "\${SUPABASE_SERVICE_ROLE_KEY}"
netlify env:set VITE_SUPABASE_JWT_SECRET "\${SUPABASE_JWT_SECRET}"

# アプリケーション設定
netlify env:set VITE_APP_NAME "DogPark JP"
netlify env:set VITE_APP_VERSION "1.0.0"
netlify env:set VITE_DEV_MODE "false"
netlify env:set VITE_DEBUG_MODE "false"

echo "✅ 環境変数の設定が完了しました"
echo "🚀 デプロイを実行してください: netlify deploy --prod"
```

## 5. トラブルシューティング用コマンド

### 5.1 デプロイエラーの調査

```bash
# 最新のデプロイログを確認
netlify logs

# ビルドエラーの詳細を確認
netlify build --debug

# 環境変数の状態を確認
netlify env:list

# サイトの状態を確認
netlify status
```

### 5.2 キャッシュクリア

```bash
# Netlify のキャッシュをクリア
netlify api clearCache

# ローカルの node_modules をクリア
rm -rf node_modules package-lock.json
npm install

# Vite のキャッシュをクリア
rm -rf node_modules/.vite
```

## 6. 継続的デプロイの設定

### 6.1 自動デプロイの確認

```bash
# 現在のデプロイ設定を確認
netlify sites:list

# 自動デプロイの設定確認
netlify api getSite --data '{"site_id": "YOUR_SITE_ID"}'
```

### 6.2 ブランチ別デプロイの設定

```bash
# develop ブランチからプレビューデプロイ
git checkout develop
git add .
git commit -m "開発版の更新"
git push origin develop

# main ブランチからプロダクションデプロイ
git checkout main
git merge develop
git push origin main
```

## 7. パフォーマンス監視用コマンド

### 7.1 Lighthouse での監査

```bash
# Lighthouse CLI のインストール
npm install -g lighthouse

# サイトの監査実行
lighthouse https://your-site.netlify.app --output=html --output-path=./lighthouse-report.html
```

### 7.2 サイトの監視

```bash
# サイトの応答時間を測定
curl -w "@curl-format.txt" -o /dev/null -s https://your-site.netlify.app

# curl-format.txt の内容:
# time_namelookup:    %{time_namelookup}\n
# time_connect:       %{time_connect}\n
# time_appconnect:    %{time_appconnect}\n
# time_pretransfer:   %{time_pretransfer}\n
# time_redirect:      %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:         %{time_total}\n
```

## 8. 定期メンテナンス用コマンド

### 8.1 依存関係の更新

```bash
# 依存関係の更新確認
npm outdated

# アップデート実行
npm update

# セキュリティ監査
npm audit
npm audit fix

# 重要なアップデート後のデプロイ
git add .
git commit -m "依存関係の更新"
git push origin main
```

### 8.2 定期的なデプロイ確認

```bash
# 週次チェックスクリプト
#!/bin/bash
echo "📅 週次デプロイチェック開始"

# 依存関係の確認
npm outdated

# セキュリティ監査
npm audit

# 環境変数の確認
netlify env:list

# 最新のデプロイ状況確認
netlify status

# サイトの動作確認
curl -I https://your-site.netlify.app

echo "✅ 週次チェック完了"
```

## 9. 緊急時のロールバック

### 9.1 前のバージョンへの復元

```bash
# 以前のコミットを確認
git log --oneline -10

# 特定のコミットに戻す
git reset --hard COMMIT_HASH

# 強制プッシュ（注意：本番環境では慎重に実行）
git push --force-with-lease origin main
```

### 9.2 Netlify での以前のデプロイに戻す

```bash
# 以前のデプロイを確認
netlify api listSiteDeploys

# 特定のデプロイを復元
netlify api restoreSiteDeploy --data '{"deploy_id": "DEPLOY_ID"}'
```

## 10. まとめ

これらのコマンドを使用することで：

1. **自動化されたデプロイフロー**
2. **エラーハンドリングと修復**
3. **パフォーマンス監視**
4. **セキュリティ監査**
5. **緊急時対応**

が効率的に実行できます。

特に Netlify Supabase Extension を使用する場合は、環境変数の設定が重要なので、定期的に確認することをお勧めします。 