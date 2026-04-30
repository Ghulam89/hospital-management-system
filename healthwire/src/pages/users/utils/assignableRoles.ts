/**
 * Roles that appear under Users → Accountant. User.role must match Role.key exactly
 * for Role.permissions → User.tabs sync (see syncUserTabsFromRole on the API).
 */

export type ApiRoleLite = {
  key: string;
  name?: string;
  isSystem?: boolean;
};

export function accountantAssignableRoles(roles: ApiRoleLite[]): ApiRoleLite[] {
  const out: ApiRoleLite[] = [];
  const seen = new Set<string>();

  const push = (r: ApiRoleLite) => {
    if (!r?.key || r.isSystem) return;
    if (seen.has(r.key)) return;
    seen.add(r.key);
    out.push(r);
  };

  for (const r of roles || []) {
    const k = String(r.key || '')
      .trim()
      .toLowerCase();
    if (!k) continue;
    if (k === 'accountant' || k.startsWith('accountant_')) push({ ...r, key: k });
  }

  if (!seen.has('accountant')) out.unshift({ key: 'accountant', name: 'Accountant (legacy)' });
  return out;
}

export function accountantRoleKeyQueryList(roles: ApiRoleLite[]): string[] {
  const keys = new Set<string>();
  keys.add('accountant');
  for (const r of accountantAssignableRoles(roles)) keys.add(r.key);
  return [...keys];
}

/** Prefer branch custom key (e.g. accountant_access) over legacy `accountant` when configuring new users */
export function preferredNewAccountantRoleKey(roles: ApiRoleLite[]): string {
  const assignable = accountantAssignableRoles(roles);
  const custom = assignable.find((x) => x.key.startsWith('accountant_'));
  return custom?.key ?? assignable.find((x) => x.key === 'accountant')?.key ?? 'accountant';
}
