/**
 * Client-side permission helpers backed by `userData` in localStorage
 * (`tabs`: string[] capability keys, `role`: user role).
 */

import {
  MENU_ROWS,
  menuPermissionKey,
  type MenuMatrixAction,
  type MenuMatrixRow,
} from './menuPermissionCatalog';

export type { MenuMatrixRow, MenuMatrixAction };

export type StoredUser = Record<string, unknown> | null;

function normalizeRole(user: StoredUser): string {
  if (!user) return '';
  return String(user.role ?? '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** Normalize `tabs` from API/localStorage (array, legacy object map, or JSON string). */
export function coercePermissionsTabs(user: StoredUser): string[] {
  if (!user) return [];
  const raw = user.tabs as unknown;
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw as Record<string, unknown>)
      .map((t) => String(t).trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) return p.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function getTabs(user: StoredUser): Set<string> {
  return new Set(coercePermissionsTabs(user));
}

function isFullAccessRole(role: string): boolean {
  return role === 'superadmin' || role === 'administrator' || role === 'admin';
}

/**
 * Legacy: `admin` / `administrator` with no Roles matrix (`mp.*`) keep full app access.
 * If `tabs` include any `mp.*`, those users follow the matrix only — role slug `admin` must not bypass.
 */
function hasLegacyFullBranchAdminBypass(user: StoredUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (role === 'superadmin') return false;
  if (usesGranularMenuTabs(user)) return false;
  return isFullAccessRole(role);
}

export function getUserRoleSlug(user: StoredUser): string {
  return normalizeRole(user);
}

/** Legacy branch login slugs that may manage standard staff user lists (not Admin list unless superadmin). */
export function isBranchStaffAdminSlug(user: StoredUser): boolean {
  if (!user) return false;
  const r = normalizeRole(user);
  return (
    r === 'admin' ||
    r === 'administrator' ||
    r === 'branchadmin' ||
    r === 'branch_admin'
  );
}

/** Only superadmin may open the Users → Admin tab (branch `admin` / others must not manage admin accounts here). */
export function canSeeUsersAdminSubtab(user: StoredUser): boolean {
  if (!user) return false;
  return normalizeRole(user) === 'superadmin';
}

/**
 * Roles with no `mp.*` tabs — full sidebar (doctor/nurse baseline).
 * Other legacy roles rely on PATH_RULES + tab keys (`pharmacist`, `staff`, …) for menu reachability.
 */
const LEGACY_FULL_SIDEBAR_ROLES = new Set(['doctor', 'nurse']);

function pathKey(pathname: string): string {
  const p = pathname.split('?')[0] || '/';
  return p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p;
}

function matchesPrefix(path: string, prefix: string): boolean {
  if (path === prefix) return true;
  const withSlash = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return path.startsWith(withSlash);
}

const MENU_ROWS_SORTED = [...MENU_ROWS].sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);

export function menuRowForPath(pathname: string): MenuMatrixRow | null {
  const path = pathKey(pathname).toLowerCase();
  for (const row of MENU_ROWS_SORTED) {
    const pref = row.pathPrefix.toLowerCase();
    if (matchesPrefix(path, pref)) return row;
  }
  return null;
}

/** User JWT tabs include any granular sidebar key (`mp.`). */
export function usesGranularMenuTabs(user: StoredUser): boolean {
  return coercePermissionsTabs(user).some((t) => t.startsWith('mp.'));
}

/**
 * Granular UI action (create / read / update / delete) for a menu row from the Roles matrix.
 * Superadmin and branch admins: always allowed. Legacy doctor/nurse full sidebar: allowed.
 * Other users: must have the matching `mp.{menuId}.{action}` in `tabs` when granular `mp.*` is enabled.
 * Legacy tab `deletePatient` applies only when the user has no granular matrix keys (old JWT shape).
 */
export function canMenuAction(
  user: StoredUser,
  menuId: string,
  action: MenuMatrixAction,
): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (role === 'superadmin') return true;
  if (hasLegacyFullBranchAdminBypass(user)) return true;

  const row = MENU_ROWS.find((r) => r.id === menuId);
  if (!row || !row.cells[action]) return false;

  const tabs = getTabs(user);

  if (!usesGranularMenuTabs(user)) {
    if (LEGACY_FULL_SIDEBAR_ROLES.has(role)) return true;
    if (menuId === 'patients' && action === 'delete') {
      return hasAnyPermission(user, 'deletePatient');
    }
    return false;
  }

  return tabs.has(menuPermissionKey(menuId, action));
}

/**
 * True when `tabs` includes `mp.{menuId}.{action}` only (no superadmin / branch-admin / legacy doctor-nurse bypass).
 * Use to extend `canCreateUsers` / similar without treating every clinical legacy role as Users admin.
 */
export function hasGranularMenuPermission(
  user: StoredUser,
  menuId: string,
  action: MenuMatrixAction,
): boolean {
  if (!user) return false;
  const row = MENU_ROWS.find((r) => r.id === menuId);
  if (!row || !row.cells[action]) return false;
  if (!usesGranularMenuTabs(user)) return false;
  return getTabs(user).has(menuPermissionKey(menuId, action));
}

/** Any scoped Users-matrix access (for /admin/users subtabs). */
export function hasAnyUsersMenuPermission(user: StoredUser): boolean {
  if (!user) return false;
  if (!usesGranularMenuTabs(user)) return false;
  return (
    hasGranularMenuPermission(user, 'users', 'module') ||
    hasGranularMenuPermission(user, 'users', 'read') ||
    hasGranularMenuPermission(user, 'users', 'create') ||
    hasGranularMenuPermission(user, 'users', 'update') ||
    hasGranularMenuPermission(user, 'users', 'delete')
  );
}

export function getStoredUserForPermissions(): StoredUser {
  try {
    const raw = localStorage.getItem('userData');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function hasAnyPermission(user: StoredUser, ...keys: string[]): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  /** Superadmin sees all capability-gated tabs (e.g. Users) even when `tabs` is empty. */
  if (role === 'superadmin') return true;
  const tabs = getTabs(user);
  for (const key of keys) {
    if (!key) continue;
    const asRole = key.toLowerCase().replace(/\s+/g, '');
    if (role === asRole) return true;
    if (tabs.has(key)) return true;
  }
  return false;
}

/** Superadmin sees every Users subtab without per-tab filtering; branch admins use legacy/mp checks below. */
export function canAccessAllUsersRoleTabs(user: StoredUser): boolean {
  if (!user) return false;
  return normalizeRole(user) === 'superadmin';
}

export function canCreateUsers(user: StoredUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (role === 'superadmin') return true;
  if (hasLegacyFullBranchAdminBypass(user)) return true;
  if (hasAnyPermission(user, 'createUsers')) return true;
  return hasGranularMenuPermission(user, 'users', 'create');
}

export function canEditUsers(user: StoredUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (role === 'superadmin') return true;
  if (hasLegacyFullBranchAdminBypass(user)) return true;
  if (hasAnyPermission(user, 'editUsers', 'createUsers')) return true;
  return hasGranularMenuPermission(user, 'users', 'update');
}

export function canDeleteUsers(user: StoredUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (role === 'superadmin') return true;
  if (hasLegacyFullBranchAdminBypass(user)) return true;
  if (hasAnyPermission(user, 'deleteUsers')) return true;
  return hasGranularMenuPermission(user, 'users', 'delete');
}

/** Longest-prefix wins; first matching rule in array order for same length. */
const PATH_RULES: { prefix: string; anyOf: string[] }[] = [
  {
    prefix: '/admin/pharmacy',
    anyOf: [
      'pharmacist',
      'pharmacyOrders',
      'viewPharmacyReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/admin/items/pharmacy',
    anyOf: [
      'pharmacist',
      'pharmacyOrders',
      'viewPharmacyReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/admin/health-records',
    anyOf: [
      'doctor',
      'nurse',
      'staff',
      'createUsers',
      'editUsers',
      'viewOtherReports',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/admin/beds',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/bed-allocation',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/admin/general-consultations',
    anyOf: [
      'doctor',
      'nurse',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/admin/patients',
    anyOf: [
      'doctor',
      'nurse',
      'staff',
      'createUsers',
      'editUsers',
      'deletePatient',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/admin/users',
    anyOf: ['createUsers', 'editUsers', 'administrator', 'superadmin', 'admin'],
  },
  {
    prefix: '/quality-control-manager',
    anyOf: ['createUsers', 'editUsers', 'administrator', 'superadmin', 'admin'],
  },
  {
    prefix: '/pharmacist',
    anyOf: [
      'pharmacist',
      'pharmacyOrders',
      'viewPharmacyReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/admin/roles',
    /** Role names only — granular users use `menuRowForPath` + `mp.roles.*`; avoid legacy tabs accidentally opening this screen. */
    anyOf: ['administrator', 'superadmin', 'admin'],
  },
  {
    prefix: '/admin/branches',
    anyOf: ['superadmin', 'administrator', 'admin', 'branchadmin', 'branch_admin'],
  },
  {
    prefix: '/appointments',
    anyOf: [
      'doctor',
      'nurse',
      'staff',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/invoice',
    anyOf: [
      'accountant',
      'staff',
      'editInvoice',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/financial/financial-report',
    anyOf: [
      'accountant',
      'staff',
      'viewFinancialReports',
      'viewFinanicalReports',
      'viewOtherReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/opd/opd-report',
    anyOf: [
      'doctor',
      'nurse',
      'viewOtherReports',
      'viewFinanicalReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/patients/patients-report',
    anyOf: [
      'doctor',
      'nurse',
      'viewOtherReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/department',
    anyOf: ['createUsers', 'editUsers', 'administrator', 'superadmin', 'admin'],
  },
  {
    prefix: '/procedures',
    anyOf: ['createUsers', 'editUsers', 'administrator', 'superadmin', 'admin'],
  },
  {
    prefix: '/expense-categories',
    anyOf: [
      'accountant',
      'staff',
      'editExpenses',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/expense',
    anyOf: [
      'accountant',
      'staff',
      'editExpenses',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/ward',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/rooms',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/bed-details',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/room-details',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/discharge-patients',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/Indoor-duty-roster',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/birth-reports',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
  {
    prefix: '/death-reports',
    anyOf: [
      'doctor',
      'nurse',
      'viewIPDReports',
      'createUsers',
      'editUsers',
      'administrator',
      'superadmin',
      'admin',
    ],
  },
];

const SORTED_PATH_RULES = [...PATH_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

/**
 * Add/edit user flows live under paths other than `/admin/users`. Users with Roles-matrix
 * `mp.users.*` must still open these routes when they can open the Users module.
 */
function matchesUsersManagementExtendedPath(pathLower: string): boolean {
  if (matchesPrefix(pathLower, '/nurse/')) return true;
  if (matchesPrefix(pathLower, '/accountant/')) return true;
  if (matchesPrefix(pathLower, '/staff/')) return true;
  if (matchesPrefix(pathLower, '/pharmacist/')) return true;
  if (matchesPrefix(pathLower, '/quality-control-manager/')) return true;
  if (pathLower === '/doctor/new' || matchesPrefix(pathLower, '/doctor/update/')) return true;
  return false;
}

function isAlwaysAllowedPath(path: string): boolean {
  return path === '/' || path === '/dashboard' || path === '/profile';
}

export function canAccessPath(user: StoredUser, pathname: string): boolean {
  const path = pathKey(pathname);
  if (isAlwaysAllowedPath(path)) return true;
  if (path.includes('/forms/form-elements')) return true;

  if (!user) return false;

  const role = normalizeRole(user);
  /** Superadmin: unrestricted app + all branches + HQ screens. */
  if (role === 'superadmin') return true;

  /**
   * Legacy branch admins (`admin`, `administrator` without `mp.*`) — full app incl. view-only Branches for own branch.
   */
  if (hasLegacyFullBranchAdminBypass(user)) {
    return true;
  }

  const tabs = getTabs(user);

  if (usesGranularMenuTabs(user)) {
    const scoped = pathKey(pathname).toLowerCase();
    if (matchesPrefix(scoped, '/admin/branches') && isBranchStaffAdminSlug(user)) {
      return true;
    }
    if (matchesUsersManagementExtendedPath(scoped)) {
      return (
        hasGranularMenuPermission(user, 'users', 'module') ||
        hasGranularMenuPermission(user, 'users', 'read')
      );
    }
    const row = menuRowForPath(pathname);
    if (row) {
      return (
        tabs.has(menuPermissionKey(row.id, 'module')) || tabs.has(menuPermissionKey(row.id, 'read'))
      );
    }
    return false;
  }

  const satisfies = (keys: string[]) =>
    keys.some((k) => {
      const asRole = k.toLowerCase().replace(/\s+/g, '');
      if (!asRole) return false;
      if (tabs.has(k)) return true;
      if (role === asRole) return true;
      /** Custom Role keys reuse catalog bases (e.g. `pharmacist_dha`, `accountant_access`). */
      if (role.startsWith(`${asRole}_`)) return true;
      return false;
    });

  for (const rule of SORTED_PATH_RULES) {
    if (matchesPrefix(path, rule.prefix)) {
      return satisfies(rule.anyOf);
    }
  }

  /** Routes not matched above: keep legacy built-in roles permissive; deny unknown layouts for custom roles without mp.* tabs */
  if (!usesGranularMenuTabs(user) && LEGACY_FULL_SIDEBAR_ROLES.has(role)) {
    return true;
  }
  return false;
}

/**
 * Sidebar item visibility — uses `mp.*` matrix when enabled; otherwise mirrors `canAccessPath` for that row’s route prefix
 * so legacy catalog roles (`pharmacist`, `staff`, …) aren’t stuck with Dashboard-only menus.
 */
export function canSeeSidebarMenu(user: StoredUser, menuId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (menuId === 'branches') {
    if (role === 'superadmin') return true;
    if (isBranchStaffAdminSlug(user)) return true;
    if (hasLegacyFullBranchAdminBypass(user)) return true;
    const tabs = getTabs(user);
    if (!usesGranularMenuTabs(user)) return false;
    const mk = menuPermissionKey('branches', 'module');
    const rk = menuPermissionKey('branches', 'read');
    return tabs.has(mk) || tabs.has(rk);
  }
  if (menuId === 'roles') {
    if (role === 'superadmin') return true;
    if (hasLegacyFullBranchAdminBypass(user)) return true;
    const tabs = getTabs(user);
    if (!usesGranularMenuTabs(user)) return false;
    const mk = menuPermissionKey('roles', 'module');
    const rk = menuPermissionKey('roles', 'read');
    return tabs.has(mk) || tabs.has(rk);
  }
  if (role === 'superadmin') return true;
  if (hasLegacyFullBranchAdminBypass(user)) return true;
  const tabs = getTabs(user);
  if (!usesGranularMenuTabs(user)) {
    if (LEGACY_FULL_SIDEBAR_ROLES.has(role)) return true;
    const row = MENU_ROWS.find((r) => r.id === menuId);
    if (row) {
      const p = row.pathPrefix.startsWith('/') ? row.pathPrefix : `/${row.pathPrefix}`;
      if (canAccessPath(user, p)) return true;
    }
    /** Role key/API mismatch leaving empty tabs */
    if (tabs.size === 0 && menuId === 'dashboard') return true;
    return false;
  }
  const mk = menuPermissionKey(menuId, 'module');
  const rk = menuPermissionKey(menuId, 'read');
  return tabs.has(mk) || tabs.has(rk);
}

/** Show a submenu section when at least one child route is permitted (group headers). */
export function canSeeAnySidebarMenu(user: StoredUser, menuIds: string[]): boolean {
  if (!menuIds.length) return false;
  return menuIds.some((id) => canSeeSidebarMenu(user, id));
}
