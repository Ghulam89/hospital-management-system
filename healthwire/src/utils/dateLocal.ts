import { trustedNow, formatYmdInTimeZone } from './trustedNow';

/**
 * Calendar YYYY-MM-DD in hospital timezone (default Asia/Karachi), using internet-synced clock.
 * Prefer this over `new Date().toISOString().split('T')[0]`, which is UTC and can show the wrong day.
 */
export function localCalendarYmd(d: Date = trustedNow()): string {
  return formatYmdInTimeZone(d);
}

export { trustedNow, trustedNowMs, syncTrustedTime, ensureTrustedTime } from './trustedNow';
