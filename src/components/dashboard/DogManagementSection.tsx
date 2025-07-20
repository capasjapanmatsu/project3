import React, { useState } from 'react';
import { Plus, Upload, Trash2, Edit, FileText, Calendar, AlertTriangle, Check, X, Save, Image as ImageIcon } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import { DogCard, DogEditModal, getDogHonorific } from './DogCard';
import VaccineBadge, { getVaccineStatusFromDog } from '../VaccineBadge';
import { validateVaccineFile } from '../../utils/vaccineUpload';
import { handleVaccineUploadFixed } from '../../utils/vaccineUploadFixed';
import { supabase } from '../../utils/supabase';
import type { Dog, Profile } from '../../types';

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
}) => {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <span className="mr-2">🐕</span>
          登録済みの愛犬
        </h2>
        <a
          href="/register-dog"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          愛犬を登録
        </a>
      </div>

      {dogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-6xl mb-4">🐕</div>
          <p className="text-lg font-medium mb-2">まだ愛犬が登録されていません</p>
          <p className="text-sm mb-4">
            ドッグランを利用するために、愛犬の情報を登録してください
          </p>
          <a
            href="/register-dog"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            愛犬を登録
          </a>
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
