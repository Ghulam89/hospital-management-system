/** localStorage key: superadmin "view as branch" filter (matches backend `?branchId`). */
export const SUPERADMIN_BRANCH_STORAGE_KEY = 'healthwire_superadminBranchId';

export const BRANCH_CHANGED_EVENT = 'healthwire-branch-changed';

export function normalizeRole(role: unknown): string {
  if (role == null || role === '') return '';
  let s: string;
  if (typeof role === 'string') {
    s = role;
  } else if (typeof role === 'object' && role !== null) {
    const o = role as Record<string, unknown>;
    if (typeof o.name === 'string') s = o.name;
    else if (typeof o.slug === 'string') s = o.slug;
    else return '';
  } else {
    s = String(role);
  }
  const base = s.toLowerCase().replace(/\s+/g, '');
  /** Align Role keys like `super_admin` / `super-admin` with backend branch scoping (`superadmin`). */
  if (base.replace(/[_-]/g, '') === 'superadmin') return 'superadmin';
  return base;
}

export function isSuperAdminRole(role: unknown): boolean {
  return normalizeRole(role) === 'superadmin';
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

/** Superadmin + navbar branch picked → APIs should send `branchId`. */
export function getSuperadminBranchScopeForApi(): string | null {
  const u = getUserDataFromStorage();
  if (!u || !isSuperAdminRole(u.role)) return null;
  return getSuperadminSelectedBranchId();
}

export function shouldSuggestBranchIdQuery(): boolean {
  return !!getSuperadminBranchScopeForApi();
}

/** Axios interceptor: merge branch scope via `params` only (axios appends to URL once — avoids duplicate `branchId`). */
export function applyBranchScopeToAxiosRequest(config: { url?: string; params?: unknown }): void {
  const bid = getSuperadminBranchScopeForApi();
  if (bid) mergeBranchIdIntoAxiosParams(config, bid);
  mergeAdminIdIntoAxiosParams(config);
}

function pathnameFromRequestUrl(url: string): string | null {
  try {
    const parsed = url.includes('://') ? new URL(url) : new URL(url, 'http://127.0.0.1');
    const p = parsed.pathname.replace(/\/+$/, '');
    return p || '/';
  } catch {
    return null;
  }
}

/** Branch catalogue must stay hospital-wide so the picker can search/select any branch. */
function omitSuperadminBranchFilter(url: string): boolean {
  const path = pathnameFromRequestUrl(String(url || ''));
  return path === '/apis/branch/get';
}

/**
 * Merge navbar `branchId` for scoped super-admin.
 * Always overwrites any existing `branchId` so the header picker beats the user's own `branchId` / stale params.
 */
export function mergeBranchIdIntoAxiosParams(
  config: { url?: string; params?: unknown },
  branchId: string
): void {
  const url = String(config.url || '');
  if (!url.includes('/apis/')) return;
  if (url.includes('/apis/login/')) return;
  if (omitSuperadminBranchFilter(url)) return;

  const p = config.params;
  if (p instanceof URLSearchParams) {
    p.set('branchId', branchId);
    config.params = p;
    return;
  }

  let existing: Record<string, unknown> = {};
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    existing = { ...(p as Record<string, unknown>) };
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

  const p = config.params;
  if (p instanceof URLSearchParams) {
    if (!p.has('adminId') || p.get('adminId') === '') {
      p.set('adminId', String(u._id));
    }
    config.params = p;
    return;
  }

  let existing: Record<string, unknown> = {};
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    existing = { ...(p as Record<string, unknown>) };
  }
  if (existing.adminId !== undefined && existing.adminId !== null && existing.adminId !== '') {
    config.params = existing;
    return;
  }
  existing.adminId = String(u._id);
  config.params = existing;
}

/**
 * Superadmin: selected branch as explicit axios `params` (dashboard/cards must match header scope).
 * Other roles: empty (interceptor adds `adminId` separately).
 */
export function buildAxiosBranchScopedParams(): Record<string, string> {
  const bid = getSuperadminBranchScopeForApi();
  return bid ? { branchId: bid } : {};
}

/**
 * When superadmin has a branch selected in the header, new staff must get that `branchId`
 * or user lists (which filter by the same branch) will stay empty.
 */
export function mergeSuperadminBranchIdForCreate<T extends Record<string, unknown>>(body: T): T {
  const bid = getSuperadminBranchScopeForApi();
  if (!bid) return body;
  const existing = body.branchId;
  if (existing !== undefined && existing !== null && String(existing).trim() !== '') {
    return body;
  }
  return { ...body, branchId: bid };
}
