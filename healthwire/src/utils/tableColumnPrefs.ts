import type { ColumnsType, ColumnType } from 'antd/es/table';

export type ColumnPrefMap = Record<string, boolean>;

const STORAGE_PREFIX = 'hms.tableColumns.';

export function tableColumnPrefsKey(tableId: string): string {
  return `${STORAGE_PREFIX}${tableId}`;
}

/** Stable id for an Ant Design column (key → dataIndex → title). */
export function getColumnPrefKey(column: ColumnType<any>, index = 0): string {
  if (column?.key != null && String(column.key).trim() !== '') {
    return String(column.key);
  }
  const di = (column as { dataIndex?: unknown })?.dataIndex;
  if (di != null && di !== '') {
    return Array.isArray(di) ? di.map(String).join('.') : String(di);
  }
  const title = column?.title;
  if (typeof title === 'string' && title.trim()) {
    return title.trim().toLowerCase().replace(/\s+/g, '_');
  }
  return `col_${index}`;
}

export function getColumnPrefLabel(column: ColumnType<any>, key: string): string {
  const title = column?.title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  if (typeof title === 'number') return String(title);
  return key;
}

export function readColumnPrefs(tableId: string): ColumnPrefMap {
  try {
    const raw = window.localStorage.getItem(tableColumnPrefsKey(tableId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as ColumnPrefMap;
  } catch {
    return {};
  }
}

export function writeColumnPrefs(tableId: string, prefs: ColumnPrefMap): void {
  try {
    window.localStorage.setItem(tableColumnPrefsKey(tableId), JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearColumnPrefs(tableId: string): void {
  try {
    window.localStorage.removeItem(tableColumnPrefsKey(tableId));
  } catch {
    /* ignore */
  }
}

export type ColumnOption = {
  key: string;
  label: string;
  visible: boolean;
  locked: boolean;
};

function isLockedKey(key: string, lockedKeys: string[]): boolean {
  const k = key.toLowerCase();
  if (lockedKeys.some((lk) => String(lk).toLowerCase() === k)) return true;
  return k === 'action' || k === 'actions' || k === 'toggle';
}

/**
 * Apply persisted show/hide prefs. Locked keys (e.g. Action) always stay visible.
 * Unknown new columns default to visible (or hidden if listed in defaultHidden).
 */
export function filterColumnsByPrefs<T = any>(
  columns: ColumnsType<T> | ColumnType<T>[],
  prefs: ColumnPrefMap,
  options?: { lockedKeys?: string[]; defaultHidden?: string[] },
): ColumnsType<T> {
  const lockedKeys = options?.lockedKeys || [];
  const defaultHidden = new Set(
    (options?.defaultHidden || []).map((k) => String(k).toLowerCase()),
  );

  return (columns || []).filter((col, index) => {
    const key = getColumnPrefKey(col as ColumnType<T>, index);
    if (isLockedKey(key, lockedKeys)) return true;
    if (Object.prototype.hasOwnProperty.call(prefs, key)) {
      return prefs[key] !== false;
    }
    return !defaultHidden.has(key.toLowerCase());
  }) as ColumnsType<T>;
}

export function buildColumnOptions<T = any>(
  columns: ColumnsType<T> | ColumnType<T>[],
  prefs: ColumnPrefMap,
  options?: { lockedKeys?: string[]; defaultHidden?: string[] },
): ColumnOption[] {
  const lockedKeys = options?.lockedKeys || [];
  const defaultHidden = new Set(
    (options?.defaultHidden || []).map((k) => String(k).toLowerCase()),
  );

  return (columns || []).map((col, index) => {
    const key = getColumnPrefKey(col as ColumnType<T>, index);
    const locked = isLockedKey(key, lockedKeys);
    let visible = true;
    if (locked) {
      visible = true;
    } else if (Object.prototype.hasOwnProperty.call(prefs, key)) {
      visible = prefs[key] !== false;
    } else {
      visible = !defaultHidden.has(key.toLowerCase());
    }
    return {
      key,
      label: getColumnPrefLabel(col as ColumnType<T>, key),
      visible,
      locked,
    };
  });
}
