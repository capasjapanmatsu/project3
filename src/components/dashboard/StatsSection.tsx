import React from 'react';
import { BarChart3, TrendingUp, Calendar, MapPin, PawPrint, Users, Building, Star, Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import Card from '../Card';
import type { Dog, DogPark, Reservation } from '../../types';

interface SimpleStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}

const SimpleStatCard: React.FC<SimpleStatCardProps> = ({ icon, label, value, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const trendIcon = {
    up: <ArrowUp className="w-4 h-4 text-green-500" />,
    down: <ArrowDown className="w-4 h-4 text-red-500" />,
    neutral: <Minus className="w-4 h-4 text-gray-500" />,
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        <div className="flex items-center space-x-1">
          {trendIcon[trend]}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </Card>
  );
};

interface StatsSectionProps {
  dogs: Dog[];
  ownedParks: DogPark[];
  recentReservations: Reservation[];
  profile: any;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  dogs,
  ownedParks,
  recentReservations,
  profile,
}) => {
  const getDogsVaccineStats = () => {
    const approved = dogs.filter(dog => 
      dog.vaccine_certifications?.some(cert => cert.status === 'approved')
    ).length;
    const pending = dogs.filter(dog => 
      dog.vaccine_certifications?.some(cert => cert.status === 'pending')
    ).length;
    const total = dogs.length;
    
    return { approved, pending, total };
  };

  const getParksStats = () => {
    const approved = ownedParks.filter(park => park.status === 'approved').length;
    const pending = ownedParks.filter(park => park.status === 'pending').length;
    const total = ownedParks.length;
    
    return { approved, pending, total };
  };

  const getReservationStats = () => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const monthlyReservations = recentReservations.filter(reservation => 
      new Date(reservation.created_at) >= thisMonth
    ).length;
    
    const totalReservations = recentReservations.length;
    
    return { monthly: monthlyReservations, total: totalReservations };
  };

  const vaccineStats = getDogsVaccineStats();
  const parksStats = getParksStats();
  const reservationStats = getReservationStats();

  return (
    <div className="space-y-6">
      {/* メイン統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SimpleStatCard
          icon={<PawPrint className="w-6 h-6" />}
          label="登録済みの愛犬"
          value={dogs.length}
          color="blue"
          trend={dogs.length > 0 ? 'up' : 'neutral'}
        />
        
        <SimpleStatCard
          icon={<Calendar className="w-6 h-6" />}
          label="今月の予約"
          value={reservationStats.monthly}
          color="green"
          trend={reservationStats.monthly > 0 ? 'up' : 'neutral'}
        />
        
        <SimpleStatCard
          icon={<Building className="w-6 h-6" />}
          label="所有施設"
          value={ownedParks.length}
          color="purple"
          trend={ownedParks.length > 0 ? 'up' : 'neutral'}
        />
        
        <SimpleStatCard
          icon={<Activity className="w-6 h-6" />}
          label="総予約数"
          value={reservationStats.total}
          color="orange"
          trend={reservationStats.total > 0 ? 'up' : 'neutral'}
        />
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ワクチン証明書統計 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              ワクチン証明書の状況
            </h3>
            <div className="text-sm text-gray-500">
              {vaccineStats.total}頭中
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">承認済み</span>
              </div>
              <span className="text-sm font-medium text-green-600">
                {vaccineStats.approved}頭
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">審査中</span>
              </div>
              <span className="text-sm font-medium text-yellow-600">
                {vaccineStats.pending}頭
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="text-sm">未登録</span>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {vaccineStats.total - vaccineStats.approved - vaccineStats.pending}頭
              </span>
            </div>
          </div>
          
          {vaccineStats.total > 0 && (
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(vaccineStats.approved / vaccineStats.total) * 100}%` }}
              />
            </div>
          )}
        </Card>

        {/* 施設管理統計 */}
        {profile?.user_type === 'owner' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                施設管理状況
              </h3>
              <div className="text-sm text-gray-500">
                {parksStats.total}施設
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">運営中</span>
                </div>
                <span className="text-sm font-medium text-green-600">
                  {parksStats.approved}施設
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">審査中</span>
                </div>
                <span className="text-sm font-medium text-yellow-600">
                  {parksStats.pending}施設
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-sm">その他</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {parksStats.total - parksStats.approved - parksStats.pending}施設
                </span>
              </div>
            </div>
            
            {parksStats.total > 0 && (
              <div className="mt-4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(parksStats.approved / parksStats.total) * 100}%` }}
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default StatsSection; 