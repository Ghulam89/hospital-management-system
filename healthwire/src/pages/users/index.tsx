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
  getStoredUserForPermissions,
  hasAnyPermission,
  hasAnyUsersMenuPermission,
} from '../../utils/permissions';

const USERS_ROLE_TABS = [
  'Accountant',
  'Admin',
  'Doctor',
  'Nurse',
  'Pharmacist',
  'Staff',
] as const;

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

    /** Custom roles: Roles matrix `Users` row → mp.users.{module|read|create|update|delete} drives subtabs + buttons */
    if (hasAnyUsersMenuPermission(userData)) {
      if (tab.title === 'Quality Control Manager') {
        return hasAnyPermission(userData, 'createUsers', 'editUsers', 'administrator');
      }
      return (USERS_ROLE_TABS as readonly string[]).includes(tab.title);
    }

    if (tab.title === 'Admin') {
      return hasAnyPermission(userData, 'administrator', 'createUsers', 'editUsers');
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
