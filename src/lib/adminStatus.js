export const STATUS_LABELS = {
  open: 'Open',
  complete: 'Complete',
  not_applicable: 'N/A',
  unknown: 'Not reviewed',
};

export const FALLBACK_COLORS = {
  clear: '#4f8f5f',
  unknown: '#6b7280',
  open: '#c75b39',
  overdue: '#b42318',
  dueSoon: '#b7791f',
};

const DAY_MS = 86_400_000;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getItemState(item, today = startOfToday()) {
  const status = item?.status || 'unknown';
  const due = parseDateOnly(item?.due_date);

  if (status !== 'not_applicable' && due) {
    const daysUntilDue = Math.round((due.getTime() - today.getTime()) / DAY_MS);
    if (daysUntilDue < 0) {
      return { key: 'overdue', label: 'Overdue', tone: 'danger', rank: 0, daysUntilDue };
    }
    if (daysUntilDue <= 30) {
      return { key: 'due_soon', label: daysUntilDue === 0 ? 'Due today' : 'Due soon', tone: 'warning', rank: 2, daysUntilDue };
    }
  }

  if (status === 'open') return { key: 'open', label: 'Open', tone: 'danger', rank: 1 };
  if (status === 'unknown') return { key: 'unknown', label: 'Not reviewed', tone: 'neutral', rank: 3 };
  if (status === 'complete') return { key: 'complete', label: 'Complete', tone: 'success', rank: 5 };
  return { key: 'not_applicable', label: 'N/A', tone: 'muted', rank: 6 };
}

function materializeItems(unit, activeItemTypes = []) {
  const records = unit.unit_items || [];
  if (!activeItemTypes.length) return records;
  const byType = new Map(records.map((item) => [item.item_types?.id || item.item_type_id, item]));
  return activeItemTypes.map((type) => byType.get(type.id) || {
    id: null,
    item_type_id: type.id,
    status: 'unknown',
    due_date: null,
    completed_date: null,
    notes: null,
    item_types: type,
  });
}

export function getAttentionItems(unit, activeItemTypes = []) {
  return materializeItems(unit, activeItemTypes)
    .map((item) => ({ ...item, computed_state: getItemState(item) }))
    .filter((item) => ['overdue', 'open', 'due_soon', 'unknown'].includes(item.computed_state.key))
    .sort((a, b) => a.computed_state.rank - b.computed_state.rank
      || (a.item_types?.severity_rank ?? 999) - (b.item_types?.severity_rank ?? 999)
      || String(a.item_types?.label || '').localeCompare(String(b.item_types?.label || '')));
}

// Backward-compatible name used by older code.
export const getOpenItems = getAttentionItems;

export function hasCompleteCoverage(unit, activeItemTypes = []) {
  if (!activeItemTypes.length) return false;
  const records = new Map((unit.unit_items || []).map((item) => [item.item_types?.id || item.item_type_id, item]));
  return activeItemTypes.every((type) => {
    const item = records.get(type.id);
    if (!item) return false;
    const state = getItemState(item);
    return state.key === 'complete' || state.key === 'not_applicable';
  });
}

export function getPrimaryStatus(unit, activeItemTypes = []) {
  const attention = getAttentionItems(unit, activeItemTypes);
  if (attention.length) {
    const primary = attention[0];
    const state = primary.computed_state;
    return {
      label: state.key === 'overdue'
        ? `${primary.item_types?.label || 'Item'} overdue`
        : state.key === 'due_soon'
          ? `${primary.item_types?.label || 'Item'} due soon`
          : primary.item_types?.label || state.label,
      color: state.key === 'overdue'
        ? FALLBACK_COLORS.overdue
        : state.key === 'due_soon'
          ? FALLBACK_COLORS.dueSoon
          : primary.item_types?.color || FALLBACK_COLORS.open,
      slug: primary.item_types?.slug || state.key,
      state: state.key,
    };
  }
  if (hasCompleteCoverage(unit, activeItemTypes)) {
    return { label: 'All clear', color: FALLBACK_COLORS.clear, slug: 'clear', state: 'clear' };
  }
  return { label: 'Not reviewed', color: FALLBACK_COLORS.unknown, slug: 'unknown', state: 'unknown' };
}

export function getUnitMetrics(unit, activeItemTypes = []) {
  const states = materializeItems(unit, activeItemTypes).map((item) => getItemState(item));
  return {
    attention: states.filter((state) => ['overdue', 'open', 'due_soon', 'unknown'].includes(state.key)).length,
    overdue: states.filter((state) => state.key === 'overdue').length,
    dueSoon: states.filter((state) => state.key === 'due_soon').length,
    unknown: states.filter((state) => state.key === 'unknown').length,
    allClear: hasCompleteCoverage(unit, activeItemTypes),
  };
}

export function latestUpdatedAt(unit) {
  const values = [unit.updated_at, ...(unit.unit_items || []).map((item) => item.updated_at)].filter(Boolean);
  if (!values.length) return null;
  return values.sort((a, b) => new Date(b) - new Date(a))[0];
}

export function formatDisplayDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDisplayDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function toDateInputValue(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
