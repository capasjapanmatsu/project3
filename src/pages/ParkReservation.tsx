import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { X, Building } from 'lucide-react';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useStripe } from '../hooks/useStripe';
import { products } from '../stripe-config';
import { ReservationForm } from '../components/reservation/ReservationForm';
import { ReservationSidebar } from '../components/reservation/ReservationSidebar';
import type { Dog, DogPark, Reservation } from '../types';

interface TimeSlot {
  time: string;
  available: boolean;
  reservationCount: number;
  maxCapacity: number;
  isPrivateBoothAvailable: boolean;
  isWholeFacilityAvailable: boolean;
}

export function ParkReservation() {
  const { parkId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isActive: hasSubscription } = useSubscription();
  const { createCheckoutSession, loading: checkoutLoading } = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [park, setPark] = useState<DogPark | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDogs, setSelectedDogs] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: '',
    selectedTimeSlot: '',
    duration: '1',
    reservationType: 'whole_facility', // 施設貸し切りのみ
    paymentType: 'single', // 'single', 'subscription', 'facility_rental'
  });
  const [isDateTooSoon, setIsDateTooSoon] = useState(false);

  const MAX_DOGS = 3; // 最大3頭まで選択可能

  // 営業時間の設定（6:00 - 22:00）
  const generateTimeSlots = () => {
    const slots: TimeSlot[] = [];
    for (let hour = 6; hour <= 21; hour++) { // 21時開始まで（22時終了のため）
      const time = `${hour.toString().padStart(2, '0')}:00`;
      slots.push({
        time,
        available: true,
        reservationCount: 0,
        maxCapacity: park?.max_capacity || 10,
        isPrivateBoothAvailable: true,
        isWholeFacilityAvailable: true,
      });
    }
    return slots;
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    async function fetchData() {
      if (!user) return;
      
      try {
        const [dogsResponse, parkResponse] = await Promise.all([
          supabase
            .from('dogs')
            .select(`
              *,
              vaccine_certifications!inner(*)
            `)
            .eq('owner_id', user.id)
            .eq('vaccine_certifications.status', 'approved'),
          supabase
            .from('dog_parks')
            .select('*')
            .eq('id', parkId)
            .single()
        ]);

        if (dogsResponse.error) throw dogsResponse.error;
        if (parkResponse.error) throw parkResponse.error;

        setDogs(dogsResponse.data || []);
        setPark(parkResponse.data);
        
        // サブスクリプションがある場合はデフォルトでサブスクを選択
        if (hasSubscription) {
          setFormData(prev => ({ ...prev, paymentType: 'subscription' }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, [user, parkId, hasSubscription, navigate]);

  // 日付が変更されたときに予約状況を取得
  useEffect(() => {
    if (formData.date && park) {
      fetchReservationsForDate();
    }
  }, [formData.date, park]);

  // 選択された日付が予約可能かチェック（2日前までの予約が必要）
  useEffect(() => {
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // 2日後の日付
      const twoDaysLater = new Date(today);
      twoDaysLater.setDate(today.getDate() + 2);
      // 施設貸し切りのみ2日前までの予約制限
      const isTooSoon = formData.paymentType === 'facility_rental' && selectedDate < twoDaysLater;
      setIsDateTooSoon(isTooSoon);
      if (isTooSoon) {
        setError('施設貸し切りは2日前までの予約が必要です。');
      } else {
        setError('');
      }
    }
  }, [formData.date, formData.paymentType]);

  const fetchReservationsForDate = async () => {
    if (!formData.date || !park) return;

    try {
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('park_id', parkId)
        .eq('date', formData.date)
        .eq('status', 'confirmed');

      if (error) throw error;

      setExistingReservations(reservations || []);
      updateTimeSlotAvailability(reservations || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  const updateTimeSlotAvailability = (reservations: Reservation[]) => {
    const slots = generateTimeSlots();
    
    // 各時間スロットの予約状況を計算
    slots.forEach(slot => {
      const slotHour = parseInt(slot.time.split(':')[0]);
      let regularReservationCount = 0;
      let privateBoothReservations = 0;
      let wholeFacilityReservations = 0;

      reservations.forEach(reservation => {
        const startHour = parseInt(reservation.start_time.split(':')[0]);
        const endHour = startHour + reservation.duration;
        
        // この時間スロットに重複する予約があるかチェック
        if (slotHour >= startHour && slotHour < endHour) {
          // 予約タイプに応じて分類
          if (reservation.reservation_type === 'whole_facility' || reservation.total_amount >= 4400) {
            wholeFacilityReservations++;
          } else if (reservation.reservation_type === 'private_booth' || reservation.total_amount === 5000) {
            privateBoothReservations++;
          } else {
            regularReservationCount++;
          }
        }
      });

      slot.reservationCount = regularReservationCount;
      slot.available = regularReservationCount < slot.maxCapacity && wholeFacilityReservations === 0;
      
      // プライベートブースの空き状況
      slot.isPrivateBoothAvailable = privateBoothReservations < (park?.private_booth_count || 0) && wholeFacilityReservations === 0;
      
      // 全館貸し切りの空き状況（他の予約が一切ない場合のみ可能）
      slot.isWholeFacilityAvailable = regularReservationCount === 0 && privateBoothReservations === 0 && wholeFacilityReservations === 0;
    });

    setTimeSlots(slots);
  };

  const getSlotStatus = (slot: TimeSlot) => {
    if (!slot.isWholeFacilityAvailable) {
      return { 
        label: '利用不可', 
        color: 'bg-red-500 text-white cursor-not-allowed',
        icon: X 
      };
    } else {
      return { 
        label: '施設貸し切り可能', 
        color: 'bg-orange-500 text-white hover:bg-orange-600',
        icon: Building 
      };
    }
  };

  // 犬選択の処理
  const handleDogSelection = (dogId: string) => {
    setSelectedDogs(prev => {
      if (prev.includes(dogId)) {
        // 既に選択されている場合は削除
        return prev.filter(id => id !== dogId);
      } else {
        // 新しく選択する場合
        if (prev.length >= MAX_DOGS) {
          setError(`最大${MAX_DOGS}頭まで選択可能です。`);
          return prev;
        }
        setError(''); // エラーをクリア
        return [...prev, dogId];
      }
    });
  };

  // 時間スロット選択時の処理
  const handleTimeSlotSelect = (time: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTimeSlot: time,
      duration: '1' // 施設貸し切りは1時間単位
    }));
  };

  // 料金計算（施設貸し切り）
  const calculateFacilityPrice = () => {
    const hours = parseInt(formData.duration);
    const basePrice = 4400; // 1時間あたり4400円
    
    if (hasSubscription) {
      // サブスク会員は20%OFF
      const totalPrice = basePrice * hours;
      const discountedPrice = Math.round(totalPrice * 0.8); // 20%OFF
      return discountedPrice;
    }
    return basePrice * hours; // 通常価格
  };

  // 1日券の料金計算（段階的料金制）
  const calculateDayPassPrice = () => {
    const dogCount = selectedDogs.length;
    if (dogCount === 0) return 0;
    
    // 段階的料金: 1頭目800円 + 2頭目以降400円ずつ（半額）
    if (dogCount === 1) {
      return 800;
    } else {
      return 800 + (dogCount - 1) * 400;
    }
  };

  // 総料金計算
  const calculateTotalPrice = () => {
    if (formData.paymentType === 'subscription') {
      return hasSubscription ? 0 : 3800; // 既存会員は追加料金なし、新規は月額料金
    } else if (formData.paymentType === 'facility_rental') {
      return calculateFacilityPrice();
    } else {
      return calculateDayPassPrice();
    }
  };

  const getSelectedDogNames = () => {
    return selectedDogs.map(dogId => {
      const dog = dogs.find(d => d.id === dogId);
      return dog?.name || '';
    }).filter(name => name).join('、');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !park) return;
    setIsLoading(true);
    setError('');
    try {
      if (formData.paymentType === 'facility_rental' && !formData.selectedTimeSlot) {
        setError('施設貸し切りの場合は時間を選択してください。');
        setIsLoading(false);
        return;
      }
      if (selectedDogs.length === 0) {
        setError('ワンちゃんを1頭以上選択してください。');
        setIsLoading(false);
        return;
      }
      // 施設貸し切りの場合の時間スロット確認
      if (formData.paymentType === 'facility_rental') {
        const selectedSlot = timeSlots.find(slot => slot.time === formData.selectedTimeSlot);
        if (!selectedSlot || !selectedSlot.isWholeFacilityAvailable) {
          setError('選択された時間は施設貸し切りできません。他の予約が入っています。');
          setIsLoading(false);
          return;
        }
        // 2日前までの予約が必要
        const selectedDate = new Date(formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const twoDaysLater = new Date(today);
        twoDaysLater.setDate(today.getDate() + 2);
        if (selectedDate < twoDaysLater) {
          setError('施設貸し切りは2日前までの予約が必要です。');
          setIsLoading(false);
          return;
        }
      }
      // 全ての選択された犬のワクチン接種証明書を確認
      for (const dogId of selectedDogs) {
        const { data: certData, error: certError } = await supabase
          .from('vaccine_certifications')
          .select('status')
          .eq('dog_id', dogId)
          .eq('status', 'approved')
          .single();

        if (certError || !certData) {
          const dog = dogs.find(d => d.id === dogId);
          setError(`${dog?.name}のワクチン接種証明書が承認されていません。`);
          setIsLoading(false);
          return;
        }
      }

      // 予約データを準備
      const reservationData = {
        parkId,
        parkName: park.name,
        selectedDogs,
        dogNames: getSelectedDogNames(),
        date: formData.date,
        selectedTimeSlot: formData.selectedTimeSlot,
        duration: parseInt(formData.duration),
        paymentType: formData.paymentType,
        totalPrice: calculateTotalPrice(),
        reservationType: formData.paymentType === 'facility_rental' ? 'whole_facility' : 'regular'
      };

      // 注文番号を生成
      const orderNumber = `DP${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // 1日券の場合
      if (formData.paymentType === 'single') {
        const dayPassProduct = products.find(p => p.mode === 'payment');
        if (!dayPassProduct) {
          setError('1日券商品が見つかりません。');
          setIsLoading(false);
          return;
        }

        await createCheckoutSession({
          priceId: dayPassProduct.priceId,
          mode: 'payment',
          successUrl: `${window.location.origin}/payment-confirmation?success=true&order_number=${orderNumber}`,
          cancelUrl: `${window.location.origin}/parks/${parkId}/reserve`,
          customParams: {
            reservation_data: JSON.stringify(reservationData),
            order_number: orderNumber
          }
        });
        return;
      }

      // サブスクリプション未加入でサブスク支払いを選択した場合、Stripeチェックアウトに進む
      if (formData.paymentType === 'subscription' && !hasSubscription) {
        const subscriptionProduct = products.find(p => p.mode === 'subscription');
        if (!subscriptionProduct) {
          setError('サブスクリプション商品が見つかりません。');
          setIsLoading(false);
          return;
        }

        await createCheckoutSession({
          priceId: subscriptionProduct.priceId,
          mode: 'subscription',
          successUrl: `${window.location.origin}/access-control`,
          cancelUrl: `${window.location.origin}/parks/${parkId}/reserve`,
        });
        return;
      }

      // サブスクリプション加入済みの場合はQRコード発行画面に直接進む
      if (formData.paymentType === 'subscription' && hasSubscription) {
        navigate('/access-control');
        return;
      }

      // 施設貸し切りの場合
      if (formData.paymentType === 'facility_rental') {
        await createCheckoutSession({
          priceId: 'price_placeholder', // 実際には使用されない
          mode: 'payment',
          successUrl: `${window.location.origin}/payment-confirmation?success=true&order_number=${orderNumber}`,
          cancelUrl: `${window.location.origin}/parks/${parkId}/reserve`,
          customAmount: calculateFacilityPrice(),
          customName: `${park.name} 施設貸し切り ${formData.date} ${formData.selectedTimeSlot}〜${parseInt(formData.selectedTimeSlot) + parseInt(formData.duration)}:00`,
          customParams: {
            reservation_data: JSON.stringify(reservationData),
            order_number: orderNumber
          }
        });
        return;
      }

      // 決済ページに遷移（データをstateで渡す）
      navigate('/checkout', { state: { reservationData } });

    } catch (err) {
      console.error('Error processing reservation:', err);
      setError('予約データの準備に失敗しました。もう一度お試しください。');
      setIsLoading(false);
    }
  };

  const getEndTime = (startTime: string, duration: string) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = startHour + parseInt(duration);
    return `${endHour.toString().padStart(2, '0')}:00`;
  };

  if (!park) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-8">
        <h2 className="text-xl font-semibold mb-4">ワクチン接種証明書が必要です</h2>
        <p className="text-gray-600 mb-4">
          ドッグランを利用するには、ワクチン接種証明書の承認が必要です。
          まだ証明書を提出していない場合は、ワンちゃんの登録時に提出してください。
        </p>
        <Button onClick={() => navigate('/register-dog')}>
          ワンちゃんを登録する
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">{park.name}の予約</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 予約フォーム */}
        <div className="lg:col-span-2">
          <ReservationForm 
            park={park}
            error={error}
            formData={formData}
            setFormData={setFormData}
            timeSlots={timeSlots}
            isDateTooSoon={isDateTooSoon}
            selectedDogs={selectedDogs}
            dogs={dogs}
            handleDogSelection={handleDogSelection}
            handleTimeSlotSelect={handleTimeSlotSelect}
            getEndTime={getEndTime}
            getSlotStatus={getSlotStatus}
            getSelectedDogNames={getSelectedDogNames}
            calculateDayPassPrice={calculateDayPassPrice}
            calculateTotalPrice={calculateTotalPrice}
            hasSubscription={hasSubscription}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            checkoutLoading={checkoutLoading}
            MAX_DOGS={MAX_DOGS}
          />
        </div>

        {/* サイドバー情報 */}
        <ReservationSidebar 
          hasSubscription={hasSubscription}
          calculateDayPassPrice={calculateDayPassPrice}
        />
      </div>
    </div>
  );
}