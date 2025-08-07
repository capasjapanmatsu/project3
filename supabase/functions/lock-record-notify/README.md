# lock-record-notify Edge Function

Sciener Webhookからの解錠通知を受信し、AccessLogを更新するエンドポイント。

## 概要

このEdge Functionは、Scienerの `lockRecord/notify` Webhookから送信される解錠通知を受け取り、対応するAccessLogのステータスを更新します。

## エンドポイント

```
POST /functions/v1/lock-record-notify
```

## リクエスト形式

```json
{
  "lockId": "123456",
  "keyboardPwd": "123456",
  "recordType": 2,
  "date": 1690000000000
}
```

### パラメータ

- `lockId` (string, required): スマートロックのID
- `keyboardPwd` (string, required): 使用されたPINコード
- `recordType` (number, required): 記録タイプ（2 = 解錠成功）
- `date` (number, required): イベント発生時刻（Unixタイムスタンプ、ミリ秒）

## レスポンス形式

### 成功時

```json
{
  "success": true,
  "message": "Access log updated: entered",
  "updatedLog": {
    "id": "uuid",
    "status": "entered",
    "used_at": "2024-01-01T00:00:00Z"
  }
}
```

### エラー時

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error"
}
```

## デプロイ方法

### 1. ローカル開発

```bash
# Supabaseローカル環境を起動
supabase start

# Edge Functionをローカルで実行
supabase functions serve lock-record-notify --env-file ./supabase/.env.local
```

### 2. プロダクションデプロイ

```bash
# Supabaseプロジェクトにリンク
supabase link --project-ref your-project-ref

# Edge Functionをデプロイ
supabase functions deploy lock-record-notify

# 環境変数を設定（Supabaseダッシュボードから）
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

## Sciener側の設定

1. Sciener管理画面にログイン
2. Webhook設定ページへ移動
3. 新しいWebhookを追加:
   - URL: `https://your-project.supabase.co/functions/v1/lock-record-notify`
   - イベント: `lockRecord`
   - メソッド: `POST`

## テスト方法

### curlでのテスト

```bash
curl -X POST https://your-project.supabase.co/functions/v1/lock-record-notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "lockId": "123456",
    "keyboardPwd": "123456",
    "recordType": 2,
    "date": 1690000000000
  }'
```

### フロントエンドからのテスト

`/test-pin-generator` ページのWebhookテストセクションを使用してテスト可能。

## 処理フロー

1. Webhookペイロードを受信
2. `recordType` が 2（解錠成功）であることを確認
3. `pin` と `lockId` でAccessLogを検索
4. 見つかったAccessLogのステータスを更新:
   - `entry` PIN + `issued` → `entered`
   - `exit` PIN + `exit_requested` → `exited`
5. `used_at` にイベント時刻を記録

## 注意事項

- Service Roleキーを使用してRLSをバイパス
- 重複処理防止のため、すでに `used_at` が設定されているログは更新しない
- `recordType` が 2 以外のイベントはログのみで処理しない
