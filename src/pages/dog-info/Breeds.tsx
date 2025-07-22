import { ArrowLeft, Heart, Search, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';

interface DogBreed {
  id: string;
  name: string;
  japaneseName: string;
  category: 'small' | 'medium' | 'large' | 'giant';
  size: string;
  weight: string;
  lifespan: string;
  temperament: string[];
  characteristics: string[];
  careLevel: 'easy' | 'medium' | 'hard';
  exerciseNeeds: 'low' | 'medium' | 'high';
  popularity: number;
  image: string;
  description: string;
}

const dogBreeds: DogBreed[] = [
  {
    id: 'chihuahua',
    name: 'Chihuahua',
    japaneseName: 'チワワ',
    category: 'small',
    size: '超小型',
    weight: '1.5-3kg',
    lifespan: '12-20年',
    temperament: ['勇敢', '忠実', '活発', '警戒心が強い'],
    characteristics: ['世界最小の犬種', '大きな耳', 'りんご型の頭', '短毛・長毛'],
    careLevel: 'easy',
    exerciseNeeds: 'low',
    popularity: 5,
    image: 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?auto=compress&w=300',
    description: '世界最小の犬種として知られるチワワは、勇敢で忠実な性格の持ち主です。小さな体に大きな心を持ち、家族を守ろうとする勇敢さがあります。'
  },
  {
    id: 'shiba',
    name: 'Shiba Inu',
    japaneseName: '柴犬',
    category: 'medium',
    size: '中型',
    weight: '8-10kg',
    lifespan: '12-15年',
    temperament: ['独立心が強い', '忠実', '警戒心が強い', '勇敢'],
    characteristics: ['日本原産', '巻き尾', '立ち耳', '赤毛・黒毛・胡麻毛'],
    careLevel: 'medium',
    exerciseNeeds: 'medium',
    popularity: 5,
    image: 'https://images.pexels.com/photos/1458916/pexels-photo-1458916.jpeg?auto=compress&w=300',
    description: '日本原産の柴犬は、独立心が強く忠実な性格です。古くから猟犬として活躍し、現在も家庭犬として人気があります。'
  },
  {
    id: 'golden',
    name: 'Golden Retriever',
    japaneseName: 'ゴールデンレトリバー',
    category: 'large',
    size: '大型',
    weight: '25-34kg',
    lifespan: '10-12年',
    temperament: ['温厚', '賢い', '家族思い', '子供好き'],
    characteristics: ['金色の被毛', '垂れ耳', '友好的', '訓練しやすい'],
    careLevel: 'medium',
    exerciseNeeds: 'high',
    popularity: 5,
    image: 'https://images.pexels.com/photos/1643457/pexels-photo-1643457.jpeg?auto=compress&w=300',
    description: '温厚で賢い性格のゴールデンレトリバーは、家族思いで子供との相性も抜群です。訓練しやすく、様々な場面で活躍します。'
  },
  {
    id: 'labrador',
    name: 'Labrador Retriever',
    japaneseName: 'ラブラドールレトリバー',
    category: 'large',
    size: '大型',
    weight: '25-36kg',
    lifespan: '10-12年',
    temperament: ['友好的', '活発', '賢い', '忠実'],
    characteristics: ['短毛', '垂れ耳', '水泳が得意', '嗅覚が優れている'],
    careLevel: 'medium',
    exerciseNeeds: 'high',
    popularity: 5,
    image: 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?auto=compress&w=300',
    description: '友好的で活発なラブラドールは、盲導犬や警察犬としても活躍する賢い犬種です。水泳が得意で、家族との時間を大切にします。'
  },
  {
    id: 'pomeranian',
    name: 'Pomeranian',
    japaneseName: 'ポメラニアン',
    category: 'small',
    size: '小型',
    weight: '1.5-3kg',
    lifespan: '12-16年',
    temperament: ['活発', '好奇心旺盛', '勇敢', '忠実'],
    characteristics: ['豊富な被毛', '小さな体', 'キツネのような顔', '巻き尾'],
    careLevel: 'medium',
    exerciseNeeds: 'low',
    popularity: 4,
    image: 'https://images.pexels.com/photos/1458916/pexels-photo-1458916.jpeg?auto=compress&w=300',
    description: '小さな体に大きな心を持つポメラニアンは、活発で好奇心旺盛な性格です。豊富な被毛が特徴で、おしゃれな犬種として人気があります。'
  },
  {
    id: 'corgi',
    name: 'Pembroke Welsh Corgi',
    japaneseName: 'コーギー',
    category: 'medium',
    size: '中型',
    weight: '10-14kg',
    lifespan: '12-14年',
    temperament: ['活発', '賢い', '忠実', '勇敢'],
    characteristics: ['短い足', '大きな耳', '断尾', '牧畜犬'],
    careLevel: 'medium',
    exerciseNeeds: 'medium',
    popularity: 4,
    image: 'https://images.pexels.com/photos/1643457/pexels-photo-1643457.jpeg?auto=compress&w=300',
    description: '短い足と大きな耳が特徴のコーギーは、活発で賢い性格です。元々は牧畜犬として活躍し、現在も家庭犬として人気があります。'
  }
];

export function Breeds() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCareLevel, setSelectedCareLevel] = useState<string>('all');

  const filteredBreeds = dogBreeds.filter(breed => {
    const matchesSearch = breed.japaneseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         breed.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || breed.category === selectedCategory;
    const matchesCareLevel = selectedCareLevel === 'all' || breed.careLevel === selectedCareLevel;
    
    return matchesSearch && matchesCategory && matchesCareLevel;
  });

  const getCareLevelText = (level: string) => {
    switch (level) {
      case 'easy': return '初心者向け';
      case 'medium': return '中級者向け';
      case 'hard': return '上級者向け';
      default: return '';
    }
  };

  const getExerciseNeedsText = (needs: string) => {
    switch (needs) {
      case 'low': return '少なめ';
      case 'medium': return '普通';
      case 'high': return '多め';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            トップページに戻る
          </Link>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <Heart className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">犬種図鑑</h1>
          </div>
          <p className="text-lg text-gray-600">
            人気の犬種から珍しい犬種まで、特徴や性格、飼育のポイントを詳しくご紹介します。あなたにぴったりの犬種を見つけましょう。
          </p>
        </div>

        {/* 検索・フィルター */}
        <Card className="p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">検索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="犬種名で検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">サイズ</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">すべて</option>
                <option value="small">小型犬</option>
                <option value="medium">中型犬</option>
                <option value="large">大型犬</option>
                <option value="giant">超大型犬</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">飼育難易度</label>
              <select
                value={selectedCareLevel}
                onChange={(e) => setSelectedCareLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">すべて</option>
                <option value="easy">初心者向け</option>
                <option value="medium">中級者向け</option>
                <option value="hard">上級者向け</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedCareLevel('all');
                }}
                variant="outline"
                className="w-full"
              >
                リセット
              </Button>
            </div>
          </div>
        </Card>

        {/* 犬種一覧 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBreeds.map((breed) => (
            <Card key={breed.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={breed.image}
                  alt={breed.japaneseName}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                  <div className="flex items-center">
                    {[...Array(breed.popularity)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{breed.japaneseName}</h3>
                  <span className="text-sm text-gray-500">{breed.name}</span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{breed.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-gray-500">サイズ</span>
                    <p className="text-sm font-medium">{breed.size}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">体重</span>
                    <p className="text-sm font-medium">{breed.weight}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">寿命</span>
                    <p className="text-sm font-medium">{breed.lifespan}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">運動量</span>
                    <p className="text-sm font-medium">{getExerciseNeedsText(breed.exerciseNeeds)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-xs text-gray-500">性格</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {breed.temperament.slice(0, 3).map((trait, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    breed.careLevel === 'easy' ? 'bg-green-100 text-green-800' :
                    breed.careLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getCareLevelText(breed.careLevel)}
                  </span>
                  <Button variant="outline" size="sm">
                    詳細を見る
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredBreeds.length === 0 && (
          <Card className="p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">該当する犬種が見つかりません</h3>
            <p className="text-gray-600">検索条件を変更してお試しください。</p>
          </Card>
        )}

        {/* ナビゲーション */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dog-info/care">
              <Button variant="outline" className="w-full sm:w-auto">
                ← お手入れ
              </Button>
            </Link>
            <Link to="/dog-info/health">
              <Button variant="outline" className="w-full sm:w-auto">
                健康管理 →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Breeds; 