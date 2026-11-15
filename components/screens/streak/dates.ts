/** Month and day words for the streak and week screens, from YYYY-MM-DD strings, with no Date object. */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "9 November" from a saved YYYY-MM-DD day. */
export function dayMonth(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "November" from YYYY-MM. */
export function monthName(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1];
}

/** YYYY-MM moved by whole months. */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + by;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
