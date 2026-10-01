/**
 * Roles that appear under each Users screen.
 * Sync to Roles & Permissions happens only on exact Role.key === User.role
 * (no admin↔administrator alias, no auto-create).
 */

export type ApiRoleLite = {
  key: string;
  name?: string;
  isSystem?: boolean;
};

export type UserRoleScreen =
  | 'accountant'
  | 'nurse'
  | 'pharmacist'
  | 'staff'
  | 'quality_control_manager'
  | 'administrator'
  | 'doctor';

const BLOCKED = new Set(['superadmin', 'super_admin']);

function normKey(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

export function roleMatchesScreen(key: string, screen: UserRoleScreen): boolean {
  const k = normKey(key);
  if (!k || BLOCKED.has(k)) return false;
  switch (screen) {
    case 'accountant':
      return k === 'accountant' || k.startsWith('accountant_');
    case 'nurse':
      return k === 'nurse' || k.startsWith('nurse_');
    case 'pharmacist':
      return (
        k === 'pharmacist' ||
        k.startsWith('pharmacist_') ||
        k === 'sale' ||
        k === 'sales' ||
        k.startsWith('sale_') ||
        k.startsWith('sales_') ||
        k === 'pos' ||
        k.startsWith('pos_')
      );
    case 'quality_control_manager':
      return (
        k === 'quality_control_manager' || k.startsWith('quality_control_manager_')
      );
    case 'staff':
      return (
        k === 'staff' ||
        k === 'reception' ||
        k === 'receptionist' ||
        k.startsWith('staff_') ||
        k.startsWith('reception_') ||
        k.startsWith('receptionist_') ||
        k.endsWith('_reception') ||
        k.includes('reception')
      );
    case 'administrator':
      // Admin screen: classic keys OR any custom Roles Manage key (not a staff screen family)
      if (
        k === 'administrator' ||
        k === 'admin' ||
        k === 'branchadmin' ||
        k === 'branch_admin' ||
        k.startsWith('administrator_') ||
        k.startsWith('admin_')
      ) {
        return true;
      }
      return !(
        k === 'doctor' ||
        k.startsWith('doctor_') ||
        k === 'nurse' ||
        k.startsWith('nurse_') ||
        k === 'pharmacist' ||
        k === 'sale' ||
        k === 'sales' ||
        k === 'pos' ||
        k.startsWith('pharmacist_') ||
        k === 'accountant' ||
        k.startsWith('accountant_') ||
        k === 'staff' ||
        k.startsWith('staff_') ||
        k === 'reception' ||
        k === 'receptionist' ||
        k.includes('reception') ||
        k === 'quality_control_manager' ||
        k.startsWith('quality_control_manager_') ||
        k === 'superadmin' ||
        k === 'super_admin'
      );
    case 'doctor':
      return k === 'doctor' || k.startsWith('doctor_');
    default:
      return false;
  }
}

const LEGACY_LABELS: Partial<Record<UserRoleScreen, string>> = {
  accountant: 'Accountant (legacy)',
  nurse: 'Nurse (legacy)',
  pharmacist: 'Pharmacist (legacy)',
  staff: 'Staff (legacy)',
  quality_control_manager: 'Quality Control Manager (legacy)',
  administrator: 'Administrator (legacy)',
  doctor: 'Doctor (legacy)',
};

const LEGACY_KEYS: Record<UserRoleScreen, string> = {
  accountant: 'accountant',
  nurse: 'nurse',
  pharmacist: 'pharmacist',
  staff: 'staff',
  quality_control_manager: 'quality_control_manager',
  administrator: 'administrator',
  doctor: 'doctor',
};

/** Custom / template roles for a user-management screen (skips isSystem catalog rows). */
export function assignableRolesForScreen(
  roles: ApiRoleLite[],
  screen: UserRoleScreen,
): ApiRoleLite[] {
  const out: ApiRoleLite[] = [];
  const seen = new Set<string>();

  const push = (r: ApiRoleLite) => {
    const key = normKey(r?.key);
    if (!key || r.isSystem) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...r, key });
  };

  for (const r of roles || []) {
    if (roleMatchesScreen(r.key, screen)) push(r);
  }

  const legacy = LEGACY_KEYS[screen];
  if (!seen.has(legacy)) {
    out.unshift({ key: legacy, name: LEGACY_LABELS[screen] || legacy });
  }

  if (screen === 'staff') {
    for (const extra of ['reception', 'receptionist'] as const) {
      if (!seen.has(extra)) {
        out.push({
          key: extra,
          name: extra === 'reception' ? 'Reception (legacy)' : 'Receptionist (legacy)',
        });
        seen.add(extra);
      }
    }
  }

  if (screen === 'administrator' && !seen.has('admin')) {
    out.push({ key: 'admin', name: 'Admin (legacy)' });
  }

  return out;
}

/** Prefer a custom keyed role (e.g. nurse_opd) over the legacy base slug for new users. */
export function preferredNewRoleKey(
  roles: ApiRoleLite[],
  screen: UserRoleScreen,
): string {
  const assignable = assignableRolesForScreen(roles, screen);
  const prefix = `${LEGACY_KEYS[screen]}_`;
  const custom = assignable.find((x) => x.key.startsWith(prefix));
  if (custom) return custom.key;
  if (screen === 'staff') {
    const receptionCustom = assignable.find(
      (x) =>
        x.key.startsWith('reception_') ||
        x.key.startsWith('receptionist_') ||
        x.key.includes('reception'),
    );
    if (
      receptionCustom &&
      receptionCustom.key !== 'reception' &&
      receptionCustom.key !== 'receptionist'
    ) {
      return receptionCustom.key;
    }
  }
  if (screen === 'administrator') {
    const adminCustom = assignable.find((x) => {
      const k = String(x.key || '').toLowerCase();
      if (!k || k === 'administrator' || k === 'admin') return false;
      return roleMatchesScreen(k, 'administrator');
    });
    if (adminCustom) return adminCustom.key;
  }
  return (
    assignable.find((x) => x.key === LEGACY_KEYS[screen])?.key ||
    LEGACY_KEYS[screen]
  );
}

/** @deprecated use assignableRolesForScreen(..., 'accountant') */
export function accountantAssignableRoles(roles: ApiRoleLite[]): ApiRoleLite[] {
  return assignableRolesForScreen(roles, 'accountant');
}

/** @deprecated use preferredNewRoleKey(..., 'accountant') */
export function preferredNewAccountantRoleKey(roles: ApiRoleLite[]): string {
  return preferredNewRoleKey(roles, 'accountant');
}

export function accountantRoleKeyQueryList(roles: ApiRoleLite[]): string[] {
  const keys = new Set<string>();
  keys.add('accountant');
  for (const r of assignableRolesForScreen(roles, 'accountant')) keys.add(r.key);
  return [...keys];
}
