-- ステップ11: 最近の出会い記録を作成
-- 管理者アカウントの犬と他の犬との出会い記録

DO $$
DECLARE
    admin_id UUID;
    admin_dog_id UUID;
    tanaka_id UUID;
    tanaka_dog_id UUID;
    sato_id UUID;
    sato_dog_id UUID;
    yamada_id UUID;
    yamada_dog_id UUID;
BEGIN
    -- ユーザーIDを取得
    SELECT id INTO admin_id FROM profiles WHERE email = 'capasjapan@gmail.com';
    SELECT id INTO tanaka_id FROM profiles WHERE email = 'tanaka.taro@example.com';
    SELECT id INTO sato_id FROM profiles WHERE email = 'sato.hanako@example.com';
    SELECT id INTO yamada_id FROM profiles WHERE email = 'yamada.jiro@example.com';
    
    -- 犬のIDを取得
    SELECT id INTO admin_dog_id FROM dogs WHERE owner_id = admin_id LIMIT 1;
    SELECT id INTO tanaka_dog_id FROM dogs WHERE owner_id = tanaka_id LIMIT 1;
    SELECT id INTO sato_dog_id FROM dogs WHERE owner_id = sato_id LIMIT 1;
    SELECT id INTO yamada_dog_id FROM dogs WHERE owner_id = yamada_id LIMIT 1;
    
    IF admin_id IS NOT NULL AND admin_dog_id IS NOT NULL THEN
        
        -- 1. 管理者の犬と佐藤さんの犬の出会い（友達同士）
        IF sato_id IS NOT NULL AND sato_dog_id IS NOT NULL THEN
            INSERT INTO encounters (user1_id, user2_id, dog1_id, dog2_id, location, notes, created_at) VALUES
            (admin_id, sato_id, admin_dog_id, sato_dog_id, '中央公園ドッグラン', 'アッシュとハナちゃんがとても仲良く遊んでいました。ボール遊びを一緒に楽しんでいました🎾', NOW() - INTERVAL '6 hours'),
            (admin_id, sato_id, admin_dog_id, sato_dog_id, '代々木公園', '散歩中に偶然会いました。お互いすぐに覚えていて、尻尾を振って挨拶していました', NOW() - INTERVAL '3 days'),
            (admin_id, sato_id, admin_dog_id, sato_dog_id, '井の頭公園', '桜が綺麗でした。アッシュとハナちゃんが池の周りを一緒に散歩しました', NOW() - INTERVAL '1 week')
            ON CONFLICT (user1_id, user2_id, created_at) DO NOTHING;
        END IF;
        
        -- 2. 管理者の犬と山田さんの犬の出会い（友達同士）
        IF yamada_id IS NOT NULL AND yamada_dog_id IS NOT NULL THEN
            INSERT INTO encounters (user1_id, user2_id, dog1_id, dog2_id, location, notes, created_at) VALUES
            (admin_id, yamada_id, admin_dog_id, yamada_dog_id, '渋谷ドッグラン', 'チョコちゃんとアッシュが初対面でしたが、すぐに仲良くなりました。チョコちゃんがとても優しい性格で、アッシュも安心していました', NOW() - INTERVAL '2 days'),
            (admin_id, yamada_id, admin_dog_id, yamada_dog_id, '駒沢公園', 'アジリティコースで一緒に遊びました。チョコちゃんがアッシュに遊び方を教えてくれていました', NOW() - INTERVAL '5 days'),
            (admin_id, yamada_id, admin_dog_id, yamada_dog_id, '上野公園', '広い芝生でフリスビーをしました。チョコちゃんの運動能力に驚きました！', NOW() - INTERVAL '1 week')
            ON CONFLICT (user1_id, user2_id, created_at) DO NOTHING;
        END IF;
        
        -- 3. 管理者の犬と田中さんの犬の出会い（まだ友達ではないが出会いはある）
        IF tanaka_id IS NOT NULL AND tanaka_dog_id IS NOT NULL THEN
            INSERT INTO encounters (user1_id, user2_id, dog1_id, dog2_id, location, notes, created_at) VALUES
            (admin_id, tanaka_id, admin_dog_id, tanaka_dog_id, '荒川河川敷', 'ポチくんとアッシュが朝の散歩で会いました。ポチくんはとても人懐っこくて、すぐにアッシュと仲良くなりました', NOW() - INTERVAL '4 hours'),
            (admin_id, tanaka_id, admin_dog_id, tanaka_dog_id, '世田谷公園', '偶然同じ時間に散歩していて出会いました。ポチくんの元気な様子にアッシュも刺激を受けていました', NOW() - INTERVAL '2 days')
            ON CONFLICT (user1_id, user2_id, created_at) DO NOTHING;
        END IF;
        
        RAISE NOTICE '管理者アカウントの出会い記録を作成しました';
    ELSE
        RAISE NOTICE '管理者アカウントまたは犬のデータが見つかりません';
    END IF;
END $$;

-- ステップ12: 最終的な確認クエリ
SELECT '=== 管理者の友達一覧（犬情報付き）===' as info;
SELECT 
    p.name as friend_name,
    d.name as friend_dog_name,
    d.breed as friend_dog_breed,
    fr.status,
    fr.updated_at as friend_since
FROM profiles admin
JOIN friendships f ON admin.id = f.user_id
JOIN profiles p ON p.id = f.friend_id
LEFT JOIN dogs d ON d.owner_id = p.id
WHERE admin.email = 'capasjapan@gmail.com'
ORDER BY fr.updated_at DESC;

SELECT '=== 管理者の最近の出会い（詳細）===' as info;
SELECT 
    p.name as met_user,
    d1.name as admin_dog,
    d2.name as other_dog,
    d2.breed as other_dog_breed,
    e.location,
    e.notes,
    e.created_at as met_at,
    CASE WHEN f.user_id IS NOT NULL THEN '友達' ELSE '未友達' END as friendship_status
FROM profiles admin
JOIN encounters e ON admin.id = e.user1_id OR admin.id = e.user2_id
JOIN profiles p ON p.id = CASE WHEN admin.id = e.user1_id THEN e.user2_id ELSE e.user1_id END
LEFT JOIN dogs d1 ON d1.id = CASE WHEN admin.id = e.user1_id THEN e.dog1_id ELSE e.dog2_id END
LEFT JOIN dogs d2 ON d2.id = CASE WHEN admin.id = e.user1_id THEN e.dog2_id ELSE e.dog1_id END
LEFT JOIN friendships f ON (admin.id = f.user_id AND p.id = f.friend_id)
WHERE admin.email = 'capasjapan@gmail.com'
ORDER BY e.created_at DESC
LIMIT 10;

SELECT '=== 管理者への保留中のフレンドリクエスト ===' as info;
SELECT 
    p.name as requester_name,
    d.name as requester_dog_name,
    d.breed as requester_dog_breed,
    fr.created_at as requested_at
FROM profiles admin
JOIN friend_requests fr ON admin.id = fr.receiver_id
JOIN profiles p ON p.id = fr.sender_id
LEFT JOIN dogs d ON d.owner_id = p.id
WHERE admin.email = 'capasjapan@gmail.com' 
  AND fr.status = 'pending'
ORDER BY fr.created_at DESC;

SELECT '=== 管理者の未読通知数 ===' as info;
SELECT 
    n.type,
    COUNT(*) as unread_count
FROM profiles admin
JOIN notifications n ON admin.id = n.user_id
WHERE admin.email = 'capasjapan@gmail.com'
  AND n.is_read = false
GROUP BY n.type
ORDER BY unread_count DESC;

SELECT '=== 管理者の未読メッセージ数 ===' as info;
SELECT 
    COUNT(*) as unread_message_count
FROM profiles admin
JOIN messages m ON admin.id = m.receiver_id
WHERE admin.email = 'capasjapan@gmail.com'
  AND m.is_read = false;
