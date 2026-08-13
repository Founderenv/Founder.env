export const SETUP_FEE_PAISE = 29_900;
export const MONTHLY_FEE_PAISE = 19_900;
export const TOTAL_COUNT = 24;

/** Add one UTC calendar month and clamp end-of-month dates (for example, Jan 31 → Feb 28/29). */
export function addOneCalendarMonth(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(date.getUTCDate(), lastDay), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
}
