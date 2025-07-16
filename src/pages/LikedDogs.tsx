import { ArrowLeft, Calendar, Heart, Search, Star, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import type { Dog } from '../types';
import { supabase } from '../utils/supabase';

interface LikedDogData {
  id: string;
  dog_id: string;
  user_id: string;
  created_at: string;
  dog: Dog;
}

export function LikedDogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [likedDogs, setLikedDogs] = useState<LikedDogData[]>([]);
  const [filteredDogs, setFilteredDogs] = useState<LikedDogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBreed, setSelectedBreed] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'name' | 'breed'>('latest');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchLikedDogs();
  }, [user, navigate]);

  useEffect(() => {
    filterAndSortDogs();
  }, [likedDogs, searchTerm, selectedBreed, selectedGender, sortBy]);

  const fetchLikedDogs = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('dog_likes')
        .select(`
          *,
          dog:dogs (
            *,
            vaccine_certifications (*)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setLikedDogs(data || []);
    } catch (err) {
      console.error('Error fetching liked dogs:', err);
      setError('いいねしたワンちゃんの情報を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortDogs = () => {
    let filtered = [...likedDogs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.dog.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dog.breed.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Breed filter
    if (selectedBreed) {
      filtered = filtered.filter(item => item.dog.breed === selectedBreed);
    }

    // Gender filter
    if (selectedGender) {
      filtered = filtered.filter(item => item.dog.gender === selectedGender);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.dog.name.localeCompare(b.dog.name));
        break;
      case 'breed':
        filtered.sort((a, b) => a.dog.breed.localeCompare(b.dog.breed));
        break;
      case 'latest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredDogs(filtered);
  };

  const handleUnlike = async (dogId: string) => {
    try {
      const { error } = await supabase
        .from('dog_likes')
        .delete()
        .eq('dog_id', dogId)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      setLikedDogs(prev => prev.filter(item => item.dog_id !== dogId));
    } catch (err) {
      console.error('Error unliking dog:', err);
    }
  };

  const getUniqueBreeds = () => {
    const breeds = [...new Set(likedDogs.map(item => item.dog.breed))];
    return breeds.sort();
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}ヶ月`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}歳`;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO
        title="いいねしたワンちゃん | ドッグパーク"
        description="あなたがいいねしたワンちゃんの一覧です。お気に入りのワンちゃんを管理しましょう。"
        keywords="いいね, ワンちゃん, ペット, 犬, お気に入り"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            to="/dashboard"
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            マイページに戻る
          </Link>
        </div>
        
        <div className="flex items-center space-x-3 mb-2">
          <Heart className="w-8 h-8 text-pink-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            いいねしたワンちゃん
          </h1>
        </div>
        
        <p className="text-gray-600">
          あなたがいいねしたワンちゃんの一覧です（{likedDogs.length}匹）
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="名前・犬種で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Breed Filter */}
          <select
            value={selectedBreed}
            onChange={(e) => setSelectedBreed(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての犬種</option>
            {getUniqueBreeds().map(breed => (
              <option key={breed} value={breed}>{breed}</option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての性別</option>
            <option value="オス">オス</option>
            <option value="メス">メス</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'latest' | 'name' | 'breed')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="latest">いいねした順</option>
            <option value="name">名前順</option>
            <option value="breed">犬種順</option>
          </select>
        </div>
      </Card>

      {/* Dogs Grid */}
      {filteredDogs.length === 0 ? (
        <Card className="text-center py-16">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {likedDogs.length === 0 ? 'まだいいねしたワンちゃんはいません' : '検索条件に合うワンちゃんがいません'}
          </h2>
          <p className="text-gray-600 mb-6">
            {likedDogs.length === 0 
              ? '気になるワンちゃんがいたら、いいねしてみましょう！'
              : '別の検索条件を試してみてください。'
            }
          </p>
          <div className="space-x-4">
            <Link to="/community">
              <Button>
                コミュニティを見る
              </Button>
            </Link>
            {likedDogs.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBreed('');
                  setSelectedGender('');
                  setSortBy('latest');
                }}
              >
                フィルターをクリア
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDogs.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-200 overflow-hidden relative">
                {item.dog.image_url ? (
                  <img
                    src={item.dog.image_url}
                    alt={item.dog.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
                    🐕
                  </div>
                )}
                
                {/* Unlike button */}
                <button
                  onClick={() => handleUnlike(item.dog_id)}
                  className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full transition-opacity"
                  title="いいねを取り消す"
                >
                  <Heart className="w-4 h-4 text-pink-500 fill-current" />
                </button>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 truncate">
                    {item.dog.name}{item.dog.gender === 'オス' ? 'くん' : 'ちゃん'}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {item.dog.gender === 'オス' ? '♂' : '♀'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    <span>{item.dog.breed}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{calculateAge(item.dog.birth_date)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 mr-1 text-pink-500" />
                    <span>{new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Link
                    to={`/dog/${item.dog_id}`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full">
                      詳細を見る
                    </Button>
                  </Link>
                  
                  <Link
                    to={`/profile/${item.dog.owner_id}`}
                    title="飼い主のプロフィール"
                  >
                    <Button size="sm" variant="secondary">
                      <User className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Back to Top */}
      {filteredDogs.length > 8 && (
        <div className="mt-8 text-center">
          <Button
            variant="secondary"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ページトップに戻る
          </Button>
        </div>
      )}
    </div>
  );
} 