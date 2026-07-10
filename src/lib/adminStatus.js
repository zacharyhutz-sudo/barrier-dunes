export const STATUS_LABELS = { open: 'Open', complete: 'Complete', not_applicable: 'N/A', unknown: 'Unknown' };
export const FALLBACK_COLORS = { clear: '#4f8f5f', unknown: '#6b7280', open: '#c75b39' };

export function getOpenItems(unit) {
  return (unit.unit_items || [])
    .filter((item) => item.status === 'open' || item.status === 'unknown')
    .sort((a, b) => (a.item_types?.severity_rank ?? 999) - (b.item_types?.severity_rank ?? 999)
      || String(a.item_types?.label || '').localeCompare(String(b.item_types?.label || '')));
}

export function hasCompleteCoverage(unit, activeItemTypes = []) {
  if (!activeItemTypes.length) return false;
  const records = new Map((unit.unit_items || []).map((item) => [item.item_types?.id || item.item_type_id, item]));
  return activeItemTypes.every((type) => {
    const item = records.get(type.id);
    return item && (item.status === 'complete' || item.status === 'not_applicable');
  });
}

export function getPrimaryStatus(unit, activeItemTypes = []) {
  const openItems = getOpenItems(unit);
  if (openItems.length) {
    const primary = openItems[0];
    return {
      label: primary.item_types?.label || STATUS_LABELS[primary.status] || 'Open item',
      color: primary.item_types?.color || FALLBACK_COLORS.open,
      slug: primary.item_types?.slug || 'open',
    };
  }
  if (hasCompleteCoverage(unit, activeItemTypes)) return { label: 'All clear', color: FALLBACK_COLORS.clear, slug: 'clear' };
  return { label: 'Not reviewed', color: FALLBACK_COLORS.unknown, slug: 'unknown' };
}

export function latestUpdatedAt(unit) {
  const values = [unit.updated_at, ...(unit.unit_items || []).map((item) => item.updated_at)].filter(Boolean);
  if (!values.length) return null;
  return values.sort((a, b) => new Date(b) - new Date(a))[0];
}

export function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function toDateInputValue(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
