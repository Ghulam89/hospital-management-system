import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { Outlet } from 'react-router-dom';
import {
  BRANCH_CHANGED_EVENT,
  getUserDataFromStorage,
  isSuperAdminRole,
} from '../utils/branchScope';

const DefaultLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Remount active route when superadmin branch scope changes so lists refetch with new ?branchId (or all branches). */
  const [outletKey, setOutletKey] = useState(0);
  const [branchSwitching, setBranchSwitching] = useState(false);

  useEffect(() => {
    const onBranchScopeChange = () => {
      if (!isSuperAdminRole(getUserDataFromStorage()?.role)) return;
      setBranchSwitching(true);
      setOutletKey((k) => k + 1);
      window.setTimeout(() => setBranchSwitching(false), 700);
    };
    window.addEventListener(BRANCH_CHANGED_EVENT, onBranchScopeChange);
    return () => window.removeEventListener(BRANCH_CHANGED_EVENT, onBranchScopeChange);
  }, []);

  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main>
            <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
              <Outlet key={outletKey} />
            </div>
          </main>
        </div>

        {branchSwitching && (
          <div
            className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/25 dark:bg-black/45"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="rounded-lg bg-white px-8 py-6 shadow-xl dark:bg-boxdark">
              <Spin size="large" tip="Loading data for the selected branch…" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefaultLayout;
