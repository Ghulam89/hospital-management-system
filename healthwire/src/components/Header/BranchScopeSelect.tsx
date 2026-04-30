import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Select, Spin } from 'antd';
import { Base_url } from '../../utils/Base_url';
import {
  BRANCH_CHANGED_EVENT,
  getSuperadminSelectedBranchId,
  getUserDataFromStorage,
  isSuperAdminRole,
  setSuperadminSelectedBranchId,
} from '../../utils/branchScope';

type BranchRow = { _id: string; name: string; code?: string };

const BranchScopeSelect = () => {
  /** Re-read each render so superadmin sees the dropdown after login without full page reload. */
  const isSuper = isSuperAdminRole(getUserDataFromStorage()?.role);

  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string | undefined>(
    () => getSuperadminSelectedBranchId() || undefined
  );

  const loadBranches = useCallback(() => {
    if (!isSuper) return;
    setLoading(true);
    axios
      .get(`${Base_url}/apis/branch/get`, { params: { limit: 500, page: 1 } })
      .then((res) => {
        setBranches((res.data?.data || []) as BranchRow[]);
      })
      .catch(() => {
        setBranches([]);
      })
      .finally(() => setLoading(false));
  }, [isSuper]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    const sync = () => setValue(getSuperadminSelectedBranchId() || undefined);
    window.addEventListener(BRANCH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(BRANCH_CHANGED_EVENT, sync);
  }, []);

  if (!isSuper) return null;

  return (
    <div className="min-w-[140px] max-w-[min(100vw-8rem,260px)] sm:min-w-[200px]">
      <Select
        showSearch
        allowClear
        placeholder="All branches"
        className="w-full"
        loading={loading}
        value={value}
        optionFilterProp="label"
        notFoundContent={loading ? <Spin size="small" /> : null}
        options={branches.map((b) => ({
          value: b._id,
          label: b.code ? `${b.name} (${b.code})` : b.name,
        }))}
        onChange={(v) => {
          const next = v != null && v !== '' ? String(v) : '';
          setValue(next || undefined);
          setSuperadminSelectedBranchId(next || null);
        }}
      />
    </div>
  );
};

export default BranchScopeSelect;
