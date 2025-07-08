import { MapPin, Building, Calculator, Crown, PawPrint, Info, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import type { DogPark, Dog } from '../../types';
import Input from '../Input';
import VaccineBadge, { getVaccineStatusFromDog } from '../VaccineBadge';

interface TimeSlot {
  time: string;
  isWholeFacilityAvailable: boolean;
}

interface SlotStatus {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ReservationFormProps {
  park: DogPark;
  error: string;
  formData: {
    date: string;
    selectedTimeSlot: string;
    duration: string;
    reservationType: string;
    paymentType: string;
  };
  setFormData: (data: {
    date: string;
    selectedTimeSlot: string;
    duration: string;
    reservationType: string;
    paymentType: string;
  }) => void;
  timeSlots: TimeSlot[];
  isDateTooSoon: boolean;
  selectedDogs: string[];
  dogs: Dog[];
  handleDogSelection: (dogId: string) => void;
  handleTimeSlotSelect: (time: string) => void;
  getEndTime: (startTime: string, duration: string) => string;
  getSlotStatus: (slot: TimeSlot) => SlotStatus;
  getSelectedDogNames: () => string;
  calculateDayPassPrice: () => number;
  calculateTotalPrice: () => number;
  hasSubscription: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  checkoutLoading: boolean;
  MAX_DOGS: number;
}

export function ReservationForm({
  park,
  error,
  formData,
  setFormData,
  timeSlots,
  isDateTooSoon,
  selectedDogs,
  dogs,
  handleDogSelection,
  handleTimeSlotSelect,
  getEndTime,
  getSlotStatus,
  getSelectedDogNames,
  calculateDayPassPrice,
  calculateTotalPrice,
  hasSubscription,
  handleSubmit,
  isLoading,
  checkoutLoading,
  MAX_DOGS
}: ReservationFormProps) {
  return (
    <Card>
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="w-5 h-5 text-gray-500" />
          <p className="text-gray-600">{park.address}</p>
        </div>
        <p className="text-gray-600 mb-4">{park.description}</p>
        
        {/* 料金体系の説明 */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">料金体系</h3>
          </div>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• 1日券: ¥800（24時間有効）</p>
            <p>• 2頭目以降: +¥400/頭（半額）</p>
            <p>• サブスク: 月額¥3,800（3頭まで使い放題）</p>
            <p>• 施設貸し切り: ¥4,400/時間（サブスク会員20%OFF）</p>
          </div>
        </div>
        
        {/* 施設貸し切りの注意事項 */}
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">施設貸し切りの注意事項</h3>
          </div>
          <div className="text-sm text-yellow-800 space-y-1">
            <p>• 施設貸し切りは1時間単位で予約可能です</p>
            <p>• <strong>2日前までの予約が必要です</strong>（当日・翌日の予約不可）</p>
            <p>• 貸し切り中は他のお客様は入場できません</p>
            <p>• 友達にPINコードを共有して一緒に利用できます</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        {/* ワンちゃん選択 */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700">
              入場するワンちゃんを選択（最大{MAX_DOGS}頭）
            </label>
            <div className="text-sm text-gray-600">
              {selectedDogs.length}/{MAX_DOGS}頭選択中
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dogs.map((dog) => {
              const isSelected = selectedDogs.includes(dog.id);
              const isDisabled = !isSelected && selectedDogs.length >= MAX_DOGS;
              
              return (
                <div
                  key={dog.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors relative ${
                    isSelected
                      ? 'border-green-500 bg-green-50'
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => !isDisabled && handleDogSelection(dog.id)}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {dog.image_url ? (
                        <img 
                          src={dog.image_url} 
                          alt={dog.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PawPrint className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{dog.name}ちゃん</h3>
                        <VaccineBadge 
                          status={getVaccineStatusFromDog(dog)} 
                          size="sm" 
                        />
                      </div>
                      <p className="text-sm text-gray-600">{dog.breed} • {dog.gender}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {selectedDogs.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-1">選択中のワンちゃん</h4>
              <p className="text-sm text-green-800">{getSelectedDogNames()}</p>
              <p className="text-xs text-green-700 mt-1">
                {selectedDogs.length}頭が同時入場できます
              </p>
            </div>
          )}
        </div>
        
        <Input
          label="日付"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value, selectedTimeSlot: '' })}
          min={new Date().toISOString().split('T')[0]}
          required
        />

        {/* 支払い方法（ラジオボタン形式） */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            支払い方法
          </label>
          <div className="space-y-4">
            {/* 1日券 - サブスク会員の場合は表示しない */}
            {!hasSubscription && (
              <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.paymentType === 'single'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  value="single"
                  checked={formData.paymentType === 'single'}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                  className="form-radio text-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">1日券（段階的料金制）</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    1頭目¥800 + 2頭目以降¥400/頭・24時間有効
                  </p>
                  {selectedDogs.length > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {selectedDogs.length}頭選択中: ¥{calculateDayPassPrice().toLocaleString()}
                    </p>
                  )}
                </div>
              </label>
            )}
            
            {/* サブスク */}
            <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              formData.paymentType === 'subscription'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                value="subscription"
                checked={formData.paymentType === 'subscription'}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="form-radio text-purple-600"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">サブスクリプション（月額¥3,800）</span>
                  {hasSubscription ? (
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                      ご利用中
                    </span>
                  ) : (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                      未加入
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  3頭まで使い放題・施設貸し切り20%OFF
                </p>
                {!hasSubscription && (
                  <p className="text-xs text-purple-600 mt-1">
                    ※ サブスクリプションに加入していません
                  </p>
                )}
              </div>
            </label>

            {/* 施設貸し切り */}
            <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              formData.paymentType === 'facility_rental'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                value="facility_rental"
                checked={formData.paymentType === 'facility_rental'}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value, duration: '1' })}
                className="form-radio text-orange-600"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Building className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">施設貸し切り</span>
                  <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs">
                    1時間¥{hasSubscription ? '3,520' : '4,400'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  施設全体を独占利用・人数制限なし・友達にPINコード共有可能
                </p>
                {hasSubscription && (
                  <p className="text-sm text-purple-700 font-medium mt-1">
                    サブスク会員20%OFF適用済み！
                  </p>
                )}
              </div>
            </label>
          </div>
        </div>
        
        {/* 施設貸し切りの時間選択 */}
        {formData.paymentType === 'facility_rental' && formData.date && (
          <>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  利用開始時間を選択してください
                </label>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">利用時間:</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {[1, 2, 3, 4].map(hours => (
                      <option key={hours} value={hours.toString()}>{hours}時間</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* 2日前までの予約が必要の警告 */}
              {isDateTooSoon && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
                  <AlertTriangle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">施設貸し切りは2日前までの予約が必要です</p>
                    <p className="text-sm">2日後以降の日付を選択してください。</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {timeSlots.map((slot) => {
                  const status = getSlotStatus(slot);
                  const Icon = status.icon;
                  const isSelected = formData.selectedTimeSlot === slot.time;
                  const canSelect = slot.isWholeFacilityAvailable && !isDateTooSoon;
                  
                  // 選択された時間から利用時間分の予約が可能かチェック
                  const duration = parseInt(formData.duration);
                  let canReserveFullDuration = true;
                  
                  if (canSelect && duration > 1) {
                    const startHour = parseInt(slot.time.split(':')[0]);
                    for (let h = 1; h < duration; h++) {
                      const nextHour = startHour + h;
                      const nextSlot = timeSlots.find(s => parseInt(s.time.split(':')[0]) === nextHour);
                      if (!nextSlot || !nextSlot.isWholeFacilityAvailable) {
                        canReserveFullDuration = false;
                        break;
                      }
                    }
                  }
                  
                  const finalCanSelect = canSelect && canReserveFullDuration;
                  
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => {
                        if (finalCanSelect) {
                          handleTimeSlotSelect(slot.time);
                        }
                      }}
                      disabled={!finalCanSelect}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50'
                          : finalCanSelect
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-200 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-medium text-gray-900">{slot.time}</div>
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs mt-1 ${
                          finalCanSelect ? status.color : 'bg-red-500 text-white'
                        }`}>
                          <Icon className="w-3 h-3" />
                          <span>{finalCanSelect ? status.label : '利用不可'}</span>
                        </div>
                        {!finalCanSelect && canSelect && !canReserveFullDuration && (
                          <div className="text-xs text-red-600 mt-1">
                            連続{duration}時間予約不可
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {formData.selectedTimeSlot && (
                <div className="text-sm mt-3 p-3 rounded-lg bg-orange-50 text-orange-800 border border-orange-200">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4" />
                    <span className="font-medium">
                      選択時間: {formData.selectedTimeSlot} ～ {getEndTime(formData.selectedTimeSlot, formData.duration)}
                    </span>
                  </div>
                  <p className="text-xs mt-1 flex items-center">
                    施設貸し切りは1時間単位での利用となります。
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* 予約内容 */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
          <p className="font-medium">予約内容</p>
          <div className="mt-1 space-y-1">
            <p>選択ワンちゃん: {selectedDogs.length}頭</p>
            
            {/* 支払い方法に応じた内容表示 */}
            {formData.paymentType === 'single' && (
              <div>
                <p>1日券料金: ¥{calculateDayPassPrice().toLocaleString()}（{selectedDogs.length}頭・段階的料金）</p>
                <p className="text-xs">24時間有効・全国のドッグランで利用可能</p>
              </div>
            )}
            
            {formData.paymentType === 'subscription' && (
              <div>
                {hasSubscription ? (
                  <div>
                    <p className="text-purple-700 font-medium">サブスク会員: 3頭まで使い放題</p>
                    <p className="text-xs">追加料金なし・全国のドッグランで利用可能</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-orange-700 font-medium">サブスクリプション申し込み: 月額¥3,800</p>
                    <p className="text-xs">申し込み後、3頭まで使い放題・全国のドッグランで利用可能</p>
                  </div>
                )}
              </div>
            )}
            
            {formData.paymentType === 'facility_rental' && (
              <div>
                <p>施設貸し切り料金: ¥{calculateTotalPrice().toLocaleString()}</p>
                <p className="text-xs">{formData.duration}時間利用・施設全体独占・友達にPINコード共有可能</p>
                {hasSubscription && (
                  <p className="text-purple-700 font-medium text-xs">サブスク会員20%OFF適用済み</p>
                )}
              </div>
            )}
            
            {/* 合計料金 */}
            <div className="border-t border-blue-300 pt-2 mt-2">
              <p className="font-bold">
                合計料金: ¥{calculateTotalPrice().toLocaleString()}
              </p>
            </div>
          </div>
          
          <p className="text-sm mt-2 flex items-center">
            <CreditCard className="w-3 h-3 mr-1" />
            決済完了後、入場用PINコードが発行されます
          </p>
        </div>
        
        <Button 
          type="submit" 
          isLoading={isLoading || checkoutLoading} 
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
          disabled={
            selectedDogs.length === 0 || 
            (formData.paymentType === 'facility_rental' && (!formData.selectedTimeSlot || isDateTooSoon))
          }
        >
          {formData.paymentType === 'subscription' && !hasSubscription ? (
            <>
              <Crown className="w-4 h-4 mr-2" />
              サブスクリプションに加入する
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              {hasSubscription && formData.paymentType === 'subscription' ? 'PINコードを発行する' : '決済に進む'}
            </>
          )}
          {selectedDogs.length > 0 && (
            <span className="ml-2 bg-blue-500 text-white px-2 py-1 rounded-full text-sm">
              {selectedDogs.length}頭・¥{calculateTotalPrice().toLocaleString()}
            </span>
          )}
        </Button>
      </form>
    </Card>
  );
}