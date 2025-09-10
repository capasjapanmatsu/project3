const env = import.meta.env as Record<string, string>;

export const COMPANY = {
  CORP_LEGAL_NAME: env.VITE_CORP_LEGAL_NAME || '株式会社CAPAS',
  REPRESENTATIVE_NAME: env.VITE_REPRESENTATIVE_NAME || '松本保弘',
  CORP_ADDRESS: env.VITE_CORP_ADDRESS || '〒861-0563 熊本県山鹿市鹿央町千田1718－13',
  CORP_TEL: env.VITE_CORP_TEL || '0968-36-9208',
  SUPPORT_EMAIL: env.VITE_SUPPORT_EMAIL || 'info@dogparkjp.com',
  BUSINESS_HOURS: env.VITE_BUSINESS_HOURS || '平日10:00〜18:00',
  CANCEL_DEADLINE_DAYS: Number(env.VITE_CANCEL_DEADLINE_DAYS || 3),
  EXTRA_FEES: env.VITE_EXTRA_FEES || 'なし',
};


