import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  getAttentionItems,
  getItemState,
  getPrimaryStatus,
  getUnitMetrics,
  latestUpdatedAt,
  toDateInputValue,
} from '../lib/adminStatus.js';
import { routes } from '../lib/routes.js';

const state = {
  user: null,
  profile: null,
  units: [],
  itemTypes: [],
  allItemTypes: [],
  selectedUnitId: '',
  selectedEvents: [],
  selectedUnitIds: new Set(),
  activeWorkspaceTab: 'record',
  activeAdminTab: 'units',
  map: null,
  markers: new Map(),
  tempMarker: null,
  placingLocation: false,
  realtimeChannel: null,
  issueInitialValue: '',
  issueDirty: false,
  profiles: [],
  auditEntries: [],
};

const q = (selector) => document.querySelector(selector);
const qa = (selector) => [...document.querySelectorAll(selector)];
const els = {
  loading: q('[data-admin-loading]'),
  denied: q('[data-access-denied]'),
  dashboard: q('[data-admin-dashboard]'),
  profileName: q('[data-profile-name]'),
  profileRole: q('[data-profile-role]'),
  signOut: q('[data-sign-out]'),
  message: q('[data-admin-message]'),
  adminToolsOpen: q('[data-admin-tools-open]'),
  addUnitOpen: q('[data-add-unit-open]'),
  emptyAddUnit: q('[data-empty-add-unit]'),

  summaryAttention: q('[data-summary-attention]'),
  summaryOverdue: q('[data-summary-overdue]'),
  summaryDueSoon: q('[data-summary-due-soon]'),
  summaryClear: q('[data-summary-clear]'),

  unitList: q('[data-unit-list]'),
  resultCount: q('[data-result-count]'),
  search: q('[data-unit-search]'),
  filter: q('[data-status-filter]'),
  clearFilters: q('[data-clear-filters]'),
  archived: q('[data-show-archived]'),
  exportCurrent: q('[data-export-current]'),
  selectVisible: q('[data-select-visible]'),
  batchBar: q('[data-batch-bar]'),
  batchCount: q('[data-batch-count]'),
  batchOpen: q('[data-batch-open]'),
  batchClear: q('[data-batch-clear]'),

  noUnit: q('[data-no-unit]'),
  workspace: q('[data-unit-workspace]'),
  selectedStatus: q('[data-selected-status]'),
  selectedTitle: q('[data-selected-unit-title]'),
  selectedMeta: q('[data-selected-unit-meta]'),
  selectedNotes: q('[data-selected-unit-notes]'),
  addRecord: q('[data-add-record]'),
  editSelectedUnit: q('[data-edit-selected-unit]'),
  record: q('[data-unit-record]'),
  activityList: q('[data-activity-list]'),
  exportHistory: q('[data-export-history]'),

  mapElement: q('#admin-map'),
  mapLegend: q('[data-map-legend]'),

  issueDialog: q('[data-issue-dialog]'),
  issueForm: q('[data-issue-form]'),
  issueKicker: q('[data-issue-kicker]'),
  issueTitle: q('[data-issue-title]'),
  issueContext: q('[data-issue-context]'),
  issueUnitId: q('[data-issue-unit-id]'),
  issueItemTypeId: q('[data-issue-item-type-id]'),
  issueItemPicker: q('[data-issue-item-picker]'),
  issueStatus: q('[data-issue-status]'),
  issueCompleted: q('[data-issue-completed]'),
  issueDue: q('[data-issue-due]'),
  issuePeriod: q('[data-issue-period]'),
  issueNotes: q('[data-issue-notes]'),
  issueSubmit: q('[data-issue-submit]'),
  issueUpdatedBy: q('[data-issue-updated-by]'),
  completedDateLabel: q('[data-completed-date-label]'),
  dueDateLabel: q('[data-due-date-label]'),
  dueDateField: q('[data-due-date-field]'),

  batchDialog: q('[data-batch-dialog]'),
  batchForm: q('[data-batch-form]'),
  batchDialogCount: q('[data-batch-dialog-count]'),
  batchItem: q('[data-batch-item]'),
  batchStatus: q('[data-batch-status]'),
  batchCompleted: q('[data-batch-completed]'),
  batchDue: q('[data-batch-due]'),
  batchPeriod: q('[data-batch-period]'),
  batchNotes: q('[data-batch-notes]'),
  batchSubmit: q('[data-batch-submit]'),

  addUnitDialog: q('[data-add-unit-dialog]'),
  addUnitForm: q('[data-add-unit-form]'),
  addUnitNumber: q('[data-add-unit-number]'),
  addUnitDisplay: q('[data-add-unit-display]'),
  addUnitBuilding: q('[data-add-unit-building]'),
  addUnitLat: q('[data-add-unit-lat]'),
  addUnitLng: q('[data-add-unit-lng]'),
  addUnitNotes: q('[data-add-unit-notes]'),
  addUnitPlace: q('[data-add-unit-place]'),
  addUnitLocationStatus: q('[data-add-unit-location-status]'),
  addUnitError: q('[data-add-unit-error]'),
  addUnitSubmit: q('[data-add-unit-submit]'),

  adminDialog: q('[data-admin-dialog]'),
  unitForm: q('[data-unit-form]'),
  unitId: q('[data-edit-unit-id]'),
  unitNumber: q('[data-edit-unit-number]'),
  unitDisplay: q('[data-edit-unit-display-name]'),
  unitBuilding: q('[data-edit-unit-building]'),
  unitLat: q('[data-edit-unit-lat]'),
  unitLng: q('[data-edit-unit-lng]'),
  unitNotes: q('[data-edit-unit-notes]'),
  unitActive: q('[data-edit-unit-active]'),
  newUnit: q('[data-new-unit]'),
  placeUnit: q('[data-place-unit]'),
  saveUnit: q('[data-save-unit]'),

  itemTypeList: q('[data-item-type-list]'),
  itemTypeForm: q('[data-item-type-form]'),
  itemTypeId: q('[data-item-type-id]'),
  itemTypeLabel: q('[data-item-type-label]'),
  itemTypeSlug: q('[data-item-type-slug]'),
  itemTypeDescription: q('[data-item-type-description]'),
  itemTypeColor: q('[data-item-type-color]'),
  itemTypeSeverity: q('[data-item-type-severity]'),
  itemTypeInterval: q('[data-item-type-interval]'),
  itemTypeActionLabel: q('[data-item-type-action-label]'),
  itemTypeCompletionLabel: q('[data-item-type-completion-label]'),
  itemTypeDueLabel: q('[data-item-type-due-label]'),
  itemTypeSupportsDue: q('[data-item-type-supports-due]'),
  itemTypeActive: q('[data-item-type-active]'),
  newItemType: q('[data-new-item-type]'),
  saveItemType: q('[data-save-item-type]'),

  userList: q('[data-user-list]'),
  auditList: q('[data-audit-list]'),
};

const show = (element, visible) => element?.classList.toggle('hidden', !visible);
const canEditItems = () => ['president', 'admin', 'editor'].includes(state.profile?.role);
const canEditUnits = () => ['president', 'admin'].includes(state.profile?.role);
const canManageUsers = () => state.profile?.role === 'president';
const todayInput = () => new Date().toISOString().slice(0, 10);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setMessage(text, type = 'info') {
  if (!els.message) return;
  els.message.textContent = text;
  els.message.dataset.type = type;
  show(els.message, Boolean(text));
  clearTimeout(setMessage.timer);
  if (text) setMessage.timer = setTimeout(() => show(els.message, false), 6000);
}

function selectedUnit() {
  return state.units.find((unit) => unit.id === state.selectedUnitId) || null;
}

function recordForType(unit, itemTypeId) {
  return (unit?.unit_items || []).find((item) => (item.item_types?.id || item.item_type_id) === itemTypeId) || null;
}

function itemTypeById(id) {
  return state.allItemTypes.find((item) => item.id === id) || null;
}

function addMonths(dateString, months) {
  if (!dateString || !Number.isFinite(Number(months)) || Number(months) <= 0) return '';
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + Number(months));
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

function badgeClass(tone) {
  return {
    success: 'admin-badge-success',
    danger: 'admin-badge-danger',
    warning: 'admin-badge-warning',
    muted: 'admin-badge-muted',
    neutral: 'admin-badge-neutral',
  }[tone] || 'admin-badge-neutral';
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function requireSession() {
  if (!isSupabaseConfigured) {
    show(els.loading, false);
    show(els.denied, true);
    els.denied.innerHTML = '<p>Supabase is not configured. Add the public URL and anon key.</p>';
    return false;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    location.assign(routes.adminLogin);
    return false;
  }
  state.user = data.user;

  const profileResult = await supabase
    .from('profiles')
    .select('id,user_id,full_name,email,role,active')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data?.active) {
    show(els.loading, false);
    show(els.denied, true);
    return false;
  }

  state.profile = profileResult.data;
  return true;
}

async function loadData({ preserveSelection = true } = {}) {
  const previousSelected = preserveSelection ? state.selectedUnitId : '';
  const [unitsResult, itemTypesResult] = await Promise.all([
    supabase
      .from('units')
      .select(`
        id,unit_number,display_name,building,lat,lng,notes,is_active,created_at,updated_at,
        unit_items(
          id,item_type_id,status,due_date,completed_date,period_label,notes,
          updated_by,updated_by_name,created_at,updated_at,
          item_types(
            id,slug,label,description,color,severity_rank,is_active,
            completion_action_label,completion_date_label,due_date_label,
            supports_due_date,default_interval_months
          )
        )
      `)
      .order('unit_number'),
    supabase
      .from('item_types')
      .select(`
        id,slug,label,description,color,severity_rank,is_active,
        completion_action_label,completion_date_label,due_date_label,
        supports_due_date,default_interval_months,created_at,updated_at
      `)
      .order('severity_rank'),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (itemTypesResult.error) throw itemTypesResult.error;

  state.units = unitsResult.data || [];
  state.allItemTypes = itemTypesResult.data || [];
  state.itemTypes = state.allItemTypes.filter((item) => item.is_active);

  renderFilters();
  renderSummary();
  renderLegend();
  renderBatchOptions();
  renderItemTypeList();
  renderList();

  const selectedStillExists = previousSelected && state.units.some((unit) => unit.id === previousSelected);
  if (selectedStillExists) {
    state.selectedUnitId = previousSelected;
    await loadSelectedEvents(previousSelected);
    renderWorkspace();
  } else {
    const first = visibleUnits()[0] || state.units.find((unit) => unit.is_active);
    if (first) await selectUnit(first.id, { moveMap: false });
    else clearWorkspace();
  }

  if (state.activeWorkspaceTab === 'map') renderMap();
}

async function loadSelectedEvents(unitId) {
  if (!unitId) {
    state.selectedEvents = [];
    return;
  }
  const { data, error } = await supabase
    .from('unit_item_events')
    .select(`
      id,unit_item_id,unit_id,item_type_id,event_type,event_date,
      previous_status,new_status,completed_date,due_date,period_label,notes,
      created_by,actor_name,created_at,
      item_types(id,slug,label,color)
    `)
    .eq('unit_id', unitId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  state.selectedEvents = data || [];
}

function renderFilters() {
  const current = els.filter.value;
  const systemOptions = [
    ['all', 'All units'],
    ['attention', 'Needs attention'],
    ['overdue', 'Overdue'],
    ['due_soon', 'Due in 30 days'],
    ['unknown', 'Not reviewed'],
    ['clear', 'All clear'],
  ];
  els.filter.innerHTML = [
    ...systemOptions.map(([value, label]) => `<option value="${value}">${label}</option>`),
    ...state.itemTypes.map((item) => `<option value="item:${item.slug}">${escapeHtml(item.label)}</option>`),
  ].join('');
  els.filter.value = [...els.filter.options].some((option) => option.value === current) ? current : 'all';
  qa('[data-summary-filter]').forEach((button) => button.classList.toggle('is-active', button.dataset.summaryFilter === els.filter.value));
}

function visibleUnits() {
  const search = els.search.value.trim().toLowerCase();
  const filter = els.filter.value;
  const includeArchived = els.archived.checked;

  return state.units.filter((unit) => {
    if (!includeArchived && !unit.is_active) return false;
    const matchesSearch = !search || [unit.unit_number, unit.display_name, unit.building]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
    if (!matchesSearch) return false;
    if (filter === 'all') return true;

    const metrics = getUnitMetrics(unit, state.itemTypes);
    if (filter === 'attention') return metrics.attention > 0;
    if (filter === 'overdue') return metrics.overdue > 0;
    if (filter === 'due_soon') return metrics.dueSoon > 0;
    if (filter === 'unknown') return metrics.unknown > 0;
    if (filter === 'clear') return metrics.allClear;
    if (filter.startsWith('item:')) {
      const slug = filter.slice(5);
      const type = state.itemTypes.find((item) => item.slug === slug);
      if (!type) return false;
      const record = recordForType(unit, type.id) || { status: 'unknown' };
      return ['overdue', 'open', 'due_soon', 'unknown'].includes(getItemState(record).key);
    }
    return true;
  });
}

function renderSummary() {
  const activeUnits = state.units.filter((unit) => unit.is_active);
  const states = activeUnits.flatMap((unit) => state.itemTypes.map((type) => {
    const record = recordForType(unit, type.id) || { status: 'unknown' };
    return getItemState(record);
  }));
  els.summaryAttention.textContent = String(states.filter((item) => ['overdue', 'open', 'due_soon', 'unknown'].includes(item.key)).length);
  els.summaryOverdue.textContent = String(states.filter((item) => item.key === 'overdue').length);
  els.summaryDueSoon.textContent = String(states.filter((item) => item.key === 'due_soon').length);
  els.summaryClear.textContent = String(activeUnits.filter((unit) => getUnitMetrics(unit, state.itemTypes).allClear).length);
  qa('[data-summary-filter]').forEach((button) => button.classList.toggle('is-active', button.dataset.summaryFilter === els.filter.value));
}

function renderList() {
  const units = visibleUnits();
  els.resultCount.textContent = `${units.length} unit${units.length === 1 ? '' : 's'} shown`;
  if (!units.length) {
    els.unitList.innerHTML = '<p class="p-2 text-sm text-beach-slate/60">No units match these filters.</p>';
    renderBatchBar();
    return;
  }

  els.unitList.innerHTML = units.map((unit) => {
    const primary = getPrimaryStatus(unit, state.itemTypes);
    const metrics = getUnitMetrics(unit, state.itemTypes);
    const attention = getAttentionItems(unit, state.itemTypes);
    const summary = attention.length
      ? attention.slice(0, 2).map((item) => item.item_types?.label || getItemState(item).label).join(', ')
      : primary.label;
    const more = attention.length > 2 ? ` +${attention.length - 2} more` : '';
    const selected = state.selectedUnitIds.has(unit.id);
    return `
      <article class="admin-unit-card ${unit.id === state.selectedUnitId ? 'is-selected' : ''}" data-unit-card="${unit.id}">
        <input data-batch-unit="${unit.id}" type="checkbox" ${selected ? 'checked' : ''} aria-label="Select Unit ${escapeHtml(unit.unit_number)} for batch update" />
        <button data-select-unit="${unit.id}" type="button" class="min-w-0 text-left">
          <div class="flex items-center gap-2">
            <i class="admin-status-dot" style="background:${primary.color}"></i>
            <h3 class="truncate font-semibold">Unit ${escapeHtml(unit.unit_number)}${unit.is_active ? '' : ' · Archived'}</h3>
          </div>
          <p class="mt-1 truncate text-xs text-beach-slate/70">${escapeHtml(summary)}${escapeHtml(more)}</p>
          <p class="mt-1 text-[11px] text-beach-slate/50">
            ${metrics.overdue ? `${metrics.overdue} overdue · ` : ''}${metrics.dueSoon ? `${metrics.dueSoon} due soon · ` : ''}Updated ${escapeHtml(formatDisplayDate(latestUpdatedAt(unit)))}
          </p>
        </button>
        <button data-select-unit="${unit.id}" type="button" class="self-center text-[10px] font-semibold uppercase tracking-[.14em]">Open</button>
      </article>`;
  }).join('');

  els.unitList.querySelectorAll('[data-select-unit]').forEach((button) => {
    button.addEventListener('click', () => selectUnit(button.dataset.selectUnit));
  });
  els.unitList.querySelectorAll('[data-batch-unit]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selectedUnitIds.add(checkbox.dataset.batchUnit);
      else state.selectedUnitIds.delete(checkbox.dataset.batchUnit);
      renderBatchBar();
    });
  });
  renderBatchBar();
}

function renderBatchBar() {
  const count = state.selectedUnitIds.size;
  els.batchCount.textContent = `${count} selected`;
  show(els.batchBar, count > 0 && canEditItems());
}

function renderBatchOptions() {
  const options = state.itemTypes.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('');
  els.batchItem.innerHTML = `<option value="">Choose item…</option>${options}`;
  els.issueItemPicker.innerHTML = options;
}

function renderLegend() {
  els.mapLegend.innerHTML = [
    '<span class="flex items-center gap-2"><i class="admin-status-dot" style="background:#4f8f5f"></i>All clear</span>',
    '<span class="flex items-center gap-2"><i class="admin-status-dot" style="background:#b42318"></i>Overdue</span>',
    '<span class="flex items-center gap-2"><i class="admin-status-dot" style="background:#b7791f"></i>Due soon</span>',
    '<span class="flex items-center gap-2"><i class="admin-status-dot" style="background:#6b7280"></i>Not reviewed</span>',
    ...state.itemTypes.map((item) => `<span class="flex items-center gap-2"><i class="admin-status-dot" style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`),
  ].join('');
}

async function selectUnit(id, { moveMap = true } = {}) {
  const unit = state.units.find((candidate) => candidate.id === id);
  if (!unit) return;
  state.selectedUnitId = id;
  await loadSelectedEvents(id);
  renderWorkspace();
  renderList();
  if (moveMap && state.map) {
    const marker = state.markers.get(id);
    if (marker) {
      state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 18));
      marker.openPopup();
    }
  }
}

function clearWorkspace() {
  state.selectedUnitId = '';
  state.selectedEvents = [];
  show(els.noUnit, true);
  show(els.workspace, false);
}

function renderWorkspace() {
  const unit = selectedUnit();
  if (!unit) {
    clearWorkspace();
    return;
  }
  show(els.noUnit, false);
  show(els.workspace, true);

  const primary = getPrimaryStatus(unit, state.itemTypes);
  const metrics = getUnitMetrics(unit, state.itemTypes);
  const primaryTone = primary.state === 'clear' ? 'success'
    : primary.state === 'overdue' ? 'danger'
      : primary.state === 'due_soon' ? 'warning'
        : 'neutral';
  els.selectedStatus.className = `admin-badge ${badgeClass(primaryTone)}`;
  els.selectedStatus.textContent = primary.label;
  els.selectedTitle.textContent = unit.display_name || `Unit ${unit.unit_number}`;
  els.selectedMeta.textContent = [
    unit.building,
    `${metrics.attention} item${metrics.attention === 1 ? '' : 's'} needing attention`,
    `Updated ${formatDisplayDate(latestUpdatedAt(unit))}`,
  ].filter(Boolean).join(' · ');
  els.selectedNotes.textContent = unit.notes || 'No general unit notes.';
  show(els.editSelectedUnit, canEditUnits());
  show(els.addRecord, canEditItems());

  renderRecord();
  renderActivity();
  if (state.activeWorkspaceTab === 'map') renderMap();
}

function renderRecord() {
  const unit = selectedUnit();
  if (!unit) return;
  if (!state.itemTypes.length) {
    els.record.innerHTML = '<p class="p-5 text-sm text-beach-slate/60">No active item types are configured.</p>';
    return;
  }

  els.record.innerHTML = state.itemTypes.map((type) => {
    const existing = recordForType(unit, type.id);
    const record = existing || { status: 'unknown', item_type_id: type.id, item_types: type };
    const status = getItemState(record);
    const events = state.selectedEvents.filter((event) => event.item_type_id === type.id);
    const actionLabel = type.completion_action_label || 'Mark complete';
    const mainAction = status.key === 'complete' ? 'Record again' : actionLabel;
    const notes = record.notes || '—';
    const updated = existing?.updated_at
      ? `Updated ${formatDisplayDate(existing.updated_at)}${existing.updated_by_name ? ` by ${existing.updated_by_name}` : ''}`
      : 'No current record';

    return `
      <article class="admin-record-row" data-record-item="${type.id}">
        <div class="admin-record-main">
          <div class="min-w-0">
            <span class="admin-record-label xl:hidden">Item</span>
            <div class="flex items-start gap-2"><i class="admin-status-dot mt-1" style="background:${type.color}"></i><div><h3 class="font-semibold">${escapeHtml(type.label)}</h3><p class="mt-1 text-xs leading-relaxed text-beach-slate/55">${escapeHtml(type.description || '')}</p>${record.period_label ? `<p class="mt-1 text-xs font-semibold text-beach-slate/70">${escapeHtml(record.period_label)}</p>` : ''}</div></div>
          </div>
          <div><span class="admin-record-label xl:hidden">Status</span><span class="admin-badge ${badgeClass(status.tone)}">${escapeHtml(status.label)}</span></div>
          <div><span class="admin-record-label xl:hidden">${escapeHtml(type.completion_date_label || 'Last completed')}</span><p class="text-sm">${escapeHtml(formatDisplayDate(record.completed_date))}</p></div>
          <div><span class="admin-record-label xl:hidden">${escapeHtml(type.due_date_label || 'Next due')}</span><p class="text-sm">${type.supports_due_date === false ? '—' : escapeHtml(formatDisplayDate(record.due_date))}</p></div>
          <div class="min-w-0"><span class="admin-record-label xl:hidden">Notes</span><p class="line-clamp-2 text-sm text-beach-slate/75">${escapeHtml(notes)}</p><p class="mt-1 text-[11px] text-beach-slate/45">${escapeHtml(updated)}</p></div>
          <div class="flex flex-wrap justify-start gap-2 xl:justify-end">
            ${canEditItems() ? `<button data-issue-action="resolve" data-item-type-id="${type.id}" type="button" class="admin-button-primary">${escapeHtml(mainAction)}</button><button data-issue-action="edit" data-item-type-id="${type.id}" type="button" class="admin-button-secondary">Edit</button>${['complete', 'not_applicable'].includes(record.status) ? `<button data-issue-action="reopen" data-item-type-id="${type.id}" type="button" class="text-xs font-semibold underline underline-offset-4">Reopen</button>` : ''}` : ''}
          </div>
        </div>
        <details class="admin-history">
          <summary>${events.length} histor${events.length === 1 ? 'y entry' : 'y entries'}</summary>
          <div class="admin-history-list">
            ${events.length ? events.map(renderHistoryEntry).join('') : '<p class="text-xs text-beach-slate/55">No history has been recorded yet.</p>'}
          </div>
        </details>
      </article>`;
  }).join('');

  els.record.querySelectorAll('[data-issue-action]').forEach((button) => {
    button.addEventListener('click', () => openIssueDialog(button.dataset.itemTypeId, button.dataset.issueAction));
  });
}

function renderHistoryEntry(event) {
  const labels = {
    initialized: 'Initialized',
    opened: 'Opened',
    resolved: 'Resolved',
    reopened: 'Reopened',
    updated: 'Updated',
    note_added: 'Note added',
  };
  const details = [
    event.completed_date ? `Completed ${formatDisplayDate(event.completed_date)}` : '',
    event.due_date ? `Due ${formatDisplayDate(event.due_date)}` : '',
    event.period_label || '',
  ].filter(Boolean).join(' · ');
  return `<div class="admin-history-entry"><div class="flex flex-wrap justify-between gap-2"><strong>${escapeHtml(labels[event.event_type] || event.event_type)}</strong><span>${escapeHtml(formatDisplayDate(event.event_date))}</span></div>${details ? `<span>${escapeHtml(details)}</span>` : ''}${event.notes ? `<span class="text-beach-slate/70">${escapeHtml(event.notes)}</span>` : ''}<small class="text-beach-slate/45">${escapeHtml(event.actor_name || 'System')} · ${escapeHtml(formatDisplayDateTime(event.created_at))}</small></div>`;
}

function renderActivity() {
  if (!state.selectedEvents.length) {
    els.activityList.innerHTML = '<div class="border border-beach-sky/30 bg-white p-6 text-sm text-beach-slate/60 shadow-sm">No activity has been recorded for this unit yet.</div>';
    return;
  }
  els.activityList.innerHTML = state.selectedEvents.map((event) => `
    <article class="border border-beach-sky/30 bg-white p-4 shadow-sm">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><div class="flex items-center gap-2"><i class="admin-status-dot" style="background:${event.item_types?.color || '#6b7280'}"></i><h3 class="font-semibold">${escapeHtml(event.item_types?.label || 'Unit item')}</h3></div><p class="mt-1 text-sm capitalize text-beach-slate/70">${escapeHtml(event.event_type.replaceAll('_', ' '))}${event.period_label ? ` · ${escapeHtml(event.period_label)}` : ''}</p></div>
        <time class="text-xs text-beach-slate/55">${escapeHtml(formatDisplayDate(event.event_date))}</time>
      </div>
      ${event.notes ? `<p class="mt-3 text-sm leading-relaxed text-beach-slate/75">${escapeHtml(event.notes)}</p>` : ''}
      <p class="mt-3 text-[11px] text-beach-slate/45">${escapeHtml(event.actor_name || 'System')} · ${escapeHtml(formatDisplayDateTime(event.created_at))}</p>
    </article>`).join('');
}

function markerIcon(unit) {
  const primary = getPrimaryStatus(unit, state.itemTypes);
  return L.divIcon({
    className: 'admin-unit-marker',
    html: `<span style="background:${primary.color}" title="${escapeHtml(primary.label)}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function renderMap() {
  if (!window.L || !els.mapElement) return;
  if (!state.map) {
    state.map = L.map('admin-map', { center: [29.7485, -85.3975], zoom: 17, scrollWheelZoom: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
    }).addTo(state.map);
    state.map.on('click', (event) => {
      if (!state.placingLocation || !canEditUnits()) return;
      const placingForAdd = state.placingLocation === 'add';
      const latInput = placingForAdd ? els.addUnitLat : els.unitLat;
      const lngInput = placingForAdd ? els.addUnitLng : els.unitLng;
      latInput.value = event.latlng.lat.toFixed(6);
      lngInput.value = event.latlng.lng.toFixed(6);
      state.tempMarker?.remove();
      state.tempMarker = L.marker(event.latlng).addTo(state.map);
      state.placingLocation = false;
      if (placingForAdd) {
        els.addUnitLocationStatus.textContent = `Location selected: ${latInput.value}, ${lngInput.value}`;
        els.addUnitDialog.showModal();
        setMessage('Location selected. Finish adding the unit.', 'success');
      } else {
        setMessage('Location selected. Return to Admin Tools and save the unit.', 'success');
      }
    });
  }

  const unitsWithCoordinates = state.units.filter((unit) => unit.lat != null && unit.lng != null);
  const currentIds = new Set(unitsWithCoordinates.map((unit) => unit.id));
  for (const [id, marker] of state.markers) {
    if (!currentIds.has(id)) {
      marker.remove();
      state.markers.delete(id);
    }
  }

  const visibleIds = new Set(visibleUnits().map((unit) => unit.id));
  unitsWithCoordinates.forEach((unit) => {
    const coordinates = [Number(unit.lat), Number(unit.lng)];
    let marker = state.markers.get(unit.id);
    if (!marker) {
      marker = L.marker(coordinates, { icon: markerIcon(unit) }).on('click', () => selectUnit(unit.id, { moveMap: false }));
      state.markers.set(unit.id, marker);
    } else {
      marker.setLatLng(coordinates);
      marker.setIcon(markerIcon(unit));
    }
    const primary = getPrimaryStatus(unit, state.itemTypes);
    marker.bindPopup(`<strong>Unit ${escapeHtml(unit.unit_number)}</strong><br>${escapeHtml(primary.label)}`);
    if (visibleIds.has(unit.id)) marker.addTo(state.map);
    else marker.remove();
  });

  window.setTimeout(() => state.map?.invalidateSize(), 50);
}

function setWorkspaceTab(tab) {
  state.activeWorkspaceTab = tab;
  qa('[data-workspace-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.workspaceTab === tab));
  qa('[data-workspace-panel]').forEach((panel) => show(panel, panel.dataset.workspacePanel === tab));
  if (tab === 'map') renderMap();
  if (tab === 'activity') renderActivity();
}

function issueFormSnapshot() {
  return JSON.stringify({
    status: els.issueStatus.value,
    completed: els.issueCompleted.value,
    due: els.issueDue.value,
    period: els.issuePeriod.value,
    notes: els.issueNotes.value,
  });
}

function updateIssueDirtyState() {
  state.issueDirty = issueFormSnapshot() !== state.issueInitialValue;
  els.issueSubmit.disabled = !state.issueDirty;
}

function openIssueDialog(itemTypeId, mode = 'edit') {
  const unit = selectedUnit();
  const type = itemTypeById(itemTypeId);
  if (!unit || !type) return;
  const record = recordForType(unit, itemTypeId);
  const existing = record || { status: 'unknown', completed_date: null, due_date: null, period_label: null, notes: null };

  els.issueUnitId.value = unit.id;
  els.issueItemTypeId.value = type.id;
  els.issueItemPicker.value = type.id;
  els.completedDateLabel.textContent = type.completion_date_label || 'Completed date';
  els.dueDateLabel.textContent = type.due_date_label || 'Next due';
  show(els.dueDateField, type.supports_due_date !== false);
  els.issueContext.textContent = `${unit.display_name || `Unit ${unit.unit_number}`} · ${type.label}`;
  els.issueUpdatedBy.textContent = record?.updated_at
    ? `Last updated ${formatDisplayDateTime(record.updated_at)}${record.updated_by_name ? ` by ${record.updated_by_name}` : ''}`
    : 'No previous record.';

  if (mode === 'resolve') {
    els.issueKicker.textContent = 'Resolve or record';
    els.issueTitle.textContent = type.completion_action_label || `Complete ${type.label}`;
    els.issueStatus.value = 'complete';
    els.issueCompleted.value = todayInput();
    els.issueDue.value = type.supports_due_date === false ? '' : addMonths(els.issueCompleted.value, type.default_interval_months);
    els.issuePeriod.value = existing.period_label || '';
    els.issueNotes.value = existing.notes || '';
    els.issueSubmit.textContent = type.completion_action_label || 'Save resolution';
  } else if (mode === 'reopen') {
    els.issueKicker.textContent = 'Reopen issue';
    els.issueTitle.textContent = `Reopen ${type.label}`;
    els.issueStatus.value = 'open';
    els.issueCompleted.value = '';
    els.issueDue.value = toDateInputValue(existing.due_date);
    els.issuePeriod.value = existing.period_label || '';
    els.issueNotes.value = existing.notes || '';
    els.issueSubmit.textContent = 'Reopen issue';
  } else {
    els.issueKicker.textContent = 'Edit current record';
    els.issueTitle.textContent = type.label;
    els.issueStatus.value = existing.status || 'unknown';
    els.issueCompleted.value = toDateInputValue(existing.completed_date);
    els.issueDue.value = toDateInputValue(existing.due_date);
    els.issuePeriod.value = existing.period_label || '';
    els.issueNotes.value = existing.notes || '';
    els.issueSubmit.textContent = 'Save update';
  }

  state.issueInitialValue = issueFormSnapshot();
  state.issueDirty = false;
  els.issueSubmit.disabled = true;
  if (!els.issueDialog.open) els.issueDialog.showModal();
}

function closeIssueDialog(force = false) {
  if (!force && state.issueDirty && !confirm('Discard your unsaved changes?')) return;
  state.issueDirty = false;
  els.issueDialog.close();
}

async function saveIssue(event) {
  event.preventDefault();
  if (!canEditItems()) return;
  const status = els.issueStatus.value;
  const completed = status === 'complete' ? (els.issueCompleted.value || todayInput()) : null;
  const due = status === 'not_applicable' ? null : (els.issueDue.value || null);
  els.issueSubmit.disabled = true;

  const { error } = await supabase.rpc('set_unit_item_status', {
    p_unit_id: els.issueUnitId.value,
    p_item_type_id: els.issueItemTypeId.value,
    p_status: status,
    p_completed_date: completed,
    p_due_date: due,
    p_period_label: els.issuePeriod.value.trim() || null,
    p_notes: els.issueNotes.value.trim() || null,
  });

  if (error) {
    els.issueSubmit.disabled = false;
    setMessage(error.message, 'error');
    return;
  }

  const unitId = els.issueUnitId.value;
  closeIssueDialog(true);
  await loadData();
  await selectUnit(unitId, { moveMap: false });
  setMessage('Unit record updated.', 'success');
}

function openBatchDialog() {
  if (!state.selectedUnitIds.size) return;
  els.batchDialogCount.textContent = `${state.selectedUnitIds.size} unit${state.selectedUnitIds.size === 1 ? '' : 's'} selected.`;
  els.batchStatus.value = 'complete';
  els.batchCompleted.value = todayInput();
  els.batchDue.value = '';
  els.batchPeriod.value = '';
  els.batchNotes.value = '';
  els.batchDialog.showModal();
}

function syncBatchDates() {
  const type = itemTypeById(els.batchItem.value);
  if (els.batchStatus.value === 'complete') {
    if (!els.batchCompleted.value) els.batchCompleted.value = todayInput();
    if (!els.batchDue.value && type?.default_interval_months) {
      els.batchDue.value = addMonths(els.batchCompleted.value, type.default_interval_months);
    }
  }
  if (els.batchStatus.value === 'not_applicable') {
    els.batchCompleted.value = '';
    els.batchDue.value = '';
  }
}

async function saveBatch(event) {
  event.preventDefault();
  if (!canEditItems() || !state.selectedUnitIds.size) return;
  if (!els.batchItem.value) {
    setMessage('Choose an item type for the batch update.', 'error');
    return;
  }
  if (!confirm(`Apply this update to ${state.selectedUnitIds.size} units?`)) return;
  els.batchSubmit.disabled = true;
  const status = els.batchStatus.value;
  const { data, error } = await supabase.rpc('set_unit_item_status_batch', {
    p_unit_ids: [...state.selectedUnitIds],
    p_item_type_id: els.batchItem.value,
    p_status: status,
    p_completed_date: status === 'complete' ? (els.batchCompleted.value || todayInput()) : null,
    p_due_date: status === 'not_applicable' ? null : (els.batchDue.value || null),
    p_period_label: els.batchPeriod.value.trim() || null,
    p_notes: els.batchNotes.value.trim() || null,
  });
  els.batchSubmit.disabled = false;
  if (error) {
    setMessage(error.message, 'error');
    return;
  }
  els.batchDialog.close();
  state.selectedUnitIds.clear();
  await loadData();
  setMessage(`${data ?? 'Selected'} unit records updated.`, 'success');
}

function setAddUnitError(message = '') {
  if (!els.addUnitError) return;
  els.addUnitError.textContent = message;
  show(els.addUnitError, Boolean(message));
}

function resetAddUnitForm() {
  els.addUnitForm.reset();
  els.addUnitLat.value = '';
  els.addUnitLng.value = '';
  els.addUnitLocationStatus.textContent = '';
  setAddUnitError('');
  state.placingLocation = false;
  state.tempMarker?.remove();
  state.tempMarker = null;
}

function openAddUnitDialog({ reset = true } = {}) {
  if (!canEditUnits()) return;
  if (reset) resetAddUnitForm();
  els.addUnitDialog.showModal();
  window.setTimeout(() => els.addUnitNumber.focus(), 50);
}

async function saveNewUnit(event) {
  event.preventDefault();
  if (!canEditUnits()) return;
  setAddUnitError('');
  const unitNumber = els.addUnitNumber.value.trim();
  if (!unitNumber) {
    setAddUnitError('Enter a unit number.');
    els.addUnitNumber.focus();
    return;
  }
  const duplicate = state.units.find((unit) => String(unit.unit_number).trim().toLowerCase() === unitNumber.toLowerCase());
  if (duplicate) {
    setAddUnitError(`Unit ${unitNumber} already exists${duplicate.is_active ? '' : ' and is archived'}.`);
    els.addUnitNumber.focus();
    return;
  }
  const latitude = els.addUnitLat.value === '' ? null : Number(els.addUnitLat.value);
  const longitude = els.addUnitLng.value === '' ? null : Number(els.addUnitLng.value);
  if ((latitude == null) !== (longitude == null)) {
    setAddUnitError('Enter both latitude and longitude, or leave both blank.');
    return;
  }
  if ((latitude != null && !Number.isFinite(latitude)) || (longitude != null && !Number.isFinite(longitude))) {
    setAddUnitError('Enter valid coordinates or leave both blank.');
    return;
  }
  els.addUnitSubmit.disabled = true;
  els.addUnitSubmit.textContent = 'Adding…';
  const payload = {
    unit_number: unitNumber,
    display_name: els.addUnitDisplay.value.trim() || `Unit ${unitNumber}`,
    building: els.addUnitBuilding.value.trim() || null,
    lat: latitude,
    lng: longitude,
    notes: els.addUnitNotes.value.trim() || null,
    is_active: true,
  };
  const { data, error } = await supabase.from('units').insert(payload).select('id').single();
  els.addUnitSubmit.disabled = false;
  els.addUnitSubmit.textContent = 'Add Unit';
  if (error) {
    setAddUnitError(error.code === '23505' ? `Unit ${unitNumber} already exists.` : error.message);
    return;
  }
  els.addUnitDialog.close();
  resetAddUnitForm();
  await loadData({ preserveSelection: false });
  await selectUnit(data.id, { moveMap: false });
  setWorkspaceTab('record');
  els.workspace?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setMessage(`Unit ${unitNumber} was added. Its tracking items are ready to review.`, 'success');
}

function populateUnitForm(unit) {
  els.unitId.value = unit?.id || '';
  els.unitNumber.value = unit?.unit_number || '';
  els.unitDisplay.value = unit?.display_name || '';
  els.unitBuilding.value = unit?.building || '';
  els.unitLat.value = unit?.lat ?? '';
  els.unitLng.value = unit?.lng ?? '';
  els.unitNotes.value = unit?.notes || '';
  els.unitActive.checked = unit ? Boolean(unit.is_active) : true;
}

function resetUnitForm() {
  els.unitForm.reset();
  populateUnitForm(null);
  state.tempMarker?.remove();
  state.tempMarker = null;
}

async function saveUnit(event) {
  event.preventDefault();
  if (!canEditUnits()) return;
  const unitNumber = els.unitNumber.value.trim();
  if (!unitNumber) {
    setMessage('Unit number is required.', 'error');
    return;
  }
  const latitude = els.unitLat.value === '' ? null : Number(els.unitLat.value);
  const longitude = els.unitLng.value === '' ? null : Number(els.unitLng.value);
  if ((latitude != null && !Number.isFinite(latitude)) || (longitude != null && !Number.isFinite(longitude))) {
    setMessage('Enter valid coordinates or leave both blank.', 'error');
    return;
  }
  const id = els.unitId.value;
  if (id && !els.unitActive.checked && !confirm('Archive this unit? It will remain available under “Show archived.”')) return;
  els.saveUnit.disabled = true;
  const payload = {
    unit_number: unitNumber,
    display_name: els.unitDisplay.value.trim() || `Unit ${unitNumber}`,
    building: els.unitBuilding.value.trim() || null,
    lat: latitude,
    lng: longitude,
    notes: els.unitNotes.value.trim() || null,
    is_active: els.unitActive.checked,
  };
  const request = id
    ? supabase.from('units').update(payload).eq('id', id).select('id').single()
    : supabase.from('units').insert(payload).select('id').single();
  const { data, error } = await request;
  els.saveUnit.disabled = false;
  if (error) {
    setMessage(error.message, 'error');
    return;
  }
  await loadData();
  await selectUnit(data.id, { moveMap: false });
  populateUnitForm(selectedUnit());
  setMessage(id ? 'Unit saved.' : 'Unit added with all items marked Not reviewed.', 'success');
}

function renderItemTypeList() {
  const allTypes = [...state.allItemTypes].sort((a, b) => a.severity_rank - b.severity_rank);
  els.itemTypeList.innerHTML = allTypes.length
    ? allTypes.map((item) => `<button data-edit-item-type="${item.id}" type="button" class="flex min-h-11 w-full items-center gap-3 border border-beach-sky/40 p-3 text-left hover:border-beach-sea"><i class="admin-status-dot" style="background:${item.color}"></i><span class="min-w-0"><strong class="block truncate text-sm">${escapeHtml(item.label)}</strong><small class="text-beach-slate/50">${escapeHtml(item.slug)}${item.is_active ? '' : ' · inactive'}</small></span></button>`).join('')
    : '<p class="text-sm text-beach-slate/60">No item types.</p>';
  els.itemTypeList.querySelectorAll('[data-edit-item-type]').forEach((button) => button.addEventListener('click', () => populateItemTypeForm(itemTypeById(button.dataset.editItemType))));
}

function populateItemTypeForm(item) {
  els.itemTypeId.value = item?.id || '';
  els.itemTypeLabel.value = item?.label || '';
  els.itemTypeSlug.value = item?.slug || '';
  els.itemTypeDescription.value = item?.description || '';
  els.itemTypeColor.value = item?.color || '#c75b39';
  els.itemTypeSeverity.value = item?.severity_rank ?? 100;
  els.itemTypeInterval.value = item?.default_interval_months ?? '';
  els.itemTypeActionLabel.value = item?.completion_action_label || '';
  els.itemTypeCompletionLabel.value = item?.completion_date_label || '';
  els.itemTypeDueLabel.value = item?.due_date_label || '';
  els.itemTypeSupportsDue.checked = item?.supports_due_date !== false;
  els.itemTypeActive.checked = item ? Boolean(item.is_active) : true;
}

async function saveItemType(event) {
  event.preventDefault();
  if (!canEditUnits()) return;
  const label = els.itemTypeLabel.value.trim();
  const slug = slugify(els.itemTypeSlug.value || label);
  if (!label || !slug) {
    setMessage('Item label and slug are required.', 'error');
    return;
  }
  const payload = {
    label,
    slug,
    description: els.itemTypeDescription.value.trim() || null,
    color: els.itemTypeColor.value || '#c75b39',
    severity_rank: Number(els.itemTypeSeverity.value) || 100,
    default_interval_months: els.itemTypeInterval.value === '' ? null : Number(els.itemTypeInterval.value),
    completion_action_label: els.itemTypeActionLabel.value.trim() || 'Mark complete',
    completion_date_label: els.itemTypeCompletionLabel.value.trim() || 'Completed on',
    due_date_label: els.itemTypeDueLabel.value.trim() || 'Next due',
    supports_due_date: els.itemTypeSupportsDue.checked,
    is_active: els.itemTypeActive.checked,
  };
  const id = els.itemTypeId.value;
  els.saveItemType.disabled = true;
  const request = id
    ? supabase.from('item_types').update(payload).eq('id', id)
    : supabase.from('item_types').insert(payload);
  const { error } = await request;
  els.saveItemType.disabled = false;
  if (error) {
    setMessage(error.message, 'error');
    return;
  }
  await loadData();
  populateItemTypeForm(null);
  setMessage('Item type saved.', 'success');
}

async function loadProfiles() {
  if (!canManageUsers()) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,user_id,full_name,email,role,active,updated_at')
    .order('full_name');
  if (error) throw error;
  state.profiles = data || [];
  renderUsers();
}

function renderUsers() {
  if (!canManageUsers()) {
    els.userList.innerHTML = '<p class="text-sm text-beach-slate/60">Only the president can manage users.</p>';
    return;
  }
  els.userList.innerHTML = state.profiles.map((profile) => `
    <form data-user-form="${profile.id}" class="grid gap-3 border border-beach-sky/40 p-4 md:grid-cols-[minmax(12rem,1fr)_11rem_auto_auto] md:items-end">
      <div><strong class="block">${escapeHtml(profile.full_name || profile.email || 'Unnamed user')}</strong><span class="text-xs text-beach-slate/55">${escapeHtml(profile.email || '')}</span></div>
      <label><span class="admin-label">Role</span><select data-user-role class="admin-input min-h-11"><option value="president" ${profile.role === 'president' ? 'selected' : ''}>President</option><option value="admin" ${profile.role === 'admin' ? 'selected' : ''}>Admin</option><option value="editor" ${profile.role === 'editor' ? 'selected' : ''}>Editor</option><option value="viewer" ${profile.role === 'viewer' ? 'selected' : ''}>Viewer</option></select></label>
      <label class="flex min-h-11 items-center gap-2 text-sm"><input data-user-active type="checkbox" ${profile.active ? 'checked' : ''} /> Active</label>
      <button type="submit" class="admin-button-primary">Save</button>
    </form>`).join('') || '<p class="text-sm text-beach-slate/60">No profiles found.</p>';
  els.userList.querySelectorAll('[data-user-form]').forEach((form) => form.addEventListener('submit', saveProfile));
}

async function saveProfile(event) {
  event.preventDefault();
  if (!canManageUsers()) return;
  const form = event.currentTarget;
  const id = form.dataset.userForm;
  const role = form.querySelector('[data-user-role]').value;
  const active = form.querySelector('[data-user-active]').checked;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  const { error } = await supabase.from('profiles').update({ role, active }).eq('id', id);
  submit.disabled = false;
  if (error) {
    setMessage(error.message, 'error');
    return;
  }
  await loadProfiles();
  setMessage('User access updated.', 'success');
}

async function loadAudit() {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id,user_id,actor_name,unit_id,action,old_value,new_value,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  state.auditEntries = data || [];
  renderAudit();
}

function renderAudit() {
  els.auditList.innerHTML = state.auditEntries.map((entry) => {
    const unit = state.units.find((candidate) => candidate.id === entry.unit_id);
    return `<details class="border border-beach-sky/40 bg-white p-4"><summary class="cursor-pointer"><strong>${escapeHtml(entry.action)}</strong>${unit ? ` · Unit ${escapeHtml(unit.unit_number)}` : ''}<span class="ml-2 text-xs text-beach-slate/50">${escapeHtml(entry.actor_name || 'System')} · ${escapeHtml(formatDisplayDateTime(entry.created_at))}</span></summary><div class="mt-3 grid gap-3 md:grid-cols-2"><div><span class="admin-label">Before</span><pre class="max-h-64 overflow-auto bg-slate-50 p-3 text-xs">${escapeHtml(JSON.stringify(entry.old_value, null, 2) || '—')}</pre></div><div><span class="admin-label">After</span><pre class="max-h-64 overflow-auto bg-slate-50 p-3 text-xs">${escapeHtml(JSON.stringify(entry.new_value, null, 2) || '—')}</pre></div></div></details>`;
  }).join('') || '<p class="text-sm text-beach-slate/60">No audit entries yet.</p>';
}

function setAdminTab(tab) {
  state.activeAdminTab = tab;
  qa('[data-admin-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.adminTab === tab));
  qa('[data-admin-panel]').forEach((panel) => show(panel, panel.dataset.adminPanel === tab));
  if (tab === 'users') loadProfiles().catch((error) => setMessage(error.message, 'error'));
  if (tab === 'audit') loadAudit().catch((error) => setMessage(error.message, 'error'));
}

function openAdminDialog(tab = 'units') {
  if (!canEditUnits()) return;
  populateUnitForm(selectedUnit());
  populateItemTypeForm(null);
  setAdminTab(tab);
  els.adminDialog.showModal();
}

function closeDialog(name) {
  if (name === 'issue') closeIssueDialog();
  if (name === 'batch') els.batchDialog.close();
  if (name === 'add-unit') {
    els.addUnitDialog.close();
    resetAddUnitForm();
  }
  if (name === 'admin') els.adminDialog.close();
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportCurrentView() {
  const rows = [['Unit', 'Building', 'Item', 'Status', 'Completed date', 'Due date', 'Period', 'Notes', 'Updated by', 'Updated at']];
  visibleUnits().forEach((unit) => {
    state.itemTypes.forEach((type) => {
      const record = recordForType(unit, type.id) || { status: 'unknown' };
      rows.push([
        unit.unit_number,
        unit.building || '',
        type.label,
        getItemState(record).label,
        record.completed_date || '',
        record.due_date || '',
        record.period_label || '',
        record.notes || '',
        record.updated_by_name || '',
        record.updated_at || '',
      ]);
    });
  });
  downloadCsv(`barrier-dunes-current-status-${todayInput()}.csv`, rows);
}

function exportUnitHistory() {
  const unit = selectedUnit();
  if (!unit) return;
  const rows = [['Unit', 'Item', 'Event', 'Event date', 'Previous status', 'New status', 'Completed date', 'Due date', 'Period', 'Notes', 'Entered by', 'Recorded at']];
  state.selectedEvents.forEach((event) => rows.push([
    unit.unit_number,
    event.item_types?.label || '',
    event.event_type,
    event.event_date,
    event.previous_status || '',
    event.new_status || '',
    event.completed_date || '',
    event.due_date || '',
    event.period_label || '',
    event.notes || '',
    event.actor_name || '',
    event.created_at || '',
  ]));
  downloadCsv(`unit-${unit.unit_number}-history-${todayInput()}.csv`, rows);
}

function bind() {
  els.signOut.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.assign(routes.adminLogin);
  });

  els.search.addEventListener('input', () => { renderList(); renderMap(); });
  els.filter.addEventListener('change', () => { renderList(); renderMap(); renderSummary(); });
  els.archived.addEventListener('change', () => { renderList(); renderMap(); });
  els.clearFilters.addEventListener('click', () => {
    els.search.value = '';
    els.filter.value = 'all';
    els.archived.checked = false;
    renderList();
    renderMap();
    renderSummary();
  });

  qa('[data-summary-filter]').forEach((button) => button.addEventListener('click', () => {
    els.filter.value = button.dataset.summaryFilter;
    renderList();
    renderMap();
    renderSummary();
  }));

  els.selectVisible.addEventListener('click', () => {
    visibleUnits().forEach((unit) => state.selectedUnitIds.add(unit.id));
    renderList();
  });
  els.batchClear.addEventListener('click', () => {
    state.selectedUnitIds.clear();
    renderList();
  });
  els.batchOpen.addEventListener('click', openBatchDialog);
  els.batchStatus.addEventListener('change', syncBatchDates);
  els.batchItem.addEventListener('change', syncBatchDates);
  els.batchCompleted.addEventListener('change', syncBatchDates);
  els.batchForm.addEventListener('submit', saveBatch);

  qa('[data-workspace-tab]').forEach((button) => button.addEventListener('click', () => setWorkspaceTab(button.dataset.workspaceTab)));
  els.addRecord.addEventListener('click', () => {
    const unit = selectedUnit();
    const firstAttention = unit ? getAttentionItems(unit, state.itemTypes)[0] : null;
    const type = itemTypeById(firstAttention?.item_type_id || firstAttention?.item_types?.id) || state.itemTypes[0];
    if (type) openIssueDialog(type.id, 'edit');
  });
  els.editSelectedUnit.addEventListener('click', () => openAdminDialog('units'));
  els.exportCurrent.addEventListener('click', exportCurrentView);
  els.exportHistory.addEventListener('click', exportUnitHistory);

  els.issueForm.addEventListener('submit', saveIssue);
  els.issueItemPicker.addEventListener('change', () => {
    if (state.issueDirty && !confirm('Discard changes and switch to another item?')) {
      els.issueItemPicker.value = els.issueItemTypeId.value;
      return;
    }
    openIssueDialog(els.issueItemPicker.value, 'edit');
  });
  [els.issueStatus, els.issueCompleted, els.issueDue, els.issuePeriod, els.issueNotes].forEach((input) => input.addEventListener('input', updateIssueDirtyState));
  els.issueStatus.addEventListener('change', () => {
    const type = itemTypeById(els.issueItemTypeId.value);
    if (els.issueStatus.value === 'complete') {
      if (!els.issueCompleted.value) els.issueCompleted.value = todayInput();
      if (!els.issueDue.value && type?.default_interval_months) els.issueDue.value = addMonths(els.issueCompleted.value, type.default_interval_months);
    }
    if (els.issueStatus.value === 'not_applicable') {
      els.issueCompleted.value = '';
      els.issueDue.value = '';
    }
    updateIssueDirtyState();
  });
  els.issueCompleted.addEventListener('change', () => {
    const type = itemTypeById(els.issueItemTypeId.value);
    if (els.issueStatus.value === 'complete' && type?.default_interval_months) {
      els.issueDue.value = addMonths(els.issueCompleted.value, type.default_interval_months);
      updateIssueDirtyState();
    }
  });

  els.adminToolsOpen.addEventListener('click', () => openAdminDialog('units'));
  els.addUnitOpen.addEventListener('click', () => openAddUnitDialog());
  els.emptyAddUnit.addEventListener('click', () => openAddUnitDialog());
  els.addUnitForm.addEventListener('submit', saveNewUnit);
  els.addUnitNumber.addEventListener('input', () => {
    setAddUnitError('');
    const number = els.addUnitNumber.value.trim();
    els.addUnitDisplay.placeholder = number ? `Defaults to Unit ${number}` : 'Defaults to Unit 150';
  });
  els.addUnitPlace.addEventListener('click', async () => {
    if (!state.units.length) {
      setAddUnitError('Add the first unit without a location, then place it on the map from Edit Unit.');
      return;
    }
    state.placingLocation = 'add';
    els.addUnitDialog.close();
    if (!selectedUnit()) await selectUnit(state.units.find((unit) => unit.is_active)?.id || state.units[0].id, { moveMap: false });
    setWorkspaceTab('map');
    setMessage('Click the map where this unit belongs.', 'info');
  });
  qa('[data-dialog-close]').forEach((button) => button.addEventListener('click', () => closeDialog(button.dataset.dialogClose)));
  qa('[data-admin-tab]').forEach((button) => button.addEventListener('click', () => setAdminTab(button.dataset.adminTab)));

  els.unitForm.addEventListener('submit', saveUnit);
  els.newUnit.addEventListener('click', () => { els.adminDialog.close(); openAddUnitDialog(); });
  els.placeUnit.addEventListener('click', () => {
    state.placingLocation = 'edit';
    els.adminDialog.close();
    setWorkspaceTab('map');
    setMessage('Click the map to place the unit. Then reopen Admin Tools and save.', 'info');
  });

  els.itemTypeForm.addEventListener('submit', saveItemType);
  els.newItemType.addEventListener('click', () => populateItemTypeForm(null));
  els.itemTypeLabel.addEventListener('input', () => {
    if (!els.itemTypeId.value && !els.itemTypeSlug.dataset.touched) els.itemTypeSlug.value = slugify(els.itemTypeLabel.value);
  });
  els.itemTypeSlug.addEventListener('input', () => { els.itemTypeSlug.dataset.touched = 'true'; });

  [els.issueDialog, els.batchDialog, els.addUnitDialog, els.adminDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      if (dialog === els.issueDialog) closeIssueDialog();
      else if (dialog === els.addUnitDialog) closeDialog('add-unit');
      else dialog.close();
    });
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.issueDirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function setupRealtime() {
  if (state.realtimeChannel) return;
  let timer;
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadData().catch((error) => setMessage(error.message, 'error')), 350);
  };
  state.realtimeChannel = supabase
    .channel('admin-workspace-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_items' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_item_events' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'item_types' }, refresh)
    .subscribe();
}

async function init() {
  if (!await requireSession()) return;
  els.profileName.textContent = state.profile.full_name || state.profile.email || state.user.email;
  els.profileRole.textContent = state.profile.role;
  show(els.loading, false);
  show(els.dashboard, true);
  show(els.adminToolsOpen, canEditUnits());
  show(els.addUnitOpen, canEditUnits());
  show(els.emptyAddUnit, canEditUnits());
  show(els.editSelectedUnit, canEditUnits());
  show(q('[data-admin-tab="users"]'), canManageUsers());

  if (!canEditItems()) {
    show(els.addRecord, false);
    show(els.batchBar, false);
  }

  bind();
  try {
    await loadData();
    setupRealtime();
  } catch (error) {
    setMessage(error.message || 'Unable to load admin data.', 'error');
  }
}

init();
