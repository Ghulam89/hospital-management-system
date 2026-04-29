import React, { useMemo } from 'react';
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
}: Props) {
  const tabSet = useMemo(() => new Set(rolePermissions), [rolePermissions]);

  const selectedRole = roles.find((r) => r._id === selectedRoleId);

  const toggleColumn = (action: MenuMatrixAction, checked: boolean) => {
    if (readOnly || !selectedRole || selectedRole.isSystem) return;
    for (const row of menuRows) {
      if (!row.cells[action]) continue;
      onToggle(row.id, action, checked);
    }
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

  if (loading) return <p className="text-sm text-bodydark2">Loading sidebar permissions…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="m-0 text-sm font-medium text-bodydark1">Sidebar access (module × CRUD)</p>
          <p className="m-0 text-xs text-bodydark2">
            Pick a role, tick Access / Create / Read / Update / Delete per menu — matches sidebar tabs &amp;
            submenus. Save with <strong>Save matrix</strong>.
          </p>
        </div>
        <Select
          className="min-w-[220px]"
          placeholder="Select role"
          value={selectedRoleId || undefined}
          options={roles.map((r) => ({
            value: r._id,
            label: `${r.name} (${r.key})${r.isSystem ? ' · system' : ''}`,
          }))}
          onChange={(v) => onSelectRole(String(v))}
        />
      </div>

      {!selectedRoleId ? (
        <p className="text-sm text-bodydark2">Select a role to edit granular sidebar permissions.</p>
      ) : selectedRole?.isSystem ? (
        <p className="text-sm text-warning dark:text-meta-6">
          System roles cannot change granular keys here — duplicate into a custom role if needed.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
          <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-stroke bg-gray dark:border-strokedark dark:bg-meta-4">
                <th className="px-3 py-3 text-left font-semibold text-black dark:text-white">
                  Module / submenu
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
                      colSpan={6}
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
                        <div className="font-medium text-black dark:text-bodydark1">{row.label}</div>
                        {row.parentLabel ? (
                          <div className="text-[11px] text-body dark:text-bodydark2">{row.parentLabel}</div>
                        ) : null}
                        <code className="text-[10px] text-bodydark2">{row.pathPrefix}</code>
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
