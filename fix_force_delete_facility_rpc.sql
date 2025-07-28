-- 修正版RPC関数: 管理者権限での強制施設削除
-- パラメータ名を変更してambiguousエラーを解決

-- 既存関数があれば削除
DROP FUNCTION IF EXISTS public.force_delete_facility(uuid);

CREATE OR REPLACE FUNCTION public.force_delete_facility(target_facility_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_json json;
    deleted_count integer := 0;
    images_deleted_count integer := 0;
BEGIN
    -- セキュリティチェック: 管理者権限確認
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required';
    END IF;

    -- 削除実行ログ
    RAISE NOTICE 'Force deleting facility: %', target_facility_id;

    -- 1. 関連する施設画像を削除（CASCADE削除の保険）
    DELETE FROM pet_facility_images 
    WHERE facility_id = target_facility_id;
    
    GET DIAGNOSTICS images_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % facility images', images_deleted_count;

    -- 2. 施設本体を強制削除（RLS無効化）
    SET LOCAL row_security = off;
    
    DELETE FROM pet_facilities 
    WHERE id = target_facility_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % facilities', deleted_count;

    -- RLS設定を元に戻す
    SET LOCAL row_security = on;

    -- 3. 削除が成功したかチェック
    IF deleted_count = 0 THEN
        RAISE EXCEPTION 'Facility not found or could not be deleted: %', target_facility_id;
    END IF;

    -- 4. 成功レスポンス
    result_json := json_build_object(
        'success', true,
        'facility_id', target_facility_id,
        'deleted_facilities', deleted_count,
        'deleted_images', images_deleted_count,
        'message', 'Facility forcefully deleted'
    );

    RETURN result_json;

EXCEPTION
    WHEN OTHERS THEN
        -- RLS設定を元に戻す（エラー時も）
        SET LOCAL row_security = on;
        
        -- エラーレスポンス
        result_json := json_build_object(
            'success', false,
            'facility_id', target_facility_id,
            'error', SQLERRM,
            'message', 'Force deletion failed'
        );
        
        RAISE EXCEPTION 'Force deletion failed: %', SQLERRM;
END;
$$;

-- 関数の実行権限を設定
GRANT EXECUTE ON FUNCTION public.force_delete_facility(uuid) TO authenticated;

-- 関数の説明を追加
COMMENT ON FUNCTION public.force_delete_facility(uuid) IS 
'管理者権限での強制施設削除。RLS無効化で確実に削除を実行。パラメータ名をtarget_facility_idに変更してambiguousエラーを解決。';

-- 関数の作成確認
SELECT 'force_delete_facility function created successfully' as status; 