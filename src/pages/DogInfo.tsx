import React from 'react';
import { Link } from 'react-router-dom';

const articles = [
  {
    title: 'ワンちゃんが食べてはいけない食べ物',
    image: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&w=300',
    path: '/dog-info/foods',
  },
  {
    title: '狂犬病予防や混合ワクチンの重要性',
    image: 'https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?auto=compress&w=300',
    path: '/dog-info/vaccine',
  },
  {
    title: '犬種ごとにかかりやすい主な病気',
    image: 'https://images.pexels.com/photos/1108098/pexels-photo-1108098.jpeg?auto=compress&w=300',
    path: '/dog-info/breeds',
  },
  {
    title: 'フィラリア・ダニ・ノミなど寄生虫の危険性',
    image: 'https://images.pexels.com/photos/458799/pexels-photo-458799.jpeg?auto=compress&w=300',
    path: '/dog-info/parasite',
  },
  {
    title: 'ワンちゃん用おやつやおもちゃの重要性',
    image: 'https://images.pexels.com/photos/1108097/pexels-photo-1108097.jpeg?auto=compress&w=300',
    path: '/dog-info/snack',
  },
  {
    title: 'ドッグショーについて',
    image: 'https://images.pexels.com/photos/458804/pexels-photo-458804.jpeg?auto=compress&w=300',
    path: '/dog-info/show',
  },
];

export default function DogInfo() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">ワンちゃんについての情報発信</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Link to={article.path} key={article.title} className="block group">
            <div className="bg-white rounded-xl shadow hover:shadow-lg transition p-4 flex flex-col items-center cursor-pointer h-full">
              <img src={article.image} alt={article.title} className="w-28 h-28 object-cover rounded-full mb-3 border-4 border-yellow-100 group-hover:border-yellow-400 transition" />
              <h2 className="text-base font-semibold text-center mb-1 group-hover:text-yellow-700 transition">{article.title}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 