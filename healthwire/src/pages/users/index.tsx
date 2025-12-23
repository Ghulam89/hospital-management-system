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

const Users = () => {
  const tabData = [
    { title: 'Accountant', content:<Accountant/>},
    { title: 'Admin', content:<Admin/> },
    { title: 'Doctor', content:<Doctor/>},
    { title: 'Nurse', content:<Nurse/>},
    { title: 'Pharmacist', content:<Pharmacist/>},
    { title: 'Quality Control Manager', content:<QualityControlManager/> },
    { title: 'Staff', content:<Staff/>},
  ];
  const defaultTab = 'Accountant';

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
