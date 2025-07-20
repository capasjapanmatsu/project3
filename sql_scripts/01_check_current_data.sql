-- 現在のデータを確認するSQLスクリプト
-- まず既存のデータを確認してください

-- 既存のユーザーを確認
SELECT 
    id,
    name,
    email,
    created_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- 既存の犬を確認
SELECT 
    id,
    name,
    breed,
    owner_id,
    created_at
FROM dogs 
ORDER BY created_at DESC
LIMIT 10;

-- 既存のフレンドリクエストを確認
SELECT 
    id,
    sender_id,
    receiver_id,
    status,
    created_at
FROM friend_requests
ORDER BY created_at DESC
LIMIT 10;

-- 既存のエンカウンターを確認
SELECT 
    id,
    user_id,
    dog_id,
    other_user_id,
    other_dog_id,
    encounter_type,
    created_at
FROM dog_encounters
ORDER BY created_at DESC
LIMIT 10;
