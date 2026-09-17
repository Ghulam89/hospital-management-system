const {
  trustedNow,
  trustedNowMs,
  syncTrustedTime,
  getTrustedTimeStatus,
  formatYmdInTimeZone,
} = require('../utils/trustedNow');

/** Public clock endpoint — internet-synced UTC (+ optional force refresh). */
const getTrustedTime = async (req, res) => {
  try {
    const force =
      String(req.query.force || '').trim() === '1' ||
      String(req.query.refresh || '').toLowerCase() === 'true';
    const sync = await syncTrustedTime(force);
    const status = getTrustedTimeStatus();
    return res.status(200).json({
      status: 'ok',
      utc: status.utc,
      utcMs: trustedNowMs(),
      ymd: formatYmdInTimeZone(),
      timeZone: status.timeZone,
      source: status.source,
      offsetMs: status.offsetMs,
      syncedAt: status.syncedAt,
      stale: status.stale,
      syncOk: sync.ok,
      syncError: sync.error || undefined,
      // Client can measure RTT against this echo.
      serverLocalMs: Date.now(),
    });
  } catch (err) {
    return res.status(500).json({
      status: 'fail',
      message: err.message,
      utc: trustedNow().toISOString(),
      utcMs: trustedNowMs(),
    });
  }
};

module.exports = { getTrustedTime };
