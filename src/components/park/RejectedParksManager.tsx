import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { DogPark } from '../../types';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

interface RejectedParksManagerProps {
  rejectedParks: DogPark[];
  onUpdateRejectedParks: (parks: DogPark[]) => void;
  onResubmit: (parkData: DogPark) => void;
  onError: (error: string) => void;
}

export default function RejectedParksManager({
  rejectedParks,
  onUpdateRejectedParks,
  onResubmit,
  onError,
}: RejectedParksManagerProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  const handleDeletePark = async (parkId: string) => {
    try {
      setIsDeleting(true);
      
      // Delete the park
      const { error } = await supabase
        .from('dog_parks')
        .delete()
        .eq('id', parkId);
      
      if (error) throw error;
      
      // Update the rejected parks list
      const updatedParks = rejectedParks.filter(park => park.id !== parkId);
      onUpdateRejectedParks(updatedParks);
      setShowConfirmDelete(null);
      
    } catch (err: unknown) {
      console.error('Error deleting park:', err);
      onError((err as Error).message || 'ドッグランの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (rejectedParks.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 bg-red-50 border-red-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
          <div>
            <h3 className="font-semibold text-red-900 mb-2">却下された申請</h3>
            <p className="text-sm text-red-800 mb-4">
              以下の申請は審査の結果、却下されました。申請内容を見直して再提出するか、削除することができます。
            </p>
            <div className="space-y-4">
              {rejectedParks.map(park => (
                <div key={park.id} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{park.name}</h4>
                      <p className="text-sm text-gray-600">{park.address}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        申請日: {new Date(park.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => onResubmit(park)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        再申請
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setShowConfirmDelete(park.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 削除確認モーダル */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">申請を削除しますか？</h3>
            <p className="text-gray-600 mb-6">
              この操作は取り消せません。申請を削除してもよろしいですか？
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowConfirmDelete(null)}
              >
                キャンセル
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                isLoading={isDeleting}
                onClick={() => handleDeletePark(showConfirmDelete)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 