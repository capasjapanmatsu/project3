import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import Card from '../Card';

interface RentalInfo {
  date: string;
  slots: {
    start: string;
    end: string;
  }[];
}

interface ParkRentalInfoProps {
  rentalInfo: RentalInfo[];
}

export function ParkRentalInfo({ rentalInfo }: ParkRentalInfoProps) {
  return (
    <Card className="p-6 bg-orange-50 border-orange-200">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
        <div>
          <h2 className="text-xl font-semibold text-orange-900 mb-3">施設貸し切り予約あり</h2>
          <p className="text-sm text-orange-800 mb-4">
            以下の日時は施設貸し切りのため、通常利用（1Dayパス・サブスク）での入場はできません。
          </p>
          <div className="space-y-4">
            {rentalInfo.map((rental, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-orange-900">
                    {new Date(rental.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                  </span>
                </div>
                <div className="space-y-1">
                  {rental.slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center text-sm text-orange-800">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{slot.start} 〜 {slot.end}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
