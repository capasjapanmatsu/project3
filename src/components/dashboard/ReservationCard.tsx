import { Link } from 'react-router-dom';
import { MapPin, Clock, PawPrint, Building, Calendar } from 'lucide-react';
import Button from '../Button';
import { getStatusBadge } from './ParkCard';
import { getDogHonorific } from './DogCard';
import type { Reservation } from '../../types';

interface ReservationCardProps {
  reservation: Reservation;
}

export function ReservationCard({ reservation }: ReservationCardProps) {
  const reservationDate = new Date(reservation.date);
  const formattedDate = reservationDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  const startTime = reservation.start_time;
  const endTime = `${parseInt(startTime) + reservation.duration}:00`;
  
  const reservationType = 
    reservation.reservation_type === 'regular' ? '通常利用' : 
    reservation.reservation_type === 'private_booth' ? 'プライベートブース' : 
    '施設貸し切り';
  
  const dogHonorific = reservation.dog ? getDogHonorific(reservation.dog.gender) : 'ちゃん';
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{reservation.dog_park?.name}</h3>
          <p className="text-sm text-gray-600">{reservation.dog_park?.address}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <span>日付: {new Date(reservation.date).toLocaleDateString('ja-JP')}</span>
            <span>時間: {reservation.start_time}</span>
            <span>ワンちゃん: {reservation.dog?.name}{dogHonorific}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(reservation.status)}
          <span className="text-sm font-medium">¥{reservation.total_amount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export function getMonthName(month: number) {
  const months = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  return months[month - 1];
}