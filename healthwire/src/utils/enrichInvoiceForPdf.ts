import axios from 'axios';
import { Base_url } from './Base_url';

/** True if `branchId` is a populated branch object with display fields. */
export function isBranchInfoPopulated(branchId: unknown): boolean {
  if (branchId == null || branchId === '') return false;
  if (typeof branchId === 'string') return false;
  if (typeof branchId !== 'object' || Array.isArray(branchId)) return false;
  const o = branchId as Record<string, unknown>;
  return (
    String(o.name || '').trim() !== '' ||
    String(o.address || '').trim() !== '' ||
    String(o.location || '').trim() !== '' ||
    String(o.phone || '').trim() !== '' ||
    String(o.email || '').trim() !== ''
  );
}

/**
 * Fetches `GET /apis/invoice/get/:id` so `branchId` is populated (table rows often omit it).
 */
export async function enrichInvoiceForPdf<T extends { _id?: string; branchId?: unknown }>(
  invoice: T
): Promise<T> {
  if (isBranchInfoPopulated(invoice.branchId)) return invoice;
  const id = String(invoice._id || '').trim();
  if (!id) return invoice;
  try {
    const res = await axios.get(`${Base_url}/apis/invoice/get/${id}`);
    const full = res?.data?.data;
    if (full && isBranchInfoPopulated(full.branchId)) {
      return {
        ...invoice,
        ...full,
        branchId: full.branchId,
        patientId: full.patientId || invoice.patientId,
        doctorId: full.doctorId || (invoice as { doctorId?: unknown }).doctorId,
        item: full.item || invoice.item,
      } as T;
    }
  } catch {
    /* use row as-is */
  }
  return invoice;
}

function branchIdString(branchId: unknown): string | null {
  if (typeof branchId === 'string' && /^[0-9a-fA-F]{24}$/i.test(branchId)) return branchId;
  if (branchId && typeof branchId === 'object' && !Array.isArray(branchId)) {
    const id = (branchId as { _id?: unknown })._id;
    if (id && /^[0-9a-fA-F]{24}$/i.test(String(id))) return String(id);
  }
  return null;
}

/** Load branch for POS when pharm response has unpopulated `branchId`. */
export async function fetchBranchForPosReceipt(branchId: unknown): Promise<Record<string, unknown> | null> {
  if (isBranchInfoPopulated(branchId)) return null;
  const id = branchIdString(branchId);
  if (!id) return null;
  try {
    const res = await axios.get(`${Base_url}/apis/branch/get/${id}`);
    return (res?.data?.data as Record<string, unknown>) || null;
  } catch {
    return null;
  }
}
