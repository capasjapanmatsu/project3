-- ワクチン証明書テーブルに一時保管フラグを追加
ALTER TABLE vaccine_certifications 
ADD COLUMN temp_storage BOOLEAN DEFAULT false;

-- 一時保管されたワクチン証明書を削除する関数
CREATE OR REPLACE FUNCTION cleanup_temp_vaccine_certificates()
RETURNS void AS $$
BEGIN
  -- 承認または却下された一時保管の証明書を削除
  DELETE FROM vaccine_certifications 
  WHERE temp_storage = true 
  AND status IN ('approved', 'rejected')
  AND updated_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 定期的にクリーンアップを実行するためのコメント
COMMENT ON FUNCTION cleanup_temp_vaccine_certificates() IS 'Cleanup temporary vaccine certificates after approval/rejection';

-- 管理者が承認・却下を行った際に一時保管フラグをクリアするトリガー関数
CREATE OR REPLACE FUNCTION clear_temp_storage_on_status_change()
RETURNS trigger AS $$
BEGIN
  -- ステータスが pending 以外に変更された場合、一時保管フラグをクリア
  IF NEW.status != 'pending' AND OLD.temp_storage = true THEN
    NEW.temp_storage = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS trigger_clear_temp_storage ON vaccine_certifications;
CREATE TRIGGER trigger_clear_temp_storage
  BEFORE UPDATE ON vaccine_certifications
  FOR EACH ROW
  EXECUTE FUNCTION clear_temp_storage_on_status_change(); 