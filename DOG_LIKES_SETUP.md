# ワンちゃんいいね機能セットアップガイド

## 概要
ワンちゃんの個別プロフィールページにいいね機能を実装しました。

## データベースセットアップ

以下のSQLをSupabaseのSQL Editorで実行してください：

```sql
-- dog_likesテーブルを作成
CREATE TABLE IF NOT EXISTS dog_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, dog_id)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_dog_likes_user_id ON dog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_dog_likes_dog_id ON dog_likes(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_likes_created_at ON dog_likes(created_at);

-- RLSポリシーを有効化
ALTER TABLE dog_likes ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
DROP POLICY IF EXISTS "Users can view all dog likes" ON dog_likes;
CREATE POLICY "Users can view all dog likes" ON dog_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own dog likes" ON dog_likes;
CREATE POLICY "Users can manage their own dog likes" ON dog_likes
  FOR ALL USING (auth.uid() = user_id);

-- テーブルの権限を設定
GRANT ALL ON dog_likes TO authenticated;
GRANT ALL ON dog_likes TO anon;
```

## 機能の特徴

1. **いいねボタンの表示**
   - ワンちゃんの名前の横に配置（目立つ位置）
   - 基本情報セクションの下部にも配置
   - ピンク色のハートアイコンで視覚的にわかりやすく

2. **ログイン状態による動作**
   - ログイン済み：いいねの追加/取り消しが可能
   - 未ログイン：ログイン画面へリダイレクト

3. **いいねカウント**
   - リアルタイムでいいね数を表示
   - いいね/取り消し時に即座に反映

4. **UI/UX改善**
   - ホバー時にボタンが少し拡大するアニメーション
   - いいね済みの場合はピンク色の塗りつぶし
   - 未いいねの場合は白背景にピンク色の枠線

## アクセス方法
- コミュニティページから各ワンちゃんのプロフィールにアクセス
- `/dog-profile/{dogId}` または `/dog/{id}` のURLでアクセス可能

## トラブルシューティング

もしいいね機能が動作しない場合：

1. Supabaseダッシュボードで`dog_likes`テーブルが存在することを確認
2. RLSポリシーが正しく設定されていることを確認
3. ブラウザのコンソールでエラーがないか確認