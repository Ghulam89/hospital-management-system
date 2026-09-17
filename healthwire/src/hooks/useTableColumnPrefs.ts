import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import {
  buildColumnOptions,
  clearColumnPrefs,
  filterColumnsByPrefs,
  readColumnPrefs,
  writeColumnPrefs,
  type ColumnOption,
  type ColumnPrefMap,
} from '../utils/tableColumnPrefs';

type Options = {
  /** Column keys that cannot be hidden (Action is always locked). */
  lockedKeys?: string[];
  /** Keys hidden until the user enables them. */
  defaultHidden?: string[];
};

/**
 * Persist table column visibility in localStorage under `hms.tableColumns.<tableId>`.
 */
export function useTableColumnPrefs<T = any>(
  tableId: string,
  columns: ColumnsType<T> | ColumnType<T>[] | undefined | null,
  options?: Options,
) {
  const lockedKeys = options?.lockedKeys;
  const defaultHidden = options?.defaultHidden;

  const [prefs, setPrefs] = useState<ColumnPrefMap>(() =>
    typeof window !== 'undefined' ? readColumnPrefs(tableId) : {},
  );

  useEffect(() => {
    setPrefs(readColumnPrefs(tableId));
  }, [tableId]);

  const persist = useCallback(
    (next: ColumnPrefMap) => {
      setPrefs(next);
      writeColumnPrefs(tableId, next);
    },
    [tableId],
  );

  const setColumnVisible = useCallback(
    (key: string, visible: boolean) => {
      persist({ ...prefs, [key]: visible });
    },
    [persist, prefs],
  );

  const setAllVisible = useCallback(
    (visible: boolean) => {
      const opts = buildColumnOptions(columns || [], prefs, { lockedKeys, defaultHidden });
      const next: ColumnPrefMap = { ...prefs };
      opts.forEach((opt) => {
        if (!opt.locked) next[opt.key] = visible;
      });
      persist(next);
    },
    [columns, prefs, lockedKeys, defaultHidden, persist],
  );

  const resetColumns = useCallback(() => {
    clearColumnPrefs(tableId);
    setPrefs({});
  }, [tableId]);

  const visibleColumns = useMemo(
    () =>
      filterColumnsByPrefs(columns || [], prefs, {
        lockedKeys,
        defaultHidden,
      }),
    [columns, prefs, lockedKeys, defaultHidden],
  );

  const columnOptions: ColumnOption[] = useMemo(
    () =>
      buildColumnOptions(columns || [], prefs, {
        lockedKeys,
        defaultHidden,
      }),
    [columns, prefs, lockedKeys, defaultHidden],
  );

  return {
    visibleColumns,
    columnOptions,
    setColumnVisible,
    setAllVisible,
    resetColumns,
    prefs,
  };
}

export default useTableColumnPrefs;
