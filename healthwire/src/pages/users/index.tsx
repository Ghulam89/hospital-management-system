import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import Tabs from '../../components/Tabs/Tabs';
import { Base_url } from '../../utils/Base_url';
import Accountant from './Accountant';
import Admin from './Admin';
import Doctor from './Doctor';
import Nurse from './Nurse';
import Pharmacist from './Pharmacist';
import QualityControlManager from './QualityControlManager';
import Staff from './Staff';
import {
  canAccessAllUsersRoleTabs,
  canSeeUsersAdminSubtab,
  getStoredUserForPermissions,
  getUserRoleSlug,
  hasAnyPermission,
  hasAnyUsersMenuPermission,
  isBranchStaffAdminSlug,
} from '../../utils/permissions';

/** Subtabs for managing users of that type — shown only when JWT role slug matches (granular users). */
const USERS_TAB_ROLE_SLUG: Record<string, string> = {
  Accountant: 'accountant',
  Doctor: 'doctor',
  Nurse: 'nurse',
  Pharmacist: 'pharmacist',
  'Quality Control Manager': 'quality_control_manager',
  Staff: 'staff',
};

/** Custom role keys (e.g. `reception_xyz`, `amp_reception`) map to Staff / reception lists. */
function matchesStaffLikeRoleSlug(r: string): boolean {
  const x = String(r || '').trim().toLowerCase();
  if (!x) return false;
  if (x === 'staff' || x.startsWith('staff_')) return true;
  if (x === 'reception' || x === 'receptionist' || x.startsWith('reception_')) return true;
  /** e.g. `amp_reception`, legacy keys with `_reception` embedded */
  if (x.includes('_reception')) return true;
  return false;
}

function slugMatchesTabSlug(userSlug: string, tabSlug: string): boolean {
  const r = userSlug.trim().toLowerCase();
  const base = tabSlug.trim().toLowerCase();
  if (!r || !base) return false;
  if (r === base) return true;
  /** Custom Roles keys — same pattern as Accountant (`accountant_access`) */
  const prefix = `${base}_`;
  return r.startsWith(prefix);
}

/** Tabs branch admins use to add/manage operational staff (not the HQ Admin user list). */
const BRANCH_STAFF_USER_SUBTABS = ['Accountant', 'Doctor', 'Nurse', 'Pharmacist', 'Staff'] as const;

const Users = () => {
  const { pathname } = useLocation();
  const [permTick, setPermTick] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) return;
    let cancelled = false;
    axios
      .get(`${Base_url}/apis/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data && typeof data === 'object') {
          localStorage.setItem('userData', JSON.stringify(data));
          setPermTick((n) => n + 1);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const userData = useMemo(() => getStoredUserForPermissions(), [permTick]);

  /**
   * Only the active tab mounts (see Tabs). Mounting every Users sub-table at once has caused
   * blank /admin/users when any single sub-component failed during render or data load.
   */
  const tabData = useMemo(
    () =>
      [
        { title: 'Accountant', Content: Accountant },
        { title: 'Admin', Content: Admin },
        { title: 'Doctor', Content: Doctor },
        { title: 'Nurse', Content: Nurse },
        { title: 'Pharmacist', Content: Pharmacist },
        { title: 'Quality Control Manager', Content: QualityControlManager },
        { title: 'Staff', Content: Staff },
      ].filter((tab) => {
    if (canAccessAllUsersRoleTabs(userData)) return true;

    /** HQ Admin accounts tab — superadmin only */
    if (tab.title === 'Admin') {
      return canSeeUsersAdminSubtab(userData);
    }

    /**
     * Branch admin / administrator: always expose standard staff lists so they can add users
     * (even when JWT has only mp.* keys and no legacy createUsers / mp.users row).
     */
    if (isBranchStaffAdminSlug(userData)) {
      if (tab.title === 'Quality Control Manager') {
        return hasAnyPermission(userData, 'createUsers', 'editUsers', 'administrator');
      }
      return (BRANCH_STAFF_USER_SUBTABS as readonly string[]).includes(tab.title);
    }

    /** Custom roles: Roles matrix `Users` row → mp.users.* drives subtabs */
    if (hasAnyUsersMenuPermission(userData)) {
      if (tab.title === 'Quality Control Manager') {
        return hasAnyPermission(userData, 'createUsers', 'editUsers', 'administrator');
      }
      const slug = USERS_TAB_ROLE_SLUG[tab.title];
      if (slug) {
        const r = getUserRoleSlug(userData);
        /** Reception / amp_reception roles share the Staff user list tooling */
        if (tab.title === 'Staff') {
          return matchesStaffLikeRoleSlug(r);
        }
        /** Custom Roles keys like `doctor_visiting`, `pharmacist_night`, etc. */
        return slugMatchesTabSlug(r, slug);
      }
      return false;
    }

    if (tab.title === 'Accountant') {
      return hasAnyPermission(userData, 'accountant', 'createUsers', 'editUsers');
    }
    if (tab.title === 'Doctor') {
      return hasAnyPermission(userData, 'doctor', 'createUsers', 'editUsers');
    }
    if (tab.title === 'Nurse') {
      return hasAnyPermission(userData, 'nurse', 'createUsers', 'editUsers');
    }
    if (tab.title === 'Pharmacist') {
      return hasAnyPermission(userData, 'pharmacist', 'pharmacyOrders', 'createUsers');
    }
    if (tab.title === 'Quality Control Manager') {
      return hasAnyPermission(
        userData,
        'quality_control_manager',
        'createUsers',
        'editUsers',
        'administrator',
      );
    }
    if (tab.title === 'Staff') {
      return hasAnyPermission(userData, 'staff', 'createUsers', 'editUsers', 'administrator');
    }
    return hasAnyPermission(userData, 'createUsers', 'editUsers', 'administrator');
      }),
    [userData],
  );
  const defaultTab = tabData[0]?.title || 'Accountant';

  if (tabData.length === 0) {
    return (
      <>
        <Breadcrumb pageName="Users" />
        <div className="container mx-auto mt-8 rounded-sm border border-stroke bg-white px-6 py-10 text-center text-bodydark2 shadow-default dark:border-strokedark dark:bg-boxdark">
          <p className="m-0 text-sm">No user sections are available for your role.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Users" />
      <div className="container mx-auto mt-8">
        <Tabs tabs={tabData} defaultTab={defaultTab} />
      </div>
    </>
  );
};

export default Users;
