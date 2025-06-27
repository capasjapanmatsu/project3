/**
 * CSVエクスポート用のユーティリティ関数
 */

/**
 * UTF-8 BOM付きのCSVファイルをダウンロードする関数
 * 日本語Windows環境のExcelで文字化けしないようにBOMを追加
 * 
 * @param headers CSVヘッダー行の配列
 * @param rows CSVデータ行の配列の配列
 * @param filename ダウンロードするファイル名
 */
export function downloadCSVWithBOM(
  headers: string[],
  rows: (string | number)[][],
  filename: string
): void {
  // UTF-8 BOMを追加
  const BOM = '\uFEFF';
  
  // ヘッダー行をCSV形式に変換
  const headerRow = headers.map(escapeCSVField).join(',');
  
  // データ行をCSV形式に変換
  const dataRows = rows.map(row => 
    row.map(field => escapeCSVField(field.toString())).join(',')
  );
  
  // CSVデータを作成（BOMを先頭に追加）
  const csvContent = BOM + [headerRow, ...dataRows].join('\n');
  
  // CSVファイルをダウンロード
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * CSVフィールドをエスケープする関数
 * ダブルクォートを含むフィールドは、ダブルクォートでエスケープし、
 * フィールド全体をダブルクォートで囲む
 * 
 * @param field CSVフィールド
 * @returns エスケープされたCSVフィールド
 */
export function escapeCSVField(field: string): string {
  // フィールドがダブルクォート、カンマ、改行を含む場合は、
  // ダブルクォートでエスケープし、フィールド全体をダブルクォートで囲む
  if (field.includes('"') || field.includes(',') || field.includes('\n') || field.includes('\r')) {
    // ダブルクォートをエスケープ（" → ""）
    const escapedField = field.replace(/"/g, '""');
    return `"${escapedField}"`;
  }
  return field;
}

/**
 * 日付をYYYY-MM-DD形式に変換する関数
 * 
 * @param date 日付オブジェクトまたは日付文字列
 * @returns YYYY-MM-DD形式の日付文字列
 */
export function formatDateForCSV(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日本語形式の日付（YYYY年MM月DD日）に変換する関数
 * 
 * @param date 日付オブジェクトまたは日付文字列
 * @returns 日本語形式の日付文字列
 */
export function formatDateJP(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 金額を日本円形式（¥1,000）に変換する関数
 * 
 * @param amount 金額
 * @returns 日本円形式の金額文字列
 */
export function formatCurrencyJP(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}