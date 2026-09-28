import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { formatDisplayDate, formatDisplayDateTime } from '../lib/adminStatus.js';
import { routes } from '../lib/routes.js';

const state = {
  user: null,
  profile: null,
  units: [],
  itemTypes: [],
  quickFilter: 'all',
  selectedUnitId: '',
  drawerOriginal: '',
  drawerDirty: false,
  selectedEvents: [],
  activeView: 'properties',
  columnSort: null,
  map: null,
  markers: new Map(),
  tempMarker: null,
  pendingLatLng: null,
  mapMode: null,
  realtimeChannel: null,
  saving: false,
};

const q = (selector) => document.querySelector(selector);
const qa = (selector) => [...document.querySelectorAll(selector)];
const show = (element, visible) => element?.classList.toggle('hidden', !visible);

const els = {
  loading: q('[data-admin-loading]'),
  denied: q('[data-access-denied]'),
  dashboard: q('[data-admin-dashboard]'),
  profileName: q('[data-profile-name]'),
  profileRole: q('[data-profile-role]'),
  signOut: q('[data-sign-out]'),
  export: q('[data-export]'),
  message: q('[data-admin-message]'),

  summaryTotal: q('[data-summary-total]'),
  summaryAttention: q('[data-summary-attention]'),
  summaryMonitor: q('[data-summary-monitor]'),
  summaryPaint: q('[data-summary-paint]'),
  paintSummary: q('[data-paint-summary]'),

  search: q('[data-search]'),
  categoryFilter: q('[data-category-filter]'),
  conditionFilter: q('[data-condition-filter]'),
  sort: q('[data-sort]'),
  clearFilters: q('[data-clear-filters]'),
  resultCount: q('[data-result-count]'),
  tableHead: q('[data-table-head]'),
  tableBody: q('[data-table-body]'),
  mobileList: q('[data-mobile-list]'),
  emptyState: q('[data-empty-state]'),
  emptyClear: q('[data-empty-clear]'),
  addCondo: q('[data-add-condo]'),

  mapAddCondo: q('[data-map-add-condo]'),
  mapInstruction: q('[data-map-instruction]'),
  mapInstructionText: q('[data-map-instruction-text]'),
  cancelMapMode: q('[data-cancel-map-mode]'),
  saveMapLocation: q('[data-save-map-location]'),
  mapElement: q('#admin-map'),
  addCard: q('[data-add-condo-card]'),
  addNumber: q('[data-add-number]'),
  addOwner: q('[data-add-owner]'),
  addBuilding: q('[data-add-building]'),
  addError: q('[data-add-error]'),
  cancelAddCard: q('[data-cancel-add-card]'),
  saveAddCondo: q('[data-save-add-condo]'),

  drawerBackdrop: q('[data-drawer-backdrop]'),
  drawer: q('[data-condo-drawer]'),
  drawerForm: q('[data-condo-form]'),
  drawerClose: q('[data-drawer-close]'),
  drawerTitle: q('[data-drawer-title]'),
  drawerSubtitle: q('[data-drawer-subtitle]'),
  drawerItems: q('[data-drawer-items]'),
  drawerSaveStatus: q('[data-drawer-save-status]'),
  saveCondo: q('[data-save-condo]'),
  movePin: q('[data-move-pin]'),
  editNumber: q('[data-edit-number]'),
  editBuilding: q('[data-edit-building]'),
  editOwner: q('[data-edit-owner]'),
  editOwnerEmail: q('[data-edit-owner-email]'),
  editOwnerPhone: q('[data-edit-owner-phone]'),
  editNotes: q('[data-edit-notes]'),
  historyDetails: q('[data-history-details]'),
  historyList: q('[data-history-list]'),
};

const CONDITION_META = {
  complete: { label: 'Good', className: 'condition-good', rank: 4 },
  monitor: { label: 'Monitor', className: 'condition-monitor', rank: 2 },
  open: { label: 'Needs attention', className: 'condition-attention', rank: 1 },
  unknown: { label: 'Not reviewed', className: 'condition-unknown', rank: 3 },
  not_applicable: { label: 'N/A', className: 'condition-na', rank: 5 },
};

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
  if (text) setMessage.timer = setTimeout(() => show(els.message, false), 5000);
}

function canEditItems() {
  return ['president', 'admin', 'editor'].includes(state.profile?.role);
}

function canEditUnits() {
  return ['president', 'admin'].includes(state.profile?.role);
}

function selectedUnit() {
  return state.units.find((unit) => unit.id === state.selectedUnitId) || null;
}

function recordForType(unit, itemTypeId) {
  return (unit?.unit_items || []).find((record) => (record.item_types?.id || record.item_type_id) === itemTypeId) || null;
}

function paintType() {
  return state.itemTypes.find((type) => type.slug === 'paint') || null;
}

function conditionForRecord(record) {
  const raw = record?.status || 'unknown';
  return { key: raw, ...(CONDITION_META[raw] || CONDITION_META.unknown) };
}

function materializedRecord(unit, type) {
  return recordForType(unit, type.id) || {
    id: null,
    item_type_id: type.id,
    status: 'unknown',
    due_date: null,
    completed_date: null,
    last_completed_date: null,
    notes: null,
    updated_at: unit?.updated_at || null,
    item_types: type,
  };
}

function unitHealth(unit) {
  const conditions = state.itemTypes.map((type) => conditionForRecord(materializedRecord(unit, type)));
  if (conditions.some((condition) => condition.key === 'open')) return 'attention';
  if (conditions.some((condition) => condition.key === 'monitor')) return 'monitor';
  if (conditions.some((condition) => condition.key === 'unknown')) return 'unknown';
  return 'good';
}

function latestUpdatedAt(unit) {
  const values = [unit.updated_at, ...(unit.unit_items || []).map((record) => record.updated_at)].filter(Boolean);
  if (!values.length) return null;
  return values.sort((a, b) => new Date(b) - new Date(a))[0];
}

function completionDate(record) {
  return record?.last_completed_date || record?.completed_date || '';
}

function shortDateLabel(type) {
  const value = type?.completion_date_label || 'Last completed';
  return value.replace(/\s+on$/i, '');
}

function conditionPill(condition) {
  return `<span class="condition-pill ${condition.className}"><span class="condition-dot"></span>${escapeHtml(condition.label)}</span>`;
}

function naturalUnitSort(a, b) {
  return String(a.unit_number || '').localeCompare(String(b.unit_number || ''), undefined, { numeric: true, sensitivity: 'base' });
}

async function requireSession() {
  if (!isSupabaseConfigured) {
    show(els.loading, false);
    show(els.denied, true);
    els.denied.innerHTML = '<p class="font-semibold">Supabase is not configured for this deployment.</p>';
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

async function loadData({ preserveDrawer = true } = {}) {
  const selected = preserveDrawer ? state.selectedUnitId : '';
  const [unitsResult, itemTypesResult] = await Promise.all([
    supabase
      .from('units')
      .select(`
        id,unit_number,display_name,building,lat,lng,notes,is_active,
        owner_name,owner_email,owner_phone,created_at,updated_at,
        unit_items(
          id,item_type_id,status,due_date,completed_date,last_completed_date,period_label,notes,
          updated_by,updated_by_name,created_at,updated_at,
          item_types(
            id,slug,label,description,color,severity_rank,is_active,
            completion_action_label,completion_date_label,due_date_label,
            supports_due_date,default_interval_months
          )
        )
      `)
      .eq('is_active', true)
      .order('unit_number'),
    supabase
      .from('item_types')
      .select(`
        id,slug,label,description,color,severity_rank,is_active,
        completion_action_label,completion_date_label,due_date_label,
        supports_due_date,default_interval_months,created_at,updated_at
      `)
      .eq('is_active', true)
      .order('severity_rank'),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (itemTypesResult.error) throw itemTypesResult.error;

  state.units = unitsResult.data || [];
  state.itemTypes = itemTypesResult.data || [];
  state.selectedUnitId = selected && state.units.some((unit) => unit.id === selected) ? selected : '';

  renderCategoryOptions();
  renderAll();

  if (state.selectedUnitId && els.drawer.classList.contains('is-open') && !state.drawerDirty) {
    populateDrawer(state.selectedUnitId, { reloadHistory: false });
  }
}

function renderCategoryOptions() {
  const current = els.categoryFilter.value || 'all';
  els.categoryFilter.innerHTML = [
    '<option value="all">Any category</option>',
    ...state.itemTypes.map((type) => `<option value="${escapeHtml(type.id)}">${escapeHtml(type.label)}</option>`),
  ].join('');
  if ([...els.categoryFilter.options].some((option) => option.value === current)) els.categoryFilter.value = current;

  const paint = paintType();
  show(els.paintSummary, Boolean(paint));
}

function matchesQuickFilter(unit) {
  if (state.quickFilter === 'all') return true;
  if (state.quickFilter === 'attention') return state.itemTypes.some((type) => conditionForRecord(materializedRecord(unit, type)).key === 'open');
  if (state.quickFilter === 'monitor') return state.itemTypes.some((type) => conditionForRecord(materializedRecord(unit, type)).key === 'monitor');
  if (state.quickFilter === 'paint') {
    const type = paintType();
    return type ? conditionForRecord(materializedRecord(unit, type)).key === 'open' : true;
  }
  return true;
}

function visibleUnits() {
  const search = els.search.value.trim().toLowerCase();
  const categoryId = els.categoryFilter.value;
  const condition = els.conditionFilter.value;

  const filtered = state.units.filter((unit) => {
    if (!matchesQuickFilter(unit)) return false;

    if (search) {
      const haystack = [
        unit.unit_number,
        unit.display_name,
        unit.building,
        unit.owner_name,
        unit.owner_email,
        unit.owner_phone,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (condition !== 'all') {
      if (categoryId === 'all') {
        if (!state.itemTypes.some((type) => conditionForRecord(materializedRecord(unit, type)).key === condition)) return false;
      } else {
        const type = state.itemTypes.find((item) => item.id === categoryId);
        if (!type || conditionForRecord(materializedRecord(unit, type)).key !== condition) return false;
      }
    }

    return true;
  });

  return filtered.sort(compareUnits);
}

function compareUnits(a, b) {
  if (state.columnSort?.kind === 'unit') {
    return naturalUnitSort(a, b) * state.columnSort.direction;
  }
  if (state.columnSort?.kind === 'owner') {
    const result = String(a.owner_name || '').localeCompare(String(b.owner_name || ''), undefined, { sensitivity: 'base' }) || naturalUnitSort(a, b);
    return result * state.columnSort.direction;
  }
  if (state.columnSort?.kind === 'item') {
    const type = state.itemTypes.find((item) => item.id === state.columnSort.itemTypeId);
    if (type) {
      const left = conditionForRecord(materializedRecord(a, type));
      const right = conditionForRecord(materializedRecord(b, type));
      const rank = (left.rank - right.rank) || naturalUnitSort(a, b);
      return rank * state.columnSort.direction;
    }
  }

  if (els.sort.value === 'attention') {
    const severity = (unit) => {
      const conditions = state.itemTypes.map((type) => conditionForRecord(materializedRecord(unit, type)));
      return Math.min(...conditions.map((item) => item.rank), 99);
    };
    return severity(a) - severity(b) || naturalUnitSort(a, b);
  }
  if (els.sort.value === 'recent') {
    return new Date(latestUpdatedAt(b) || 0) - new Date(latestUpdatedAt(a) || 0) || naturalUnitSort(a, b);
  }
  return naturalUnitSort(a, b);
}

function renderSummary() {
  const units = state.units;
  els.summaryTotal.textContent = units.length;
  els.summaryAttention.textContent = units.filter((unit) => state.itemTypes.some((type) => conditionForRecord(materializedRecord(unit, type)).key === 'open')).length;
  els.summaryMonitor.textContent = units.filter((unit) => state.itemTypes.some((type) => conditionForRecord(materializedRecord(unit, type)).key === 'monitor')).length;
  const paint = paintType();
  els.summaryPaint.textContent = paint
    ? units.filter((unit) => conditionForRecord(materializedRecord(unit, paint)).key === 'open').length
    : 0;

  qa('[data-quick-filter]').forEach((button) => button.classList.toggle('is-active', button.dataset.quickFilter === state.quickFilter));
}

function sortIndicator(kind, itemTypeId = '') {
  const sort = state.columnSort;
  const match = sort?.kind === kind && (kind !== 'item' || sort.itemTypeId === itemTypeId);
  if (!match) return '';
  return `<span class="admin-sort-indicator">${sort.direction === 1 ? '↑' : '↓'}</span>`;
}

function renderTableHead() {
  els.tableHead.innerHTML = `<tr>
    <th><button type="button" class="admin-sort-header" data-sort-column="unit"><span>Condo</span>${sortIndicator('unit')}</button></th>
    <th><button type="button" class="admin-sort-header" data-sort-column="owner"><span>Owner</span>${sortIndicator('owner')}</button></th>
    ${state.itemTypes.map((type) => `<th><button type="button" class="admin-sort-header" data-sort-column="item" data-item-type-id="${escapeHtml(type.id)}"><span>${escapeHtml(type.label)}</span>${sortIndicator('item', type.id)}</button></th>`).join('')}
    <th>Last updated</th>
  </tr>`;
}

function renderConditionCell(unit, type) {
  const record = materializedRecord(unit, type);
  const condition = conditionForRecord(record);
  const date = completionDate(record);
  return `<button type="button" class="condition-cell-button" data-open-unit="${escapeHtml(unit.id)}" data-focus-item="${escapeHtml(type.id)}">
    ${conditionPill(condition)}
    ${date ? `<div class="condition-date">${escapeHtml(shortDateLabel(type))} ${escapeHtml(formatDisplayDate(date))}</div>` : '<div class="condition-date">—</div>'}
  </button>`;
}

function renderTable() {
  const units = visibleUnits();
  renderTableHead();
  els.resultCount.textContent = `${units.length} ${units.length === 1 ? 'condo' : 'condos'} shown`;
  show(els.emptyState, units.length === 0);

  els.tableBody.innerHTML = units.map((unit) => `<tr>
    <td>
      <button type="button" class="admin-unit-link" data-open-unit="${escapeHtml(unit.id)}">
        <span class="admin-unit-number">${escapeHtml(unit.unit_number)}</span>
        <span class="admin-unit-meta">${escapeHtml(unit.building || 'Barrier Dunes')}</span>
      </button>
    </td>
    <td>
      <button type="button" class="admin-unit-link" data-open-unit="${escapeHtml(unit.id)}">
        <span class="font-semibold">${escapeHtml(unit.owner_name || '—')}</span>
        <span class="admin-unit-meta">${escapeHtml(unit.owner_email || unit.owner_phone || '')}</span>
      </button>
    </td>
    ${state.itemTypes.map((type) => `<td>${renderConditionCell(unit, type)}</td>`).join('')}
    <td class="whitespace-nowrap text-xs text-beach-slate/55">${escapeHtml(formatDisplayDate(latestUpdatedAt(unit)))}</td>
  </tr>`).join('');

  els.mobileList.innerHTML = units.map((unit) => `<article class="admin-mobile-card">
    <button type="button" class="flex w-full items-start justify-between gap-3 text-left" data-open-unit="${escapeHtml(unit.id)}">
      <div><div class="font-serif text-2xl text-beach-slate">Condo ${escapeHtml(unit.unit_number)}</div><div class="mt-1 text-sm text-beach-slate/60">${escapeHtml(unit.owner_name || unit.building || 'Barrier Dunes')}</div></div>
      ${conditionPill({ ...CONDITION_META[unitHealth(unit) === 'good' ? 'complete' : unitHealth(unit) === 'attention' ? 'open' : unitHealth(unit) === 'monitor' ? 'monitor' : 'unknown'], label: unitHealth(unit) === 'good' ? 'All clear' : unitHealth(unit) === 'attention' ? 'Needs attention' : unitHealth(unit) === 'monitor' ? 'Monitor' : 'Not reviewed' })}
    </button>
    <div class="admin-mobile-grid">
      ${state.itemTypes.map((type) => {
        const record = materializedRecord(unit, type);
        const condition = conditionForRecord(record);
        const date = completionDate(record);
        return `<button type="button" class="admin-mobile-condition" data-open-unit="${escapeHtml(unit.id)}" data-focus-item="${escapeHtml(type.id)}">
          <div class="admin-mobile-condition-label">${escapeHtml(type.label)}</div>
          ${conditionPill(condition)}
          ${date ? `<div class="condition-date">${escapeHtml(shortDateLabel(type))} ${escapeHtml(formatDisplayDate(date))}</div>` : ''}
        </button>`;
      }).join('')}
    </div>
  </article>`).join('');
}

function renderAll() {
  renderSummary();
  renderTable();
  if (state.map) renderMapMarkers();
}

function setQuickFilter(filter) {
  state.quickFilter = filter;
  renderAll();
}

function clearFilters() {
  state.quickFilter = 'all';
  els.search.value = '';
  els.categoryFilter.value = 'all';
  els.conditionFilter.value = 'all';
  els.sort.value = 'unit-asc';
  state.columnSort = null;
  renderAll();
}

function toggleColumnSort(kind, itemTypeId = '') {
  const same = state.columnSort?.kind === kind && (kind !== 'item' || state.columnSort.itemTypeId === itemTypeId);
  state.columnSort = {
    kind,
    itemTypeId,
    direction: same ? state.columnSort.direction * -1 : 1,
  };
  renderTable();
}

function setView(view) {
  state.activeView = view;
  qa('[data-view-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.viewTab === view));
  qa('[data-view-panel]').forEach((panel) => show(panel, panel.dataset.viewPanel === view));

  if (view === 'map') {
    ensureMap();
    setTimeout(() => {
      state.map?.invalidateSize();
      fitMapToUnits();
    }, 30);
  }
}

function drawerSnapshot() {
  if (!state.selectedUnitId) return '';
  const payload = {
    unit: {
      unit_number: els.editNumber.value.trim(),
      building: els.editBuilding.value.trim(),
      owner_name: els.editOwner.value.trim(),
      owner_email: els.editOwnerEmail.value.trim(),
      owner_phone: els.editOwnerPhone.value.trim(),
      notes: els.editNotes.value.trim(),
    },
    items: qa('[data-condition-editor]').map((row) => ({
      id: row.dataset.itemTypeId,
      status: row.querySelector('[data-condition-status]').value,
      date: row.querySelector('[data-condition-date]').value,
      notes: row.querySelector('[data-condition-notes]').value.trim(),
    })),
  };
  return JSON.stringify(payload);
}

function updateDrawerDirty() {
  state.drawerDirty = Boolean(state.drawerOriginal) && drawerSnapshot() !== state.drawerOriginal;
  els.drawerSaveStatus.textContent = state.drawerDirty ? 'Unsaved changes' : '';
}

function renderConditionEditors(unit) {
  els.drawerItems.innerHTML = state.itemTypes.map((type) => {
    const record = materializedRecord(unit, type);
    const currentDate = completionDate(record);
    const disabled = canEditItems() ? '' : 'disabled';
    return `<article class="admin-condition-editor" data-condition-editor data-item-type-id="${escapeHtml(type.id)}">
      <div class="admin-condition-editor-head">
        <div>
          <h4 class="admin-condition-title">${escapeHtml(type.label)}</h4>
          ${type.description ? `<p class="admin-condition-description">${escapeHtml(type.description)}</p>` : ''}
        </div>
        ${conditionPill(conditionForRecord(record))}
      </div>
      <div class="admin-condition-fields">
        <label>
          <span class="admin-label">Current condition</span>
          <select data-condition-status class="admin-input" ${disabled}>
            <option value="complete" ${record.status === 'complete' ? 'selected' : ''}>Good</option>
            <option value="monitor" ${record.status === 'monitor' ? 'selected' : ''}>Monitor</option>
            <option value="open" ${record.status === 'open' ? 'selected' : ''}>Needs attention</option>
            <option value="unknown" ${record.status === 'unknown' ? 'selected' : ''}>Not reviewed</option>
            <option value="not_applicable" ${record.status === 'not_applicable' ? 'selected' : ''}>N/A</option>
          </select>
        </label>
        <label>
          <span class="admin-label">${escapeHtml(type.completion_date_label || 'Last completed')}</span>
          <input data-condition-date type="date" value="${escapeHtml(currentDate)}" class="admin-input" ${disabled} />
        </label>
        <label>
          <span class="admin-label">Notes</span>
          <textarea data-condition-notes rows="2" class="admin-input" placeholder="Optional" ${disabled}>${escapeHtml(record.notes || '')}</textarea>
        </label>
      </div>
    </article>`;
  }).join('');
}

async function loadHistory(unitId) {
  els.historyList.innerHTML = '<p class="text-sm text-beach-slate/60">Loading history…</p>';
  const { data, error } = await supabase
    .from('unit_item_events')
    .select(`
      id,event_type,event_date,previous_status,new_status,completed_date,last_completed_date,
      due_date,period_label,notes,actor_name,created_at,
      item_types(id,label,completion_date_label)
    `)
    .eq('unit_id', unitId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(120);

  if (error) {
    els.historyList.innerHTML = `<p class="text-sm text-red-700">${escapeHtml(error.message)}</p>`;
    return;
  }
  state.selectedEvents = data || [];
  renderHistory();
}

function historyTitle(event) {
  const label = event.item_types?.label || 'Condition';
  if (event.event_type === 'work_recorded') return `${label} — work date recorded`;
  if (event.event_type === 'resolved') return `${label} marked Good`;
  if (event.event_type === 'opened') return `${label} needs attention`;
  if (event.event_type === 'reopened') return `${label} changed from Good`;
  if (event.event_type === 'note_added') return `${label} note updated`;
  if (event.event_type === 'initialized') return `${label} tracking started`;
  return `${label} updated`;
}

function renderHistory() {
  const useful = state.selectedEvents.filter((event) => event.event_type !== 'initialized');
  if (!useful.length) {
    els.historyList.innerHTML = '<p class="text-sm text-beach-slate/60">No maintenance history has been recorded yet.</p>';
    return;
  }

  els.historyList.innerHTML = useful.map((event) => {
    const workDate = event.last_completed_date || event.completed_date;
    return `<article class="admin-history-entry">
      <div class="admin-history-title">${escapeHtml(historyTitle(event))}</div>
      <div class="admin-history-meta">
        ${escapeHtml(formatDisplayDate(event.event_date))}${event.actor_name ? ` · ${escapeHtml(event.actor_name)}` : ''}
        ${workDate && event.event_type !== 'work_recorded' ? ` · ${escapeHtml(shortDateLabel(event.item_types))} ${escapeHtml(formatDisplayDate(workDate))}` : ''}
      </div>
      ${workDate && event.event_type === 'work_recorded' ? `<div class="admin-history-notes"><strong>${escapeHtml(event.item_types?.completion_date_label || 'Completed on')}:</strong> ${escapeHtml(formatDisplayDate(workDate))}</div>` : ''}
      ${event.notes ? `<div class="admin-history-notes">${escapeHtml(event.notes)}</div>` : ''}
    </article>`;
  }).join('');
}

function populateDrawer(unitId, { focusItemId = '', reloadHistory = true } = {}) {
  const unit = state.units.find((entry) => entry.id === unitId);
  if (!unit) return;
  state.selectedUnitId = unitId;
  state.drawerDirty = false;

  els.drawerTitle.textContent = `Condo ${unit.unit_number}`;
  els.drawerSubtitle.textContent = [unit.owner_name, unit.building].filter(Boolean).join(' · ') || 'Barrier Dunes';
  els.editNumber.value = unit.unit_number || '';
  els.editBuilding.value = unit.building || '';
  els.editOwner.value = unit.owner_name || '';
  els.editOwnerEmail.value = unit.owner_email || '';
  els.editOwnerPhone.value = unit.owner_phone || '';
  els.editNotes.value = unit.notes || '';

  [els.editNumber, els.editBuilding, els.editOwner, els.editOwnerEmail, els.editOwnerPhone, els.editNotes].forEach((input) => {
    input.disabled = !canEditUnits();
  });
  show(els.movePin, canEditUnits());
  els.saveCondo.disabled = !canEditItems() && !canEditUnits();
  els.saveCondo.textContent = (canEditItems() || canEditUnits()) ? 'Save Changes' : 'Read Only';

  renderConditionEditors(unit);
  if (reloadHistory) {
    els.historyDetails.open = false;
    els.historyList.innerHTML = '';
    loadHistory(unitId);
  }
  els.drawerSaveStatus.textContent = '';
  state.drawerOriginal = drawerSnapshot();

  if (focusItemId) {
    requestAnimationFrame(() => {
      const target = els.drawerItems.querySelector(`[data-item-type-id="${CSS.escape(focusItemId)}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

function openDrawer(unitId, focusItemId = '') {
  populateDrawer(unitId, { focusItemId });
  els.drawer.classList.add('is-open');
  els.drawer.setAttribute('aria-hidden', 'false');
  show(els.drawerBackdrop, true);
  document.body.style.overflow = 'hidden';
}

function closeDrawer({ force = false } = {}) {
  if (!force && state.drawerDirty && !confirm('Discard your unsaved changes?')) return false;
  els.drawer.classList.remove('is-open');
  els.drawer.setAttribute('aria-hidden', 'true');
  show(els.drawerBackdrop, false);
  document.body.style.overflow = '';
  state.drawerDirty = false;
  state.drawerOriginal = '';
  state.selectedUnitId = '';
  return true;
}

async function saveDrawer(event) {
  event.preventDefault();
  if (!state.selectedUnitId || (!canEditItems() && !canEditUnits())) return;
  const unit = selectedUnit();
  if (!unit) return;

  state.saving = true;
  els.saveCondo.disabled = true;
  els.drawerSaveStatus.textContent = 'Saving…';

  try {
    const original = JSON.parse(state.drawerOriginal || '{"unit":{},"items":[]}');

    if (canEditUnits()) {
      const currentUnit = {
        unit_number: els.editNumber.value.trim(),
        building: els.editBuilding.value.trim(),
        owner_name: els.editOwner.value.trim(),
        owner_email: els.editOwnerEmail.value.trim(),
        owner_phone: els.editOwnerPhone.value.trim(),
        notes: els.editNotes.value.trim(),
      };
      if (!currentUnit.unit_number) throw new Error('Condo number is required.');

      if (JSON.stringify(currentUnit) !== JSON.stringify(original.unit || {})) {
        const unitPayload = {
          unit_number: currentUnit.unit_number,
          display_name: `Unit ${currentUnit.unit_number}`,
          building: currentUnit.building || null,
          owner_name: currentUnit.owner_name || null,
          owner_email: currentUnit.owner_email || null,
          owner_phone: currentUnit.owner_phone || null,
          notes: currentUnit.notes || null,
        };
        const { error } = await supabase.from('units').update(unitPayload).eq('id', unit.id);
        if (error) throw error;
      }
    }

    if (canEditItems()) {
      const originalMap = new Map((original.items || []).map((item) => [item.id, item]));
      const changed = qa('[data-condition-editor]').map((row) => {
        const current = {
          id: row.dataset.itemTypeId,
          status: row.querySelector('[data-condition-status]').value,
          date: row.querySelector('[data-condition-date]').value,
          notes: row.querySelector('[data-condition-notes]').value.trim(),
        };
        return JSON.stringify(current) !== JSON.stringify(originalMap.get(current.id)) ? current : null;
      }).filter(Boolean);

      for (const item of changed) {
        const { error } = await supabase.rpc('set_unit_item_condition', {
          p_unit_id: unit.id,
          p_item_type_id: item.id,
          p_status: item.status,
          p_last_completed_date: item.date || null,
          p_notes: item.notes || null,
        });
        if (error) throw error;
      }
    }

    state.drawerDirty = false;
    await loadData({ preserveDrawer: true });
    populateDrawer(unit.id, { reloadHistory: true });
    els.drawerSaveStatus.textContent = 'Saved';
    setMessage(`Condo ${els.editNumber.value.trim()} saved.`, 'success');
  } catch (error) {
    els.drawerSaveStatus.textContent = 'Could not save';
    setMessage(error.message || 'Unable to save condo.', 'error');
  } finally {
    state.saving = false;
    els.saveCondo.disabled = !canEditItems() && !canEditUnits();
  }
}

function markerIcon(unit) {
  const health = unitHealth(unit);
  const className = health === 'attention' ? 'attention' : health === 'monitor' ? 'monitor' : health === 'good' ? 'good' : 'unknown';
  return window.L.divIcon({
    className: `admin-map-marker ${className}`,
    html: `<span>${escapeHtml(unit.unit_number)}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function ensureMap() {
  if (state.map || !window.L || !els.mapElement) return;
  state.map = window.L.map(els.mapElement, { zoomControl: true }).setView([29.7485, -85.3975], 17);
  window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20,
    attribution: 'Tiles © Esri',
  }).addTo(state.map);
  state.map.on('click', onMapClick);
  renderMapMarkers();
  fitMapToUnits();
}

function fitMapToUnits() {
  if (!state.map || state.mapMode) return;
  const coords = state.units
    .filter((unit) => Number.isFinite(Number(unit.lat)) && Number.isFinite(Number(unit.lng)))
    .map((unit) => [Number(unit.lat), Number(unit.lng)]);
  if (coords.length === 1) state.map.setView(coords[0], 18);
  else if (coords.length > 1) state.map.fitBounds(coords, { padding: [35, 35], maxZoom: 18 });
}

function renderMapMarkers() {
  if (!state.map) return;
  state.markers.forEach((marker) => marker.remove());
  state.markers.clear();

  state.units.forEach((unit) => {
    if (!Number.isFinite(Number(unit.lat)) || !Number.isFinite(Number(unit.lng))) return;
    const marker = window.L.marker([Number(unit.lat), Number(unit.lng)], { icon: markerIcon(unit) })
      .addTo(state.map)
      .bindTooltip(`Condo ${escapeHtml(unit.unit_number)}`, { direction: 'top' });
    marker.on('click', () => {
      if (!state.mapMode) openDrawer(unit.id);
    });
    state.markers.set(unit.id, marker);
  });
}

function tempMarkerIcon() {
  return window.L.divIcon({
    className: 'admin-temp-marker',
    html: '<span>+</span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function setTempMarker(latlng) {
  state.pendingLatLng = { lat: latlng.lat, lng: latlng.lng };
  if (!state.tempMarker) {
    state.tempMarker = window.L.marker(latlng, { icon: tempMarkerIcon(), draggable: true }).addTo(state.map);
    state.tempMarker.on('dragend', () => {
      const next = state.tempMarker.getLatLng();
      state.pendingLatLng = { lat: next.lat, lng: next.lng };
    });
  } else {
    state.tempMarker.setLatLng(latlng);
  }
}

function startAddMode() {
  if (!canEditUnits()) return;
  if (!closeDrawer({ force: false }) && els.drawer.classList.contains('is-open')) return;
  setView('map');
  ensureMap();
  cancelMapMode({ keepView: true });
  state.mapMode = 'add';
  els.mapInstructionText.textContent = 'Click the condo on the map. Then drag the pin if you need to fine-tune the location.';
  show(els.mapInstruction, true);
  show(els.saveMapLocation, false);
  show(els.addCard, false);
  els.mapElement.style.cursor = 'crosshair';
  setTimeout(() => state.map?.invalidateSize(), 20);
}

function startMoveMode() {
  if (!canEditUnits()) return;
  const unit = selectedUnit();
  if (!unit) return;
  if (!closeDrawer({ force: false })) return;
  state.selectedUnitId = unit.id;
  setView('map');
  ensureMap();
  cancelMapMode({ keepView: true });
  state.mapMode = 'move';
  els.mapInstructionText.textContent = `Move Condo ${unit.unit_number}: click a new location or drag the highlighted pin, then save.`;
  show(els.mapInstruction, true);
  show(els.saveMapLocation, true);
  show(els.addCard, false);
  els.mapElement.style.cursor = 'crosshair';
  if (Number.isFinite(Number(unit.lat)) && Number.isFinite(Number(unit.lng))) {
    setTempMarker({ lat: Number(unit.lat), lng: Number(unit.lng) });
    state.map.setView([Number(unit.lat), Number(unit.lng)], Math.max(state.map.getZoom(), 18));
  }
}

function onMapClick(event) {
  if (!state.mapMode) return;
  setTempMarker(event.latlng);
  if (state.mapMode === 'add') {
    show(els.addCard, true);
    els.addError.textContent = '';
    show(els.addError, false);
    setTimeout(() => els.addNumber.focus(), 20);
  }
}

function cancelMapMode({ keepView = true } = {}) {
  state.mapMode = null;
  state.pendingLatLng = null;
  if (state.tempMarker) {
    state.tempMarker.remove();
    state.tempMarker = null;
  }
  show(els.mapInstruction, false);
  show(els.saveMapLocation, false);
  show(els.addCard, false);
  els.addNumber.value = '';
  els.addOwner.value = '';
  els.addBuilding.value = '';
  els.addError.textContent = '';
  show(els.addError, false);
  if (els.mapElement) els.mapElement.style.cursor = '';
  if (keepView && state.map) fitMapToUnits();
}

async function saveNewCondo(event) {
  event.preventDefault();
  if (!canEditUnits()) return;
  if (!state.pendingLatLng) {
    els.addError.textContent = 'Choose a map location first.';
    show(els.addError, true);
    return;
  }
  const unitNumber = els.addNumber.value.trim();
  if (!unitNumber) return;

  els.saveAddCondo.disabled = true;
  try {
    const { data, error } = await supabase.from('units').insert({
      unit_number: unitNumber,
      display_name: `Unit ${unitNumber}`,
      building: els.addBuilding.value.trim() || null,
      owner_name: els.addOwner.value.trim() || null,
      lat: state.pendingLatLng.lat,
      lng: state.pendingLatLng.lng,
      is_active: true,
    }).select('id').single();
    if (error) throw error;

    cancelMapMode({ keepView: false });
    await loadData({ preserveDrawer: false });
    renderMapMarkers();
    setMessage(`Condo ${unitNumber} added.`, 'success');
    if (data?.id) openDrawer(data.id);
  } catch (error) {
    els.addError.textContent = error.message || 'Unable to add condo.';
    show(els.addError, true);
  } finally {
    els.saveAddCondo.disabled = false;
  }
}

async function saveMovedLocation() {
  if (state.mapMode !== 'move' || !state.pendingLatLng || !state.selectedUnitId) return;
  els.saveMapLocation.disabled = true;
  try {
    const unit = selectedUnit();
    const { error } = await supabase.from('units').update({
      lat: state.pendingLatLng.lat,
      lng: state.pendingLatLng.lng,
    }).eq('id', state.selectedUnitId);
    if (error) throw error;
    const id = state.selectedUnitId;
    cancelMapMode({ keepView: false });
    await loadData({ preserveDrawer: false });
    renderMapMarkers();
    setMessage(`Condo ${unit?.unit_number || ''} location saved.`, 'success');
    openDrawer(id);
  } catch (error) {
    setMessage(error.message || 'Unable to save map location.', 'error');
  } finally {
    els.saveMapLocation.disabled = false;
  }
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function exportSpreadsheet() {
  const headers = ['Condo', 'Owner', 'Owner Email', 'Owner Phone', 'Building'];
  state.itemTypes.forEach((type) => {
    headers.push(`${type.label} - Condition`, `${type.label} - ${shortDateLabel(type)}`, `${type.label} - Notes`);
  });
  headers.push('Last Updated');

  const rows = [headers];
  visibleUnits().forEach((unit) => {
    const row = [unit.unit_number, unit.owner_name || '', unit.owner_email || '', unit.owner_phone || '', unit.building || ''];
    state.itemTypes.forEach((type) => {
      const record = materializedRecord(unit, type);
      row.push(conditionForRecord(record).label, completionDate(record), record.notes || '');
    });
    row.push(latestUpdatedAt(unit) || '');
    rows.push(row);
  });

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `barrier-dunes-condos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function bind() {
  els.signOut.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.assign(routes.adminLogin);
  });
  els.export.addEventListener('click', exportSpreadsheet);

  qa('[data-quick-filter]').forEach((button) => button.addEventListener('click', () => setQuickFilter(button.dataset.quickFilter)));
  qa('[data-view-tab]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.viewTab)));

  els.search.addEventListener('input', renderAll);
  els.categoryFilter.addEventListener('change', renderAll);
  els.conditionFilter.addEventListener('change', renderAll);
  els.sort.addEventListener('change', () => {
    state.columnSort = null;
    renderTable();
  });
  els.clearFilters.addEventListener('click', clearFilters);
  els.emptyClear.addEventListener('click', clearFilters);

  els.tableHead.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sort-column]');
    if (!button) return;
    toggleColumnSort(button.dataset.sortColumn, button.dataset.itemTypeId || '');
  });

  const openFromClick = (event) => {
    const button = event.target.closest('[data-open-unit]');
    if (!button) return;
    openDrawer(button.dataset.openUnit, button.dataset.focusItem || '');
  };
  els.tableBody.addEventListener('click', openFromClick);
  els.mobileList.addEventListener('click', openFromClick);

  els.drawerForm.addEventListener('input', updateDrawerDirty);
  els.drawerForm.addEventListener('change', updateDrawerDirty);
  els.drawerForm.addEventListener('submit', saveDrawer);
  els.drawerClose.addEventListener('click', () => closeDrawer());
  els.drawerBackdrop.addEventListener('click', () => closeDrawer());
  els.movePin.addEventListener('click', startMoveMode);

  els.addCondo.addEventListener('click', startAddMode);
  els.mapAddCondo.addEventListener('click', startAddMode);
  els.cancelMapMode.addEventListener('click', () => cancelMapMode());
  els.cancelAddCard.addEventListener('click', () => cancelMapMode());
  els.addCard.addEventListener('submit', saveNewCondo);
  els.saveMapLocation.addEventListener('click', saveMovedLocation);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (state.mapMode) cancelMapMode();
      else if (els.drawer.classList.contains('is-open')) closeDrawer();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.drawerDirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function setupRealtime() {
  if (state.realtimeChannel) return;
  let timer;
  const refresh = () => {
    if (state.saving || state.drawerDirty) return;
    clearTimeout(timer);
    timer = setTimeout(() => loadData({ preserveDrawer: true }).catch((error) => setMessage(error.message, 'error')), 400);
  };
  state.realtimeChannel = supabase
    .channel('admin-spreadsheet-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_items' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_item_events' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'item_types' }, refresh)
    .subscribe();
}

async function init() {
  if (!await requireSession()) return;

  els.profileName.textContent = state.profile.full_name || state.profile.email || state.user.email || 'Board member';
  els.profileRole.textContent = state.profile.role;
  show(els.loading, false);
  show(els.dashboard, true);
  show(els.addCondo, canEditUnits());
  show(els.mapAddCondo, canEditUnits());

  bind();
  try {
    await loadData({ preserveDrawer: false });
    setupRealtime();
  } catch (error) {
    setMessage(error.message || 'Unable to load admin data.', 'error');
  }
}

init();
