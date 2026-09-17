import { useEffect, useMemo, useState } from 'react';
import { Select } from 'antd';
import axios from 'axios';
import { Base_url } from '../utils/Base_url';
import {
  getUserDataFromStorage,
  isSuperAdminRole,
} from '../utils/branchScope';

type BranchOption = { _id: string; name: string };

type BranchMultiSelectFieldProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  required?: boolean;
  label?: string;
};

function ownBranchIdFromUser(user: Record<string, unknown> | null): string {
  if (!user) return '';
  const raw = user.branchId;
  if (raw && typeof raw === 'object' && raw !== null && '_id' in raw) {
    return String((raw as { _id?: unknown })._id || '').trim();
  }
  return String(raw || '').trim();
}

/**
 * Multi-branch select for doctor registration / edit.
 * Superadmin: pick one or more branches (searchable).
 * Branch admin: locked to their own branch (single).
 */
const BranchMultiSelectField = ({
  value,
  onChange,
  required = true,
  label = 'Branches',
}: BranchMultiSelectFieldProps) => {
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const currentUser = useMemo(() => getUserDataFromStorage(), []);
  const isSuperAdmin = isSuperAdminRole(currentUser?.role);
  const ownBranchId = ownBranchIdFromUser(currentUser);

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
    if (ownBranchId && (!value.length || !value.includes(ownBranchId) || value[0] !== ownBranchId)) {
      onChange([ownBranchId]);
    }
  }, [isSuperAdmin, ownBranchId, value, onChange]);

  return (
    <div className="w-full">
      <label className="mb-2.5 block text-black dark:text-white">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <Select
        mode={isSuperAdmin ? 'multiple' : undefined}
        allowClear={isSuperAdmin}
        disabled={!isSuperAdmin}
        className="w-full"
        placeholder={isSuperAdmin ? 'Select one or more branches' : 'Branch'}
        value={isSuperAdmin ? value : ownBranchId || value[0] || undefined}
        onChange={(v) => {
          if (isSuperAdmin) {
            onChange(Array.isArray(v) ? v.map(String) : []);
          } else {
            onChange(ownBranchId ? [ownBranchId] : v ? [String(v)] : []);
          }
        }}
        options={branches.map((b) => ({ value: b._id, label: b.name }))}
        optionFilterProp="label"
        showSearch
        maxTagCount="responsive"
      />
      {isSuperAdmin ? (
        <p className="mt-1 text-xs text-gray-500">
          Doctor will appear in each selected branch (one profile per branch).
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">
          Locked to your branch. Multi-branch assignment is super-admin only.
        </p>
      )}
    </div>
  );
};

export default BranchMultiSelectField;
