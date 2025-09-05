export const COMPANY = {
  CORP_LEGAL_NAME: process.env.VITE_CORP_LEGAL_NAME || '（仮）会社名',
  REPRESENTATIVE_NAME: process.env.VITE_REPRESENTATIVE_NAME || '（仮）代表者名',
  CORP_ADDRESS: process.env.VITE_CORP_ADDRESS || '（仮）住所',
  CORP_TEL: process.env.VITE_CORP_TEL || '（仮）電話番号',
  SUPPORT_EMAIL: process.env.VITE_SUPPORT_EMAIL || 'support@dogparkjp.com',
  BUSINESS_HOURS: process.env.VITE_BUSINESS_HOURS || '平日10:00〜18:00',
  CANCEL_DEADLINE_DAYS: Number(process.env.VITE_CANCEL_DEADLINE_DAYS || 3),
  EXTRA_FEES: process.env.VITE_EXTRA_FEES || 'なし',
};


