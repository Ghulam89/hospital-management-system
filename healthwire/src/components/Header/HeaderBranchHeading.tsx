import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Base_url } from '../../utils/Base_url';
import {
  BRANCH_CHANGED_EVENT,
  getSuperadminSelectedBranchId,
  getUserDataFromStorage,
  isSuperAdminRole,
} from '../../utils/branchScope';

type BranchRow = { _id: string; name: string; code?: string };

function branchIdFromUser(u: Record<string, unknown> | null): string | null {
  if (!u) return null;
  const b = u.branchId as unknown;
  if (b == null || b === '') return null;
  if (typeof b === 'object' && b !== null && '_id' in b) {
    return String((b as { _id: string })._id);
  }
  return String(b);
}

function branchNameFromPopulatedUser(u: Record<string, unknown> | null): string | null {
  if (!u) return null;
  const b = u.branchId as unknown;
  if (b && typeof b === 'object' && b !== null && 'name' in b) {
    const n = (b as { name?: string }).name;
    if (n && String(n).trim()) return String(n);
  }
  return null;
}

/**
 * Left navbar title: branch name for branch users; superadmin sees "All branches" or selected branch.
 */
const HeaderBranchHeading = () => {
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');

  const resolveSuperLabel = useCallback(
    (branches: BranchRow[], selectedId: string | null) => {
      if (!selectedId) {
        return { t: 'All branches', s: 'Super admin' };
      }
      const row = branches.find((b) => String(b._id) === String(selectedId));
      const name = row
        ? row.code
          ? `${row.name} (${row.code})`
          : row.name
        : 'Branch';
      return { t: name, s: 'Super admin · scoped view' };
    },
    [],
  );

  const refresh = useCallback(() => {
    const u = getUserDataFromStorage();
    if (!u) {
      setTitle('');
      setSubtitle('');
      return;
    }

    if (isSuperAdminRole(u.role)) {
      setSubtitle('Super admin');
      const selectedId = getSuperadminSelectedBranchId();
      axios
        .get(`${Base_url}/apis/branch/get`, { params: { limit: 500, page: 1 } })
        .then((res) => {
          const branches = (res.data?.data || []) as BranchRow[];
          const { t, s } = resolveSuperLabel(branches, selectedId);
          setTitle(t);
          setSubtitle(s);
        })
        .catch(() => {
          setTitle(selectedId ? 'Selected branch' : 'All branches');
          setSubtitle('Super admin');
        });
      return;
    }

    setSubtitle('Branch');
    const directName = branchNameFromPopulatedUser(u);
    if (directName) {
      setTitle(directName);
      return;
    }

    const bid = branchIdFromUser(u);
    if (!bid) {
      setTitle('');
      setSubtitle('');
      return;
    }

    axios
      .get(`${Base_url}/apis/branch/get/${bid}`)
      .then((res) => {
        const b = res.data?.data as BranchRow | undefined;
        if (b?.name) {
          setTitle(b.code ? `${b.name} (${b.code})` : b.name);
        } else {
          setTitle('Branch');
        }
      })
      .catch(() => {
        setTitle('Branch');
      });
  }, [resolveSuperLabel]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onBranchChange = () => refresh();
    window.addEventListener(BRANCH_CHANGED_EVENT, onBranchChange);
    return () => window.removeEventListener(BRANCH_CHANGED_EVENT, onBranchChange);
  }, [refresh]);

  if (!title) return null;

  return (
    <div className="min-w-0 flex-1 pr-1">
      <div className="min-w-0 pl-0.5 sm:pl-0 lg:pl-1">
        {subtitle ? (
          <p className="truncate text-xs font-medium uppercase tracking-wide text-body dark:text-bodydark">
            {subtitle}
          </p>
        ) : null}
        <h1 className="truncate text-base font-semibold text-black dark:text-white md:text-lg">{title}</h1>
      </div>
    </div>
  );
};

export default HeaderBranchHeading;
