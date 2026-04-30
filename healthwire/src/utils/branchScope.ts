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
  return s.toLowerCase().replace(/\s+/g, '');
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

  const p = config.params;
  if (p instanceof URLSearchParams) {
    if (!p.has('branchId') || p.get('branchId') === '') {
      p.set('branchId', branchId);
    }
    config.params = p;
    return;
  }

  let existing: Record<string, unknown> = {};
  if (p && typeof p === 'object' && !Array.isArray(p)) {
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
 * When the URL itself carries query params (`.../get?page=1&...`), axios may still omit merging;
 * append branch scope onto `config.url` so appointments/dashboard/opd lists honor branch filters.
 */
export function mergeBranchScopeIntoRequestUrl(config: { url?: string }): void {
  const raw = config.url;
  if (!raw || typeof raw !== 'string') return;
  if (!raw.includes('/apis/') || raw.includes('/apis/login/')) return;

  let parsed: URL;
  try {
    parsed = raw.includes('://') ? new URL(raw) : new URL(raw, 'http://127.0.0.1');
  } catch {
    return;
  }

  if (shouldSuggestBranchIdQuery()) {
    const bid = getSuperadminSelectedBranchId();
    if (bid && (!parsed.searchParams.has('branchId') || parsed.searchParams.get('branchId') === '')) {
      parsed.searchParams.set('branchId', bid);
    }
  }

  const u = getUserDataFromStorage();
  if (u?._id && !isSuperAdminRole(u.role)) {
    if (!parsed.searchParams.has('adminId') || parsed.searchParams.get('adminId') === '') {
      parsed.searchParams.set('adminId', String(u._id));
    }
  }

  config.url = raw.includes('://') ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Superadmin: selected branch as explicit axios `params` (dashboard/cards must match header scope).
 * Other roles: empty (interceptor adds `adminId` separately).
 */
export function buildAxiosBranchScopedParams(): Record<string, string> {
  const u = getUserDataFromStorage();
  if (!u || !isSuperAdminRole(u.role)) return {};
  const bid = getSuperadminSelectedBranchId();
  return bid ? { branchId: bid } : {};
}
