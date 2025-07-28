-- テスト用クーポンデータ追加SQL
-- まず施設IDを確認
SELECT id, name FROM pet_facilities WHERE name LIKE '%わんわんキャンプ%' LIMIT 1;

-- クーポン追加（上記で取得した施設IDを使用）
INSERT INTO facility_coupons (
    facility_id,
    title,
    description,
    service_content,
    discount_value,
    discount_type,
    start_date,
    end_date,
    usage_limit_type,
    max_uses,
    is_active
) VALUES (
    'c2535dc4-aa98-4324-a90b-db34d8123557', -- わんわんキャンプの施設ID
    'わんわんキャンプ２０％OFF',
    'ワンちゃんと一緒にキャンプなら２ ０％OFF',
    'キャンプ料金２０％割引',
    20,
    'percentage',
    '2025-01-01 00:00:00+09',
    '2025-08-31 23:59:59+09',
    'once',
    1,
    true
);

-- 追加されたクーポンを確認
SELECT * FROM facility_coupons WHERE facility_id = 'c2535dc4-aa98-4324-a90b-db34d8123557'; 