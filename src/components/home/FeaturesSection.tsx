import { Calendar, MapPin, ShoppingBag, Users } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

interface FeaturesSectionProps {
  isLoggedIn: boolean;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ isLoggedIn }) => {
  const features = [
    {
      icon: <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />,
      title: '簡単検索',
      description: 'お近くのドッグランを簡単に見つけることができます',
      linkTo: '/parks',
      color: 'text-blue-600'
    },
    {
      icon: <Users className="h-12 w-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />,
      title: 'コミュニティ',
      description: '愛犬家同士で交流を深めることができます',
      linkTo: isLoggedIn ? '/community' : '/login',
      color: 'text-purple-600'
    },
    {
      icon: <Calendar className="h-12 w-12 text-orange-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />,
      title: '予約管理',
      description: '施設の予約をオンラインで簡単に管理',
      linkTo: isLoggedIn ? '/dashboard' : '/login',
      color: 'text-orange-600'
    },
    {
      icon: <ShoppingBag className="h-12 w-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />,
      title: 'ペットショップ',
      description: 'ペット用品をワンタッチで簡単注文',
      linkTo: '/petshop',
      color: 'text-green-600'
    }
  ];

  return (
    <section className="grid md:grid-cols-4 gap-8 mt-12">
      {features.map((feature, index) => (
        <Link 
          key={index}
          to={feature.linkTo} 
          className="text-center p-6 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
        >
          {feature.icon}
          <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
          <p className="text-gray-600">
            {feature.description}
          </p>
        </Link>
      ))}
    </section>
  );
};

export default FeaturesSection; 
