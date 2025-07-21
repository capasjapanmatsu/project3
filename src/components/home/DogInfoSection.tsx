import { Bone, Bug, Heart, Shield, Stethoscope, Trophy } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

const articles = [
  {
    title: 'ワンちゃんが食べてはいけない食べ物',
    icon: <Heart className="w-8 h-8 text-red-500" />,
    image: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&w=300',
    path: '/dog-info/foods',
    description: '愛犬の健康のために避けるべき食材について'
  },
  {
    title: '狂犬病予防や混合ワクチンの重要性',
    icon: <Shield className="w-8 h-8 text-blue-500" />,
    image: 'https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?auto=compress&w=300',
    path: '/dog-info/vaccine',
    description: '必要なワクチン接種で愛犬を病気から守ろう'
  },
  {
    title: '犬種ごとにかかりやすい主な病気',
    icon: <Stethoscope className="w-8 h-8 text-green-500" />,
    image: 'https://images.pexels.com/photos/1108098/pexels-photo-1108098.jpeg?auto=compress&w=300',
    path: '/dog-info/breeds',
    description: '犬種特有の健康リスクと予防法について'
  },
  {
    title: 'フィラリア・ダニ・ノミなど寄生虫の危険性',
    icon: <Bug className="w-8 h-8 text-orange-500" />,
    image: 'https://images.pexels.com/photos/458799/pexels-photo-458799.jpeg?auto=compress&w=300',
    path: '/dog-info/parasite',
    description: '寄生虫から愛犬を守るための予防対策'
  },
  {
    title: 'ワンちゃん用おやつやおもちゃの重要性',
    icon: <Bone className="w-8 h-8 text-purple-500" />,
    image: 'https://images.pexels.com/photos/1108097/pexels-photo-1108097.jpeg?auto=compress&w=300',
    path: '/dog-info/snack',
    description: '健康的なおやつと適切なおもちゃの選び方'
  },
  {
    title: 'ドッグショーについて',
    icon: <Trophy className="w-8 h-8 text-yellow-500" />,
    image: 'https://images.pexels.com/photos/458804/pexels-photo-458804.jpeg?auto=compress&w=300',
    path: '/dog-info/show',
    description: 'ドッグショーの世界と参加のための準備'
  },
];

export const DogInfoSection: React.FC = () => {
  return (
    <section className="bg-yellow-50 p-6 rounded-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center">
          <Heart className="w-6 h-6 text-red-500 mr-2" />
          ワンちゃんについての情報発信
        </h2>
        <p className="text-gray-600 mt-2">
          愛犬の健康と安全のための重要な情報をお届けします
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article, index) => (
          <Link 
            to={article.path} 
            key={article.title} 
            className="block group hover:transform hover:scale-105 transition-transform"
          >
            <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow p-4 h-full">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 group-hover:scale-110 transition-transform">
                  {article.icon}
                </div>
                <img 
                  src={article.image} 
                  alt={article.title} 
                  className="w-20 h-20 object-cover rounded-full mb-3 border-4 border-yellow-100 group-hover:border-yellow-400 transition-colors"
                />
                <h3 className="text-sm font-semibold text-gray-900 mb-2 group-hover:text-yellow-700 transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {article.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="text-center mt-6">
        <Link 
          to="/dog-info" 
          className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
        >
          すべての情報を見る
        </Link>
      </div>
    </section>
  );
}; 