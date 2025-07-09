import { useEffect, useState } from 'react';
import { 
  Bell,
  Edit,
  Plus,
  FileText,
  Megaphone,
  Tag,
  X,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import { supabase } from '../../utils/supabase';
import useAuth from '../../context/AuthContext';
import type { NewsAnnouncement } from '../../types';

export function NewsManagement() {
  const { user } = useAuth();
  
  // 新着情報管理の状態
  const [newsList, setNewsList] = useState<NewsAnnouncement[]>([]);
  const [newsFormData, setNewsFormData] = useState({
    title: '',
    content: '',
    category: 'news' as 'news' | 'announcement' | 'sale',
    is_important: false,
    image_url: '',
    link_url: ''
  });
  const [selectedNews, setSelectedNews] = useState<NewsAnnouncement | null>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [isUpdatingNews, setIsUpdatingNews] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [newsSuccess, setNewsSuccess] = useState('');

  // 新着情報の取得
  useEffect(() => {
    fetchNews();
    checkUserProfile();
  }, []);

  // ユーザープロファイルをチェック
  const checkUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('Current user profile:', profile);
      console.log('User type:', profile?.user_type);
      
      if (error && error.code === 'PGRST116') {
        // プロファイルが存在しない場合、管理者として作成
        console.log('Profile not found, creating admin profile...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            user_type: 'admin',
            name: user.email || 'Admin User',
            email: user.email
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating admin profile:', createError);
          setNewsError('管理者プロファイルの作成に失敗しました。');
        } else {
          console.log('Admin profile created successfully:', newProfile);
          setNewsSuccess('管理者プロファイルを作成しました。');
          setTimeout(() => setNewsSuccess(''), 3000);
        }
      } else if (error) {
        console.error('Error fetching user profile:', error);
        setNewsError('ユーザープロファイルの取得に失敗しました。');
      } else if (!profile || profile.user_type !== 'admin') {
        // 既存プロファイルを管理者に更新
        console.log('Updating user to admin...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_type: 'admin' })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Error updating user to admin:', updateError);
          setNewsError('管理者権限の設定に失敗しました。');
        } else {
          console.log('User updated to admin successfully');
          setNewsSuccess('管理者権限を設定しました。ページを手動でリロードしてください。');
          setTimeout(() => setNewsSuccess(''), 5000);
        }
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      setNewsError('ユーザープロファイルの確認に失敗しました。');
    }
  };

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNewsList(data || []);
      setNewsError('');
    } catch (error) {
      console.error('Error fetching news:', error);
      setNewsError('新着情報の取得に失敗しました。');
    }
  };

  // 新着情報の追加・更新
  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!newsFormData.title.trim()) {
      setNewsError('タイトルを入力してください。');
      return;
    }
    if (!newsFormData.content.trim()) {
      setNewsError('内容を入力してください。');
      return;
    }

    // ユーザー認証チェック
    if (!user) {
      setNewsError('ユーザーが認証されていません。ログインしてください。');
      return;
    }

    try {
      setIsUpdatingNews(true);
      setNewsError('');
      setNewsSuccess('');

      // デバッグ: 現在のユーザー情報とプロファイルを再確認
      console.log('=== 保存開始 ===');
      console.log('Current user:', user);
      
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('Current profile:', currentProfile);
      console.log('Profile error:', profileError);

      const insertData = {
        title: newsFormData.title,
        content: newsFormData.content,
        category: newsFormData.category,
        is_important: newsFormData.is_important,
        created_by: user?.id
      };

      console.log('Insert data:', insertData);

      if (selectedNews) {
        // 更新
        const { error } = await supabase
          .from('news_announcements')
          .update({
            title: newsFormData.title,
            content: newsFormData.content,
            category: newsFormData.category,
            is_important: newsFormData.is_important,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNews.id);

        if (error) throw error;
        setNewsSuccess('新着情報を更新しました。');
      } else {
        // 新規追加
        console.log('Attempting to insert new announcement...');
        const { data: insertResult, error } = await supabase
          .from('news_announcements')
          .insert([insertData])
          .select();

        console.log('Insert result:', insertResult);
        if (error) {
          console.error('Insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        setNewsSuccess('新着情報を追加しました。');
      }

      // フォームリセット
      setNewsFormData({
        title: '',
        content: '',
        category: 'news',
        is_important: false,
        image_url: '',
        link_url: ''
      });
      setSelectedNews(null);
      setShowNewsModal(false);
      
      // 新着情報一覧を更新
      await fetchNews();

      // 3秒後に成功メッセージを消去
      setTimeout(() => {
        setNewsSuccess('');
      }, 3000);

    } catch (error) {
      console.error('=== エラー詳細 ===');
      console.error('Error saving news:', error);
      
      let errorMessage = '新着情報の保存に失敗しました。';
      
      if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
          errorMessage += ` エラー詳細: ${error.message}`;
        }
        if ('details' in error && typeof error.details === 'string') {
          errorMessage += ` 詳細: ${error.details}`;
        }
        if ('hint' in error && typeof error.hint === 'string') {
          errorMessage += ` ヒント: ${error.hint}`;
        }
        if ('code' in error) {
          errorMessage += ` コード: ${error.code}`;
        }
      }
      
      setNewsError(errorMessage);
    } finally {
      setIsUpdatingNews(false);
    }
  };

  // 新着情報の削除
  const handleDeleteNews = async (id: string) => {
    if (!confirm('この新着情報を削除してもよろしいですか？')) return;

    try {
      setIsUpdatingNews(true);
      setNewsError('');

      const { error } = await supabase
        .from('news_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNewsSuccess('新着情報を削除しました。');
      await fetchNews();

      // 3秒後に成功メッセージを消去
      setTimeout(() => {
        setNewsSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error deleting news:', error);
      setNewsError('新着情報の削除に失敗しました。');
    } finally {
      setIsUpdatingNews(false);
    }
  };

  // 新着情報の編集準備
  const handleEditNews = (news: NewsAnnouncement) => {
    setSelectedNews(news);
    setNewsFormData({
      title: news.title,
      content: news.content,
      category: news.category,
      is_important: news.is_important || false,
      image_url: '',
      link_url: ''
    });
    setShowNewsModal(true);
  };

  // カテゴリーラベルとカラーの取得
  const getCategoryLabel = (category: string) => {
    const labels = {
      news: 'お知らせ',
      announcement: '重要なお知らせ',
      sale: 'セール情報'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      news: 'bg-blue-100 text-blue-800',
      announcement: 'bg-red-100 text-red-800',
      sale: 'bg-green-100 text-green-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'news':
        return <FileText className="w-4 h-4" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4" />;
      case 'sale':
        return <Tag className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Bell className="w-5 h-5 text-blue-600 mr-2" />
            新着情報管理
          </h2>
          <Button
            onClick={() => {
              setSelectedNews(null);
              setNewsFormData({
                title: '',
                content: '',
                category: 'news',
                is_important: false,
                image_url: '',
                link_url: ''
              });
              setShowNewsModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新着情報を追加
          </Button>
        </div>

        {/* エラー・成功メッセージ */}
        {newsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-red-800">{newsError}</p>
          </div>
        )}
        
        {newsSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-green-800">{newsSuccess}</p>
          </div>
        )}

        {/* 新着情報一覧 */}
        <div className="space-y-4">
          {newsList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              新着情報がありません
            </div>
          ) : (
            newsList.map(news => (
              <div key={news.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getCategoryColor(news.category)}`}>
                        {getCategoryIcon(news.category)}
                        <span>{getCategoryLabel(news.category)}</span>
                      </span>
                      {news.is_important && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          重要
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg mb-2">{news.title}</h3>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">{news.content}</p>
                    <div className="text-xs text-gray-500">
                      作成日: {new Date(news.created_at).toLocaleString('ja-JP')}
                      {news.updated_at !== news.created_at && (
                        <span> / 更新日: {new Date(news.updated_at).toLocaleString('ja-JP')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditNews(news)}
                      disabled={isUpdatingNews}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteNews(news.id)}
                      disabled={isUpdatingNews}
                    >
                      <X className="w-4 h-4 mr-1" />
                      削除
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 新着情報追加・編集モーダル */}
      {showNewsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {selectedNews ? '新着情報を編集' : '新着情報を追加'}
                </h2>
                <button
                  onClick={() => setShowNewsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isUpdatingNews}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleNewsSubmit}>
                <div className="space-y-4">
                  <Input
                    label="タイトル *"
                    value={newsFormData.title}
                    onChange={(e) => setNewsFormData({ ...newsFormData, title: e.target.value })}
                    required
                    disabled={isUpdatingNews}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      内容 *
                    </label>
                    <textarea
                      value={newsFormData.content}
                      onChange={(e) => setNewsFormData({ ...newsFormData, content: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                      required
                      disabled={isUpdatingNews}
                    />
                  </div>
                  
                  <Select
                    label="カテゴリー *"
                    options={[
                      { value: 'news', label: 'お知らせ' },
                      { value: 'announcement', label: '重要なお知らせ' },
                      { value: 'sale', label: 'セール情報' }
                    ]}
                    value={newsFormData.category}
                    onChange={(e) => setNewsFormData({ ...newsFormData, category: e.target.value as 'news' | 'announcement' | 'sale' })}
                    required
                    disabled={isUpdatingNews}
                  />
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_important"
                      checked={newsFormData.is_important}
                      onChange={(e) => setNewsFormData({ ...newsFormData, is_important: e.target.checked })}
                      className="rounded text-blue-600"
                      disabled={isUpdatingNews}
                    />
                    <label htmlFor="is_important" className="text-sm text-gray-700">
                      重要なお知らせとして表示する
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowNewsModal(false)}
                    disabled={isUpdatingNews}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isUpdatingNews}
                  >
                    {selectedNews ? '更新する' : '追加する'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 