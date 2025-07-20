// Postal code lookup utility for Japanese addresses

/**
 * Fetch address data from postal code using the free zipcloud API
 * @param postalCode Postal code in format 123-4567 or 1234567
 * @returns Promise with address data or error
 */
export async function lookupPostalCode(postalCode: string): Promise<{
  success: boolean;
  message?: string;
  results?: {
    address1: string; // Prefecture
    address2: string; // City
    address3: string; // Town/Area
    kana1: string;    // Prefecture in kana
    kana2: string;    // City in kana
    kana3: string;    // Town/Area in kana
  }[];
}> {
  try {
    // Clean the postal code (remove hyphens)
    const cleanPostalCode = postalCode.replace(/-/g, '');
    
    // Validate postal code format (7 digits)
    if (!/^\d{7}$/.test(cleanPostalCode)) {
      return {
        success: false,
        message: '郵便番号は7桁の数字で入力してください'
      };
    }
    
    // Call the zipcloud API
    const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanPostalCode}`);
    
    if (!response.ok) {
      throw new Error('郵便番号検索APIでエラーが発生しました');
    }
    
    const data = await response.json();
    
    if (data.status !== 200) {
      return {
        success: false,
        message: data.message || '郵便番号検索に失敗しました'
      };
    }
    
    if (!data.results || data.results.length === 0) {
      return {
        success: false,
        message: '該当する住所が見つかりませんでした'
      };
    }
    
    return {
      success: true,
      results: data.results
    };
  } catch (error) {
    console.error('Postal code lookup error:', error);
    return {
      success: false,
      message: '郵便番号検索中にエラーが発生しました'
    };
  }
}

/**
 * Format address from postal code lookup results
 * @param results Results from postal code lookup
 * @returns Formatted address string
 */
export function formatAddress(results: {
  address1: string;
  address2: string;
  address3: string;
}): string {
  return `${results.address1}${results.address2}${results.address3}`;
}
