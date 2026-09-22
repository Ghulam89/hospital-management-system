import XLSX from 'xlsx-js-style';
import moment from 'moment';
import dayjs from 'dayjs';
import { sumInvoiceDoctorHospitalShare } from '../../../utils/invoiceShare';
import { getInvoiceItemProcedureName, getInvoiceListGrandTotal, hasProcedureDate, invoiceListDueAndAdvance, invoiceListStatus } from '../../invoices/invoiceListUtils';

const CURRENCY_FMT = '#,##0.00';

const HEADER_STYLE = {
  font: { bold: true },
  alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
};

const TOTAL_ROW_STYLE = {
  font: { bold: true },
  alignment: { vertical: 'center' },
};

const MONEY_STYLE = {
  numFmt: CURRENCY_FMT,
  alignment: { horizontal: 'right', vertical: 'center' },
};

const TEXT_STYLE = {
  alignment: { vertical: 'center' },
};

const SHEET_HEADERS = [
  'Sr No',
  'Invoice No',
  'HCloud Invoice No',
  'Invoice Date',
  'Payment Date',
  'Created At',
  'Updated At',
  'Created By',
  'Updated By',
  'Patient Name',
  'Doctor Name',
  'Department',
  'Sub Total',
  'Discount',
  'Tax',
  'Grand Total',
  'Paid',
  'Due',
  'Advance',
  'Doctor Share',
  'Hospital Share',
  'Payment Status',
  'Procedure Name',
  'Quantity',
  'Unit Price',
  'Discount Value',
  'Discount Type',
  'Discount Amount',
  'Procedure Net Amount',
  'Procedure Status',
];

/** Invoice-level columns before procedure columns. */
const INVOICE_COL_COUNT = 21;

/** 0-based money column indices in the combined sheet (includes Sr No). */
const MONEY_COLS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 27, 28];

const PROCEDURE_COL_COUNT = 8;

const SUMMARY_HEADERS = [
  'Sr No',
  'Invoice No',
  'HCloud Invoice No',
  'Invoice Date',
  'Payment Date',
  'Created At',
  'Updated At',
  'Created By',
  'Updated By',
  'Patient Name',
  'Doctor Name',
  'Department',
  'Procedures / Items',
  'Sub Total',
  'Discount',
  'Tax',
  'Grand Total',
  'Paid',
  'Due',
  'Advance',
  'Doctor Share',
  'Hospital Share',
  'Payment Status',
];

/** 0-based money column indices in the summary sheet. */
const SUMMARY_MONEY_COLS = [13, 14, 15, 16, 17, 18, 19, 20, 21];

function invoiceCreatedByName(invoice: any): string {
  return (
    invoice?.createdByData?.name ||
    invoice?.createdById?.name ||
    invoice?.createdBy?.name ||
    invoice?.createdBy?.user?.name ||
    'N/A'
  );
}

function invoiceUpdatedByName(invoice: any): string {
  return (
    invoice?.updatedByData?.name ||
    invoice?.updatedById?.name ||
    invoice?.updatedBy?.name ||
    invoice?.updatedBy?.user?.name ||
    'N/A'
  );
}

function lineQuantity(item: any): number {
  const qty = Number(item?.quantity);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function lineUnitPrice(item: any): number {
  const rate = Number(item?.rate);
  if (Number.isFinite(rate) && rate > 0) return rate;

  const qty = lineQuantity(item);
  const amount = Number(item?.amount);
  if (Number.isFinite(amount) && amount > 0) return amount / qty;

  return 0;
}

function lineGross(item: any): number {
  const amount = Number(item?.amount);
  if (Number.isFinite(amount) && amount > 0) return amount;
  return lineUnitPrice(item) * lineQuantity(item);
}

function lineDiscountRaw(item: any): number {
  return Number(item?.discount) || 0;
}

function lineDiscountTypeLabel(item: any): string {
  return Number(item?.discountType) === 1 ? 'Percentage' : 'Amount';
}

function lineDiscountAmount(item: any): number {
  const gross = lineGross(item);
  const discount = lineDiscountRaw(item);
  return Number(item?.discountType) === 1 ? gross * (discount / 100) : discount;
}

function lineNet(item: any): number {
  return Math.max(0, lineGross(item) - lineDiscountAmount(item));
}

function procedureStatus(item: any): string {
  return hasProcedureDate(item?.procedureDate) ? 'Billed' : 'Advance';
}

function invoiceAdvanceAmount(invoice: any): number {
  const grandTotal = getInvoiceListGrandTotal(invoice);
  return invoiceListDueAndAdvance(grandTotal, invoice?.totalPay).advance;
}

function invoiceDueAmount(invoice: any): number {
  const grandTotal = getInvoiceListGrandTotal(invoice);
  return invoiceListDueAndAdvance(grandTotal, invoice?.totalPay).due;
}

function invoicePaymentStatus(invoice: any): string {
  return invoiceListStatus(getInvoiceListGrandTotal(invoice), invoice?.totalPay);
}

function formatDateTime(value: unknown): string {
  if (!value) return '';
  return moment(String(value)).format('DD/MM/YYYY HH:mm');
}

function parsePayDateToTs(payDate: unknown): number | null {
  if (!payDate) return null;
  if (typeof payDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
    const [y, m, d] = payDate.split('-').map((v) => Number(v));
    if (!y || !m || !d) return null;
    const local = new Date(y, m - 1, d);
    return Number.isFinite(local.getTime()) ? local.getTime() : null;
  }
  const parsed = dayjs(payDate as string);
  return parsed.isValid() ? parsed.valueOf() : null;
}

function parsePayDateToTsWithFallback(payDate: unknown, fallbackDateTime: unknown): number | null {
  if (!payDate) return null;
  if (
    typeof payDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(payDate)
  ) {
    return parsePayDateToTsWithFallback(payDate.slice(0, 10), fallbackDateTime);
  }
  if (typeof payDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
    const baseTs = parsePayDateToTs(payDate);
    if (!baseTs) return baseTs;
    const fb = dayjs(fallbackDateTime as string);
    if (!fb.isValid()) return baseTs;
    const base = dayjs(baseTs);
    return base
      .hour(fb.hour())
      .minute(fb.minute())
      .second(fb.second())
      .millisecond(fb.millisecond())
      .valueOf();
  }
  return parsePayDateToTs(payDate);
}

function invoiceDepartmentName(invoice: any): string {
  return invoice?.doctorId?.departmentId?.name || invoice?.departmentData?.name || 'N/A';
}

/** Latest payment date — same logic as Financial Report list. */
function invoicePaymentDateLabel(invoice: any): string {
  const paymentEntries = Array.isArray(invoice?.payment) ? invoice.payment : [];
  const paymentEntriesWithTs = paymentEntries
    .map((p: any) => ({
      ts: parsePayDateToTsWithFallback(
        p?.payDate,
        p?.createdAt || p?.updatedAt || invoice?.updatedAt || invoice?.createdAt,
      ),
    }))
    .filter((p: { ts: number | null }) => typeof p.ts === 'number') as { ts: number }[];

  if (paymentEntriesWithTs.length === 0) return '';

  const latest = paymentEntriesWithTs.reduce((acc, cur) => (cur.ts > acc.ts ? cur : acc));
  return dayjs(latest.ts).format('DD/MM/YYYY - hh:mm A');
}

/** Full invoice info on every procedure row (same invoice repeats per line). */
function invoiceMetaCells(invoice: any, effectiveInvoiceDate: (invoice: any) => string) {
  const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(invoice);
  const cells: (string | number)[] = new Array(INVOICE_COL_COUNT).fill('');

  cells[0] = invoice.invoiceNo || '';
  cells[1] = String(invoice.hcloudInvoiceNo || '').trim();
  cells[2] = formatDateTime(effectiveInvoiceDate(invoice));
  cells[3] = invoicePaymentDateLabel(invoice);
  cells[4] = formatDateTime(invoice.createdAt);
  cells[5] = formatDateTime(invoice.updatedAt || invoice.createdAt);
  cells[6] = invoiceCreatedByName(invoice);
  cells[7] = invoiceUpdatedByName(invoice);
  cells[8] = invoice.patientId?.name || 'N/A';
  cells[9] = invoice.doctorId?.name || 'N/A';
  cells[10] = invoiceDepartmentName(invoice);
  cells[11] = Number(invoice.subTotalBill) || 0;
  cells[12] = Number(invoice.discountBill) || 0;
  cells[13] = Number(invoice.taxBill) || 0;
  cells[14] = getInvoiceListGrandTotal(invoice);
  cells[15] = Number(invoice.totalPay) || 0;
  cells[16] = invoiceDueAmount(invoice);
  cells[17] = invoiceAdvanceAmount(invoice);
  cells[18] = Number(doctorShare.toFixed(2));
  cells[19] = Number(hospitalShare.toFixed(2));
  cells[20] = invoicePaymentStatus(invoice);

  return cells;
}

function invoiceItemsCommaLabel(items: any[]): string {
  return items.map((item) => getInvoiceItemProcedureName(item)).filter(Boolean).join(', ');
}

function summaryInvoiceRow(
  invoice: any,
  srNo: number,
  effectiveInvoiceDate: (invoice: any) => string,
): (string | number)[] {
  const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(invoice);
  const items = Array.isArray(invoice.item) ? invoice.item : [];

  return [
    srNo,
    invoice.invoiceNo || '',
    String(invoice.hcloudInvoiceNo || '').trim(),
    formatDateTime(effectiveInvoiceDate(invoice)),
    invoicePaymentDateLabel(invoice),
    formatDateTime(invoice.createdAt),
    formatDateTime(invoice.updatedAt || invoice.createdAt),
    invoiceCreatedByName(invoice),
    invoiceUpdatedByName(invoice),
    invoice.patientId?.name || 'N/A',
    invoice.doctorId?.name || 'N/A',
    invoiceDepartmentName(invoice),
    invoiceItemsCommaLabel(items),
    Number(invoice.subTotalBill) || 0,
    Number(invoice.discountBill) || 0,
    Number(invoice.taxBill) || 0,
    getInvoiceListGrandTotal(invoice),
    Number(invoice.totalPay) || 0,
    invoiceDueAmount(invoice),
    invoiceAdvanceAmount(invoice),
    Number(doctorShare.toFixed(2)),
    Number(hospitalShare.toFixed(2)),
    invoicePaymentStatus(invoice),
  ];
}

function summaryTotalsRow(invoices: any[]): (string | number)[] {
  const totals = invoices.reduce(
    (acc, invoice) => {
      const { doctorShare, hospitalShare } = sumInvoiceDoctorHospitalShare(invoice);
      acc.subTotal += Number(invoice.subTotalBill) || 0;
      acc.discount += Number(invoice.discountBill) || 0;
      acc.tax += Number(invoice.taxBill) || 0;
      acc.total += getInvoiceListGrandTotal(invoice);
      acc.paid += Number(invoice.totalPay) || 0;
      acc.due += invoiceDueAmount(invoice);
      acc.advance += invoiceAdvanceAmount(invoice);
      acc.doctorShare += doctorShare;
      acc.hospitalShare += hospitalShare;
      return acc;
    },
    {
      subTotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      paid: 0,
      due: 0,
      advance: 0,
      doctorShare: 0,
      hospitalShare: 0,
    },
  );

  const row: (string | number)[] = new Array(SUMMARY_HEADERS.length).fill('');
  row[1] = 'TOTAL';
  row[13] = Number(totals.subTotal.toFixed(2));
  row[14] = Number(totals.discount.toFixed(2));
  row[15] = Number(totals.tax.toFixed(2));
  row[16] = Number(totals.total.toFixed(2));
  row[17] = Number(totals.paid.toFixed(2));
  row[18] = Number(totals.due.toFixed(2));
  row[19] = Number(totals.advance.toFixed(2));
  row[20] = Number(totals.doctorShare.toFixed(2));
  row[21] = Number(totals.hospitalShare.toFixed(2));
  return row;
}

function procedureCells(item: any): (string | number)[] {
  const discountAmount = lineDiscountAmount(item);

  return [
    getInvoiceItemProcedureName(item),
    lineQuantity(item),
    Number(lineUnitPrice(item).toFixed(2)),
    lineDiscountRaw(item),
    lineDiscountTypeLabel(item),
    Number(discountAmount.toFixed(2)),
    Number(lineNet(item).toFixed(2)),
    procedureStatus(item),
  ];
}

const EMPTY_PROCEDURE_CELLS: (string | number)[] = new Array(PROCEDURE_COL_COUNT).fill('');

function autoFitColumns(data: (string | number)[][]): { wch: number }[] {
  if (data.length === 0) return [];
  const colCount = data[0].length;
  const widths = new Array(colCount).fill(10);

  data.forEach((row) => {
    row.forEach((cell, index) => {
      const len = String(cell ?? '').length;
      widths[index] = Math.max(widths[index], len + 2);
    });
  });

  return widths.map((w) => ({ wch: Math.min(Math.max(w, 10), 48) }));
}

function applySheetFormatting(
  ws: XLSX.WorkSheet,
  colCount: number,
  rowCount: number,
  moneyCols: number[],
) {
  for (let c = 0; c < colCount; c++) {
    const headerAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[headerAddr]) {
      ws[headerAddr].s = HEADER_STYLE;
    }
  }

  for (let r = 1; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      ws[addr].s = moneyCols.includes(c) ? MONEY_STYLE : TEXT_STYLE;
    }
  }

  ws['!views'] = [{ state: 'frozen', ySplit: 1, activeCell: 'A2', topLeftCell: 'A2' }];
}

function buildSheet(
  headers: string[],
  rows: (string | number)[][],
  moneyCols: number[],
  totalsRowIndex?: number,
): XLSX.WorkSheet {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = autoFitColumns(data);
  applySheetFormatting(ws, headers.length, data.length, moneyCols);

  if (typeof totalsRowIndex === 'number') {
    for (let c = 0; c < headers.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: totalsRowIndex, c });
      if (!ws[addr]) continue;
      ws[addr].s = {
        ...TOTAL_ROW_STYLE,
        ...(moneyCols.includes(c) ? MONEY_STYLE : TEXT_STYLE),
      };
    }
  }

  return ws;
}

export function buildFinancialInvoiceExcelWorkbook(
  invoices: any[],
  effectiveInvoiceDate: (invoice: any) => string,
): XLSX.WorkBook {
  const rows: (string | number)[][] = [];
  let srNo = 0;

  const pushRow = (cells: (string | number)[], invoiceSrNo: number | '' = '') => {
    rows.push([invoiceSrNo, ...cells]);
  };

  for (const invoice of invoices) {
    srNo += 1;
    const metaCells = invoiceMetaCells(invoice, effectiveInvoiceDate);
    const items = Array.isArray(invoice.item) ? invoice.item : [];
    const hasMultipleProcedures = items.length > 1;

    if (items.length === 0) {
      pushRow([...metaCells, ...EMPTY_PROCEDURE_CELLS], srNo);
      continue;
    }

    items.forEach((item, index) => {
      const rowSrNo = hasMultipleProcedures && index === 0 ? srNo : hasMultipleProcedures ? '' : srNo;
      pushRow([...metaCells, ...procedureCells(item)], rowSrNo);
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(SHEET_HEADERS, rows, MONEY_COLS),
    'Details Summary',
  );

  return wb;
}

export function buildFinancialInvoiceSummaryExcelWorkbook(
  invoices: any[],
  effectiveInvoiceDate: (invoice: any) => string,
): XLSX.WorkBook {
  const rows = invoices.map((invoice, index) =>
    summaryInvoiceRow(invoice, index + 1, effectiveInvoiceDate),
  );
  const totalsRow = summaryTotalsRow(invoices);
  const allRows = [...rows, totalsRow];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(SUMMARY_HEADERS, allRows, SUMMARY_MONEY_COLS, allRows.length),
    'Report Summary',
  );

  return wb;
}

export function writeFinancialInvoiceExcelFile(
  invoices: any[],
  effectiveInvoiceDate: (invoice: any) => string,
  fileName: string,
): { invoiceCount: number; procedureCount: number } {
  const wb = buildFinancialInvoiceExcelWorkbook(invoices, effectiveInvoiceDate);
  XLSX.writeFile(wb, fileName);

  const procedureCount = invoices.reduce(
    (sum, inv) => sum + (Array.isArray(inv?.item) ? inv.item.length : 0),
    0,
  );

  return { invoiceCount: invoices.length, procedureCount };
}

export function writeFinancialInvoiceSummaryExcelFile(
  invoices: any[],
  effectiveInvoiceDate: (invoice: any) => string,
  fileName: string,
): { invoiceCount: number } {
  const wb = buildFinancialInvoiceSummaryExcelWorkbook(invoices, effectiveInvoiceDate);
  XLSX.writeFile(wb, fileName);
  return { invoiceCount: invoices.length };
}
