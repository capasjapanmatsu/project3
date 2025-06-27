-- サンプル愛犬・コミュニティデータを追加
-- 注意: プロフィールデータは実際のユーザー登録時に作成されるため、
-- ここでは愛犬とコミュニティデータのみを追加します

-- 既存のユーザーがいる場合のみサンプル愛犬を追加
-- 実際のユーザーIDを使用するため、条件付きで挿入
DO $$
DECLARE
    sample_user_id uuid;
    sample_user_id_2 uuid;
    sample_user_id_3 uuid;
    sample_park_id uuid;
BEGIN
    -- 既存のユーザーIDを取得（最大3人まで）
    SELECT id INTO sample_user_id FROM profiles WHERE user_type = 'user' LIMIT 1;
    SELECT id INTO sample_user_id_2 FROM profiles WHERE user_type = 'user' AND id != COALESCE(sample_user_id, '00000000-0000-0000-0000-000000000000') LIMIT 1;
    SELECT id INTO sample_user_id_3 FROM profiles WHERE user_type = 'user' AND id NOT IN (COALESCE(sample_user_id, '00000000-0000-0000-0000-000000000000'), COALESCE(sample_user_id_2, '00000000-0000-0000-0000-000000000000')) LIMIT 1;
    
    -- 既存のドッグパークIDを取得
    SELECT id INTO sample_park_id FROM dog_parks WHERE status = 'approved' LIMIT 1;
    
    -- ユーザーが存在する場合のみサンプル愛犬を追加
    IF sample_user_id IS NOT NULL THEN
        -- 最初のユーザーの愛犬
        INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, image_url, created_at) VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, sample_user_id, 'ココ', '柴犬', '2022-03-15', 'メス', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', NOW()),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, sample_user_id, 'ハチ', 'コーギー', '2021-06-12', 'オス', 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg', NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- ワクチン接種証明書
        INSERT INTO vaccine_certifications (id, dog_id, rabies_vaccine_image, combo_vaccine_image, status, approved_at, created_at) VALUES
        ('11111111-2222-3333-4444-555555555555'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'vaccine/rabies_coco.jpg', 'vaccine/combo_coco.jpg', 'approved', NOW(), NOW()),
        ('66666666-7777-8888-9999-aaaaaaaaaaaa'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'vaccine/rabies_hachi.jpg', 'vaccine/combo_hachi.jpg', 'approved', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    IF sample_user_id_2 IS NOT NULL THEN
        -- 2番目のユーザーの愛犬
        INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, image_url, created_at) VALUES
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, sample_user_id_2, 'マロン', 'トイプードル', '2021-08-20', 'オス', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', NOW()),
        ('12345678-1234-1234-1234-123456789012'::uuid, sample_user_id_2, 'モモ', 'フレンチブルドッグ', '2023-04-18', 'メス', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- ワクチン接種証明書
        INSERT INTO vaccine_certifications (id, dog_id, rabies_vaccine_image, combo_vaccine_image, status, approved_at, created_at) VALUES
        ('22222222-3333-4444-5555-666666666666'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'vaccine/rabies_maron.jpg', 'vaccine/combo_maron.jpg', 'approved', NOW(), NOW()),
        ('77777777-8888-9999-aaaa-bbbbbbbbbbbb'::uuid, '12345678-1234-1234-1234-123456789012'::uuid, 'vaccine/rabies_momo.jpg', 'vaccine/combo_momo.jpg', 'approved', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    IF sample_user_id_3 IS NOT NULL THEN
        -- 3番目のユーザーの愛犬
        INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, image_url, created_at) VALUES
        ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, sample_user_id_3, 'ルナ', 'チワワ', '2023-01-10', 'メス', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', NOW()),
        ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, sample_user_id_3, 'レオ', 'ゴールデンレトリバー', '2020-12-05', 'オス', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', NOW()),
        ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, sample_user_id_3, 'さくら', 'ポメラニアン', '2022-09-30', 'メス', 'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg', NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- ワクチン接種証明書
        INSERT INTO vaccine_certifications (id, dog_id, rabies_vaccine_image, combo_vaccine_image, status, approved_at, created_at) VALUES
        ('33333333-4444-5555-6666-777777777777'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'vaccine/rabies_luna.jpg', 'vaccine/combo_luna.jpg', 'approved', NOW(), NOW()),
        ('44444444-5555-6666-7777-888888888888'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'vaccine/rabies_leo.jpg', 'vaccine/combo_leo.jpg', 'approved', NOW(), NOW()),
        ('55555555-6666-7777-8888-999999999999'::uuid, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'vaccine/rabies_sakura.jpg', 'vaccine/combo_sakura.jpg', 'approved', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- ドッグパークが存在し、複数のユーザーと愛犬がいる場合のみコミュニティデータを追加
    IF sample_park_id IS NOT NULL AND sample_user_id IS NOT NULL AND sample_user_id_2 IS NOT NULL THEN
        -- 犬の出会い記録を追加
        INSERT INTO dog_encounters (id, dog1_id, dog2_id, park_id, encounter_date, created_at) VALUES
        ('11111111-aaaa-bbbb-cccc-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, sample_park_id, CURRENT_DATE - INTERVAL '7 days', NOW()),
        ('22222222-aaaa-bbbb-cccc-222222222222'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '12345678-1234-1234-1234-123456789012'::uuid, sample_park_id, CURRENT_DATE - INTERVAL '5 days', NOW())
        ON CONFLICT (id) DO NOTHING;
        
        -- 友達申請を追加
        INSERT INTO friend_requests (id, requester_id, requested_id, status, message, created_at, responded_at) VALUES
        ('11111111-1111-2222-3333-444444444444'::uuid, sample_user_id, sample_user_id_2, 'accepted', 'ココちゃんとマロンくんが仲良くなったので、よろしくお願いします！', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '2 hours')
        ON CONFLICT (id) DO NOTHING;
        
        -- 友達関係を追加
        INSERT INTO friendships (id, user1_id, user2_id, created_at) VALUES
        ('11111111-aaaa-1111-bbbb-222222222222'::uuid, sample_user_id, sample_user_id_2, NOW() - INTERVAL '6 days' + INTERVAL '2 hours')
        ON CONFLICT (id) DO NOTHING;
        
        -- 通知を追加
        INSERT INTO notifications (id, user_id, type, title, message, data, read, created_at) VALUES
        ('11111111-1111-1111-aaaa-111111111111'::uuid, sample_user_id_2, 'friend_request', '新しい友達申請', 'ユーザーから友達申請が届きました。', jsonb_build_object('requester_id', sample_user_id), true, NOW() - INTERVAL '6 days'),
        ('22222222-2222-2222-bbbb-222222222222'::uuid, sample_user_id, 'friend_accepted', '友達申請が承認されました', 'あなたの友達申請が承認されました。', jsonb_build_object('friend_id', sample_user_id_2), true, NOW() - INTERVAL '6 days' + INTERVAL '2 hours'),
        ('66666666-6666-6666-ffff-666666666666'::uuid, sample_user_id_2, 'friend_at_park', '友達がドッグランにいます', '友達がドッグランにいます。', jsonb_build_object('friend_id', sample_user_id, 'park_name', 'ドッグパーク'), false, NOW() - INTERVAL '1 day')
        ON CONFLICT (id) DO NOTHING;
        
        -- 予約データを追加
        INSERT INTO reservations (id, park_id, user_id, dog_id, date, start_time, duration, status, total_amount, access_code, created_at) VALUES
        ('11111111-1111-aaaa-1111-111111111111'::uuid, sample_park_id, sample_user_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, CURRENT_DATE - INTERVAL '7 days', '14:00:00'::time, 2, 'confirmed', 800, 'ABC123', NOW() - INTERVAL '8 days'),
        ('22222222-2222-bbbb-2222-222222222222'::uuid, sample_park_id, sample_user_id_2, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, CURRENT_DATE - INTERVAL '7 days', '15:00:00'::time, 2, 'confirmed', 800, 'DEF456', NOW() - INTERVAL '8 days'),
        ('33333333-3333-cccc-3333-333333333333'::uuid, sample_park_id, sample_user_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, CURRENT_DATE + INTERVAL '1 day', '10:00:00'::time, 2, 'confirmed', 800, 'GHI789', NOW())
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- 3番目のユーザーがいる場合、追加のコミュニティデータ
    IF sample_user_id_3 IS NOT NULL AND sample_user_id IS NOT NULL THEN
        -- 友達申請（承認待ち）
        INSERT INTO friend_requests (id, requester_id, requested_id, status, message, created_at, responded_at) VALUES
        ('33333333-3333-4444-5555-666666666666'::uuid, sample_user_id_3, sample_user_id, 'pending', 'さくらとココちゃんが遊んでいました。友達になりませんか？', NOW() - INTERVAL '2 days', NULL)
        ON CONFLICT (id) DO NOTHING;
        
        -- 通知（未読）
        INSERT INTO notifications (id, user_id, type, title, message, data, read, created_at) VALUES
        ('55555555-5555-5555-eeee-555555555555'::uuid, sample_user_id, 'friend_request', '新しい友達申請', 'ユーザーから友達申請が届きました。', jsonb_build_object('requester_id', sample_user_id_3), false, NOW() - INTERVAL '2 days')
        ON CONFLICT (id) DO NOTHING;
        
        -- 犬の出会い記録
        IF sample_park_id IS NOT NULL THEN
            INSERT INTO dog_encounters (id, dog1_id, dog2_id, park_id, encounter_date, created_at) VALUES
            ('33333333-aaaa-bbbb-cccc-333333333333'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, sample_park_id, CURRENT_DATE - INTERVAL '3 days', NOW()),
            ('44444444-aaaa-bbbb-cccc-444444444444'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, sample_park_id, CURRENT_DATE - INTERVAL '4 days', NOW())
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
    
END $$;