const DEFAULT_TZ = 'Asia/Karachi';

/**
 * Calendar YYYY-MM-DD in hospital timezone (default Asia/Karachi).
 * Prefer this over `new Date().toISOString().split('T')[0]`, which is UTC and can show the wrong day.
 */
export function formatYmdInTimeZone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TZ,
): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export function localCalendarYmd(d: Date = new Date()): string {
  return formatYmdInTimeZone(d);
}
