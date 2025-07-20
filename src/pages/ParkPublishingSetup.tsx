import {
    AlertTriangle,
    ArrowLeft,
    Camera,
    Check,
    CheckCircle,
    Edit,
    Eye,
    Key,
    Lock,
    Save,
    Shield,
    X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { DoorLockButton } from '../components/DoorLockButton';
import Input from '../components/Input';
import useAuth from '../context/AuthContext';
import type { DogPark, SmartLock } from '../types';
import { supabase } from '../utils/supabase';

interface TaskStatus {
  smartLockTest: boolean;
  pageEditing: boolean;
  readyToPublish: boolean;
}

export function ParkPublishingSetup() {
  const { parkId } = useParams<{ parkId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [park, setPark] = useState<DogPark | null>(null);
  const [smartLocks, setSmartLocks] = useState<SmartLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({
    smartLockTest: false,
    pageEditing: false,
    readyToPublish: false
  });
  
  // Page editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    facility_details: '',
    price: 0
  });
  
  // Image upload state
  const [newImages, setNewImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!user || !parkId) {
      navigate('/owner-dashboard');
      return;
    }
    
    fetchParkData();
  }, [user, parkId, navigate]);

  const fetchParkData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch park data
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', parkId)
        .eq('owner_id', user?.id)
        .single();

      if (parkError) throw parkError;
      if (!parkData) {
        setError('ドッグランが見つかりません。');
        return;
      }

      // Check if park is in correct status
      if (parkData.status !== 'qr_testing_ready' && parkData.status !== 'editing' && parkData.status !== 'ready_to_publish') {
        setError('このドッグランは公開準備の段階ではありません。');
        return;
      }

      setPark(parkData);
      setEditData({
        name: parkData.name || '',
        description: parkData.description || '',
        facility_details: parkData.facility_details || '',
        price: parkData.price || 0
      });

      // Fetch smart locks
      const { data: locksData, error: locksError } = await supabase
        .from('smart_locks')
        .select('*')
        .eq('park_id', parkId);

      if (locksError) throw locksError;
      setSmartLocks(locksData || []);

      // Check task completion status
      checkTaskStatus(parkData);
      
    } catch (error) {
      console.error('Error fetching park data:', error);
      setError('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const checkTaskStatus = (parkData: DogPark) => {
    const status: TaskStatus = {
      smartLockTest: parkData.status !== 'qr_testing_ready', // If not in initial state, test is done
      pageEditing: parkData.status === 'ready_to_publish', // If ready to publish, editing is done
      readyToPublish: parkData.status === 'ready_to_publish'
    };
    setTaskStatus(status);
  };

  const handleSmartLockTestComplete = async () => {
    try {
      // Update park status to editing
      const { error } = await supabase
        .from('dog_parks')
        .update({ status: 'editing' })
        .eq('id', parkId);

      if (error) throw error;

      setTaskStatus(prev => ({ ...prev, smartLockTest: true }));
      setSuccess('スマートロックのテストが完了しました。');
      
      // Refresh park data
      await fetchParkData();
      
    } catch (error) {
      console.error('Error updating smart lock test status:', error);
      setError('スマートロックテストの完了記録に失敗しました。');
    }
  };

  const handleSavePageEdits = async () => {
    try {
      setIsUploading(true);
      
      // Update park data
      const { error: updateError } = await supabase
        .from('dog_parks')
        .update({
          name: editData.name,
          description: editData.description,
          facility_details: editData.facility_details,
          price: editData.price,
          status: 'ready_to_publish'
        })
        .eq('id', parkId);

      if (updateError) throw updateError;

      // Handle image uploads if any
      if (newImages.length > 0) {
        await uploadImages();
      }

      setTaskStatus(prev => ({ ...prev, pageEditing: true, readyToPublish: true }));
      setSuccess('掲載ページの編集が完了しました。');
      setIsEditing(false);
      
      // Refresh park data
      await fetchParkData();
      
    } catch (error) {
      console.error('Error saving page edits:', error);
      setError('掲載ページの保存に失敗しました。');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadImages = async () => {
    for (const file of newImages) {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${parkId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-park-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update park with new image URL
      const imageUrl = supabase.storage
        .from('dog-park-images')
        .getPublicUrl(filePath).data.publicUrl;

      await supabase
        .from('dog_parks')
        .update({ image_url: imageUrl })
        .eq('id', parkId);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages(files);
    
    // Generate preview URLs
    const previewUrls = files.map(file => URL.createObjectURL(file));
    setImagePreview(previewUrls);
  };

  const handlePublish = async () => {
    if (!taskStatus.smartLockTest || !taskStatus.pageEditing) {
      setError('すべてのタスクを完了してから公開してください。');
      return;
    }

    try {
      setIsPublishing(true);
      
      // Update park status to approved (published)
      const { error } = await supabase
        .from('dog_parks')
        .update({ status: 'approved' })
        .eq('id', parkId);

      if (error) throw error;

      // Send notification to admin
      await supabase
        .from('admin_notifications')
        .insert([{
          type: 'park_published',
          title: 'ドッグラン公開',
          message: `${park?.name}が公開されました。`,
          data: { park_id: parkId }
        }]);

      setSuccess('ドッグランが公開されました！');
      
      // Redirect to park management page
      setTimeout(() => {
        navigate(`/parks/${parkId}/manage`);
      }, 2000);
      
    } catch (error) {
      console.error('Error publishing park:', error);
      setError('ドッグランの公開に失敗しました。');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!park) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">ドッグランが見つかりません</h2>
          <p className="text-gray-600 mb-4">指定されたドッグランが見つからないか、アクセス権限がありません。</p>
          <Button onClick={() => navigate('/owner-dashboard')}>
            ダッシュボードに戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="secondary"
            onClick={() => navigate('/owner-dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ダッシュボードに戻る
          </Button>
          <h1 className="text-2xl font-bold">{park.name} - 公開準備</h1>
          <p className="text-gray-600">
            二次審査が承認されました。公開前に以下の作業を完了してください。
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 mr-2 mt-0.5" />
            {error}
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
          <div className="flex">
            <CheckCircle className="w-5 h-5 mr-2 mt-0.5" />
            {success}
          </div>
        </div>
      )}

      {/* Task Progress */}
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold mb-4">公開準備の進捗</h2>
        <div className="space-y-4">
          {/* Smart Lock Test */}
          <div className={`flex items-center p-4 rounded-lg ${taskStatus.smartLockTest ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`w-6 h-6 rounded-full mr-4 flex items-center justify-center ${
              taskStatus.smartLockTest ? 'bg-green-500' : 'bg-yellow-500'
            }`}>
              {taskStatus.smartLockTest ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <span className="text-white text-sm">1</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">スマートロックの動作確認</h3>
              <p className="text-sm text-gray-600">
                {taskStatus.smartLockTest ? '動作確認が完了しました' : 'スマートロックの動作を確認してください'}
              </p>
            </div>
          </div>

          {/* Page Editing */}
          <div className={`flex items-center p-4 rounded-lg ${taskStatus.pageEditing ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className={`w-6 h-6 rounded-full mr-4 flex items-center justify-center ${
              taskStatus.pageEditing ? 'bg-green-500' : 'bg-yellow-500'
            }`}>
              {taskStatus.pageEditing ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <span className="text-white text-sm">2</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">掲載ページの編集</h3>
              <p className="text-sm text-gray-600">
                {taskStatus.pageEditing ? '掲載ページの編集が完了しました' : '掲載ページの内容を編集してください'}
              </p>
            </div>
          </div>

          {/* Ready to Publish */}
          <div className={`flex items-center p-4 rounded-lg ${taskStatus.readyToPublish ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className={`w-6 h-6 rounded-full mr-4 flex items-center justify-center ${
              taskStatus.readyToPublish ? 'bg-green-500' : 'bg-gray-400'
            }`}>
              {taskStatus.readyToPublish ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <span className="text-white text-sm">3</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">公開準備完了</h3>
              <p className="text-sm text-gray-600">
                {taskStatus.readyToPublish ? '公開準備が完了しました' : '上記の作業を完了してから公開してください'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Task 1: Smart Lock Test */}
      {!taskStatus.smartLockTest && (
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Key className="w-5 h-5 mr-2" />
            1. スマートロックの動作確認
          </h2>
          <p className="text-gray-600 mb-4">
            実際にスマートロックを開錠して動作を確認してください。
          </p>
          
          {smartLocks.length > 0 ? (
            <div className="space-y-4">
              {smartLocks.map(lock => (
                <div key={lock.id} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">{lock.lock_name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{lock.location}</p>
                  <DoorLockButton
                    lockId={lock.lock_id}
                    label="PINコードを生成してテスト"
                    onSuccess={() => {
                      setSuccess(`${lock.lock_name}のテストが完了しました。`);
                      setTimeout(() => {
                        handleSmartLockTestComplete();
                      }, 1000);
                    }}
                    onError={(error) => setError(`スマートロックのテストに失敗しました: ${error}`)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">このドッグランにはスマートロックが設定されていません。</p>
              <Button 
                onClick={handleSmartLockTestComplete}
                className="mt-4"
              >
                スマートロックテストを完了として進む
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Task 2: Page Editing */}
      {taskStatus.smartLockTest && !taskStatus.pageEditing && (
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Edit className="w-5 h-5 mr-2" />
            2. 掲載ページの編集
          </h2>
          <p className="text-gray-600 mb-4">
            ドッグランの掲載ページを編集してください。
          </p>

          {!isEditing ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">現在の掲載内容</h3>
                <div className="space-y-2">
                  <p><strong>施設名:</strong> {park.name}</p>
                  <p><strong>説明:</strong> {park.description || '未設定'}</p>
                  <p><strong>施設詳細:</strong> {park.facility_details || '未設定'}</p>
                  <p><strong>料金:</strong> ¥{park.price}</p>
                </div>
              </div>
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                編集を開始
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="施設名"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  label="料金（円）"
                  type="number"
                  value={editData.price}
                  onChange={(e) => setEditData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設の説明
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="お客様に向けた施設の魅力を説明してください..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設詳細・利用規約
                </label>
                <textarea
                  value={editData.facility_details}
                  onChange={(e) => setEditData(prev => ({ ...prev, facility_details: e.target.value }))}
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="施設の詳細情報や利用規約を記入してください..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設画像を追加
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    id="park-images"
                  />
                  <label htmlFor="park-images" className="cursor-pointer">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">
                      クリックして画像を選択
                    </span>
                  </label>
                </div>
                
                {imagePreview.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imagePreview.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`プレビュー ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleSavePageEdits}
                  disabled={isUploading}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isUploading ? '保存中...' : '編集を保存'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setNewImages([]);
                    setImagePreview([]);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Task 3: Publish */}
      {taskStatus.readyToPublish && (
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            3. ドッグランを公開
          </h2>
          <p className="text-gray-600 mb-4">
            すべての準備が完了しました。ドッグランを一般公開してください。
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-medium text-blue-900 mb-2">公開後の流れ</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ドッグランが一般のユーザーに公開されます</li>
              <li>• 予約の受付が開始されます</li>
              <li>• 収益の発生が開始されます</li>
              <li>• 管理画面で予約状況や収益を確認できます</li>
            </ul>
          </div>
          
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            {isPublishing ? '公開中...' : 'ドッグランを公開する'}
          </Button>
        </Card>
      )}
    </div>
  );
} 
