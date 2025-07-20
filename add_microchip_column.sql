-- Add microchip_number column to dogs table
-- マイクロチップNOカラムをdogsテーブルに追加

ALTER TABLE dogs 
ADD COLUMN microchip_number VARCHAR(15);

-- Add comment to column
COMMENT ON COLUMN dogs.microchip_number IS 'ペットのマイクロチップ番号（15桁、任意）';

-- Add index for efficient searching (optional)
CREATE INDEX IF NOT EXISTS idx_dogs_microchip_number 
ON dogs(microchip_number) 
WHERE microchip_number IS NOT NULL;
