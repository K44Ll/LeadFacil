const BRAZIL_COUNTRY_CODE = "55";

export function normalizeBrazilianPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    if (digits.length !== 12 && digits.length !== 13) return null;
    return `+${digits}`;
  }
  if (digits.length !== 10 && digits.length !== 11) return null;
  return `+${BRAZIL_COUNTRY_CODE}${digits}`;
}

export function formatBrazilianPhone(value: string) {
  const normalized = normalizeBrazilianPhone(value);
  if (!normalized) return value;
  const digits = normalized.slice(3);
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}
