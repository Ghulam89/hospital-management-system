/**
 * Branch display for invoice PDFs and POS receipt (populated `branchId` from API).
 */

export const DEFAULT_INVOICE_CLINIC_NAME = 'HOLISTIC CARE CLINIC';
export const DEFAULT_INVOICE_ADDRESS = '188-Y Block Phase III, DHA, Lahore, Punjab, Pakistan';
export const DEFAULT_INVOICE_PHONE = '0342-4211888';
/** @deprecated Legacy constant; use branch `email` from DB. */
export const DEFAULT_INVOICE_EMAIL = '';
export const DEFAULT_PHARMACY_TITLE = 'Holistic Pharmacy';

export type PosReceiptBranch = {
  _id?: string;
  name: string;
  address: string;
  phone: string;
  location: string;
  email: string;
};

export type PosReceiptHeader = {
  title: string;
  tagline: string;
  phoneLine: string;
  emailLine: string;
  addressLines: string[];
};

export type InvoicePdfHeader = {
  clinicName: string;
  addressLine: string;
  contactLine: string;
  footerThanks: string;
  footerContactLine: string;
};

function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

function pickBranchRecord(data: unknown): Record<string, unknown> | null {
  const d = asRecord(data);
  const direct = asRecord(d?.branchId);
  const createdBy = asRecord(d?.createdBy);
  const nested = asRecord(createdBy?.branchId);
  const merged: Record<string, unknown> = { ...nested, ...direct };
  const has = (b: Record<string, unknown> | null) =>
    !!b &&
    (String(b.name || '').trim() !== '' ||
      String(b.address || '').trim() !== '' ||
      String(b.phone || '').trim() !== '' ||
      String(b.location || '').trim() !== '' ||
      String(b.email || '').trim() !== '');
  if (has(merged as Record<string, unknown> | null)) return merged;
  if (has(direct)) return direct;
  if (has(nested)) return nested;
  return direct || nested;
}

function recordToPosBranch(b: Record<string, unknown> | null): PosReceiptBranch {
  if (!b) {
    return { name: '', address: '', phone: '', location: '', email: '' };
  }
  const id = b._id;
  return {
    _id: id != null && id !== '' ? String(id) : undefined,
    name: String(b.name ?? ''),
    address: String(b.address ?? ''),
    phone: String(b.phone ?? ''),
    location: String(b.location ?? ''),
    email: String(b.email ?? ''),
  };
}

/** POS sale: prefer `branchId` on document, else creator's branch. */
export function resolveBranchForPosReceipt(data: unknown): PosReceiptBranch {
  return recordToPosBranch(pickBranchRecord(data));
}

export function getPosReceiptHeader(data: unknown): PosReceiptHeader {
  const b = resolveBranchForPosReceipt(data);
  const title = b.name?.trim() ? b.name : DEFAULT_PHARMACY_TITLE;
  const phoneLine = b.phone ? `Cell# ${b.phone}` : '';
  const em = b.email?.trim();
  const emailLine = em ? `Email: ${em}` : '';
  const addr = [b.address, b.location].map((s) => String(s || '').trim()).filter(Boolean);
  return {
    title,
    tagline: b.name,
    phoneLine,
    emailLine,
    addressLines: addr,
  };
}

function branchFromInvoice(invoice: unknown): Record<string, unknown> | null {
  return asRecord(asRecord(invoice)?.branchId);
}

function hasBranchDetails(br: Record<string, unknown> | null): boolean {
  if (!br) return false;
  return (
    String(br.name || '').trim() !== '' ||
    String(br.address || '').trim() !== '' ||
    String(br.location || '').trim() !== '' ||
    String(br.phone || '').trim() !== '' ||
    String(br.email || '').trim() !== ''
  );
}

/**
 * React-PDF / invoice: header and footer lines from `invoice.branchId` (populated).
 */
export function getInvoiceHeaderForPdf(invoice: unknown): InvoicePdfHeader {
  const br = branchFromInvoice(invoice);
  const has = hasBranchDetails(br);

  const clinicName = (has && String(br!.name || '').trim()) || DEFAULT_INVOICE_CLINIC_NAME;

  const addrParts = has
    ? [br!.address, br!.location].map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  const addressLine =
    addrParts.length > 0 ? addrParts.join(', ') : has ? '' : DEFAULT_INVOICE_ADDRESS;

  const p = has ? String(br!.phone || '').trim() : '';
  const e = has ? String(br!.email || '').trim() : '';
  const contactBits: string[] = [];
  if (p) contactBits.push(`Phone: ${p}`);
  if (e) contactBits.push(`Email: ${e}`);
  const contactLine =
    contactBits.length > 0 ? contactBits.join(' | ') : `Phone: ${DEFAULT_INVOICE_PHONE}`;

  const displayName = (has && String(br!.name || '').trim()) || 'Holistic Care Clinic';
  const footerThanks = `Thank you for choosing ${displayName}`;
  const footerContactLine =
    p || e
      ? `For any queries, please contact: ${[p, e].filter(Boolean).join(' | ')}`
      : `For any queries, please contact: ${DEFAULT_INVOICE_PHONE}`;

  return { clinicName, addressLine, contactLine, footerThanks, footerContactLine };
}
