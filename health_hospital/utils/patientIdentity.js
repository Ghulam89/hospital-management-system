/**
 * Normalize identity fields so the same person cannot be registered twice under different formats.
 * CNIC: digits only (Pakistan 13 digits; create-patient API requires it).
 * Phone: digits only for comparison (drops spaces, dashes, country-code formatting variants).
 */

function normalizeCnic(value) {
  if (value == null || value === '') return '';
  return String(value).replace(/\D/g, '');
}

function normalizePhone(value) {
  if (value == null || value === '') return '';
  let s = String(value).trim();
  if (s.startsWith('+')) s = s.slice(1);
  return s.replace(/\D/g, '');
}

function cnicQueryVariants(raw) {
  const n = normalizeCnic(raw);
  if (!n) return [];
  const set = new Set([n, String(raw || '').trim()].filter(Boolean));
  return [...set];
}

function phoneQueryVariants(raw) {
  const n = normalizePhone(raw);
  if (!n) return [];
  const set = new Set([n, String(raw || '').trim()].filter(Boolean));
  return [...set];
}

module.exports = {
  normalizeCnic,
  normalizePhone,
  cnicQueryVariants,
  phoneQueryVariants,
};
