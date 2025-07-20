import React, { useState, useEffect } from 'react';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import type { Dog, DogPark } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

interface ReservationFormProps {
  park: DogPark;
  onReservationComplete: () => void;
}

export function ReservationForm({ park, onReservationComplete }: ReservationFormProps) {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserDogs();
    }
  }, [user]);

  const fetchUserDogs = async () => {
    try {
      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .eq('owner_id', user?.id);

      if (error) throw error;
      setDogs(data || []);
    } catch (error) {
      setError((error as Error).message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDog) {
      setError('ワンちゃんを選択してください');
      return;
    }

    if (!date || !startTime || !duration) {
      setError('日付、時間、利用時間を選択してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error } = await supabase
        .from('reservations')
        .insert([{
          park_id: park.id,
          user_id: user?.id,
          dog_id: selectedDog.id,
          date,
          start_time: startTime,
          duration: parseInt(duration),
          status: 'confirmed',
          total_amount: park.price * (parseInt(duration) / 60),
          access_code: Math.random().toString(36).substring(2, 8).toUpperCase()
        }]);

      if (error) throw error;

      onReservationComplete();
    } catch (error) {
      setError((error as Error).message || '予約に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">予約フォーム</h3>
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <select
            value={selectedDog?.id || ''}
            onChange={(e) => {
              const dog = dogs.find(d => d.id === e.target.value);
              setSelectedDog(dog || null);
            }}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">ワンちゃんを選択</option>
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Input
            type="date"
            label="日付"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            type="time"
            label="開始時間"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">利用時間を選択</option>
            <option value="30">30分</option>
            <option value="60">1時間</option>
            <option value="90">1時間30分</option>
            <option value="120">2時間</option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? '予約中...' : '予約する'}
        </Button>
      </form>
    </Card>
  );
} 
