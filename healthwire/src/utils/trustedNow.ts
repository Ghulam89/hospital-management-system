import axios from 'axios';
import { Base_url } from './Base_url';

const DEFAULT_TZ = 'Asia/Karachi';
const RESYNC_MS = 5 * 60 * 1000;

let offsetMs = 0; // internetUtcMs - Date.now()
let lastSyncAt = 0;
let lastSource = 'local-fallback';
let syncInFlight: Promise<boolean> | null = null;

/** Instant from internet-synced offset (falls back to device clock until first sync). */
export function trustedNow(): Date {
  return new Date(Date.now() + offsetMs);
}

export function trustedNowMs(): number {
  return Date.now() + offsetMs;
}

export function formatYmdInTimeZone(
  date: Date = trustedNow(),
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
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export function getTrustedTimeMeta() {
  return {
    offsetMs,
    source: lastSource,
    syncedAt: lastSyncAt || null,
    stale: !lastSyncAt || Date.now() - lastSyncAt > RESYNC_MS,
  };
}

/**
 * Sync clock from backend `/apis/time/now` (backend pulls from the internet).
 * Uses mid-RTT estimate so device clock skew is corrected.
 */
export async function syncTrustedTime(force = false): Promise<boolean> {
  if (!force && lastSyncAt && Date.now() - lastSyncAt < RESYNC_MS) {
    return true;
  }
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const t0 = Date.now();
      const res = await axios.get(`${Base_url}/apis/time/now`, {
        params: force ? { force: 1 } : undefined,
        timeout: 8000,
      });
      const t1 = Date.now();
      const utcMs = Number(res.data?.utcMs);
      if (!Number.isFinite(utcMs)) {
        throw new Error('Invalid utcMs from time API');
      }
      const mid = (t0 + t1) / 2;
      offsetMs = utcMs - mid;
      lastSyncAt = Date.now();
      lastSource = String(res.data?.source || 'api');
      return true;
    } catch (err) {
      console.warn('[trustedNow] sync failed:', (err as Error)?.message || err);
      return false;
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** Ensure we have a recent sync (best-effort). */
export async function ensureTrustedTime(): Promise<Date> {
  await syncTrustedTime(false);
  return trustedNow();
}
