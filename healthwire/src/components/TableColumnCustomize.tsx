import React from 'react';
import { Button, Checkbox, Divider, Dropdown, Space, Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { ColumnOption } from '../utils/tableColumnPrefs';

type Props = {
  options: ColumnOption[];
  onToggle: (key: string, visible: boolean) => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  onReset?: () => void;
  /** Optional button label; icon-only by default. */
  label?: string;
  className?: string;
  size?: 'small' | 'middle' | 'large';
};

/**
 * Checkbox dropdown to show/hide Ant Design table columns (prefs owned by parent hook).
 */
const TableColumnCustomize: React.FC<Props> = ({
  options,
  onToggle,
  onShowAll,
  onHideAll,
  onReset,
  label,
  className,
  size = 'middle',
}) => {
  const visibleCount = options.filter((o) => o.visible).length;

  const menu = (
    <div
      className="rounded-md border border-stroke bg-white p-3 shadow-lg dark:border-strokedark dark:bg-boxdark"
      style={{ minWidth: 220, maxWidth: 280, maxHeight: 360, overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-black dark:text-white">Columns</span>
        <span className="text-xs text-gray-500">
          {visibleCount}/{options.length}
        </span>
      </div>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {options.map((opt) => (
          <Checkbox
            key={opt.key}
            checked={opt.visible}
            disabled={opt.locked}
            onChange={(e) => onToggle(opt.key, e.target.checked)}
          >
            <span className={opt.locked ? 'text-gray-400' : ''}>
              {opt.label}
              {opt.locked ? ' (fixed)' : ''}
            </span>
          </Checkbox>
        ))}
      </Space>
      <Divider style={{ margin: '10px 0' }} />
      <div className="flex flex-wrap gap-2">
        {onShowAll ? (
          <Button type="link" size="small" className="!px-0" onClick={onShowAll}>
            Show all
          </Button>
        ) : null}
        {onHideAll ? (
          <Button type="link" size="small" className="!px-0" onClick={onHideAll}>
            Hide all
          </Button>
        ) : null}
        {onReset ? (
          <Button type="link" size="small" className="!px-0" onClick={onReset}>
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Dropdown dropdownRender={() => menu} trigger={['click']} placement="bottomRight">
      <Tooltip title="Customize columns">
        <Button
          type="default"
          size={size}
          icon={<SettingOutlined />}
          className={className}
          aria-label="Customize columns"
        >
          {label || 'Columns'}
        </Button>
      </Tooltip>
    </Dropdown>
  );
};

export default TableColumnCustomize;
