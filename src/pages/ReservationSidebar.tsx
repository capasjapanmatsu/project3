import React, { useState, useEffect } from 'react';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import type { Dog } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

export function ReservationSidebar() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">ワンちゃんを選択</h3>
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <div className="space-y-2">
        {dogs.map((dog) => (
          <Button
            key={dog.id}
            variant={selectedDog?.id === dog.id ? 'primary' : 'secondary'}
            onClick={() => setSelectedDog(dog)}
            className="w-full justify-start"
          >
            {dog.name}
          </Button>
        ))}
      </div>
    </Card>
  );
} 