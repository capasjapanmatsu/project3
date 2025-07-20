import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  AlertTriangle, 
  Building,
  MapPin,
  Clock,
  ExternalLink
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import type { NewParkOpening, DogPark } from '../types';

export function NewParkDetail() {
  const { parkId } = useParams<{ parkId: string }>();
  const navigate = useNavigate();
  const [parkOpening, setParkOpening] = useState<NewParkOpening | null>(null);
  const [parkDetails, setParkDetails] = useState<DogPark | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (parkId) {
      fetchParkDetail();
    }
  }, [parkId]);

  const fetchParkDetail = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('new_park_openings')
        .select('*')
        .eq('id', parkId)
        .single();
      
      if (error) throw error;
      
      setParkOpening(data);
      
      // 関連するドッグパーク情報を取得（もしあれば）
      if (data.park_id) {
        const { data: parkData, error: parkError } = await supabase
          .from('dog_parks')
          .select('*')
          .eq('id', data.park_id)
          .single();
        
        if (!parkError) {
          setParkDetails(parkData);
        }
      }
    } catch (error) {
      console.error('Error fetching park opening detail:', error);
      setError('新規オープン情報の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !parkOpening) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/news" className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            新着情報一覧に戻る
          </Link>
        </div>
        
        <Card className="p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-4">
            {error || '新規オープン情報が見つかりませんでした'}
          </h2>
          <Button onClick={() => navigate('/news')}>
            新着情報一覧に戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link to="/news" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          新着情報一覧に戻る
        </Link>
      </div>
      
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <Building className="w-4 h-4 mr-1" />
            新規オープン
          </span>
          <div className="flex items-center text-gray-500 text-sm ml-auto">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(parkOpening.created_at)}</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-6">{parkOpening.name}がオープンしました</h1>
        
        <div className="mb-6">
          <img 
            src={parkOpening.image_url} 
            alt={parkOpening.name} 
            className="w-full h-auto rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg';
            }}
          />
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">住所</h3>
              <p className="text-gray-700">{parkOpening.address}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">オープン日</h3>
              <p className="text-gray-700">{parkOpening.opening_date}</p>
            </div>
          </div>
          
          {parkDetails && (
            <>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">営業時間</h3>
                  <p className="text-gray-700">24時間営業</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Building className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">施設情報</h3>
                  <p className="text-gray-700">{parkDetails.description}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries({
                      parking: '駐車場',
                      shower: 'シャワー設備',
                      restroom: 'トイレ',
                      agility: 'アジリティ設備',
                      rest_area: '休憩スペース',
                      water_station: '給水設備',
                    }).map(([key, label]) => (
                      parkDetails.facilities[key as keyof typeof parkDetails.facilities] && (
                        <div key={key} className="flex items-center text-sm text-gray-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span>{label}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-8">
          <Link to="/news">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              新着情報一覧に戻る
            </Button>
          </Link>
          
          {parkOpening.park_id && (
            <Link to={`/parks/${parkOpening.park_id}`}>
              <Button>
                施設詳細を見る
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
