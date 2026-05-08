/**
 * Calendar YYYY-MM-DD in the user's local timezone.
 * Prefer this over `new Date().toISOString().split('T')[0]`, which is UTC and can show the wrong day.
 */
export function localCalendarYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
