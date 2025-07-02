import { Edit, Trash2, Camera, Shield, PawPrint } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import { dogBreeds } from '../../data/dogBreeds';
import type { Dog } from '../../types';

interface DogCardProps {
  dog: Dog;
  onEdit: (dog: Dog) => void;
}

export function DogCard({ dog, onEdit }: DogCardProps) {
  const vaccineStatus = getVaccineStatus(dog);
  const honorific = getDogHonorific(dog.gender);
  
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
          {dog.image_url ? (
            <img 
              src={dog.image_url} 
              alt={dog.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <PawPrint className="w-6 h-6 text-gray-500" />
          )}
        </div>
        <div>
          <h3 className="font-semibold">{dog.name}{honorific}</h3>
          <p className="text-sm text-gray-600">{dog.breed} • {dog.gender}</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`text-xs ${vaccineStatus.color}`}>
              {vaccineStatus.label}
            </span>
            {vaccineStatus.status === 'approved' && (
              <Shield className="w-3 h-3 text-green-600" />
            )}
          </div>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button 
          size="sm" 
          variant="secondary"
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

// ワクチン証明書のステータスを取得する関数
export function getVaccineStatus(dog: Dog) {
  const cert = dog.vaccine_certifications?.[0];
  if (!cert) return { status: 'none', label: '未提出', color: 'text-red-600' };
  
  switch (cert.status) {
    case 'approved':
      return { status: 'approved', label: '承認済み', color: 'text-green-600' };
    case 'pending':
      return { status: 'pending', label: '承認待ち', color: 'text-yellow-600' };
    case 'rejected':
      return { status: 'rejected', label: '却下', color: 'text-red-600' };
    default:
      return { status: 'none', label: '未提出', color: 'text-red-600' };
  }
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
  };
  dogImagePreview: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormChange: (formData: {
    name: string;
    breed: string;
    gender: string;
    birthDate: string;
  }) => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
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
  onFormChange,
  onImageSelect,
  onImageRemove
}: DogEditModalProps) {
  if (!dog) return null;
  
  const honorific = getDogHonorific(dog.gender);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{dog.name}{honorific}の情報編集</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <Trash2 className="w-6 h-6" />
            </button>
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
            <div className="space-y-4">
              {/* 犬の画像アップロード */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ワンちゃんの写真
                </label>
                
                {dogImagePreview ? (
                  <div className="relative">
                    <img
                      src={dogImagePreview}
                      alt="ワンちゃんのプレビュー"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={onImageRemove}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onImageSelect}
                      className="hidden"
                      id="dog-image-edit"
                    />
                    <label
                      htmlFor="dog-image-edit"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Camera className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        クリックして画像を選択
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF (最大10MB)
                      </span>
                    </label>
                  </div>
                )}
              </div>

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
              
              <div className="flex justify-end space-x-3 mt-2">
                <Button
                  type="button"
                  variant="secondary"
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
    </div>
  );
}