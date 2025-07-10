import React, { useState, useEffect } from 'react';
import { RefreshCw, Upload, AlertCircle, Check } from 'lucide-react';
import { validateAndGetImageUrl, getPlaceholderImageUrl, reuploadVaccineImage } from '../utils/imageHelpers';
import Button from './Button';

interface SmartVaccineImageProps {
  imagePath: string | null;
  imageType: 'rabies' | 'combo';
  vaccineId: string;
  altText: string;
  onImageRepaired?: () => void;
}

export const SmartVaccineImage: React.FC<SmartVaccineImageProps> = ({
  imagePath,
  imageType,
  vaccineId,
  altText,
  onImageRepaired
}) => {
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(getPlaceholderImageUrl());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isReuploading, setIsReuploading] = useState(false);

  // 画像URLの検証と設定
  useEffect(() => {
    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        const validUrl = await validateAndGetImageUrl(imagePath);
        setCurrentImageUrl(validUrl);
        setHasError(validUrl === getPlaceholderImageUrl());
      } catch (error) {
        console.error('Image loading error:', error);
        setHasError(true);
        setCurrentImageUrl(getPlaceholderImageUrl());
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [imagePath]);

  // 画像の修復処理
  const handleRepairImage = async () => {
    setIsRepairing(true);
    
    try {
      const validUrl = await validateAndGetImageUrl(imagePath);
      setCurrentImageUrl(validUrl);
      setHasError(validUrl === getPlaceholderImageUrl());
      
      if (validUrl !== getPlaceholderImageUrl()) {
        onImageRepaired?.();
      }
    } catch (error) {
      console.error('Image repair error:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  // 画像の再アップロード
  const handleImageReupload = async (file: File) => {
    setIsReuploading(true);
    
    try {
      const result = await reuploadVaccineImage(vaccineId, file, imageType);
      
      if (result.success && result.url) {
        setCurrentImageUrl(result.url);
        setHasError(false);
        onImageRepaired?.();
      } else {
        console.error('Reupload failed:', result.error);
      }
    } catch (error) {
      console.error('Reupload error:', error);
    } finally {
      setIsReuploading(false);
    }
  };

  // ファイル選択ハンドラー
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageReupload(file);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* 画像表示エリア */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-600" />
            <span className="ml-2 text-gray-600">読み込み中...</span>
          </div>
        )}
        
        <img
          src={currentImageUrl}
          alt={altText}
          className={`w-full h-64 object-contain ${isLoading ? 'opacity-50' : ''}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
            setCurrentImageUrl(getPlaceholderImageUrl());
          }}
        />
        
        {/* エラーオーバーレイ */}
        {hasError && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-700 font-medium">画像が見つかりません</p>
              <p className="text-sm text-red-600">元の画像パス: {imagePath}</p>
            </div>
          </div>
        )}
      </div>

      {/* 制御パネル */}
      <div className="p-3 bg-gray-50 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasError ? (
              <span className="text-red-600 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                エラー
              </span>
            ) : (
              <span className="text-green-600 text-sm flex items-center">
                <Check className="w-4 h-4 mr-1" />
                正常
              </span>
            )}
            
            {imagePath && (
              <span className="text-xs text-gray-500 truncate max-w-32">
                {imagePath}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 修復ボタン */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRepairImage}
              disabled={isRepairing}
            >
              {isRepairing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            
            {/* 再アップロードボタン */}
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isReuploading}
              />
              <Button
                size="sm"
                disabled={isReuploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isReuploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                再アップロード
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 