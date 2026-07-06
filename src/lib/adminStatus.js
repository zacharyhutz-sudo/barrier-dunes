export const STATUS_LABELS = {
  open: 'Open',
  complete: 'Complete',
  not_applicable: 'N/A',
  unknown: 'Unknown',
};

export const FALLBACK_COLORS = {
  clear: '#4f8f5f',
  unknown: '#6b7280',
  open: '#c75b39',
};

export function getOpenItems(unit) {
  return (unit.unit_items || [])
    .filter((item) => item.status === 'open' || item.status === 'unknown')
    .sort((a, b) => {
      const aRank = a.item_types?.severity_rank ?? 999;
      const bRank = b.item_types?.severity_rank ?? 999;
      return aRank - bRank;
    });
}

export function getPrimaryStatus(unit) {
  const openItems = getOpenItems(unit);

  if (openItems.length === 0) {
    return {
      label: 'All clear',
      color: FALLBACK_COLORS.clear,
      slug: 'clear',
    };
  }

  const primary = openItems[0];

  return {
    label: primary.item_types?.label || STATUS_LABELS[primary.status] || 'Open item',
    color: primary.item_types?.color || FALLBACK_COLORS.open,
    slug: primary.item_types?.slug || 'open',
  };
}

export function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function toDateInputValue(value) {
  if (!value) return '';

  // Already YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
