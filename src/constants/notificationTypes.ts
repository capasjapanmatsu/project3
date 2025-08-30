export const NOTIFICATION_TYPES = [
  'system_alert',
  'dog_registered',
  'order',
  'vaccine_requested',
  'vaccine_approved',
  'vaccine_rejected',
  'owner_verify_requested',
  'owner_verify_approved',
  'owner_verify_rejected',
  'park_apply_requested',
  'park_apply_approved',
  'park_apply_rejected',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export function normalizeType(v: string): NotificationType | null {
  const x = v.toLowerCase().trim();
  return (NOTIFICATION_TYPES as readonly string[]).includes(x)
    ? (x as NotificationType)
    : null;
}


