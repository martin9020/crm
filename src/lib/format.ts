export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const normalized = Math.abs(value) <= 1 ? value : value / 100;

  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(normalized);
}

export function compactNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

