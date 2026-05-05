import { createContext, useContext } from 'react';

/** Increments when superadmin changes header branch scope — use as a hook dependency to refetch branch-scoped tables. */
export const BranchScopeEpochContext = createContext(0);

export function useBranchScopeEpoch(): number {
  return useContext(BranchScopeEpochContext);
}
