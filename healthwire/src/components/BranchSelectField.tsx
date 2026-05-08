import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Base_url } from '../utils/Base_url';

type BranchOption = { _id: string; name: string };

type BranchSelectFieldProps = {
  value: string;
  onChange: (id: string) => void;
  /** Show * marker on the label */
  required?: boolean;
};

/**
 * Branch select for user add/edit forms.
 * - Superadmin: enabled select with full branch list.
 * - Other roles: disabled select with the user's own branch pre-selected
 *   (their token's branch scope is usually the only branch the API returns anyway).
 */
const BranchSelectField = ({ value, onChange, required = true }: BranchSelectFieldProps) => {
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('userData');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const currentRole = String(currentUser?.role || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  const isSuperAdmin = currentRole === 'superadmin';

  useEffect(() => {
    const token = localStorage.getItem('userToken') || '';
    axios
      .get(`${Base_url}/apis/branch/get`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => setBranches(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    if (isSuperAdmin) return;
    if (value) return;
    const own =
      (currentUser?.branchId && (currentUser.branchId._id || currentUser.branchId)) || '';
    if (own) onChange(String(own));
  }, [isSuperAdmin, currentUser, value, onChange]);

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-black dark:text-white">
        Branch {required && <span className="text-danger">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!isSuperAdmin}
        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
      >
        <option value="">Select Branch</option>
        {branches.map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default BranchSelectField;
