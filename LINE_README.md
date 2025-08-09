## LINE 連携（Messaging API）

Netlify Functions で Webhook / Push / Notify API を提供します。

### エンドポイント
- Webhook: `https://dogparkjp.com/.netlify/functions/line-webhook`
- Push: `https://dogparkjp.com/.netlify/functions/line-push`
- Notify API: `https://dogparkjp.com/.netlify/functions/line-notify` (POST)

### 環境変数（Netlify UI で設定）
- `LINE_CHANNEL_SECRET`: LINE Developers の Channel Secret
- `LINE_ACCESS_TOKEN`: 長期アクセストークン
- `LINE_TEST_USER_ID`: Push テスト用のユーザーID（Uで始まる）

### 動作確認
1) Webhook 検証: LINE Developers から Verify → 成功
2) Push（GET）: ブラウザで `/.netlify/functions/line-push?to=Uxxxx`
3) Push（POST）:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"こんにちは！"}' \
  https://dogparkjp.com/.netlify/functions/line-push
```

4) Notify API（テキスト送信）
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"to":"Uxxxx","kind":"text","message":"通知テスト"}' \
  https://dogparkjp.com/.netlify/functions/line-notify
```

5) Notify API（予約テンプレ）
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "to":"Uxxxx",
    "kind":"reservation",
    "payload":{
      "parkName":"ドッグランA",
      "date":"2025-08-09",
      "time":"10:00 - 12:00",
      "dogs":["ポチ","ココ"]
    }
  }' \
  https://dogparkjp.com/.netlify/functions/line-notify
```

メモ: follow/unfollow は line-webhook でログ出力します。メッセージの「停止」「開始」で配信ON/OFFの土台（DB処理はTODO）も用意済みです。


