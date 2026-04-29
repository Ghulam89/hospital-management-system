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
 * Old staff roles stored without `mp.*` keys — keep prior behaviour (full sidebar).
 * Custom roles created in Roles & Permissions use arbitrary keys (e.g. `amp_reception`);
 * those MUST rely on `mp.*` in JWT or the sidebar stays minimal / empty.
 */
/** Do not include `staff` / `accountant` — those strings collide with Roles matrix keys and broke granular sidebar. */
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

/** Sidebar link visibility — requires read or module when granular tabs are enabled. */
export function canSeeSidebarMenu(user: StoredUser, menuId: string): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  /** HQ branch management (/admin/branches): superadmin only; branch admins use scoped data APIs elsewhere. */
  if (menuId === 'branches') {
    if (role === 'superadmin') return true;
    const tabs = getTabs(user);
    if (!usesGranularMenuTabs(user)) return false;
    const mk = menuPermissionKey('branches', 'module');
    const rk = menuPermissionKey('branches', 'read');
    return tabs.has(mk) || tabs.has(rk);
  }
  /**
   * Roles & permissions UI: superadmin + branch admins always; everyone else needs explicit
   * `mp.roles.module` / `mp.roles.read` (assigned users must not inherit this unless granted).
   */
  if (menuId === 'roles') {
    if (role === 'superadmin') return true;
    if (isFullAccessRole(role)) return true;
    const tabs = getTabs(user);
    if (!usesGranularMenuTabs(user)) return false;
    const mk = menuPermissionKey('roles', 'module');
    const rk = menuPermissionKey('roles', 'read');
    return tabs.has(mk) || tabs.has(rk);
  }
  if (role === 'superadmin') return true;
  if (isFullAccessRole(role)) return true;
  const tabs = getTabs(user);
  if (!usesGranularMenuTabs(user)) {
    if (LEGACY_FULL_SIDEBAR_ROLES.has(role)) return true;
    /** No mp.* tabs (e.g. Role key mismatch before server fix): show Dashboard link only so menu is not blank */
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

/** Superadmin and branch admins see every Users subtab without relying on JWT `tabs` keys. */
export function canAccessAllUsersRoleTabs(user: StoredUser): boolean {
  if (!user) return false;
  return isFullAccessRole(normalizeRole(user));
}

export function canCreateUsers(user: StoredUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (isFullAccessRole(role)) return true;
  return hasAnyPermission(user, 'createUsers');
}

export function canEditUsers(user: StoredUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (isFullAccessRole(role)) return true;
  return hasAnyPermission(user, 'editUsers', 'createUsers');
}

export function canDeleteUsers(user: StoredUser): boolean {
  if (!user) return false;
  const role = normalizeRole(user);
  if (isFullAccessRole(role)) return true;
  return hasAnyPermission(user, 'deleteUsers');
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
    prefix: '/admin/roles',
    /** Role names only — granular users use `menuRowForPath` + `mp.roles.*`; avoid legacy tabs accidentally opening this screen. */
    anyOf: ['administrator', 'superadmin', 'admin'],
  },
  {
    prefix: '/admin/branches',
    anyOf: ['superadmin'],
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
   * Branch admins (`admin`, `administrator`) keep full access inside their branch data model,
   * but cannot open the global Branches HQ UI (backend already restricts mutations).
   */
  if (isFullAccessRole(role)) {
    const hq = matchesPrefix(path.toLowerCase(), '/admin/branches');
    if (hq) return false;
    return true;
  }

  const tabs = getTabs(user);

  if (usesGranularMenuTabs(user)) {
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
      if (role === asRole) return true;
      if (tabs.has(k)) return true;
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
