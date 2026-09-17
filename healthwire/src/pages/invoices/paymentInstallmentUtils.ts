/** Payment row amount while editing (empty = user cleared field to re-type). */
export type InstallmentAmount = number | '';

export function parseInstallmentAmountInput(value: string): InstallmentAmount {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return '';
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return '';
  return Math.max(0, n);
}

export function installmentAmountNumber(amount: InstallmentAmount): number {
  if (amount === '') return 0;
  return Number(amount) || 0;
}

export function installmentAmountDisplay(amount: InstallmentAmount): number | '' {
  if (amount === '') return '';
  return amount;
}
