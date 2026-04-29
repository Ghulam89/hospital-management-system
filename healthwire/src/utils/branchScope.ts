/** localStorage key: superadmin "view as branch" filter (matches backend `?branchId`). */
export const SUPERADMIN_BRANCH_STORAGE_KEY = 'healthwire_superadminBranchId';

export const BRANCH_CHANGED_EVENT = 'healthwire-branch-changed';

export function normalizeRole(role: unknown): string {
  return String(role || '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function isSuperAdminRole(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === 'superadmin' || r === 'super admin';
}

export function getUserDataFromStorage(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function isLikelyMongoObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(String(id || '').trim());
}

export function getSuperadminSelectedBranchId(): string | null {
  const v = localStorage.getItem(SUPERADMIN_BRANCH_STORAGE_KEY);
  const s = String(v || '').trim();
  if (!s || !isLikelyMongoObjectId(s)) return null;
  return s;
}

export function setSuperadminSelectedBranchId(id: string | null | undefined): void {
  const s = String(id || '').trim();
  if (!s) {
    localStorage.removeItem(SUPERADMIN_BRANCH_STORAGE_KEY);
  } else {
    localStorage.setItem(SUPERADMIN_BRANCH_STORAGE_KEY, s);
  }
  try {
    window.dispatchEvent(new Event(BRANCH_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/** When logged-in user is not superadmin, clear stored branch filter. */
export function clearSuperadminBranchSelectionIfNeeded(user: { role?: unknown } | null | undefined): void {
  if (!isSuperAdminRole(user?.role)) {
    localStorage.removeItem(SUPERADMIN_BRANCH_STORAGE_KEY);
  }
}

export function shouldSuggestBranchIdQuery(): boolean {
  const u = getUserDataFromStorage();
  return !!u && isSuperAdminRole(u.role) && !!getSuperadminSelectedBranchId();
}

/** Merge `branchId` into axios `params` for superadmin scope (explicit `params.branchId` wins). */
export function mergeBranchIdIntoAxiosParams(
  config: { url?: string; params?: unknown },
  branchId: string
): void {
  const url = String(config.url || '');
  if (!url.includes('/apis/')) return;
  if (url.includes('/apis/login/')) return;

  let existing: Record<string, unknown> = {};
  const p = config.params;
  if (p && typeof p === 'object' && !Array.isArray(p) && !(p instanceof URLSearchParams)) {
    existing = { ...(p as Record<string, unknown>) };
  }
  if (existing.branchId !== undefined && existing.branchId !== null && existing.branchId !== '') {
    config.params = existing;
    return;
  }
  existing.branchId = branchId;
  config.params = existing;
}

/**
 * Non–super-admin: send logged-in user id as `adminId` so backend can resolve branch
 * when JWT omits `branchId` (e.g. department-only admins). Explicit `params.adminId` wins.
 */
export function mergeAdminIdIntoAxiosParams(config: { url?: string; params?: unknown }): void {
  const url = String(config.url || '');
  if (!url.includes('/apis/')) return;
  if (url.includes('/apis/login/')) return;

  const u = getUserDataFromStorage();
  if (!u?._id || isSuperAdminRole(u.role)) return;

  let existing: Record<string, unknown> = {};
  const p = config.params;
  if (p && typeof p === 'object' && !Array.isArray(p) && !(p instanceof URLSearchParams)) {
    existing = { ...(p as Record<string, unknown>) };
  }
  if (existing.adminId !== undefined && existing.adminId !== null && existing.adminId !== '') {
    config.params = existing;
    return;
  }
  existing.adminId = String(u._id);
  config.params = existing;
}
