-- 重複テーブルのクリーンアップ
-- dog_vaccine_certificates は使用されていないため削除

-- 不要なテーブルを削除
DROP TABLE IF EXISTS dog_vaccine_certificates CASCADE;

-- コメント: vaccine_certifications テーブルが正式なテーブルとして使用されているため、
-- dog_vaccine_certificates は不要なテーブルとして削除します。 