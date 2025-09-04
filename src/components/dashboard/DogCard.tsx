import { Camera, Edit, FileText, PawPrint, Shield, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dogBreeds } from '../../data/dogBreeds';
import type { Dog } from '../../types';
import Button from '../Button';
import ImageCropper from '../ImageCropper';
import Input from '../Input';
import LazyImage from '../LazyImage';
import Select from '../Select';
import VaccineBadge, { getVaccineStatusFromDog } from '../VaccineBadge';

interface DogCardProps {
  dog: Dog;
  onEdit: (dog: Dog) => void;
}

export function DogCard({ dog, onEdit }: DogCardProps) {
  const vaccineStatus = getVaccineStatusFromDog(dog);
  const honorific = getDogHonorific(dog.gender);
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
          {dog.image_url ? (
            <LazyImage
              src={dog.image_url} 
              alt={dog.name}
              width={64}
              height={64}
              loading="lazy"
              priority={false}
              className="w-full h-full object-cover rounded-full"
              placeholderSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj4KPGVsbGlwc2UgY3g9IjEyIiBjeT0iMTMiIHJ4PSIxMCIgcnk9IjQiLz4KPHBhdGggZD0ibTEyIDEzIDQuNS05IDQuNSA5Ii8+CjxwYXRoIGQ9Im0xMiAxMyA0LjUtOUw3IDEzIi8+CjxwYXRoIGQ9Im0xMiAxM0w3IDQgNy41IDEzIi8+Cjwvc3ZnPgo8L3N2Zz4K"
            />
          ) : (
            <PawPrint className="w-8 h-8 text-gray-500" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">{dog.name}{honorific}</h3>
          <p className="text-sm text-gray-600">{dog.breed} • {dog.gender}</p>
          {dog.microchip_number && (
            <p className="text-xs text-gray-500">マイクロチップ: {dog.microchip_number}</p>
          )}
          <div className="flex items-center space-x-2 mt-1">
            <VaccineBadge status={vaccineStatus} size="sm" />
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Link to="/jp-passport">
          <Button 
            size="sm" 
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-0"
            title="JPパスポートを確認"
          >
            <Shield className="w-4 h-4" />
          </Button>
        </Link>
        <Button 
          size="sm" 
          className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-0"
          onClick={() => onEdit(dog)}
        >
          <Edit className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// 犬の性別に応じた敬称を取得する関数
export function getDogHonorific(gender: string) {
  return gender === 'オス' ? 'くん' : 'ちゃん';
}



interface DogEditModalProps {
  dog: Dog | null;
  isUpdating: boolean;
  error: string;
  success: string;
  dogFormData: {
    name: string;
    breed: string;
    gender: string;
    birthDate: string;
    microchipNumber: string; // マイクロチップNO追加
  };
  dogImagePreview: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: (dog: Dog) => void; // 削除機能を追加
  onFormChange: (formData: {
    name: string;
    breed: string;
    gender: string;
    birthDate: string;
    microchipNumber: string; // マイクロチップNO追加
  }) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  // 画像クロップ用（dog-registrationのImageCropperに合わせる）
  onImageCropped?: (file: File) => void;
  // ワクチン証明書関連のプロパティ
  rabiesVaccineFile: File | null;
  comboVaccineFile: File | null;
  rabiesExpiryDate: string;
  comboExpiryDate: string;
  onRabiesVaccineSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onComboVaccineSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRabiesExpiryDateChange: (date: string) => void;
  onComboExpiryDateChange: (date: string) => void;
  onSubmitVaccine?: () => void;
}

export function DogEditModal({
  dog,
  isUpdating,
  error,
  success,
  dogFormData,
  dogImagePreview,
  onClose,
  onSubmit,
  onDelete,
  onFormChange,
  onImageSelect,
  onImageRemove,
  rabiesVaccineFile,
  comboVaccineFile,
  rabiesExpiryDate,
  comboExpiryDate,
  onRabiesVaccineSelect,
  onComboVaccineSelect,
  onRabiesExpiryDateChange,
  onComboExpiryDateChange,
  onImageCropped,
  onSubmitVaccine
}: DogEditModalProps) {
  if (!dog) return null;
  
  const honorific = getDogHonorific(dog.gender);
  const vaccineStatus = getVaccineStatusFromDog(dog);
  const [localHidePreview, setLocalHidePreview] = useState(false);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    // 画像プレビューが更新されたらローカル非表示フラグをリセット
    setLocalHidePreview(false);
  }, [dogImagePreview, dog?.id]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{dog.name}{honorific}の情報編集</h2>
            <div className="flex space-x-2">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`${dog.name}${honorific}を削除しますか？\n\nこの操作は元に戻せません。`)) {
                      onDelete(dog);
                    }
                  }}
                  className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                  title="このワンちゃんを削除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                title="編集を閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              {success}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="space-y-6">
              {/* 犬の基本情報 */}
              <div>
                <h3 className="text-lg font-semibold mb-4">基本情報</h3>
                
                {/* 犬の画像アップロード */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ワンちゃんの写真
                  </label>
                  
                  {dogImagePreview && !localHidePreview ? (
                    <>
                    <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
                      <img src={dogImagePreview} alt="プレビュー" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('[DogEditModal] 🗑️ Delete image button clicked'); setLocalHidePreview(true); onImageRemove(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); console.log('[DogEditModal] 🗑️ Delete image button keydown'); onImageRemove(); } }}
                        className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                        aria-label="画像を削除"
                        title="画像を削除"
                        data-testid="dog-image-delete-button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-3 text-right">
                      <Button type="button" variant="secondary" onClick={() => setShowCropper(true)}>画像を変更（トリミング）</Button>
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('[DogEditModal] 🗑️ Delete image text clicked'); setLocalHidePreview(true); onImageRemove(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); console.log('[DogEditModal] 🗑️ Delete image text keydown'); onImageRemove(); } }}
                        className="text-sm text-red-600 hover:text-red-700 underline"
                        data-testid="dog-image-delete-text"
                      >
                        画像を削除
                      </button>
                    </div>
                    </>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <button type="button" onClick={() => setShowCropper(true)} className="cursor-pointer flex flex-col items-center w-full">
                        <Camera className="w-12 h-12 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">クリックして画像を選択</span>
                        <span className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (最大10MB)</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="名前"
                    value={dogFormData.name}
                    onChange={(e) => onFormChange({ ...dogFormData, name: e.target.value })}
                    required
                  />
                  
                  <Select
                    label="犬種"
                    options={dogBreeds.map((breed) => ({
                      value: breed,
                      label: breed,
                    }))}
                    value={dogFormData.breed}
                    onChange={(e) => onFormChange({ ...dogFormData, breed: e.target.value })}
                    required
                  />
                  
                  <Select
                    label="性別"
                    options={[
                      { value: '', label: '性別を選択してください' },
                      { value: 'オス', label: 'オス' },
                      { value: 'メス', label: 'メス' },
                    ]}
                    value={dogFormData.gender}
                    onChange={(e) => onFormChange({ ...dogFormData, gender: e.target.value })}
                    required
                  />
                  
                  <Input
                    label="生年月日"
                    type="date"
                    value={dogFormData.birthDate}
                    onChange={(e) => onFormChange({ ...dogFormData, birthDate: e.target.value })}
                    required
                  />
                  
                  <Input
                    label="マイクロチップNO"
                    type="text"
                    value={dogFormData.microchipNumber}
                    onChange={(e) => onFormChange({ ...dogFormData, microchipNumber: e.target.value })}
                    placeholder="15桁の数字（任意）"
                    maxLength={15}
                  />
                </div>
              </div>

              {/* ワクチン証明書セクション */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  ワクチン証明書
                </h3>
                
                {/* 現在のワクチン証明書ステータス */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">現在のステータス:</span>
                    <VaccineBadge status={vaccineStatus} size="md" />
                  </div>
                  {vaccineStatus === 'pending' && (
                    <p className="text-xs text-gray-600 mt-1">
                      新しい証明書をアップロードすると、再度承認待ち状態になります。
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 狂犬病ワクチン証明書 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      狂犬病ワクチン証明書
                    </label>
                    
                    {rabiesVaccineFile ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">{rabiesVaccineFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              // ファイル入力をリセット
                              const input = document.getElementById('rabies-vaccine-edit') as HTMLInputElement;
                              if (input) input.value = '';
                              // 空のFileListを模擬したイベントを作成
                              const mockEvent = {
                                target: { files: [] as any }
                              } as React.ChangeEvent<HTMLInputElement>;
                              onRabiesVaccineSelect(mockEvent);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onRabiesVaccineSelect}
                          className="hidden"
                          id="rabies-vaccine-edit"
                        />
                        <label
                          htmlFor="rabies-vaccine-edit"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">
                            証明書をアップロード
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            JPG, PNG, GIF (最大10MB)
                          </span>
                        </label>
                      </div>
                    )}
                    
                    <Input
                      label="有効期限"
                      type="date"
                      value={rabiesExpiryDate}
                      onChange={(e) => onRabiesExpiryDateChange(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  {/* 混合ワクチン証明書 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      混合ワクチン証明書
                    </label>
                    
                    {comboVaccineFile ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">{comboVaccineFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              // ファイル入力をリセット
                              const input = document.getElementById('combo-vaccine-edit') as HTMLInputElement;
                              if (input) input.value = '';
                              // 空のFileListを模擬したイベントを作成
                              const mockEvent = {
                                target: { files: [] as any }
                              } as React.ChangeEvent<HTMLInputElement>;
                              onComboVaccineSelect(mockEvent);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onComboVaccineSelect}
                          className="hidden"
                          id="combo-vaccine-edit"
                        />
                        <label
                          htmlFor="combo-vaccine-edit"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">
                            証明書をアップロード
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            JPG, PNG, GIF (最大10MB)
                          </span>
                        </label>
                      </div>
                    )}
                    
                    <Input
                      label="有効期限"
                      type="date"
                      value={comboExpiryDate}
                      onChange={(e) => onComboExpiryDateChange(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>注意:</strong> 新しいワクチン証明書をアップロードすると、管理者による再承認が必要になります。
                    承認されるまでドッグランのご利用はできません。
                  </p>
                </div>

                {/* 強制提出ボタン（Edge Function） */}
                <div className="mt-3 text-right">
                  {onSubmitVaccine && (
                    <Button type="button" onClick={() => onSubmitVaccine()}>
                      ワクチン提出（審査待ちにする）
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={onClose}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  isLoading={isUpdating}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {showCropper && (
        <ImageCropper
          onCancel={() => setShowCropper(false)}
          onCropComplete={(file) => { onImageCropped && onImageCropped(file); setShowCropper(false); setLocalHidePreview(false); }}
          aspectRatio={1}
          maxWidth={1200}
          maxHeight={1200}
        />
      )}
    </div>
  );
}
