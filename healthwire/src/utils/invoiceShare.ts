function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedShareType(value: unknown): 'percentage' | 'value' {
  return String(value || '').trim().toLowerCase() === 'percentage' ? 'percentage' : 'value';
}

function calculateGrossAmount(item: any): number {
  return toNumber(item?.amount) || toNumber(item?.rate) * Math.max(1, toNumber(item?.quantity) || 1);
}

function calculateNetAmount(item: any): number {
  const gross = calculateGrossAmount(item);
  const discount = toNumber(item?.discount);
  const discountAmount = toNumber(item?.discountType) === 1 ? gross * (discount / 100) : discount;
  return Math.max(0, gross - discountAmount);
}

function calculateDoctorGrossShareFromRows(item: any, gross: number): number | null {
  const rows = Array.isArray(item?.doctorShares) ? item.doctorShares : [];
  const validRows = rows.filter((row) => {
    const doctorId = row?.doctorId?._id || row?.doctorId || row?.userId || row?.doctor?._id || row?.doctor;
    const shareValue = toNumber(row?.shareValue ?? row?.share ?? row?.amount);
    return !!doctorId && shareValue > 0;
  });
  if (validRows.length === 0) return null;
  const total = validRows.reduce((sum, row) => {
    const shareValue = toNumber(row?.shareValue ?? row?.share ?? row?.amount);
    const shareType = normalizedShareType(row?.shareType);
    return sum + (shareType === 'percentage' ? gross * (shareValue / 100) : shareValue);
  }, 0);
  return Math.min(total, gross);
}

function calculateDoctorGrossShareFromProfile(doctor: any, gross: number): number | null {
  const sharePrice = toNumber(doctor?.sharePrice);
  if (sharePrice <= 0 || gross <= 0) return null;
  const shareType = normalizedShareType(doctor?.shareType);
  const total = shareType === 'percentage' ? gross * (sharePrice / 100) : sharePrice;
  return Math.min(total, gross);
}

function calculateFallbackShares(item: any, doctor: any) {
  const gross = calculateGrossAmount(item);
  const discount = toNumber(item?.discount);
  const discountAmount = toNumber(item?.discountType) === 1 ? gross * (discount / 100) : discount;
  const net = Math.max(0, gross - discountAmount);

  const doctorShareGross =
    calculateDoctorGrossShareFromRows(item, gross) ??
    calculateDoctorGrossShareFromProfile(doctor, gross) ??
    0;
  let hospitalShareGross = gross - doctorShareGross;

  let doctorAmount = doctorShareGross;
  let hospitalAmount = hospitalShareGross;
  switch (item?.deductDiscount) {
    case 'Hospital & Doctor':
      doctorAmount = Math.max(0, doctorShareGross - discountAmount / 2);
      hospitalAmount = Math.max(0, hospitalShareGross - discountAmount / 2);
      break;
    case 'Hospital':
      hospitalAmount = Math.max(0, hospitalShareGross - discountAmount);
      doctorAmount = doctorShareGross;
      break;
    case 'Doctor':
      doctorAmount = Math.max(0, doctorShareGross - discountAmount);
      hospitalAmount = hospitalShareGross;
      break;
    default:
      break;
  }

  const sumAfter = doctorAmount + hospitalAmount;
  if (net <= 0) {
    doctorAmount = 0;
    hospitalAmount = 0;
  } else if (Math.abs(sumAfter - net) > 0.0001) {
    hospitalAmount = Math.max(0, net - doctorAmount);
    doctorAmount = Math.max(0, net - hospitalAmount);
  }

  return {
    doctorAmount: Number(doctorAmount.toFixed(2)),
    hospitalAmount: Number(hospitalAmount.toFixed(2)),
  };
}

export function resolveInvoiceLineBreakdown(item: any, doctor: any) {
  const gross = calculateGrossAmount(item);
  const finalShares = resolveInvoiceLineShares(item, doctor);
  const doctorShareGross =
    calculateDoctorGrossShareFromRows(item, gross) ??
    calculateDoctorGrossShareFromProfile(doctor, gross) ??
    0;
  const hospitalShareGross = Math.max(0, gross - doctorShareGross);

  return {
    doctorShare: finalShares.doctorAmount,
    hospitalShare: finalShares.hospitalAmount,
    doctorDiscountBurden: Math.max(0, doctorShareGross - finalShares.doctorAmount),
    hospitalDiscountBurden: Math.max(0, hospitalShareGross - finalShares.hospitalAmount),
  };
}

export function resolveInvoiceLineShares(item: any, doctor: any) {
  const storedDoctorAmount = toNumber(item?.doctorAmount);
  const storedHospitalAmount = toNumber(item?.hospitalAmount);
  const hasRowShares = calculateDoctorGrossShareFromRows(item, calculateGrossAmount(item)) != null;
  const hasDoctorProfileShare = calculateDoctorGrossShareFromProfile(doctor, calculateGrossAmount(item)) != null;

  if (hasRowShares || hasDoctorProfileShare) {
    return calculateFallbackShares(item, doctor);
  }

  return {
    doctorAmount: storedDoctorAmount,
    hospitalAmount: storedHospitalAmount,
  };
}

export function sumInvoiceDoctorHospitalShare(invoice: any) {
  const items = Array.isArray(invoice?.item) ? invoice.item : [];
  const doctor = invoice?.doctorId || invoice?.doctorData || null;

  return items.reduce(
    (acc, item) => {
      const breakdown = resolveInvoiceLineBreakdown(item, doctor);
      acc.doctorShare += breakdown.doctorDiscountBurden;
      acc.hospitalShare += breakdown.hospitalDiscountBurden;
      return acc;
    },
    { doctorShare: 0, hospitalShare: 0 },
  );
}
