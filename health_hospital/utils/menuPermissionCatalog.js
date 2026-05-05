/**
 * Sidebar routes → granular keys: mp.{id}.{module|create|read|update|delete}
 * Keep in sync with healthwire/src/utils/menuPermissionCatalog.ts
 */
const ACTIONS = ['module', 'create', 'read', 'update', 'delete'];

/** @type {Array<{ id: string; label: string; group: string; parentLabel?: string | null; pathPrefix: string; cells: Record<string, boolean> }>} */
const MENU_ROWS = [
  { id: 'dashboard', label: 'Dashboard', group: 'Main', pathPrefix: '/dashboard', cells: { module: true, create: false, read: true, update: false, delete: false } },
  { id: 'health_records', label: 'Health Records', group: 'Main', pathPrefix: '/admin/health-records', cells: { module: true, create: true, read: true, update: true, delete: false } },

  { id: 'ward', label: 'Wards', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/ward', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'rooms', label: 'Rooms', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/rooms', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'bed_details', label: 'Bed Details', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/bed-details', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'room_details', label: 'Room Details', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/room-details', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'discharge_patients', label: 'Discharged Patients', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/discharge-patients', cells: { module: true, create: false, read: true, update: true, delete: false } },
  { id: 'indoor_duty_roster', label: 'Indoor Duty Roster', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/Indoor-duty-roster', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'birth_reports', label: 'Birth Certificates', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/birth-reports', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'death_reports', label: 'Death Certificates', group: 'Indoor Management', parentLabel: 'Indoor Management', pathPrefix: '/death-reports', cells: { module: true, create: true, read: true, update: true, delete: false } },

  { id: 'admitted_patients', label: 'Admitted Patients', group: 'Indoor Patients', parentLabel: 'Indoor Patients', pathPrefix: '/admin/beds', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'bed_allocation', label: 'Bed Allocation', group: 'Indoor Patients', parentLabel: 'Indoor Patients', pathPrefix: '/bed-allocation', cells: { module: true, create: true, read: true, update: true, delete: false } },

  { id: 'opd', label: 'OPD', group: 'Clinical', pathPrefix: '/admin/general-consultations', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'appointments', label: 'Appointments', group: 'Clinical', pathPrefix: '/appointments', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'invoices', label: 'Invoices', group: 'Clinical', pathPrefix: '/invoice', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'patients', label: 'Patients', group: 'Clinical', pathPrefix: '/admin/patients', cells: { module: true, create: true, read: true, update: true, delete: true } },

  { id: 'pharm_items', label: 'Items', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/items/pharmacy', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_stock', label: 'Manage Stock', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/stocks', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_returns', label: 'Stock Return', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/stock_returns', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_po', label: 'Purchase Orders', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/purchase-orders', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_missed', label: 'Missed Sales', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/missed-sales', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'pharm_racks', label: 'Racks', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/rack', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'pharm_consumed_stocks', label: 'Consume Stocks', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/consumed-stocks', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'pharm_store_close', label: 'Store Closings', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/store-closings', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'pharm_expenses', label: 'Pharmacy Expenses', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/expenses', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_suppliers', label: 'Suppliers', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/supplier', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_pos', label: 'POS', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/invoices/new', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_cust_ledger', label: 'Customer Ledger', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/customer-ledger', cells: { module: true, create: false, read: true, update: false, delete: false } },
  { id: 'pharm_supp_ledger', label: 'Supplier Ledger', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/supplier-ledger', cells: { module: true, create: false, read: true, update: false, delete: false } },
  { id: 'pharm_categories', label: 'Categories', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/categories', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_manufacturers', label: 'Manufacturers', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/manufacturers', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'pharm_reports_menu', label: 'Pharmacy Reports', group: 'Pharmacy', parentLabel: 'Pharmacy', pathPrefix: '/admin/pharmacy/reports', cells: { module: true, create: false, read: true, update: false, delete: false } },

  { id: 'departments', label: 'Departments', group: 'Preferences', parentLabel: 'Preferences', pathPrefix: '/department', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'branches', label: 'Branches', group: 'Preferences', parentLabel: 'Preferences', pathPrefix: '/admin/branches', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'procedures', label: 'Procedure List', group: 'Preferences', parentLabel: 'Preferences', pathPrefix: '/procedures', cells: { module: true, create: true, read: true, update: true, delete: false } },
  { id: 'expense_categories', label: 'Expense Categories', group: 'Preferences', parentLabel: 'Preferences', pathPrefix: '/expense-categories', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'expense', label: 'Expense', group: 'Preferences', parentLabel: 'Preferences', pathPrefix: '/expense', cells: { module: true, create: true, read: true, update: true, delete: true } },

  { id: 'report_opd', label: 'OPD Report', group: 'Reports', parentLabel: 'Reports', pathPrefix: '/opd/opd-report', cells: { module: true, create: false, read: true, update: false, delete: false } },
  { id: 'report_patients', label: 'Patients Report', group: 'Reports', parentLabel: 'Reports', pathPrefix: '/patients/patients-report', cells: { module: true, create: false, read: true, update: false, delete: false } },
  { id: 'report_financial', label: 'Financial Report', group: 'Reports', parentLabel: 'Reports', pathPrefix: '/financial/financial-report', cells: { module: true, create: false, read: true, update: false, delete: false } },

  { id: 'users', label: 'Users', group: 'Administration', pathPrefix: '/admin/users', cells: { module: true, create: true, read: true, update: true, delete: true } },
  { id: 'roles', label: 'Menu permissions & roles list', group: 'Administration', pathPrefix: '/admin/roles', cells: { module: true, create: true, read: true, update: true, delete: false } },
];

function flattenMenuPermissionKeys() {
  const keys = [];
  for (const row of MENU_ROWS) {
    for (const a of ACTIONS) {
      if (row.cells[a]) keys.push(`mp.${row.id}.${a}`);
    }
  }
  return keys;
}

module.exports = {
  MENU_ROWS,
  ACTIONS,
  flattenMenuPermissionKeys,
};
