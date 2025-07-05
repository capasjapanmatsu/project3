import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye, 
  Camera,
  ArrowLeft,
  Building,
  Clock
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface PendingPark {
  id: string;
  name: string;
  address: string;
  status: string;
  created_at: string;
  owner_name: string;
  owner_id: string;
  second_stage_submitted_at: string | null;
  total_images: number;
  pending_images: number;
  approved_images: number;
  rejected_images: number;
}

interface PendingVaccine {
  id: string;
  dog_id: string;
  rabies_vaccine_image: string | null;
  combo_vaccine_image: string | null;
  status: string;
  rabies_expiry_date: string | null;
  combo_expiry_date: string | null;
  created_at: string;
  dog: {
    id: string;
    name: string;
    breed: string;
    gender: string;
    birth_date: string;
    owner: {
      id: string;
      name: string;
    }
  }
}

interface FacilityImage {
  id: string;
  park_id: string;
  image_type: string;
  image_url: string;
  is_approved: boolean | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function AdminManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'parks' | 'vaccines'>('parks');
  const [pendingParks, setPendingParks] = useState<PendingPark[]>([]);
  const [pendingVaccines, setPendingVaccines] = useState<PendingVaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPark, setSelectedPark] = useState<PendingPark | null>(null);
  const [selectedVaccine, setSelectedVaccine] = useState<PendingVaccine | null>(null);
  const [parkImages, setParkImages] = useState<FacilityImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<FacilityImage | null>(null);
  const [imageReviewMode, setImageReviewMode] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [allImagesApproved, setAllImagesApproved] = useState(false);

  useEffect(() => {
    // 管理者権限チェック
    if (!isAdmin) {
      navigate('/');
      return;
    }
    
    fetchData();
  }, [isAdmin, navigate, activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      if (activeTab === 'parks') {
        // 審査待ちのドッグラン一覧を取得
        const { data: parksData, error: parksError } = await supabase
          .from('admin_pending_parks_view')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (parksError) throw parksError;
        setPendingParks(parksData || []);
      } else {
        // 審査待ちのワクチン証明書一覧を取得
        const { data: vaccinesData, error: vaccinesError } = await supabase
          .from('vaccine_certifications')
          .select(`
            *,
            dog:dogs(*, owner:profiles(*))
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (vaccinesError) throw vaccinesError;
        setPendingVaccines(vaccinesData || []);
      }
    } catch (error) {
      setError((error as Error).message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParkImages = async (parkId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('dog_park_facility_images')
        .select('*')
        .eq('park_id', parkId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setParkImages(data || []);
      
      // Check if all images are approved
      const allApproved = data && data.length > 0 && data.every(img => img.is_approved === true);
      setAllImagesApproved(allApproved);
    } catch (error) {
      setError((error as Error).message || '施設画像の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParkSelect = async (park: PendingPark) => {
    setSelectedPark(park);
    await fetchParkImages(park.id);
  };

  const handleImageSelect = (image: FacilityImage) => {
    setSelectedImage(image);
    setImageReviewMode(true);
    setRejectionNote(image.admin_notes || '');
  };

  const handleImageApproval = async (approved: boolean) => {
    if (!selectedImage) return;
    
    try {
      setIsProcessing(true);
      
      const updateData: Record<string, unknown> = {
        is_approved: approved,
      };
      
      // 却下の場合はコメントを追加
      if (!approved && rejectionNote.trim()) {
        updateData.admin_notes = rejectionNote.trim();
      } else {
        updateData.admin_notes = null; // 承認の場合はコメントをクリア
      }
      
      const { error } = await supabase
        .from('dog_park_facility_images')
        .update(updateData)
        .eq('id', selectedImage.id);
      
      if (error) throw error;
      
      // 画像一覧を再取得
      if (selectedPark) {
        await fetchParkImages(selectedPark.id);
      }
      
      // 成功メッセージを表示
      setSuccess(`画像を${approved ? '承認' : '却下'}しました`);
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // 画像レビューモードを終了
      setImageReviewMode(false);
      setSelectedImage(null);
      setRejectionNote('');
      
    } catch {
      setError('画像の承認/却下に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const approvePark = async (parkId: string) => {
    try {
      setIsProcessing(true);
      setError('');
      setSuccess('');
      
      // 施設のステータスを更新
      const { error } = await supabase
        .from('dog_parks')
        .update({ status: 'first_stage_passed' })
        .eq('id', parkId);
      
      if (error) throw error;
      
      // レビューステージを更新
      let updateData: Record<string, unknown> = {};
      
      // 既存のレビューステージを確認
      const { data: existingStage, error: stageCheckError } = await supabase
        .from('dog_park_review_stages')
        .select('id')
        .eq('park_id', parkId)
        .maybeSingle();
        
      if (stageCheckError) throw stageCheckError;
      
      if (existingStage) {
        // 既存のレビューステージを更新
        updateData.first_stage_passed_at = new Date().toISOString();
        
        const { error: updateError } = await supabase
          .from('dog_park_review_stages')
          .update(updateData)
          .eq('park_id', parkId);
          
        if (updateError) throw updateError;
      } else {
        // レビューステージが存在しない場合は作成
        updateData = {
          park_id: parkId,
          first_stage_passed_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase
          .from('dog_park_review_stages')
          .insert([updateData]);
          
        if (insertError) throw insertError;
      }
      
      // 通知を作成
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('name, owner_id')
        .eq('id', parkId)
        .single();
      
      if (parkError) throw parkError;
      
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: parkData.owner_id,
          type: 'park_approval_required',
          title: '第一審査通過のお知らせ',
          message: `${parkData.name}の第一審査が通過しました。第二審査の詳細情報を入力してください。`,
          data: { park_id: parkId }
        }]);
        
      if (notifyError) throw notifyError;
      
      await fetchData();
      setSelectedPark(null);
      setSuccess('ドッグランを承認しました。');
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch {
      setError('承認に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectPark = async (parkId: string) => {
    try {
      setIsProcessing(true);
      setError('');
      setSuccess('');
      
      const { error } = await supabase
        .from('dog_parks')
        .update({ status: 'rejected' })
        .eq('id', parkId);

      if (error) throw error;
      
      // Get park details for notification
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('name, owner_id')
        .eq('id', parkId)
        .single();
        
      if (parkError) throw parkError;
      
      // Create notification for owner
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: parkData.owner_id,
          type: 'park_approval_required',
          title: 'ドッグラン審査結果のお知らせ',
          message: `${parkData.name}の審査が却下されました。詳細はダッシュボードをご確認ください。`,
          data: { park_id: parkId }
        }]);
        
      if (notifyError) throw notifyError;
      
      await fetchData();
      setSelectedPark(null);
      setSuccess('ドッグランを却下しました。');
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch {
      setError('却下に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParkApproval = async (parkId: string, approved: boolean) => {
    try {
      setIsProcessing(true);
      
      // すべての画像が承認されているか確認
      if (approved) {
        const pendingImages = parkImages.filter(img => img.is_approved === null || img.is_approved === false);
        if (pendingImages.length > 0) {
          setError('すべての画像を承認してから施設を承認してください');
          setIsProcessing(false);
          return;
        }
      }
      
      // 施設のステータスを更新
      const newStatus = approved ? 'qr_testing' : 'rejected';
      const { error } = await supabase
        .from('dog_parks')
        .update({ status: newStatus })
        .eq('id', parkId);
      
      if (error) throw error;
      
      // レビューステージを更新
      let updateData: Record<string, unknown> = {};
      
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
          updateData.qr_testing_started_at = new Date().toISOString();
        } else {
          updateData.rejected_at = new Date().toISOString();
          if (rejectionNote.trim()) {
            updateData.rejection_reason = rejectionNote.trim();
          }
        }
        
        const { error: updateError } = await supabase
          .from('dog_park_review_stages')
          .update(updateData)
          .eq('park_id', parkId);
          
        if (updateError) throw updateError;
      } else {
        // レビューステージが存在しない場合は作成
        updateData = {
          park_id: parkId,
          first_stage_passed_at: new Date().toISOString()
        };
        
        if (approved) {
          updateData.qr_testing_started_at = new Date().toISOString();
        } else {
          updateData.rejected_at = new Date().toISOString();
          if (rejectionNote.trim()) {
            updateData.rejection_reason = rejectionNote.trim();
          }
        }
        
        const { error: insertError } = await supabase
          .from('dog_park_review_stages')
          .insert([updateData]);
          
        if (insertError) throw insertError;
      }
      
      // 通知を作成
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('name, owner_id')
        .eq('id', parkId)
        .single();
      
      if (parkError) throw parkError;
      
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: parkData.owner_id,
          type: 'park_approval_required',
          title: approved ? 'QRコード実証検査のお知らせ' : '審査結果のお知らせ',
          message: approved 
            ? `${parkData.name}の第二審査が通過しました。QRコード実証検査の日程調整のため、運営事務局からご連絡いたします。`
            : `${parkData.name}の審査が却下されました。${rejectionNote ? `理由: ${rejectionNote}` : '詳細はダッシュボードをご確認ください。'}`,
          data: { park_id: parkId }
        }]);
      
      if (notifyError) throw notifyError;
      
      // 成功メッセージを表示
      setSuccess(`施設を${approved ? 'QRコードテスト段階に進めました' : '却下しました'}`);
      
      // データを再取得
      await fetchData();
      
      // 選択解除
      setSelectedPark(null);
      setParkImages([]);
      setRejectionNote('');
      
    } catch (error) {
      setError('施設の承認/却下に失敗しました: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVaccineApproval = async (vaccineId: string, approved: boolean) => {
    try {
      setIsProcessing(true);
      setError('');
      
      // ワクチン証明書のステータスを更新
      const updateData: Record<string, unknown> = {
        status: approved ? 'approved' : 'rejected'
      };
      
      // 承認の場合は承認日時を設定
      if (approved) {
        updateData.approved_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('vaccine_certifications')
        .update(updateData)
        .eq('id', vaccineId);

      if (error) throw error;
      
      // 通知を作成
      const { data: vaccineData, error: vaccineError } = await supabase
        .from('vaccine_certifications')
        .select('*, dog:dogs(name, owner_id)')
        .eq('id', vaccineId)
        .single();
        
      if (vaccineError) throw vaccineError;
      
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
        
      if (notifyError) throw notifyError;
      
      // 成功メッセージを表示
      setSuccess(`ワクチン証明書を${approved ? '承認' : '却下'}しました`);
      
      // データを再取得
      await fetchData();
      
      // 選択解除
      setSelectedVaccine(null);
      setRejectionNote('');
      
    } catch {
      setError('ワクチン証明書の承認/却下に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const getImageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      overview: '施設全景',
      entrance: '入口',
      large_dog_area: '大型犬エリア',
      small_dog_area: '小型犬エリア',
      private_booth: 'プライベートブース',
      parking: '駐車場',
      shower: 'シャワー設備',
      restroom: 'トイレ',
      agility: 'アジリティ設備',
      rest_area: '休憩スペース',
      water_station: '給水設備'
    };
    
    return labels[type] || type;
  };

  const getApprovalStatus = (isApproved: boolean | null) => {
    if (isApproved === true) {
      return { icon: CheckCircle, color: 'text-green-600', label: '承認済み' };
    } else if (isApproved === false) {
      return { icon: X, color: 'text-red-600', label: '却下' };
    } else {
      return { icon: Clock, color: 'text-yellow-600', label: '審査中' };
    }
  };

  if (isLoading && !selectedPark && !selectedVaccine) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 画像レビューモード
  if (imageReviewMode && selectedImage) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => {
              setImageReviewMode(false);
              setSelectedImage(null);
              setRejectionNote('');
            }}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            画像一覧に戻る
          </button>
        </div>
        
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">画像レビュー: {getImageTypeLabel(selectedImage.image_type)}</h2>
            <div className="flex space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedImage.is_approved === true
                  ? 'bg-green-100 text-green-800'
                  : selectedImage.is_approved === false
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedImage.is_approved === true
                  ? '承認済み'
                  : selectedImage.is_approved === false
                  ? '却下'
                  : '審査待ち'}
              </span>
            </div>
          </div>
          
          {/* 画像表示 */}
          <div className="mb-6">
            <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={selectedImage.image_url}
                alt={getImageTypeLabel(selectedImage.image_type)}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                }}
              />
            </div>
          </div>
          
          {/* 画像情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold mb-2">画像情報</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">タイプ:</span> {getImageTypeLabel(selectedImage.image_type)}</p>
                <p><span className="font-medium">アップロード日時:</span> {new Date(selectedImage.created_at).toLocaleString('ja-JP')}</p>
                <p><span className="font-medium">最終更新日時:</span> {new Date(selectedImage.updated_at).toLocaleString('ja-JP')}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">施設情報</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">施設名:</span> {selectedPark?.name}</p>
                <p><span className="font-medium">住所:</span> {selectedPark?.address}</p>
                <p><span className="font-medium">オーナー:</span> {selectedPark?.owner_name}</p>
              </div>
            </div>
          </div>
          
          {/* 却下理由入力フォーム */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              却下理由（却下する場合のみ入力）
            </label>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="例: 画像が不鮮明です。より明るく鮮明な画像を再アップロードしてください。"
            />
          </div>
          
          {/* 承認/却下ボタン */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setImageReviewMode(false);
                setSelectedImage(null);
                setRejectionNote('');
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => handleImageApproval(false)}
              isLoading={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              却下
            </Button>
            <Button
              onClick={() => handleImageApproval(true)}
              isLoading={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              承認
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/admin" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          管理者ダッシュボードに戻る
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Shield className="w-8 h-8 text-red-600 mr-3" />
          管理者審査ページ
        </h1>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="flex space-x-4 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'parks'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('parks')}
        >
          <MapPin className="w-4 h-4 inline mr-2" />
          ドッグラン審査
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'vaccines'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('vaccines')}
        >
          <FileCheck className="w-4 h-4 inline mr-2" />
          ワクチン証明書審査
        </button>
      </div>

      {/* ドッグラン審査タブ */}
      {activeTab === 'parks' && !selectedPark && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">審査待ちドッグラン</h2>
          
          {pendingParks.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">審査待ちのドッグランはありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingParks.map((park) => (
                <Card key={park.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">{park.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          park.status === 'first_stage_passed' ? 'bg-blue-100 text-blue-800' :
                          park.status === 'second_stage_review' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {park.status === 'first_stage_passed' ? '第一審査通過' :
                           park.status === 'second_stage_review' ? '第二審査中' :
                           '審査待ち'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{park.address}</p>
                      <div className="text-sm text-gray-500">
                        <p>オーナー: {park.owner_name}</p>
                        <p>申請日: {new Date(park.created_at).toLocaleDateString('ja-JP')}</p>
                        {park.second_stage_submitted_at && (
                          <p>第二審査申請日: {new Date(park.second_stage_submitted_at).toLocaleDateString('ja-JP')}</p>
                        )}
                      </div>
                      
                      {/* 画像審査状況 */}
                      {park.status === 'second_stage_review' && (
                        <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                          <div className="bg-blue-50 p-2 rounded text-center">
                            <p className="font-medium text-blue-800">全画像</p>
                            <p className="text-blue-600">{park.total_images}枚</p>
                          </div>
                          <div className="bg-yellow-50 p-2 rounded text-center">
                            <p className="font-medium text-yellow-800">審査待ち</p>
                            <p className="text-yellow-600">{park.pending_images}枚</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded text-center">
                            <p className="font-medium text-green-800">承認済み</p>
                            <p className="text-green-600">{park.approved_images}枚</p>
                          </div>
                          <div className="bg-red-50 p-2 rounded text-center">
                            <p className="font-medium text-red-800">却下</p>
                            <p className="text-red-600">{park.rejected_images}枚</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => handleParkSelect(park)}
                        variant="secondary"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        詳細を見る
                      </Button>
                      <Button
                        onClick={() => approvePark(park.id)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        onClick={() => rejectPark(park.id)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-1" />
                        却下
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ドッグラン詳細表示 */}
      {activeTab === 'parks' && selectedPark && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center">
              <Building className="w-6 h-6 text-blue-600 mr-2" />
              {selectedPark.name}の審査
            </h2>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedPark(null);
                setParkImages([]);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              一覧に戻る
            </Button>
          </div>
          
          {/* 施設基本情報 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">施設名</p>
                <p className="font-medium">{selectedPark.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">住所</p>
                <p className="font-medium">{selectedPark.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">オーナー</p>
                <p className="font-medium">{selectedPark.owner_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">申請日</p>
                <p className="font-medium">{new Date(selectedPark.created_at).toLocaleDateString('ja-JP')}</p>
              </div>
              {selectedPark.second_stage_submitted_at && (
                <div>
                  <p className="text-sm text-gray-600">第二審査申請日</p>
                  <p className="font-medium">{new Date(selectedPark.second_stage_submitted_at).toLocaleDateString('ja-JP')}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">ステータス</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedPark.status === 'first_stage_passed' ? 'bg-blue-100 text-blue-800' :
                  selectedPark.status === 'second_stage_review' ? 'bg-purple-100 text-purple-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedPark.status === 'first_stage_passed' ? '第一審査通過' :
                   selectedPark.status === 'second_stage_review' ? '第二審査中' :
                   '審査待ち'}
                </span>
              </div>
            </div>
          </Card>
          
          {/* 施設画像一覧 */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold">施設画像</h3>
              <div className="text-sm text-gray-600">
                全{parkImages.length}枚中、
                <span className="text-yellow-600">{parkImages.filter(img => img.is_approved === null).length}枚審査待ち</span>、
                <span className="text-green-600">{parkImages.filter(img => img.is_approved === true).length}枚承認済み</span>、
                <span className="text-red-600">{parkImages.filter(img => img.is_approved === false).length}枚却下</span>
              </div>
            </div>
            
            {parkImages.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">施設画像がまだアップロードされていません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parkImages.map((image) => {
                  const status = getApprovalStatus(image.is_approved);
                  const StatusIcon = status.icon;
                  
                  return (
                    <div 
                      key={image.id} 
                      className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleImageSelect(image)}
                    >
                      <div className="h-48 bg-gray-100">
                        <img 
                          src={image.image_url} 
                          alt={getImageTypeLabel(image.image_type)} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{getImageTypeLabel(image.image_type)}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            image.is_approved === true
                              ? 'bg-green-100 text-green-800'
                              : image.is_approved === false
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {status.label}
                          </span>
                        </div>
                        {image.is_approved === false && image.admin_notes && (
                          <p className="text-xs text-red-600 mt-2 line-clamp-2">
                            却下理由: {image.admin_notes}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          アップロード: {new Date(image.created_at).toLocaleDateString('ja-JP')}
                        </p>
                        
                        {/* 承認・却下ボタン */}
                        {image.is_approved === null && (
                          <div className="flex space-x-2 mt-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 w-1/2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(image);
                                handleImageApproval(true);
                              }}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              承認
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 w-1/2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImageSelect(image);
                              }}
                            >
                              <X className="w-3 h-3 mr-1" />
                              却下
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
          
          {/* 施設承認/却下 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">審査結果</h3>
            
            {selectedPark.status === 'second_stage_review' ? (
              <>
                {/* 第二審査中の場合 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由（却下する場合のみ入力）
                  </label>
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="例: 施設の安全基準を満たしていません。フェンスの高さが不足しています。"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => handleParkApproval(selectedPark.id, false)}
                    isLoading={isProcessing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    却下
                  </Button>
                  <Button
                    onClick={() => handleParkApproval(selectedPark.id, true)}
                    isLoading={isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!allImagesApproved}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    QRコードテストへ進める
                  </Button>
                </div>
                
                {!allImagesApproved && (
                  <p className="text-sm text-yellow-600 mt-3">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    すべての画像を承認してから施設を承認してください
                  </p>
                )}
              </>
            ) : (
              // 第一審査通過の場合
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">オーナーによる第二審査の申請待ち</p>
                    <p className="text-sm text-blue-700 mt-1">
                      オーナーが施設画像をアップロードし、第二審査を申請するのを待っています。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ワクチン証明書審査タブ */}
      {activeTab === 'vaccines' && !selectedVaccine && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">審査待ちワクチン証明書</h2>
          
          {pendingVaccines.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">審査待ちのワクチン証明書はありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingVaccines.map((vaccine) => (
                <Card key={vaccine.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{vaccine.dog.name}のワクチン証明書</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">犬種</p>
                          <p className="font-medium">{vaccine.dog.breed}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">性別</p>
                          <p className="font-medium">{vaccine.dog.gender}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">飼い主</p>
                          <p className="font-medium">{vaccine.dog.owner.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">申請日</p>
                          <p className="font-medium">{new Date(vaccine.created_at).toLocaleDateString('ja-JP')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedVaccine(vaccine)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        詳細
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleVaccineApproval(vaccine.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleVaccineApproval(vaccine.id, false)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-1" />
                        却下
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ワクチン証明書詳細表示 */}
      {activeTab === 'vaccines' && selectedVaccine && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center">
              <FileCheck className="w-6 h-6 text-blue-600 mr-2" />
              {selectedVaccine.dog.name}のワクチン証明書審査
            </h2>
            <Button
              variant="secondary"
              onClick={() => setSelectedVaccine(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              一覧に戻る
            </Button>
          </div>
          
          {/* 犬の基本情報 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">名前</p>
                <p className="font-medium">{selectedVaccine.dog.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">犬種</p>
                <p className="font-medium">{selectedVaccine.dog.breed}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">性別</p>
                <p className="font-medium">{selectedVaccine.dog.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">生年月日</p>
                <p className="font-medium">{new Date(selectedVaccine.dog.birth_date).toLocaleDateString('ja-JP')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">飼い主</p>
                <p className="font-medium">{selectedVaccine.dog.owner.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">申請日</p>
                <p className="font-medium">{new Date(selectedVaccine.created_at).toLocaleDateString('ja-JP')}</p>
              </div>
            </div>
          </Card>

          {/* ワクチン証明書画像 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">ワクチン証明書</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 狂犬病ワクチン */}
              <div>
                <h4 className="font-medium mb-2">狂犬病ワクチン</h4>
                {selectedVaccine.rabies_vaccine_image ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vaccine-certs/${selectedVaccine.rabies_vaccine_image}`}
                      alt="狂犬病ワクチン証明書"
                      className="w-full h-64 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">画像なし</p>
                  </div>
                )}
                {selectedVaccine.rabies_expiry_date && (
                  <p className="text-sm text-gray-600 mt-2">
                    有効期限: {new Date(selectedVaccine.rabies_expiry_date).toLocaleDateString('ja-JP')}
                  </p>
                )}
              </div>
              
              {/* 混合ワクチン */}
              <div>
                <h4 className="font-medium mb-2">混合ワクチン</h4>
                {selectedVaccine.combo_vaccine_image ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vaccine-certs/${selectedVaccine.combo_vaccine_image}`}
                      alt="混合ワクチン証明書"
                      className="w-full h-64 object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">画像なし</p>
                  </div>
                )}
                {selectedVaccine.combo_expiry_date && (
                  <p className="text-sm text-gray-600 mt-2">
                    有効期限: {new Date(selectedVaccine.combo_expiry_date).toLocaleDateString('ja-JP')}
                  </p>
                )}
              </div>
            </div>
          </Card>
          
          {/* 審査結果 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">審査結果</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                却下理由（却下する場合のみ入力）
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="例: ワクチン証明書の有効期限が切れています。最新の証明書をアップロードしてください。"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => handleVaccineApproval(selectedVaccine.id, false)}
                isLoading={isProcessing}
                className="bg-red-600 hover:bg-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                却下
              </Button>
              <Button
                onClick={() => handleVaccineApproval(selectedVaccine.id, true)}
                isLoading={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                承認
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}