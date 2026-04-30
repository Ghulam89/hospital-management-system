import React, { useEffect, useMemo, useState } from 'react';
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
  Staff: 'staff',
};

/** Tabs branch admins use to add/manage operational staff (not the HQ Admin user list). */
const BRANCH_STAFF_USER_SUBTABS = ['Accountant', 'Doctor', 'Nurse', 'Pharmacist', 'Staff'] as const;

const Users = () => {
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
  }, []);

  const userData = useMemo(() => getStoredUserForPermissions(), [permTick]);

  const tabData = [
    { title: 'Accountant', content: <Accountant /> },
    { title: 'Admin', content: <Admin /> },
    { title: 'Doctor', content: <Doctor /> },
    { title: 'Nurse', content: <Nurse /> },
    { title: 'Pharmacist', content: <Pharmacist /> },
    { title: 'Quality Control Manager', content: <QualityControlManager /> },
    { title: 'Staff', content: <Staff /> },
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
        /** Custom Roles keys like `accountant_access` — must match Users → Accountant tooling */
        if (tab.title === 'Accountant') {
          return r === 'accountant' || r.startsWith('accountant_');
        }
        return r === slug;
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
    if (tab.title === 'Staff') {
      return hasAnyPermission(userData, 'staff', 'createUsers', 'editUsers', 'administrator');
    }
    return hasAnyPermission(userData, 'createUsers', 'editUsers', 'administrator');
  });
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
