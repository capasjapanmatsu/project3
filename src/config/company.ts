const env = import.meta.env as Record<string, string>;

export const COMPANY = {
  CORP_LEGAL_NAME: env.VITE_CORP_LEGAL_NAME || '（仮）会社名',
  REPRESENTATIVE_NAME: env.VITE_REPRESENTATIVE_NAME || '（仮）代表者名',
  CORP_ADDRESS: env.VITE_CORP_ADDRESS || '（仮）住所',
  CORP_TEL: env.VITE_CORP_TEL || '（仮）電話番号',
  SUPPORT_EMAIL: env.VITE_SUPPORT_EMAIL || 'support@dogparkjp.com',
  BUSINESS_HOURS: env.VITE_BUSINESS_HOURS || '平日10:00〜18:00',
  CANCEL_DEADLINE_DAYS: Number(env.VITE_CANCEL_DEADLINE_DAYS || 3),
  EXTRA_FEES: env.VITE_EXTRA_FEES || 'なし',
};


