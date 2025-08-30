import { AlertTriangle, Clock, Shield, X } from 'lucide-react';

export interface VaccineBadgeProps {
  status: 'approved' | 'pending' | 'rejected' | 'none' | 'expired';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

export function VaccineBadge({ 
  status, 
  size = 'md', 
  showIcon = true, 
  showText = true,
  className = '' 
}: VaccineBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          icon: Shield,
          text: '承認済み',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          iconColor: 'text-green-600',
          glow: 'shadow-green-200 shadow-lg',
          pulse: 'animate-pulse'
        };
      case 'pending':
        return {
          icon: Clock,
          text: '審査中',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
          iconColor: 'text-yellow-600',
          glow: 'shadow-yellow-200 shadow-md',
          pulse: ''
        };
      case 'rejected':
        return {
          icon: X,
          text: '却下',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          iconColor: 'text-red-600',
          glow: 'shadow-red-200 shadow-md',
          pulse: ''
        };
      case 'expired':
        return {
          icon: AlertTriangle,
          text: '期限切れ',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-300',
          iconColor: 'text-orange-600',
          glow: 'shadow-orange-200 shadow-md',
          pulse: 'animate-pulse'
        };
      case 'none':
      default:
        return {
          icon: AlertTriangle,
          text: '未提出',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
          iconColor: 'text-gray-600',
          glow: '',
          pulse: ''
        };
    }
  };

  const getSizeConfig = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          padding: 'px-2 py-1',
          textSize: 'text-xs',
          iconSize: 'w-3 h-3',
          gap: 'gap-1'
        };
      case 'lg':
        return {
          padding: 'px-4 py-2',
          textSize: 'text-base',
          iconSize: 'w-6 h-6',
          gap: 'gap-3'
        };
      case 'md':
      default:
        return {
          padding: 'px-3 py-1.5',
          textSize: 'text-sm',
          iconSize: 'w-4 h-4',
          gap: 'gap-2'
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const sizeConfig = getSizeConfig(size);
  const IconComponent = statusConfig.icon;

  return (
    <div className={`
      inline-flex items-center font-medium rounded-full border-2
      ${statusConfig.bgColor} 
      ${statusConfig.textColor} 
      ${statusConfig.borderColor}
      ${statusConfig.glow}
      ${statusConfig.pulse}
      ${sizeConfig.padding}
      ${sizeConfig.textSize}
      ${sizeConfig.gap}
      ${className}
    `}>
      {showIcon && (
        <IconComponent className={`${sizeConfig.iconSize} ${statusConfig.iconColor}`} />
      )}
      {showText && (
        <span className="font-semibold">{statusConfig.text}</span>
      )}
    </div>
  );
}

// ワクチン証明書の詳細ステータスを取得するヘルパー関数
export function getVaccineStatusFromDog(dog: any) {
  const list = Array.isArray(dog?.vaccine_certifications) ? dog.vaccine_certifications : [];
  const cert = list.length > 0
    ? [...list].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  if (!cert) return 'none';
  
  // 期限切れチェック
  const now = new Date();
  const rabiesExpiry = cert.rabies_expiry_date ? new Date(cert.rabies_expiry_date) : null;
  const comboExpiry = cert.combo_expiry_date ? new Date(cert.combo_expiry_date) : null;
  
  if (cert.status === 'approved') {
    // 承認済みでも期限切れの場合
    if ((rabiesExpiry && rabiesExpiry < now) || (comboExpiry && comboExpiry < now)) {
      return 'expired';
    }
    return 'approved';
  }
  
  return cert.status || 'none';
}

export default VaccineBadge; 
