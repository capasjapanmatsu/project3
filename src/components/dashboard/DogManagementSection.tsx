import { Dog as DogIcon, Plus, Shield } from 'lucide-react';
import React from 'react';
import { Area } from 'react-easy-crop';
import { Link } from 'react-router-dom';
import type { Dog } from '../../types';
import Card from '../Card';
import { DogCard, DogEditModal } from './DogCard';

interface DogManagementSectionProps {
  dogs: Dog[];
  user: any;
  selectedDog: Dog | null;
  showDogEditModal: boolean;
  isUpdatingDog: boolean;
  dogUpdateError: string;
  dogUpdateSuccess: string;
  dogFormData: {
    name: string;
    breed: string;
    gender: string;
    birthDate: string;
  };
  dogImageFile: File | null;
  dogImagePreview: string | null;
  rabiesVaccineFile: File | null;
  comboVaccineFile: File | null;
  rabiesExpiryDate: string;
  comboExpiryDate: string;
  onDogSelect: (dog: Dog) => void;
  onCloseDogEditModal: () => void;
  onUpdateDog: (e: React.FormEvent) => void;
  onDeleteDog: (dog: Dog) => void;
  onDogImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDogImageRemove: () => void;
  onRabiesVaccineSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onComboVaccineSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFormDataChange: (data: any) => void;
  onRabiesExpiryDateChange: (date: string) => void;
  onComboExpiryDateChange: (date: string) => void;
  // Crop control (optional)
  crop?: { x: number; y: number };
  zoom?: number;
  onCropChange?: (crop: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
  onCropComplete?: (_: any, areaPixels: Area) => void;
  // ImageCropper result
  onImageCropped?: (file: File) => void;
}

export const DogManagementSection: React.FC<DogManagementSectionProps> = ({
  dogs,
  user,
  selectedDog,
  showDogEditModal,
  isUpdatingDog,
  dogUpdateError,
  dogUpdateSuccess,
  dogFormData,
  dogImageFile,
  dogImagePreview,
  rabiesVaccineFile,
  comboVaccineFile,
  rabiesExpiryDate,
  comboExpiryDate,
  onDogSelect,
  onCloseDogEditModal,
  onUpdateDog,
  onDeleteDog,
  onDogImageSelect,
  onDogImageRemove,
  onRabiesVaccineSelect,
  onComboVaccineSelect,
  onFormDataChange,
  onRabiesExpiryDateChange,
  onComboExpiryDateChange,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onImageCropped,
}) => {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <DogIcon className="w-5 h-5 mr-2 text-gray-700" />
          登録済みの愛犬
        </h2>
      </div>

      {dogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <DogIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">まだ愛犬が登録されていません</p>
          <p className="text-sm mb-4">
            ドッグランを利用するために、愛犬の情報を登録してください
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dogs.map((dog) => (
            <DogCard
              key={dog.id}
              dog={dog}
              onEdit={() => onDogSelect(dog)}
            />
          ))}
        </div>
      )}

      {/* 統一: カード最下部に横長ボタン配置 */}
      <div className="mt-6 space-y-3">
        {dogs.length > 0 && (
          <Link to="/jp-passport" className="block">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium inline-flex items-center justify-center">
              <Shield className="w-4 h-4 mr-2" />
              JPパスポート
            </button>
          </Link>
        )}
        <a href="/dog-registration" className="block">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md font-medium inline-flex items-center justify-center">
            <Plus className="w-4 h-4 mr-2" />
            愛犬を登録
          </button>
        </a>
      </div>

      {/* Dog Edit Modal */}
      {showDogEditModal && selectedDog && (
        <DogEditModal
          dog={selectedDog}
          isUpdating={isUpdatingDog}
          error={dogUpdateError}
          success={dogUpdateSuccess}
          dogFormData={dogFormData}
          dogImagePreview={dogImagePreview}
          onClose={onCloseDogEditModal}
          onSubmit={onUpdateDog}
          onDelete={onDeleteDog}
          onFormChange={onFormDataChange}
          onImageSelect={onDogImageSelect}
          onImageRemove={onDogImageRemove}
          // Crop props (fallback to sane defaults)
          crop={crop || { x: 0, y: 0 }}
          zoom={zoom || 1}
          onCropChange={onCropChange || (() => {})}
          onZoomChange={onZoomChange || (() => {})}
          onCropComplete={onCropComplete || (() => {})}
          onImageCropped={onImageCropped}
          rabiesVaccineFile={rabiesVaccineFile}
          comboVaccineFile={comboVaccineFile}
          rabiesExpiryDate={rabiesExpiryDate}
          comboExpiryDate={comboExpiryDate}
          onRabiesVaccineSelect={onRabiesVaccineSelect}
          onComboVaccineSelect={onComboVaccineSelect}
          onRabiesExpiryDateChange={onRabiesExpiryDateChange}
          onComboExpiryDateChange={onComboExpiryDateChange}
        />
      )}
    </Card>
  );
};

export default DogManagementSection; 
