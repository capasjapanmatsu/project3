import { Star, Edit, Trash2, MessageCircle, Plus, PawPrint } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import type { DogPark, DogParkReview, UserParkReview, Dog, Profile, ReviewImage } from '../../types';

interface ParkReviewSectionProps {
  park: DogPark;
  reviews: DogParkReview[];
  userReview: UserParkReview | null;
  canReview: boolean;
  user: Profile | null;
  userDogs: Dog[];
  showReviewForm: boolean;
  setShowReviewForm: (show: boolean) => void;
  reviewFormData: {
    rating: number;
    review_text: string;
    visit_date: string;
    dog_id: string;
  };
  setReviewFormData: (data: {
    rating: number;
    review_text: string;
    visit_date: string;
    dog_id: string;
  }) => void;
  isSubmitting: boolean;
  handleReviewSubmit: (e: React.FormEvent) => Promise<void>;
  handleDeleteReview: () => Promise<void>;
}

export function ParkReviewSection({
  park,
  reviews,
  userReview,
  canReview,
  user,
  userDogs,
  showReviewForm,
  setShowReviewForm,
  reviewFormData,
  setReviewFormData,
  isSubmitting,
  handleReviewSubmit,
  handleDeleteReview
}: ParkReviewSectionProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <MessageCircle className="w-6 h-6 mr-2" />
          レビュー ({park.review_count})
        </h2>
        {user && canReview && (
          <Button
            onClick={() => setShowReviewForm(!showReviewForm)}
            variant={userReview ? "secondary" : "primary"}
            size="sm"
          >
            {userReview ? (
              <>
                <Edit className="w-4 h-4 mr-2" />
                レビューを編集
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                レビューを書く
              </>
            )}
          </Button>
        )}
      </div>

      {/* レビュー投稿フォーム */}
      {showReviewForm && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-4">
            {userReview ? 'レビューを編集' : 'レビューを投稿'}
          </h3>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                評価 *
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewFormData({ ...reviewFormData, rating: star })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= reviewFormData.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300 hover:text-yellow-300'
                      } transition-colors`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {reviewFormData.rating}つ星
                </span>
              </div>
            </div>

            <Select
              label="レビューするワンちゃん *"
              options={userDogs.map(dog => ({ value: dog.id, label: dog.name }))}
              value={reviewFormData.dog_id}
              onChange={(e) => setReviewFormData({ ...reviewFormData, dog_id: e.target.value })}
              required
            />

            <Input
              label="訪問日 *"
              type="date"
              value={reviewFormData.visit_date}
              onChange={(e) => setReviewFormData({ ...reviewFormData, visit_date: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                レビュー内容
              </label>
              <textarea
                value={reviewFormData.review_text}
                onChange={(e) => setReviewFormData({ ...reviewFormData, review_text: e.target.value })}
                placeholder="ドッグランの感想をお聞かせください..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 画像アップロード機能は後で実装 */}

            <div className="flex justify-between">
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowReviewForm(false)}
                >
                  キャンセル
                </Button>
                {userReview && (
                  <Button
                    type="button"
                    onClick={handleDeleteReview}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    削除
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={!reviewFormData.dog_id || !reviewFormData.visit_date}
              >
                {userReview ? '更新する' : '投稿する'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* レビュー一覧 */}
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">まだレビューがありません</p>
          {user && canReview && (
            <p className="text-sm text-gray-500 mt-2">
              最初のレビューを投稿してみませんか？
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-start space-x-4">
                {/* ワンちゃんの画像 */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {review.dog_image_url ? (
                      <img 
                        src={review.dog_image_url} 
                        alt={review.dog_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <PawPrint className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-gray-900">{review.user_name}</h4>
                        <span className="text-sm text-gray-500">と</span>
                        <span className="font-medium text-blue-600">{review.dog_name}ちゃん</span>
                        <span className="text-xs text-gray-400">({review.dog_breed})</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(review.visit_date).toLocaleDateString('ja-JP')} に訪問
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>

                  {review.review_text && (
                    <p className="text-gray-700 leading-relaxed mb-3">{review.review_text}</p>
                  )}

                  {/* レビュー画像ギャラリー */}
                  {review.review_images && review.review_images.length > 0 && (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {review.review_images.map((image, index) => (
                          <div key={index} className="relative group cursor-pointer">
                            <img
                              src={image.url}
                              alt={image.caption || `レビュー画像 ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                              onClick={() => window.open(image.url, '_blank')}
                            />
                            {image.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                {image.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* メイン画像がある場合（review_imagesがない古いレビュー対応） */}
                  {review.main_image_url && (!review.review_images || review.review_images.length === 0) && (
                    <div className="mt-3">
                      <img
                        src={review.main_image_url}
                        alt="レビュー画像"
                        className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(review.main_image_url, '_blank')}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* レビュー投稿の案内 */}
      {user && !canReview && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            レビューを投稿するには、このドッグランを実際に利用する必要があります。
          </p>
        </div>
      )}
    </Card>
  );
}
