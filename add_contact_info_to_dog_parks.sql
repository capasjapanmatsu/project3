-- dog_parksテーブルにcontact_infoカラムを追加
DO $$
BEGIN
    -- contact_infoカラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dog_parks' 
        AND column_name = 'contact_info'
    ) THEN
        ALTER TABLE dog_parks 
        ADD COLUMN contact_info TEXT;
        
        RAISE NOTICE 'contact_info column added to dog_parks table';
    ELSE
        RAISE NOTICE 'contact_info column already exists in dog_parks table';
    END IF;
END $$;