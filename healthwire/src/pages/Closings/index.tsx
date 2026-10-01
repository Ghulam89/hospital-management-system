import { useMemo, useState } from 'react';
import { Tabs } from 'antd';
import { useSearchParams } from 'react-router-dom';
import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import ClinicClosings from './ClinicClosings';
import StoreClosings from '../Pharmacy/StoreClosings';
import { canSeeSidebarMenu } from '../../utils/permissions';
import { getUserDataFromStorage } from '../../utils/branchScope';

/**
 * Combined Closings: Clinic (user-based) + Pharmacy Store (branch-day).
 * Tab visibility follows menu permissions.
 */
const Closings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useMemo(() => getUserDataFromStorage() as any, []);

  const showClinic = canSeeSidebarMenu(user, 'clinic_close');
  const showPharmacy = canSeeSidebarMenu(user, 'pharm_store_close');

  const defaultTab = showClinic ? 'clinic' : showPharmacy ? 'pharmacy' : 'clinic';
  const paramTab = searchParams.get('tab');
  const initial =
    paramTab === 'pharmacy' && showPharmacy
      ? 'pharmacy'
      : paramTab === 'clinic' && showClinic
        ? 'clinic'
        : defaultTab;

  const [activeKey, setActiveKey] = useState(initial);

  const items: { key: string; label: string; children: React.ReactNode }[] = [];
  if (showClinic) {
    items.push({
      key: 'clinic',
      label: 'Clinic Closing',
      children: <ClinicClosings embedded />,
    });
  }
  if (showPharmacy) {
    items.push({
      key: 'pharmacy',
      label: 'Pharmacy Store Closing',
      children: <StoreClosings embedded />,
    });
  }

  if (!items.length) {
    return (
      <>
        <Breadcrumb pageName="Closings" />
        <div className="p-6 text-gray-600">You do not have permission to view closings.</div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Closings" />
      <div className="min-h-screen bg-gray-50 p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Closings</h1>
        <p className="text-sm text-gray-600 mb-4">
          Clinic closing is per user (each receptionist closes separately). Pharmacy store closing is per branch day.
        </p>
        <Tabs
          activeKey={activeKey}
          onChange={(key) => {
            setActiveKey(key);
            setSearchParams(key === defaultTab ? {} : { tab: key });
          }}
          items={items}
          type="card"
        />
      </div>
    </>
  );
};

export default Closings;
