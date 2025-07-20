import { supabase } from './supabase';

export const fixDogParksStatusConstraint = async () => {
    try {

        // 既存の制約を削除
        const { error: dropError } = await supabase.rpc('sql', {
            query: `
        ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;
      `
        });

        if (dropError) {
            console.error('❌ 既存制約削除エラー:', dropError);
        } else {
        }

        // 新しい制約を追加
        const { error: addError } = await supabase.rpc('sql', {
            query: `
        ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check 
        CHECK (status IN (
          'pending',
          'first_stage_passed',
          'second_stage_waiting',
          'second_stage_review', 
          'smart_lock_testing',
          'approved',
          'rejected'
        ));
      `
        });

        if (addError) {
            console.error('❌ 新制約追加エラー:', addError);
            return false;
        } else {
            return true;
        }

    } catch (error) {
        console.error('❌ 制約更新エラー:', error);
        return false;
    }
};

// 直接SQLを実行する関数
export const executeSqlDirect = async (sql: string) => {
    try {
        const { data, error } = await supabase.rpc('sql', {
            query: sql
        });

        if (error) {
            console.error('❌ SQL実行エラー:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('❌ SQL実行エラー:', error);
        return { success: false, error };
    }
}; 
