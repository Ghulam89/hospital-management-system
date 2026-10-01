import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Base_url } from '../utils/Base_url';
import {
  getUserDataFromStorage,
  isSuperAdminRole,
} from '../utils/branchScope';
import {
  assignableRolesForScreen,
  preferredNewRoleKey,
  type ApiRoleLite,
  type UserRoleScreen,
} from '../pages/users/utils/assignableRoles';

type RoleRow = ApiRoleLite & {
  branchId?: string | { _id?: string; name?: string } | null;
};

type UserRoleSelectFieldProps = {
  screen: UserRoleScreen;
  branchId?: string;
  value: string;
  onChange: (key: string) => void;
  preferCustomDefault?: boolean;
  required?: boolean;
  label?: string;
};

const BLOCKED = new Set(['superadmin', 'super_admin']);

const authHeaders = () => {
  const t = localStorage.getItem('userToken') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
};

function roleBranchId(r: RoleRow): string {
  const raw = r?.branchId;
  if (raw && typeof raw === 'object' && raw !== null && '_id' in raw) {
    return String((raw as { _id?: unknown })._id || '').trim();
  }
  return String(raw || '').trim();
}

function roleBranchName(r: RoleRow): string {
  const raw = r?.branchId;
  if (raw && typeof raw === 'object' && raw !== null && 'name' in raw) {
    return String((raw as { name?: unknown }).name || '').trim();
  }
  return '';
}

function actorBranchIdFromStorage(): string {
  const u = getUserDataFromStorage();
  const raw = u?.branchId;
  if (raw && typeof raw === 'object' && raw !== null && '_id' in (raw as object)) {
    return String((raw as { _id?: unknown })._id || '').trim();
  }
  return String(raw || '').trim();
}

function normKey(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

type CollectOpts = {
  isSuperAdmin: boolean;
  actorBranchId: string;
};

/**
 * Super Admin → all roles (narrow to form branch when selected).
 * Administrator → all roles for their own branch (no screen prefix filter).
 */
function collectRoles(
  roles: RoleRow[],
  formBranchId: string,
  screen: UserRoleScreen,
  opts: CollectOpts,
): ApiRoleLite[] {
  const formBid = String(formBranchId || '').trim();
  const actorBid = String(opts.actorBranchId || '').trim();
  const out: ApiRoleLite[] = [];
  const seen = new Set<string>();

  for (const r of roles || []) {
    const key = normKey(r?.key);
    if (!key || BLOCKED.has(key)) continue;

    const rb = roleBranchId(r);
    const bName = roleBranchName(r);

    if (opts.isSuperAdmin) {
      if (formBid && rb && rb !== formBid) continue;
    } else {
      // Administrator: only own branch (+ global / no-branch templates).
      const scopeBid = formBid || actorBid;
      if (scopeBid) {
        if (rb && rb !== scopeBid) continue;
      } else if (rb) {
        continue;
      }
    }

    if (seen.has(key)) continue;
    seen.add(key);

    let label = r.name || key;
    if (opts.isSuperAdmin && !formBid && bName) {
      label = `${label} (${bName})`;
    } else if (opts.isSuperAdmin && !formBid && rb) {
      label = `${label} (branch)`;
    } else if (!rb) {
      label = opts.isSuperAdmin ? `${label} (global)` : label;
    }

    out.push({ key, name: label, isSystem: r.isSystem });
  }

  // Always offer screen legacy keys so Admin/Doctor pages are never empty
  // when the branch catalog is sparse.
  for (const legacy of assignableRolesForScreen(out, screen)) {
    const k = normKey(legacy.key);
    if (!k || seen.has(k) || BLOCKED.has(k)) continue;
    seen.add(k);
    out.push({ key: k, name: legacy.name || k });
  }

  out.sort((a, b) =>
    String(a.name || a.key).localeCompare(String(b.name || b.key), undefined, {
      sensitivity: 'base',
    }),
  );
  return out;
}

const UserRoleSelectField = ({
  screen,
  branchId = '',
  value,
  onChange,
  preferCustomDefault = false,
  required = true,
  label = 'Role',
}: UserRoleSelectFieldProps) => {
  const [options, setOptions] = useState<ApiRoleLite[]>([]);
  const [loading, setLoading] = useState(true);
  const branchKey = String(branchId || '').trim();

  const viewer = useMemo(() => {
    const u = getUserDataFromStorage();
    const superAdmin = isSuperAdminRole(u?.role);
    return {
      isSuperAdmin: superAdmin,
      actorBranchId: superAdmin ? '' : actorBranchIdFromStorage(),
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${Base_url}/apis/role/get`, { headers: authHeaders() })
      .then((res) => {
        if (cancelled) return;
        const rows: RoleRow[] = Array.isArray(res.data?.data) ? res.data.data : [];
        let assignable = collectRoles(rows, branchKey, screen, {
          isSuperAdmin: viewer.isSuperAdmin,
          actorBranchId: viewer.actorBranchId,
        });

        const current = normKey(value);
        if (current && !assignable.some((r) => r.key === current)) {
          assignable = [{ key: current, name: `${current} (current)` }, ...assignable];
        }

        setOptions(assignable);

        const keys = new Set(assignable.map((r) => r.key));
        if (preferCustomDefault && (!current || !keys.has(current))) {
          onChange(assignable[0]?.key || preferredNewRoleKey([], screen));
        } else if (!current && assignable.length) {
          onChange(assignable[0].key);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = preferredNewRoleKey([], screen);
        const legacy = assignableRolesForScreen([], screen);
        setOptions(legacy.length ? legacy : [{ key: fallback, name: fallback }]);
        if (!value) onChange(legacy[0]?.key || fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, branchKey, viewer.isSuperAdmin, viewer.actorBranchId]);

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-black dark:text-white">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading && options.length === 0}
        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
      >
        {!value && <option value="">Select role</option>}
        {options.map((r) => (
          <option key={r.key} value={r.key}>
            {r.name || r.key}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-bodydark2">
        {viewer.isSuperAdmin
          ? branchKey
            ? 'Super Admin: all roles for the selected branch (and global templates).'
            : 'Super Admin: all roles across branches. Select a branch to narrow.'
          : 'Administrator: all roles for your branch are listed.'}
      </p>
    </div>
  );
};

export default UserRoleSelectField;
