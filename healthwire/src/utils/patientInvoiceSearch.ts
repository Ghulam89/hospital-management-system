import axios from 'axios';
import { Base_url } from './Base_url';
import { buildAxiosBranchScopedParams } from './branchScope';

export type PatientLookupRow = {
  _id: string;
  mr?: string;
  name?: string;
  gender?: string;
  phone?: string;
  notInThisBranch?: boolean;
};

/** Build GET /apis/patient/get params (branch + MR/phone/name search like Patients list). */
export function buildPatientLookupParams(
  searchTerm: string,
  page = 1,
  limit = 20,
): Record<string, string | number> {
  const term = searchTerm.trim();
  const params: Record<string, string | number> = {
    page,
    limit,
    ...buildAxiosBranchScopedParams(),
  };
  if (!term) return params;

  const digitsOnly = term.replace(/\D/g, '');
  const looksLikeMr =
    digitsOnly.length >= 4 && digitsOnly.length <= 8 && /^\d+$/.test(digitsOnly);
  const looksLikePhone = digitsOnly.length >= 10;

  if (looksLikeMr) {
    params.mr = digitsOnly;
    params.exactMr = 'true';
    params.includeIdentityMatches = 'true';
  } else if (looksLikePhone) {
    params.phone = digitsOnly;
    params.exact = 'true';
    params.includeIdentityMatches = 'true';
  } else {
    params.search = term;
    params.name = term;
    params.includeIdentityMatches = 'true';
  }

  return params;
}

export function isPatientSelectableAtBranch(p: PatientLookupRow): boolean {
  return !p.notInThisBranch;
}

export async function fetchPatientsForInvoiceLookup(
  searchTerm: string,
): Promise<PatientLookupRow[]> {
  const term = searchTerm.trim();
  if (!term) return [];

  const res = await axios.get(`${Base_url}/apis/patient/get`, {
    params: buildPatientLookupParams(term),
  });
  const list = Array.isArray(res?.data?.data) ? res.data.data : [];
  return list.filter(isPatientSelectableAtBranch);
}
