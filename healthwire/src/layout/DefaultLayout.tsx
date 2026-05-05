import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Spin } from 'antd';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { Outlet } from 'react-router-dom';
import {
  BRANCH_CHANGED_EVENT,
  getUserDataFromStorage,
  isSuperAdminRole,
} from '../utils/branchScope';
import { BranchScopeEpochContext } from '../context/BranchScopeEpochContext';

const DefaultLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Remount active route when superadmin branch scope changes so lists refetch with new ?branchId (or all branches). */
  const [outletKey, setOutletKey] = useState(0);
  /** Remount header (navbar search, notifications, etc.) so cached results clear when branch scope changes. */
  const [headerKey, setHeaderKey] = useState(0);
  /** Bump so branch-scoped tables can refetch even when React preserves component instance. */
  const [branchEpoch, setBranchEpoch] = useState(0);
  const [branchSwitching, setBranchSwitching] = useState(false);

  useEffect(() => {
    const onBranchScopeChange = () => {
      if (!isSuperAdminRole(getUserDataFromStorage()?.role)) return;
      flushSync(() => {
        setBranchSwitching(true);
        setOutletKey((k) => k + 1);
        setHeaderKey((k) => k + 1);
        setBranchEpoch((n) => n + 1);
      });
      window.setTimeout(() => setBranchSwitching(false), 160);
    };
    window.addEventListener(BRANCH_CHANGED_EVENT, onBranchScopeChange);
    return () => window.removeEventListener(BRANCH_CHANGED_EVENT, onBranchScopeChange);
  }, []);

  return (
    <BranchScopeEpochContext.Provider value={branchEpoch}>
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      <div className="flex h-screen overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <Header key={headerKey} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

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
    </BranchScopeEpochContext.Provider>
  );
};

export default DefaultLayout;
