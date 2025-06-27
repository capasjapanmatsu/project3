/*
  # 料金体系の更新

  1. 料金体系の変更
    - サブスクリプション: 月額3,800円（使い放題）
    - 単発利用: 1日800円固定
    - 貸し切りブース: 2時間単位5,000円（人数制限なし）

  2. データベース更新
    - dog_parks テーブルの price カラムを削除（単発料金は固定のため）
    - private_booth_price を2時間単位5,000円に統一
    - subscriptions テーブルの price を3,800円に統一

  3. 予約システムの更新
    - 単発利用は1日800円固定
    - 貸し切りは2時間5,000円固定
*/

-- Update all dog parks to remove individual pricing (since it's now fixed at 800 yen per day)
-- Keep the price column for backward compatibility but set a standard value
UPDATE dog_parks SET price = 800;

-- Update all private booth prices to 5000 yen for 2 hours
UPDATE dog_parks SET private_booth_price = 5000 WHERE private_booths = true;

-- Update subscription prices to 3800 yen
UPDATE subscriptions SET price = 3800;

-- Add a comment to clarify the new pricing structure
COMMENT ON COLUMN dog_parks.price IS '単発利用料金（1日800円固定）';
COMMENT ON COLUMN dog_parks.private_booth_price IS '貸し切りブース料金（2時間5,000円固定、人数制限なし）';
COMMENT ON COLUMN subscriptions.price IS 'サブスクリプション料金（月額3,800円、使い放題）';