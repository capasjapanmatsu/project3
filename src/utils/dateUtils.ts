/**
 * 現在の日付から今月末までの日数を計算する
 * @returns 今月末までの日数（今日を含む）
 */
export function getDaysUntilEndOfMonth(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // 今月の最終日を取得
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const today = new Date(year, month, now.getDate());
  
  // 時差を考慮して日数を計算
  const timeDifference = lastDayOfMonth.getTime() - today.getTime();
  const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1; // 今日を含むため+1
  
  return Math.max(1, dayDifference); // 最低1日は保証
}

/**
 * サブスクリプションの初月無料期間（今月末まで）の日数を取得
 * @returns 初月無料期間の日数
 */
export function getSubscriptionTrialDays(): number {
  return getDaysUntilEndOfMonth();
}

/**
 * 初月無料期間の終了日を取得（今月末）
 * @returns 今月末の日付
 */
export function getTrialEndDate(): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // 今月の最終日を返す
  return new Date(year, month + 1, 0);
}

/**
 * 初月無料期間の説明テキストを生成
 * @returns 初月無料期間の説明文
 */
export function getTrialPeriodDescription(): string {
  const trialDays = getDaysUntilEndOfMonth();
  const endDate = getTrialEndDate();
  const endDateStr = `${endDate.getMonth() + 1}月${endDate.getDate()}日`;
  
  return `今月末（${endDateStr}）まで${trialDays}日間無料`;
} 