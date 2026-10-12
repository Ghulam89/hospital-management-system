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

/** YYYY-MM-DD → Date at local noon (keeps POS bill day stable across UTC). */
export function ymdToLocalNoonDate(ymd: string): Date {
  const m = String(ymd || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  }
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}
