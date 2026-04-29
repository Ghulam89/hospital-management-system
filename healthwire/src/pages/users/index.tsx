import React from 'react';

import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import Tabs from '../../components/Tabs/Tabs';
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
} from '../../utils/permissions';

const Users = () => {
  const userData = getStoredUserForPermissions();

  const tabData = [
    { title: 'Accountant', content:<Accountant/>},
    { title: 'Admin', content:<Admin/> },
    { title: 'Doctor', content:<Doctor/>},
    { title: 'Nurse', content:<Nurse/>},
    { title: 'Pharmacist', content:<Pharmacist/>},
    { title: 'Quality Control Manager', content:<QualityControlManager/> },
    { title: 'Staff', content:<Staff/>},
  ].filter((tab) => {
    if (canAccessAllUsersRoleTabs(userData)) return true;
    if (tab.title === 'Admin') return hasAnyPermission(userData, 'administrator', 'createUsers', 'editUsers');
    if (tab.title === 'Accountant') return hasAnyPermission(userData, 'accountant', 'createUsers', 'editUsers');
    if (tab.title === 'Doctor') return hasAnyPermission(userData, 'doctor', 'createUsers', 'editUsers');
    if (tab.title === 'Nurse') return hasAnyPermission(userData, 'nurse', 'createUsers', 'editUsers');
    if (tab.title === 'Pharmacist') return hasAnyPermission(userData, 'pharmacist', 'pharmacyOrders', 'createUsers');
    if (tab.title === 'Staff') return hasAnyPermission(userData, 'staff', 'createUsers', 'editUsers', 'administrator');
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
