#!/bin/bash

# Netlify Supabase Extension 完全設定・デプロイスクリプト
# 使用方法: ./deploy-netlify-supabase.sh

set -e  # エラーが発生したら停止

# 色付きログ関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

log_step() {
    echo -e "\033[36m[STEP]\033[0m $1"
}

# スクリプトの開始
log_info "🚀 Netlify Supabase Extension 設定・デプロイスクリプトを開始します"

# 1. 環境確認
log_step "1. 環境確認中..."

# Node.js のバージョン確認
if ! command -v node &> /dev/null; then
    log_error "Node.js がインストールされていません"
    exit 1
fi

node_version=$(node --version)
log_info "Node.js バージョン: $node_version"

# npm のバージョン確認
if ! command -v npm &> /dev/null; then
    log_error "npm がインストールされていません"
    exit 1
fi

npm_version=$(npm --version)
log_info "npm バージョン: $npm_version"

# Git の確認
if ! command -v git &> /dev/null; then
    log_error "Git がインストールされていません"
    exit 1
fi

git_version=$(git --version)
log_info "Git バージョン: $git_version"

# 2. 依存関係のインストール
log_step "2. 依存関係をインストール中..."

if [ -f "package.json" ]; then
    npm install
    log_info "✅ 依存関係のインストールが完了しました"
else
    log_error "package.json が見つかりません"
    exit 1
fi

# 3. 環境変数の確認
log_step "3. 環境変数の確認中..."

# .env.local の確認
if [ -f ".env.local" ]; then
    log_info "✅ .env.local ファイルが見つかりました"
    
    # 必要な環境変数があるかチェック
    if grep -q "VITE_SUPABASE_URL" .env.local; then
        log_info "✅ VITE_SUPABASE_URL が設定されています"
    else
        log_warning "⚠️  VITE_SUPABASE_URL が設定されていません"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env.local; then
        log_info "✅ VITE_SUPABASE_ANON_KEY が設定されています"
    else
        log_warning "⚠️  VITE_SUPABASE_ANON_KEY が設定されていません"
    fi
else
    log_warning "⚠️  .env.local ファイルが見つかりません"
    log_info "開発環境用の .env.local ファイルを作成することをお勧めします"
fi

# 4. プロジェクトのテスト
log_step "4. プロジェクトのテスト中..."

log_info "TypeScript の型チェック実行中..."
npm run type-check

log_info "ESLint でのコードチェック実行中..."
npm run lint

log_info "プロダクションビルドのテスト実行中..."
npm run build

log_info "✅ すべてのテストが完了しました"

# 5. Netlify CLI の確認・インストール
log_step "5. Netlify CLI の確認中..."

if ! command -v netlify &> /dev/null; then
    log_info "Netlify CLI をインストール中..."
    npm install -g netlify-cli
    log_info "✅ Netlify CLI のインストールが完了しました"
else
    netlify_version=$(netlify --version)
    log_info "✅ Netlify CLI バージョン: $netlify_version"
fi

# 6. Git の状態確認
log_step "6. Git の状態確認中..."

if [ -d ".git" ]; then
    log_info "✅ Git リポジトリが初期化されています"
    
    # 未コミットの変更があるかチェック
    if git diff-index --quiet HEAD --; then
        log_info "✅ 未コミットの変更はありません"
    else
        log_warning "⚠️  未コミットの変更があります"
        git status
    fi
else
    log_error "Git リポジトリが初期化されていません"
    exit 1
fi

# 7. デプロイ方法の選択
log_step "7. デプロイ方法を選択してください"

echo "以下の方法からデプロイ方法を選択してください："
echo "1. Git プッシュでの自動デプロイ（推奨）"
echo "2. Netlify CLI でのプレビューデプロイ"
echo "3. Netlify CLI でのプロダクションデプロイ"
echo "4. 設定のみ実行（デプロイしない）"

read -p "選択してください (1-4): " choice

case $choice in
    1)
        log_step "8. Git プッシュでの自動デプロイを実行中..."
        
        # 変更をステージング
        git add .
        
        # コミットメッセージを作成
        commit_message="Netlify Supabase Extension 設定完了

- Supabase クライアントを Netlify Extension 対応に更新
- 環境変数のフォールバック機能を追加
- vite.config.ts で環境変数の自動変換を設定
- netlify.toml でデプロイ設定を最適化
- package.json にデプロイ用スクリプトを追加

Date: $(date)"
        
        # コミット実行
        git commit -m "$commit_message"
        
        # プッシュ実行
        git push origin main
        
        log_info "✅ Git プッシュによるデプロイが完了しました"
        log_info "🌐 Netlify でのビルドとデプロイが開始されています"
        ;;
        
    2)
        log_step "8. Netlify CLI でのプレビューデプロイを実行中..."
        
        # プレビューデプロイ
        netlify deploy
        
        log_info "✅ プレビューデプロイが完了しました"
        ;;
        
    3)
        log_step "8. Netlify CLI でのプロダクションデプロイを実行中..."
        
        # プロダクションデプロイ
        netlify deploy --prod
        
        log_info "✅ プロダクションデプロイが完了しました"
        ;;
        
    4)
        log_info "✅ 設定のみ完了しました。デプロイは実行されませんでした"
        ;;
        
    *)
        log_error "無効な選択です"
        exit 1
        ;;
esac

# 9. 最終確認とドキュメント表示
log_step "9. 最終確認とドキュメント"

log_info "🎉 Netlify Supabase Extension の設定とデプロイが完了しました！"
echo
echo "📋 次のステップ："
echo "1. Netlify ダッシュボードで Supabase Extension をインストール"
echo "2. OAuth 認証で Supabase プロジェクトを接続"
echo "3. 環境変数 VITE_SUPABASE_URL=\${SUPABASE_DATABASE_URL} を設定"
echo "4. 環境変数 VITE_SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY} を設定"
echo "5. サイトを再デプロイ"
echo
echo "📚 参考ドキュメント："
echo "- NETLIFY_SUPABASE_SETUP.md: 完全な設定手順"
echo "- NETLIFY_ENVIRONMENT_SETUP.md: 環境変数の設定方法"
echo "- DEPLOY_COMMANDS.md: デプロイコマンド集"
echo
echo "🔧 便利なコマンド："
echo "- npm run deploy: 自動デプロイ"
echo "- npm run deploy:preview: プレビューデプロイ"
echo "- npm run deploy:prod: プロダクションデプロイ"
echo "- npm run netlify:status: デプロイ状況確認"
echo "- npm run netlify:env: 環境変数確認"
echo "- npm run check:env: 環境変数チェック"
echo
echo "🌟 設定完了！お疲れ様でした！" 