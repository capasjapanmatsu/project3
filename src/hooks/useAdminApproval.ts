// 管理者承認・却下処理のカスタムフック

import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { PendingPark, PendingVaccine, FacilityImage } from '../types/admin';

export const useAdminApproval = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVaccineApproval = async (
    vaccineId: string, 
    approved: boolean, 
    rejectionNote?: string
  ) => {
    try {
      setIsProcessing(true);
      
      console.log('Processing vaccine approval:', { vaccineId, approved });
      
      // 承認・却下前に証明書データを取得（画像削除のため）
      const { data: vaccineData, error: vaccineError } = await supabase
        .from('vaccine_certifications')
        .select('*, dog:dogs(name, owner_id)')
        .eq('id', vaccineId)
        .single();
        
      if (vaccineError) {
        console.error('Vaccine data fetch error:', vaccineError);
        throw vaccineError;
      }
      
      // ワクチン証明書のステータスを更新
      const vaccineUpdateData: Record<string, unknown> = {
        status: approved ? 'approved' : 'rejected'
      };
      
      // 承認の場合は承認日時を設定
      if (approved) {
        vaccineUpdateData.approved_at = new Date().toISOString();
      }
      
      console.log('Updating vaccine with data:', vaccineUpdateData);
      
      const { error } = await supabase
        .from('vaccine_certifications')
        .update(vaccineUpdateData)
        .eq('id', vaccineId);

      if (error) {
        console.error('Vaccine update error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`ワクチン証明書の更新に失敗しました: ${error.message}`);
      }
      
      // 一時保存の画像を削除（承認・却下問わず）
      // temp/フォルダ内の画像があれば削除
      if (vaccineData.rabies_vaccine_image?.includes('/temp/') || 
          vaccineData.combo_vaccine_image?.includes('/temp/')) {
        await deleteTemporaryImages(vaccineData);
      }
      
      // 通知を作成
      await createVaccineNotification(vaccineData, approved, rejectionNote);
      
      return { success: true, message: `ワクチン証明書を${approved ? '承認' : '却下'}しました` };
      
    } catch (error) {
      console.error('Vaccine approval error:', error);
      return { success: false, message: `承認処理に失敗しました: ${(error as Error).message}` };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParkApproval = async (
    parkId: string, 
    approved: boolean, 
    rejectionNote?: string
  ) => {
    try {
      setIsProcessing(true);
      
      // 施設のステータスを更新
      const newStatus = approved ? 'approved' : 'rejected';
      
      const parkUpdateData: Record<string, unknown> = {
        status: newStatus
      };
      
      // 承認の場合は承認日時を設定
      if (approved) {
        parkUpdateData.approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('dog_parks')
        .update(parkUpdateData)
        .eq('id', parkId);
      
      if (error) throw error;
      
      // レビューステージを更新
      await updateParkReviewStage(parkId, approved, rejectionNote);
      
      // 通知を作成
      await createParkNotification(parkId, approved, rejectionNote);
      
      return { success: true, message: `施設を${approved ? '承認' : '却下'}しました` };
      
    } catch (error) {
      console.error('Park approval error:', error);
      return { success: false, message: '承認処理に失敗しました' };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageApproval = async (
    image: FacilityImage, 
    approved: boolean, 
    rejectionNote?: string
  ) => {
    try {
      setIsProcessing(true);
      
      const imageUpdateData: Record<string, unknown> = {
        is_approved: approved,
      };
      
      // 却下の場合はコメントを追加
      if (!approved && rejectionNote?.trim()) {
        imageUpdateData.admin_notes = rejectionNote.trim();
      } else {
        imageUpdateData.admin_notes = null; // 承認の場合はコメントをクリア
      }
      
      const { error } = await supabase
        .from('dog_park_facility_images')
        .update(imageUpdateData)
        .eq('id', image.id);
      
      if (error) throw error;
      
      return { success: true, message: `画像を${approved ? '承認' : '却下'}しました` };
      
    } catch (error) {
      console.error('Image approval error:', error);
      return { success: false, message: '画像の承認処理に失敗しました' };
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVaccineExpiryUpdate = async (
    vaccineId: string,
    rabiesExpiryDate?: string | null,
    comboExpiryDate?: string | null
  ) => {
    try {
      setIsProcessing(true);
      
      const updateData: Record<string, unknown> = {};
      
      // 狂犬病ワクチンの有効期限
      if (rabiesExpiryDate !== undefined) {
        updateData.rabies_expiry_date = rabiesExpiryDate;
      }
      
      // 混合ワクチンの有効期限
      if (comboExpiryDate !== undefined) {
        updateData.combo_expiry_date = comboExpiryDate;
      }
      
      console.log('Updating vaccine expiry dates:', updateData);
      
      const { error } = await supabase
        .from('vaccine_certifications')
        .update(updateData)
        .eq('id', vaccineId);

      if (error) {
        console.error('Vaccine expiry update error:', error);
        throw new Error(`有効期限の更新に失敗しました: ${error.message}`);
      }
      
      return { success: true, message: '有効期限を更新しました' };
      
    } catch (error) {
      console.error('Vaccine expiry update error:', error);
      return { success: false, message: `有効期限の更新に失敗しました: ${(error as Error).message}` };
    } finally {
      setIsProcessing(false);
    }
  };

  // プライベートヘルパー関数
  const deleteTemporaryImages = async (vaccineData: any) => {
    console.log('Deleting temporary vaccine images...');
    console.log('Vaccine data:', {
      rabies_vaccine_image: vaccineData.rabies_vaccine_image,
      combo_vaccine_image: vaccineData.combo_vaccine_image
    });
    
    const imagesToDelete = [];
    
    // Rabies画像のパス抽出
    if (vaccineData.rabies_vaccine_image) {
      let filePath = '';
      if (vaccineData.rabies_vaccine_image.includes('/temp/')) {
        // URLから相対パスを抽出
        const pathMatch = vaccineData.rabies_vaccine_image.match(/temp\/[^\/]+\/[^\/\?]+/);
        if (pathMatch) {
          filePath = pathMatch[0];
        }
      }
      if (filePath) {
        imagesToDelete.push(filePath);
      }
    }
    
    // Combo画像のパス抽出
    if (vaccineData.combo_vaccine_image) {
      let filePath = '';
      if (vaccineData.combo_vaccine_image.includes('/temp/')) {
        // URLから相対パスを抽出
        const pathMatch = vaccineData.combo_vaccine_image.match(/temp\/[^\/]+\/[^\/\?]+/);
        if (pathMatch) {
          filePath = pathMatch[0];
        }
      }
      if (filePath) {
        imagesToDelete.push(filePath);
      }
    }
    
    console.log('Paths to delete:', imagesToDelete);
    
    // 画像がある場合のみ削除実行
    if (imagesToDelete.length > 0) {
      try {
        const { error: deleteError } = await supabase.storage
          .from('vaccine-certs')
          .remove(imagesToDelete);
        
        if (deleteError) {
          console.error('Error deleting images:', deleteError);
        } else {
          console.log('Successfully deleted images:', imagesToDelete);
        }
      } catch (deleteErr) {
        console.error('Error deleting images:', deleteErr);
      }
    } else {
      console.log('No temporary images to delete');
    }
    
    console.log('Temporary images deletion completed');
  };

  const createVaccineNotification = async (
    vaccineData: any, 
    approved: boolean, 
    rejectionNote?: string
  ) => {
    const { error: notifyError } = await supabase
      .from('notifications')
      .insert([{
        user_id: vaccineData.dog.owner_id,
        type: 'vaccine_approval_required',
        title: approved ? 'ワクチン証明書承認のお知らせ' : 'ワクチン証明書却下のお知らせ',
        message: approved
          ? `${vaccineData.dog.name}ちゃんのワクチン証明書が承認されました。ドッグランを利用できるようになりました。`
          : `${vaccineData.dog.name}ちゃんのワクチン証明書が却下されました。${rejectionNote ? `理由: ${rejectionNote}` : '詳細はマイページをご確認ください。'}`,
        data: { dog_id: vaccineData.dog_id }
      }]);
    
    if (notifyError) {
      console.error('Notification error:', notifyError);
      console.error('Notification error details:', {
        message: notifyError.message,
        code: notifyError.code,
        details: notifyError.details,
        hint: notifyError.hint
      });
      throw new Error(`通知の作成に失敗しました: ${notifyError.message}`);
    }
  };

  const updateParkReviewStage = async (
    parkId: string, 
    approved: boolean, 
    rejectionNote?: string
  ) => {
    let stageUpdateData: Record<string, unknown> = {};
    
    // 既存のレビューステージを確認
    const { data: existingStage, error: stageCheckError } = await supabase
      .from('dog_park_review_stages')
      .select('id')
      .eq('park_id', parkId)
      .maybeSingle();
      
    if (stageCheckError) throw stageCheckError;
    
    if (existingStage) {
      // 既存のレビューステージを更新
      if (approved) {
        stageUpdateData.first_stage_passed_at = new Date().toISOString();
      } else {
        stageUpdateData.rejected_at = new Date().toISOString();
        if (rejectionNote?.trim()) {
          stageUpdateData.rejection_reason = rejectionNote.trim();
        }
      }
      
      const { error: updateError } = await supabase
        .from('dog_park_review_stages')
        .update(stageUpdateData)
        .eq('park_id', parkId);
        
      if (updateError) throw updateError;
    } else {
      // レビューステージが存在しない場合は作成
      stageUpdateData = {
        park_id: parkId,
        first_stage_passed_at: new Date().toISOString()
      };
      
      if (approved) {
        stageUpdateData.first_stage_passed_at = new Date().toISOString();
      } else {
        stageUpdateData.rejected_at = new Date().toISOString();
        if (rejectionNote?.trim()) {
          stageUpdateData.rejection_reason = rejectionNote.trim();
        }
      }
      
      const { error: insertError } = await supabase
        .from('dog_park_review_stages')
        .insert([stageUpdateData]);
        
      if (insertError) throw insertError;
    }
  };

  const createParkNotification = async (
    parkId: string, 
    approved: boolean, 
    rejectionNote?: string
  ) => {
    // 通知を作成
    const { data: parkData, error: parkError } = await supabase
      .from('dog_parks')
      .select('id, name, owner_id')
      .eq('id', parkId)
      .single();
    
    if (parkError) throw parkError;
    
    const { error: notifyError } = await supabase
      .from('notifications')
      .insert([{
        user_id: parkData.owner_id,
        type: 'park_approval_required',
        title: approved ? '施設承認のお知らせ' : '審査結果のお知らせ',
        message: approved
          ? `${parkData.name}の審査が完了し、承認されました。おめでとうございます！`
          : `${parkData.name}の審査結果をお知らせします。${rejectionNote ? `理由: ${rejectionNote}` : '詳細はオーナーダッシュボードをご確認ください。'}`,
        data: { park_id: parkData.id }
      }]);
    
    if (notifyError) {
      console.error('Park notification error:', notifyError);
      console.error('Park notification error details:', {
        message: notifyError.message,
        code: notifyError.code,
        details: notifyError.details,
        hint: notifyError.hint
      });
      throw new Error(`施設通知の作成に失敗しました: ${notifyError.message}`);
    }
  };

  return {
    isProcessing,
    handleVaccineApproval,
    handleParkApproval,
    handleImageApproval,
    handleVaccineExpiryUpdate
  };
}; 