import { AlertTriangle, Shield } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

interface IdentityVerificationFormProps {
  onBack: () => void;
  onNext: () => void;
  onError: (error: string) => void;
  error: string;
  user: any;
}

export default function IdentityVerificationForm({
  onBack,
  onNext,
  onError,
  error,
  user,
}: IdentityVerificationFormProps) {
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIdentityFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!identityFile) {
      onError('本人確認書類のファイルを選択してください。');
      return;
    }
    if (!user) {
      onError('ユーザー情報が取得できません。再度ログインしてください。');
      return;
    }

    setIsUploading(true);
    onError('');

    try {
        name: identityFile.name,
        type: identityFile.type,
        size: identityFile.size,
        lastModified: identityFile.lastModified
      });

      // ファイル名例: userId_タイムスタンプ_元ファイル名
      const fileName = `identity_${user.id}_${Date.now()}_${identityFile.name}`;
      
      // vaccine-certsバケットを使用（管理者画面と統一）
      const { data, error: uploadError } = await supabase.storage
        .from('vaccine-certs')
        .upload(fileName, identityFile, { upsert: true });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw new Error(`ファイルアップロードに失敗しました: ${uploadError.message}`);
      }


      // owner_verificationsテーブルに正しい構造で保存
      const dbData = {
        user_id: user.id,
        verification_id: data.path, // ファイルパスをverification_idとして使用
        status: 'pending', // 管理者画面で期待されるステータス
        verification_data: {
          document_url: data.path,
          uploaded_at: new Date().toISOString(),
          file_name: identityFile.name,
          file_size: identityFile.size,
          file_type: identityFile.type
        }
      };
      

      const { error: dbError } = await supabase
        .from('owner_verifications')
        .upsert(dbData, { onConflict: 'user_id' });

      if (dbError) {
        console.error('❌ Database save error:', dbError);
        throw new Error(`データベース保存に失敗しました: ${dbError.message}`);
      }


      onNext(); // 次のステップへ
    } catch (err) {
      console.error('❌ Identity upload failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'アップロードに失敗しました。';
      onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ドッグラン登録 - 本人確認</h1>
      
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">本人確認について</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>安全なプラットフォーム運営のため、ドッグランオーナーには本人確認が必要です。</p>
              <p>運転免許証、マイナンバーカード、パスポートなどの本人確認書類の画像をアップロードしてください。</p>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            本人確認書類のアップロード *
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            運転免許証・マイナンバーカード・パスポート等の画像またはPDF
          </p>
        </div>

        <div className="flex justify-between items-center mt-6">
          <Button variant="secondary" onClick={onBack}>
            前のステップに戻る
          </Button>
          <Button
            onClick={handleUpload}
            isLoading={isUploading}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!identityFile || isUploading}
          >
            <Shield className="w-4 h-4 mr-2" />
            書類をアップロードして次へ
          </Button>
        </div>
      </Card>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Lock className="w-5 h-5 text-gray-600 mt-1" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">プライバシーと安全性</p>
            <p>
              アップロードされた本人確認書類は厳重に管理され、管理者以外が閲覧することはありません。
              審査完了後、速やかに削除されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lock component for privacy section
function Lock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
} 
