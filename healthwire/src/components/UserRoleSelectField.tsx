import { useEffect, useState } from 'react';
import axios from 'axios';
import { Base_url } from '../utils/Base_url';
import {
  preferredNewRoleKey,
  type ApiRoleLite,
  type UserRoleScreen,
} from '../pages/users/utils/assignableRoles';

type RoleRow = ApiRoleLite & {
  branchId?: string | { _id?: string } | null;
};

type UserRoleSelectFieldProps = {
  /** Fallback default key family if catalog is empty */
  screen: UserRoleScreen;
  /** When set, only that branch’s roles + global (no-branch) templates are listed */
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

function normKey(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * All assignable roles for a branch:
 * - roles owned by that branchId
 * - global templates (no branchId)
 * If branchId is empty → full catalog (minus blocked keys).
 */
function collectRoles(roles: RoleRow[], branchId: string): ApiRoleLite[] {
  const bid = String(branchId || '').trim();
  const out: ApiRoleLite[] = [];
  const seen = new Set<string>();

  for (const r of roles || []) {
    const key = normKey(r?.key);
    if (!key || BLOCKED.has(key)) continue;
    const rb = roleBranchId(r);
    if (bid && rb && rb !== bid) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, name: r.name || key, isSystem: r.isSystem });
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${Base_url}/apis/role/get`, { headers: authHeaders() })
      .then((res) => {
        if (cancelled) return;
        const rows: RoleRow[] = Array.isArray(res.data?.data) ? res.data.data : [];
        let assignable = collectRoles(rows, branchKey);

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
        setOptions([{ key: fallback, name: fallback }]);
        if (!value) onChange(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, branchKey]);

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
        {branchKey
          ? 'All roles for this branch (and global templates) are listed.'
          : 'Select a branch to narrow roles to that branch.'}{' '}
        Permissions sync from Roles after save.
      </p>
    </div>
  );
};

export default UserRoleSelectField;
