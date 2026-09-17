import { useEffect, useState } from 'react';
import axios from 'axios';
import { Base_url } from '../utils/Base_url';
import {
  assignableRolesForScreen,
  preferredNewRoleKey,
  type ApiRoleLite,
  type UserRoleScreen,
} from '../pages/users/utils/assignableRoles';

type UserRoleSelectFieldProps = {
  screen: UserRoleScreen;
  value: string;
  onChange: (key: string) => void;
  /** When true (add forms), prefer a custom role key once the catalog loads */
  preferCustomDefault?: boolean;
  required?: boolean;
  label?: string;
};

const authHeaders = () => {
  const t = localStorage.getItem('userToken') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/**
 * Loads Role catalog and offers screen-scoped keys (e.g. nurse + nurse_*).
 * Selecting a key lets the API sync User.tabs from Role.permissions.
 */
const UserRoleSelectField = ({
  screen,
  value,
  onChange,
  preferCustomDefault = false,
  required = true,
  label = 'Role',
}: UserRoleSelectFieldProps) => {
  const [options, setOptions] = useState<ApiRoleLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get(`${Base_url}/apis/role/get`, { headers: authHeaders() })
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        const assignable = assignableRolesForScreen(rows, screen);
        setOptions(assignable);

        const current = String(value || '')
          .trim()
          .toLowerCase();
        const keys = new Set(assignable.map((r) => r.key));

        if (preferCustomDefault && (!current || !keys.has(current))) {
          onChange(preferredNewRoleKey(rows, screen));
          return;
        }
        if (current && !keys.has(current)) {
          setOptions((prev) => [
            { key: current, name: `${current} (current)` },
            ...prev,
          ]);
        } else if (!current && assignable.length) {
          onChange(preferredNewRoleKey(rows, screen));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when screen changes
  }, [screen]);

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
        Permissions come from Roles → this key. Sidebar updates after save (and on next
        navigation via /user/me).
      </p>
    </div>
  );
};

export default UserRoleSelectField;
