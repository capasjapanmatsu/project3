# PINコードシステム セットアップガイド

## 概要

このガイドでは、スマートロックPINコードシステムのセットアップ方法を説明します。

## 環境変数の設定

`.env` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Supabase設定（必須）
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Sciener API設定（実際のスマートロック連携時に必要）
VITE_SCIENER_CLIENT_ID=your_sciener_client_id
VITE_SCIENER_ACCESS_TOKEN=your_sciener_access_token
```

## データベースセットアップ

### 1. マイグレーションの実行

```bash
# ローカル環境の場合
supabase db push

# または、Supabase SQL Editorで以下を実行：
# supabase/migrations/20250201000001_create_access_logs_table.sql の内容をコピー&ペースト
```

### 2. テーブル作成の確認

以下のテーブルが作成されていることを確認：
- `access_logs` - PINコードの発行と使用履歴
- `dog_run_locks` - スマートロック情報

## Edge Functionのデプロイ

### ローカル開発

```bash
# Supabaseローカル環境を起動
supabase start

# Edge Functionをローカルで実行
supabase functions serve lock-record-notify
```

### プロダクション環境

```bash
# Supabaseプロジェクトにリンク
supabase link --project-ref your-project-ref

# Edge Functionをデプロイ
supabase functions deploy lock-record-notify
```

## Sciener API設定

### 1. Scienerアカウントの準備

1. [Sciener開発者ポータル](https://open.sciener.com) にアクセス
2. アプリケーションを作成
3. Client IDとClient Secretを取得
4. Access Tokenを生成

### 2. Webhook設定

Sciener管理画面で以下のWebhookを設定：

- **URL**: `https://your-project.supabase.co/functions/v1/lock-record-notify`
- **イベントタイプ**: `lockRecord`
- **HTTPメソッド**: `POST`

## テスト手順

### 1. ローカル環境でのテスト

```bash
# 開発サーバーを起動
npm run dev

# ブラウザでテストページにアクセス
http://localhost:5173/test-pin-generator
```

### 2. PIN発行テスト

1. テストページの「PIN発行」セクションで新しいPINを生成
2. 生成されたPINコードをメモ
3. カウントダウンタイマーが動作することを確認

### 3. Webhook受信テスト

1. テストページの「Webhook受信テスト」セクションを使用
2. 発行したPINコードとLock IDを入力
3. 「解錠通知をテスト送信」をクリック
4. 成功メッセージが表示されることを確認

## トラブルシューティング

### Webhookエンドポイントがオフラインと表示される

1. Supabaseプロジェクトが起動していることを確認
2. Edge Functionがデプロイされていることを確認
3. 環境変数が正しく設定されていることを確認

### PIN発行時にエラーが発生する

1. Sciener APIの認証情報を確認
2. ネットワーク接続を確認
3. ブラウザのコンソールログを確認

### Webhook通知が受信されない

1. Edge Functionのログを確認：
   ```bash
   supabase functions logs lock-record-notify
   ```
2. Sciener側のWebhook設定を確認
3. ファイアウォール設定を確認

## 実装ステータス

✅ **完了済み**
- ステップ1: データモデル定義
- ステップ2: PIN発行UIコンポーネント
- ステップ3: Sciener API連携関数
- ステップ4: Webhook受信エンドポイント
- ステップ5: 入退場ステータス管理とUI表示
- ステップ6: 履歴保存とコミュニティ連携基盤

## 関連ファイル

- `/src/types/pinCode.ts` - TypeScript型定義
- `/src/components/PinGenerator.tsx` - PIN発行UIコンポーネント
- `/src/utils/scienerApi.ts` - Sciener API連携関数
- `/src/utils/webhookTest.ts` - Webhookテストユーティリティ
- `/supabase/functions/lock-record-notify/` - Webhook受信Edge Function
- `/supabase/migrations/20250201000001_create_access_logs_table.sql` - データベーススキーマ

## サポート

問題が発生した場合は、以下を確認してください：
1. このガイドの手順をすべて実行したか
2. 環境変数が正しく設定されているか
3. ブラウザのコンソールログとネットワークタブ
4. Supabaseのログとデータベース状態
