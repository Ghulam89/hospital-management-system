/**
 * Capabilities for custom role templates (matrix in Roles & Permissions UI).
 * `group` labels align with major app areas / menus.
 * Keys must match client `permissions.ts` path rules.
 */
module.exports = [
  {
    key: 'createUsers',
    label: 'Create users',
    group: 'Users & administration',
    description: 'Add new staff and assign roles (Users section).',
  },
  {
    key: 'editUsers',
    label: 'Edit users',
    group: 'Users & administration',
    description: 'Change existing user profiles and tabs.',
  },
  {
    key: 'deleteUsers',
    label: 'Delete users',
    group: 'Users & administration',
    description: 'Remove user accounts where allowed.',
  },
  {
    key: 'doctor',
    label: 'Doctor',
    group: 'Clinical & OPD',
    description: 'Access doctor workflows: appointments, patients, clinical areas tied to this role.',
  },
  {
    key: 'nurse',
    label: 'Nurse',
    group: 'Clinical & OPD',
    description: 'Access nursing workflows and patient care features.',
  },
  {
    key: 'staff',
    label: 'Staff',
    group: 'Clinical & OPD',
    description: 'General staff access for front desk and shared clinical tools.',
  },
  {
    key: 'pharmacist',
    label: 'Pharmacist',
    group: 'Pharmacy',
    description: 'Pharmacy counter, stock, and dispensing areas.',
  },
  {
    key: 'pharmacyReferenceCatalog',
    label: 'Pharmacy reference catalog',
    group: 'Pharmacy',
    description:
      'Suppliers, manufacturers, and item categories are hospital-wide (global masters visible at every branch). Fine-grained CRUD uses Roles matrix keys mp.pharm_suppliers.*, mp.pharm_manufacturers.*, mp.pharm_categories.*.',
  },
  {
    key: 'pharmacyOrders',
    label: 'Pharmacy orders',
    group: 'Pharmacy',
    description: 'Create and manage purchase orders and inbound stock.',
  },
  {
    key: 'viewPharmacyReports',
    label: 'View pharmacy reports',
    group: 'Pharmacy',
    description: 'Open pharmacy sales and stock reports.',
  },
  {
    key: 'pharmPosChangeQuantity',
    label: 'POS: change quantities on bills',
    group: 'Pharmacy',
    description:
      'When editing pharmacy POS invoices, allow changing line quantities and return quantities (otherwise header/note-only style edits).',
  },
  {
    key: 'pharmPosBackdateBills',
    label: 'POS: backdate bills',
    group: 'Pharmacy',
    description:
      'Create or edit pharmacy POS with invoice/payment date before today (calendar day in server local time).',
  },
  {
    key: 'invoiceBackdate',
    label: 'Backdate patient invoices',
    group: 'Finance & billing',
    description:
      'Set patient invoice date or payment dates before today (calendar day in server local time).',
  },
  {
    key: 'accountant',
    label: 'Accountant',
    group: 'Finance & billing',
    description: 'Invoices, expenses, and accounting views.',
  },
  {
    key: 'editInvoice',
    label: 'Edit invoices',
    group: 'Finance & billing',
    description: 'Create and modify patient invoices and billing lines.',
  },
  {
    key: 'editExpenses',
    label: 'Edit expenses',
    group: 'Finance & billing',
    description: 'Manage expense categories and entries.',
  },
  {
    key: 'expenseCategoriesCatalog',
    label: 'Expense categories catalog',
    group: 'Finance & billing',
    description:
      'Expense category master list is shared across branches. Assign create/update/delete via Roles matrix mp.expense_categories.*.',
  },
  {
    key: 'viewFinancialReports',
    label: 'View financial reports',
    group: 'Reports',
    description: 'Profit & loss and financial dashboards.',
  },
  {
    key: 'viewOtherReports',
    label: 'View OPD / other reports',
    group: 'Reports',
    description: 'OPD and general operational reports.',
  },
  {
    key: 'viewIPDReports',
    label: 'View IPD reports',
    group: 'Reports',
    description: 'Indoor, wards, beds, and IPD-related reports.',
  },
  {
    key: 'deletePatient',
    label: 'Delete patients',
    group: 'Patients',
    description: 'Permanently remove patient records where policy allows.',
  },
];

/**
 * Old deployments may still store this typo; accept on save, do not show in UI.
 * @type {string[]}
 */
const LEGACY_EXTRA_KEYS = ['viewFinanicalReports'];

module.exports.LEGACY_EXTRA_KEYS = LEGACY_EXTRA_KEYS;
