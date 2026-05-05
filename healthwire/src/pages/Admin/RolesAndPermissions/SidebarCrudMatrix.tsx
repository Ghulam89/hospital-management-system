import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Checkbox, Select } from 'antd';
import type { MenuMatrixRow } from '../../../utils/menuPermissionCatalog';
import {
  MENU_MATRIX_ACTIONS,
  menuPermissionKey,
  type MenuMatrixAction,
} from '../../../utils/menuPermissionCatalog';

type RoleLite = { _id: string; name: string; key: string; isSystem?: boolean };

type Props = {
  loading: boolean;
  roles: RoleLite[];
  menuRows: MenuMatrixRow[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
  /** Full permission strings for the selected role (includes legacy + mp.*). */
  rolePermissions: string[];
  readOnly: boolean;
  onToggle: (menuId: string, action: MenuMatrixAction, checked: boolean) => void;
  /** Prefer for column/row/header select-all — one parent update avoids stale matrix when looping `onToggle`. */
  onMatrixMutate?: (mutate: (s: Set<string>) => void) => void;
};

const COL_LABEL: Record<MenuMatrixAction, string> = {
  module: 'Access',
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
};

export default function SidebarCrudMatrix({
  loading,
  roles,
  menuRows,
  selectedRoleId,
  onSelectRole,
  rolePermissions,
  readOnly,
  onToggle,
  onMatrixMutate,
}: Props) {
  const tabSet = useMemo(() => new Set(rolePermissions), [rolePermissions]);

  const selectedRole = roles.find((r) => r._id === selectedRoleId);

  const toggleColumn = (action: MenuMatrixAction, checked: boolean) => {
    if (readOnly || !selectedRole || selectedRole.isSystem) return;
    if (onMatrixMutate) {
      onMatrixMutate((cur) => {
        for (const row of menuRows) {
          if (!row.cells[action]) continue;
          const key = menuPermissionKey(row.id, action);
          if (checked) cur.add(key);
          else cur.delete(key);
        }
      });
      return;
    }
    for (const row of menuRows) {
      if (!row.cells[action]) continue;
      onToggle(row.id, action, checked);
    }
  };

  const toggleRow = (row: MenuMatrixRow, checked: boolean) => {
    if (readOnly || !selectedRole || selectedRole.isSystem) return;
    if (onMatrixMutate) {
      onMatrixMutate((cur) => {
        for (const action of MENU_MATRIX_ACTIONS) {
          if (!row.cells[action]) continue;
          const key = menuPermissionKey(row.id, action);
          if (checked) cur.add(key);
          else cur.delete(key);
        }
      });
      return;
    }
    for (const action of MENU_MATRIX_ACTIONS) {
      if (!row.cells[action]) continue;
      const key = menuPermissionKey(row.id, action);
      const isOn = tabSet.has(key);
      if (checked && !isOn) onToggle(row.id, action, true);
      if (!checked && isOn) onToggle(row.id, action, false);
    }
  };

  const toggleAllApplicable = (checked: boolean) => {
    if (readOnly || !selectedRole || selectedRole.isSystem) return;
    if (onMatrixMutate) {
      onMatrixMutate((cur) => {
        for (const row of menuRows) {
          for (const action of MENU_MATRIX_ACTIONS) {
            if (!row.cells[action]) continue;
            const key = menuPermissionKey(row.id, action);
            if (checked) cur.add(key);
            else cur.delete(key);
          }
        }
      });
      return;
    }
    for (const row of menuRows) {
      for (const action of MENU_MATRIX_ACTIONS) {
        if (!row.cells[action]) continue;
        const key = menuPermissionKey(row.id, action);
        const isOn = tabSet.has(key);
        if (checked && !isOn) onToggle(row.id, action, true);
        if (!checked && isOn) onToggle(row.id, action, false);
      }
    }
  };

  const rowTriState = (row: MenuMatrixRow) => {
    let applicable = 0;
    let on = 0;
    for (const action of MENU_MATRIX_ACTIONS) {
      if (!row.cells[action]) continue;
      applicable += 1;
      if (tabSet.has(menuPermissionKey(row.id, action))) on += 1;
    }
    const checked = applicable > 0 && on === applicable;
    const indeterminate = on > 0 && on < applicable;
    return { checked, indeterminate, applicable };
  };

  const columnTriState = (action: MenuMatrixAction) => {
    let applicable = 0;
    let on = 0;
    for (const row of menuRows) {
      if (!row.cells[action]) continue;
      applicable += 1;
      if (tabSet.has(menuPermissionKey(row.id, action))) on += 1;
    }
    const checked = applicable > 0 && on === applicable;
    const indeterminate = on > 0 && on < applicable;
    return { checked, indeterminate, applicable };
  };

  const grouped = useMemo(() => {
    const m = new Map<string, MenuMatrixRow[]>();
    for (const r of menuRows) {
      if (!m.has(r.group)) m.set(r.group, []);
      m.get(r.group)!.push(r);
    }
    return m;
  }, [menuRows]);

  const matrixSummary = useMemo(() => {
    let applicable = 0;
    let on = 0;
    for (const row of menuRows) {
      for (const action of MENU_MATRIX_ACTIONS) {
        if (!row.cells[action]) continue;
        applicable += 1;
        if (tabSet.has(menuPermissionKey(row.id, action))) on += 1;
      }
    }
    const checked = applicable > 0 && on === applicable;
    const indeterminate = on > 0 && on < applicable;
    return { checked, indeterminate, applicable };
  }, [menuRows, tabSet]);

  const headerColSpan = 1 + MENU_MATRIX_ACTIONS.length;

  if (loading) return <p className="text-sm text-bodydark2">Loading sidebar permissions…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Select
          className="min-w-[220px] sm:max-w-md flex-1"
          showSearch
          optionFilterProp="label"
          placeholder="Search or select role"
          value={selectedRoleId || undefined}
          options={roles.map((r) => ({
            value: r._id,
            label: `${r.name} (${r.key})${r.isSystem ? ' · system' : ''}`,
          }))}
          onChange={(v) => onSelectRole(String(v))}
        />
      </div>

      {!selectedRoleId ? (
        <p className="text-sm text-bodydark2">
          Choose a role to configure which sidebar items appear for users with that role. Unticked rows stay hidden.
        </p>
      ) : selectedRole?.isSystem ? (
        <p className="text-sm text-warning dark:text-meta-6">
          System roles cannot be changed on this screen. Create a custom role on{' '}
          <Link to="/admin/roles/manage" className="font-medium text-primary underline-offset-2 hover:underline">
            Roles (list)
          </Link>{' '}
          if you need different menu access.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
            <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-stroke bg-gray dark:border-strokedark dark:bg-meta-4">
                <th className="px-3 py-3 text-left font-semibold text-black dark:text-white">
                  <div className="flex flex-col gap-1.5">
                    <span>Module / sub-menu</span>
                    {matrixSummary.applicable > 0 ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={matrixSummary.checked}
                            indeterminate={matrixSummary.indeterminate}
                            disabled={readOnly}
                            onChange={(e) => toggleAllApplicable(e.target.checked)}
                          />
                          <span className="text-xs font-normal text-bodydark2">All rows</span>
                        </div>
                      ) : null}
                  </div>
                </th>
                {MENU_MATRIX_ACTIONS.map((action) => {
                  const { checked, indeterminate, applicable } = columnTriState(action);
                  return (
                    <th key={action} className="px-2 py-3 text-center font-semibold text-black dark:text-white">
                      <div className="flex flex-col items-center gap-1">
                        <span>{COL_LABEL[action]}</span>
                        {applicable > 0 && (
                          <Checkbox
                            checked={checked}
                            indeterminate={indeterminate}
                            disabled={readOnly}
                            onChange={(e) => toggleColumn(action, e.target.checked)}
                          />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([group, rows]) => (
                <React.Fragment key={group}>
                  <tr className="bg-whiten dark:bg-meta-4/60">
                    <td
                      colSpan={headerColSpan}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-bodydark2"
                    >
                      {group}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-stroke hover:bg-gray dark:border-strokedark dark:hover:bg-meta-4/40"
                    >
                      <td className="max-w-[340px] px-3 py-2 align-middle">
                        <div className="flex items-start gap-2">
                          {(() => {
                            const { checked, indeterminate, applicable } = rowTriState(row);
                            return applicable > 0 ? (
                              <Checkbox
                                className="mt-0.5 flex-shrink-0"
                                checked={checked}
                                indeterminate={indeterminate}
                                disabled={readOnly}
                                title="Turn all actions on or off for this module"
                                onChange={(e) => toggleRow(row, e.target.checked)}
                              />
                            ) : (
                              <span className="mt-0.5 inline-block w-4 flex-shrink-0" aria-hidden />
                            );
                          })()}
                          <div className="min-w-0">
                            <div className="font-medium text-black dark:text-bodydark1">{row.label}</div>
                            {row.parentLabel ? (
                              <div className="text-[11px] text-body dark:text-bodydark2">{row.parentLabel}</div>
                            ) : null}
                            <code className="text-[10px] text-bodydark2">{row.pathPrefix}</code>
                          </div>
                        </div>
                      </td>
                      {MENU_MATRIX_ACTIONS.map((action) => {
                        const enabled = row.cells[action];
                        const key = menuPermissionKey(row.id, action);
                        const checked = tabSet.has(key);
                        return (
                          <td key={action} className="px-2 py-2 text-center align-middle">
                            {!enabled ? (
                              <span className="inline-block h-5 w-5" aria-hidden />
                            ) : (
                              <Checkbox
                                checked={checked}
                                disabled={readOnly}
                                onChange={(e) => onToggle(row.id, action, e.target.checked)}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
            </table>
          </div>
      )}
    </div>
  );
}
