/**
 * Trusted wall-clock from the internet (not the host OS clock).
 * Caches an offset so subsequent trustedNow() calls stay cheap.
 */

const DEFAULT_TZ = process.env.TRUSTED_TIMEZONE || 'Asia/Karachi';
const SYNC_TTL_MS = Math.max(60_000, Number(process.env.TRUSTED_TIME_TTL_MS) || 5 * 60_000);

let offsetMs = 0; // internetUtcMs - Date.now()
let lastSyncAt = 0;
let lastSource = 'local-fallback';
let syncInFlight = null;

function applyOffset(internetUtcMs, source) {
  offsetMs = Number(internetUtcMs) - Date.now();
  lastSyncAt = Date.now();
  lastSource = source || 'internet';
}

async function fetchJson(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDateHeader(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    const raw = res.headers.get('date');
    if (!raw) throw new Error('No Date header');
    const ms = Date.parse(raw);
    if (!Number.isFinite(ms)) throw new Error('Invalid Date header');
    return ms;
  } finally {
    clearTimeout(timer);
  }
}

async function pullInternetUtcMs() {
  const tz = encodeURIComponent(DEFAULT_TZ);

  // 1) WorldTimeAPI (timezone-aware)
  try {
    const data = await fetchJson(`https://worldtimeapi.org/api/timezone/${tz}`);
    const ms = Date.parse(data?.utc_datetime || data?.datetime);
    if (Number.isFinite(ms)) return { ms, source: 'worldtimeapi' };
  } catch (err) {
    console.warn('[trustedNow] worldtimeapi failed:', err?.message || err);
  }

  // 2) timeapi.io
  try {
    const data = await fetchJson(
      `https://timeapi.io/api/Time/current/zone?timeZone=${tz}`,
    );
    const iso = data?.dateTime
      ? `${String(data.dateTime)}${data.utcOffset ? '' : 'Z'}`
      : null;
    let ms = iso ? Date.parse(iso) : NaN;
    if (!Number.isFinite(ms) && data?.year) {
      ms = Date.UTC(
        Number(data.year),
        Number(data.month) - 1,
        Number(data.day),
        Number(data.hour || 0),
        Number(data.minute || 0),
        Number(data.seconds || 0),
      );
    }
    if (Number.isFinite(ms)) return { ms, source: 'timeapi.io' };
  } catch (err) {
    console.warn('[trustedNow] timeapi.io failed:', err?.message || err);
  }

  // 3) Cloudflare / Google Date header (UTC)
  for (const [url, source] of [
    ['https://www.cloudflare.com', 'cloudflare-date'],
    ['https://www.google.com', 'google-date'],
  ]) {
    try {
      const ms = await fetchDateHeader(url);
      return { ms, source };
    } catch (err) {
      console.warn(`[trustedNow] ${source} failed:`, err?.message || err);
    }
  }

  throw new Error('All internet time sources failed');
}

async function syncTrustedTime(force = false) {
  if (!force && lastSyncAt && Date.now() - lastSyncAt < SYNC_TTL_MS) {
    return {
      ok: true,
      cached: true,
      offsetMs,
      source: lastSource,
      syncedAt: lastSyncAt,
    };
  }
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const { ms, source } = await pullInternetUtcMs();
      applyOffset(ms, source);
      return {
        ok: true,
        cached: false,
        offsetMs,
        source: lastSource,
        syncedAt: lastSyncAt,
        utcMs: Date.now() + offsetMs,
      };
    } catch (err) {
      // Keep previous offset if any; otherwise stay on local clock.
      if (!lastSyncAt) {
        lastSource = 'local-fallback';
      }
      return {
        ok: false,
        cached: !!lastSyncAt,
        offsetMs,
        source: lastSource,
        syncedAt: lastSyncAt,
        error: err?.message || String(err),
        utcMs: Date.now() + offsetMs,
      };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** Instant representing internet wall-clock (falls back to local until first sync). */
function trustedNow() {
  return new Date(Date.now() + offsetMs);
}

function trustedNowMs() {
  return Date.now() + offsetMs;
}

function formatYmdInTimeZone(date = trustedNow(), timeZone = DEFAULT_TZ) {
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

function getTrustedTimeStatus() {
  return {
    offsetMs,
    source: lastSource,
    syncedAt: lastSyncAt || null,
    timeZone: DEFAULT_TZ,
    utc: trustedNow().toISOString(),
    localYmd: formatYmdInTimeZone(),
    stale: !lastSyncAt || Date.now() - lastSyncAt > SYNC_TTL_MS,
  };
}

// Kick off background sync; refresh periodically.
syncTrustedTime(true).catch(() => {});
setInterval(() => {
  syncTrustedTime(true).catch(() => {});
}, SYNC_TTL_MS).unref?.();

module.exports = {
  trustedNow,
  trustedNowMs,
  syncTrustedTime,
  formatYmdInTimeZone,
  getTrustedTimeStatus,
  DEFAULT_TZ,
};
