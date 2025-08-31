export const NOTIFICATION_TYPES = [
  'system_alert',
  'dog_registered',
  'order',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  'reservation_reminder',
  'vaccine_requested',
  'vaccine_approved',
  'vaccine_rejected',
  // 管理通知（DBトリガー等でも使用）
  'vaccine_approval_required',
  'owner_verify_requested',
  'owner_verify_approved',
  'owner_verify_rejected',
  'park_apply_requested',
  'park_apply_approved',
  'park_apply_rejected',
  // 施設・ドッグラン関連（不足で落ちやすいので明示的に追加）
  'park_application_received',
  'park_application_status',
  'park_approval_required',
  'facility_registered',
  'facility_apply_requested',
  'facility_apply_approved',
  'facility_apply_rejected',
  'facility_approval_required',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export function normalizeType(v: string): NotificationType | null {
  const x = v.toLowerCase().trim();
  return (NOTIFICATION_TYPES as readonly string[]).includes(x)
    ? (x as NotificationType)
    : null;
}


