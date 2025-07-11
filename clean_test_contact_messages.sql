-- テスト用のお問い合わせデータを削除
DELETE FROM contact_messages 
WHERE email IN (
  'yamada@example.com',
  'sato@example.com', 
  'suzuki@example.com',
  'tanaka@example.com',
  'takahashi@example.com'
);

-- 削除後の件数を確認
SELECT COUNT(*) as remaining_messages FROM contact_messages;

-- 統計情報を確認
SELECT 
  (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') as unread_messages,
  (SELECT COUNT(*) FROM contact_messages) as total_messages; 