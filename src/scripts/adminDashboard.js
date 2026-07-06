import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';
import { STATUS_LABELS, formatDisplayDate, getPrimaryStatus, toDateInputValue } from '../lib/adminStatus.js';

const rawBaseUrl = import.meta.env.BASE_URL || '/';
const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`;
const loginUrl = `${baseUrl}admin/login`;

const state = {
  user: null,
  profile: null,
  units: [],
  itemTypes: [],
  selectedUnitId: '',
  map: null,
  markers: new Map(),
  placingLocation: false,
  tempMarker: null,
  realtimeChannel: null,
};

const els = {
  loading: document.querySelector('[data-admin-loading]'),
  accessDenied: document.querySelector('[data-access-denied]'),
  dashboard: document.querySelector('[data-admin-dashboard]'),
  profileName: document.querySelector('[data-profile-name]'),
  profileRole: document.querySelector('[data-profile-role]'),
  signOut: document.querySelector('[data-sign-out]'),
  message: document.querySelector('[data-admin-message]'),
  map: document.querySelector('#admin-map'),
  unitList: document.querySelector('[data-unit-list]'),
  searchInput: document.querySelector('[data-unit-search]'),
  statusFilter: document.querySelector('[data-status-filter]'),
  unitSelect: document.querySelector('[data-unit-select]'),
  itemSelect: document.querySelector('[data-item-select]'),
  statusSelect: document.querySelector('[data-status-select]'),
  completedDate: document.querySelector('[data-completed-date]'),
  dueDate: document.querySelector('[data-due-date]'),
  notes: document.querySelector('[data-notes]'),
  updateForm: document.querySelector('[data-update-form]'),
  updateButton: document.querySelector('[data-update-submit]'),
  unitEditor: document.querySelector('[data-unit-editor]'),
  unitForm: document.querySelector('[data-unit-form]'),
  unitId: document.querySelector('[data-edit-unit-id]'),
  unitNumber: document.querySelector('[data-edit-unit-number]'),
  unitDisplayName: document.querySelector('[data-edit-unit-display-name]'),
  unitBuilding: document.querySelector('[data-edit-unit-building]'),
  unitLat: document.querySelector('[data-edit-unit-lat]'),
  unitLng: document.querySelector('[data-edit-unit-lng]'),
  unitNotes: document.querySelector('[data-edit-unit-notes]'),
  unitIsActive: document.querySelector('[data-edit-unit-active]'),
  newUnit: document.querySelector('[data-new-unit]'),
  placeUnit: document.querySelector('[data-place-unit]'),
  saveUnit: document.querySelector('[data-save-unit]'),
};

function setMessage(text, type = 'info') {
  if (!els.message) return;
  els.message.textContent = text;
  els.message.dataset.type = type;
  window.clearTimeout(setMessage.timeout);
  if (text) {
    setMessage.timeout = window.setTimeout(() => {
      els.message.textContent = '';
      els.message.removeAttribute('data-type');
    }, 4500);
  }
}

function canEditItems() {
  return ['president', 'admin', 'editor'].includes(state.profile?.role);
}

function canEditUnits() {
  return ['president', 'admin'].includes(state.profile?.role);
}

function show(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

async function requireSession() {
  if (!isSupabaseConfigured) {
    show(els.loading, false);
    show(els.accessDenied, true);
    els.accessDenied.innerHTML = '<p>Supabase is not configured yet. Add your public Supabase URL and anon key.</p>';
    return false;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    window.location.assign(loginUrl);
    return false;
  }

  state.user = data.user;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.active) {
    show(els.loading, false);
    show(els.accessDenied, true);
    return false;
  }

  state.profile = profile;
  return true;
}

async function loadData() {
  const [unitsResult, itemTypesResult] = await Promise.all([
    supabase
      .from('units')
      .select(`
        id,
        unit_number,
        display_name,
        building,
        lat,
        lng,
        notes,
        is_active,
        updated_at,
        unit_items (
          id,
          status,
          due_date,
          completed_date,
          notes,
          updated_at,
          item_types (
            id,
            slug,
            label,
            color,
            severity_rank
          )
        )
      `)
      .eq('is_active', true)
      .order('unit_number', { ascending: true }),
    supabase
      .from('item_types')
      .select('id, slug, label, color, severity_rank, is_active')
      .eq('is_active', true)
      .order('severity_rank', { ascending: true }),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (itemTypesResult.error) throw itemTypesResult.error;

  state.units = unitsResult.data || [];
  state.itemTypes = itemTypesResult.data || [];

  renderFilters();
  renderUnitOptions();
  renderItemOptions();
  renderMap();
  renderUnitList();
}

function renderFilters() {
  if (!els.statusFilter) return;
  const current = els.statusFilter.value;
  els.statusFilter.innerHTML = `
    <option value="all">All statuses</option>
    <option value="clear">All clear</option>
    ${state.itemTypes.map((item) => `<option value="${item.slug}">${item.label}</option>`).join('')}
  `;
  els.statusFilter.value = current || 'all';
}

function renderUnitOptions() {
  if (!els.unitSelect) return;
  const current = els.unitSelect.value || state.selectedUnitId;
  els.unitSelect.innerHTML = `
    <option value="">Choose unit…</option>
    ${state.units.map((unit) => `<option value="${unit.id}">Unit ${unit.unit_number}</option>`).join('')}
  `;
  if (current) els.unitSelect.value = current;
}

function renderItemOptions() {
  if (!els.itemSelect) return;
  const current = els.itemSelect.value;
  els.itemSelect.innerHTML = `
    <option value="">Choose item…</option>
    ${state.itemTypes.map((item) => `<option value="${item.id}">${item.label}</option>`).join('')}
  `;
  if (current) els.itemSelect.value = current;
}

function getFilteredUnits() {
  const search = (els.searchInput?.value || '').trim().toLowerCase();
  const status = els.statusFilter?.value || 'all';

  return state.units.filter((unit) => {
    const primary = getPrimaryStatus(unit);
    const matchesSearch = !search || [unit.unit_number, unit.display_name, unit.building]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
    const matchesStatus = status === 'all' || primary.slug === status;
    return matchesSearch && matchesStatus;
  });
}

function makeMarkerIcon(unit) {
  const primary = getPrimaryStatus(unit);
  return L.divIcon({
    className: 'admin-unit-marker',
    html: `<span style="background:${primary.color}" title="${primary.label}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function renderMap() {
  if (!els.map || !window.L) return;

  if (!state.map) {
    state.map = L.map('admin-map', {
      center: [29.7485, -85.3975],
      zoom: 17,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      className: 'admin-map-tiles',
    }).addTo(state.map);

    state.map.on('click', (event) => {
      if (!state.placingLocation || !canEditUnits()) return;
      const { lat, lng } = event.latlng;
      els.unitLat.value = lat.toFixed(6);
      els.unitLng.value = lng.toFixed(6);

      if (state.tempMarker) state.tempMarker.remove();
      state.tempMarker = L.marker([lat, lng], { draggable: true }).addTo(state.map);
      state.tempMarker.on('dragend', (dragEvent) => {
        const next = dragEvent.target.getLatLng();
        els.unitLat.value = next.lat.toFixed(6);
        els.unitLng.value = next.lng.toFixed(6);
      });

      state.placingLocation = false;
      setMessage('Location selected. Save the unit to keep it.', 'success');
    });
  }

  const visibleUnitIds = new Set(getFilteredUnits().map((unit) => unit.id));

  state.units.forEach((unit) => {
    const hasCoordinates = unit.lat && unit.lng;
    if (!hasCoordinates) return;

    const coords = [Number(unit.lat), Number(unit.lng)];
    let marker = state.markers.get(unit.id);

    if (!marker) {
      marker = L.marker(coords, { icon: makeMarkerIcon(unit) }).addTo(state.map);
      marker.on('click', () => selectUnit(unit.id));
      state.markers.set(unit.id, marker);
    } else {
      marker.setLatLng(coords);
      marker.setIcon(makeMarkerIcon(unit));
    }

    const primary = getPrimaryStatus(unit);
    marker.bindPopup(`
      <div class="admin-map-popup">
        <strong>Unit ${unit.unit_number}</strong>
        <span>${primary.label}</span>
      </div>
    `);

    if (visibleUnitIds.has(unit.id)) {
      marker.addTo(state.map);
    } else {
      marker.remove();
    }
  });
}

function renderUnitList() {
  if (!els.unitList) return;
  const units = getFilteredUnits();

  if (!units.length) {
    els.unitList.innerHTML = '<p class="text-sm text-beach-slate/60">No units match this filter.</p>';
    return;
  }

  els.unitList.innerHTML = units.map((unit) => {
    const primary = getPrimaryStatus(unit);
    const items = unit.unit_items || [];
    const openItems = items.filter((item) => item.status === 'open' || item.status === 'unknown');
    const itemSummary = openItems.length
      ? openItems.map((item) => item.item_types?.label || item.status).join(', ')
      : 'No open items';

    return `
      <article class="admin-unit-card ${unit.id === state.selectedUnitId ? 'is-selected' : ''}" data-unit-card="${unit.id}">
        <div>
          <div class="admin-unit-title-row">
            <span class="admin-status-dot" style="background:${primary.color}"></span>
            <h3>Unit ${escapeHtml(unit.unit_number)}</h3>
          </div>
          <p>${escapeHtml(itemSummary)}</p>
          <small>Updated ${formatDisplayDate((items[0] || {}).updated_at?.slice(0, 10))}</small>
        </div>
        <button type="button" data-select-unit="${unit.id}">Select</button>
      </article>
    `;
  }).join('');

  els.unitList.querySelectorAll('[data-select-unit]').forEach((button) => {
    button.addEventListener('click', () => selectUnit(button.dataset.selectUnit));
  });
}

function selectUnit(unitId) {
  const unit = state.units.find((entry) => entry.id === unitId);
  if (!unit) return;

  state.selectedUnitId = unitId;
  if (els.unitSelect) els.unitSelect.value = unitId;

  if (canEditUnits()) {
    populateUnitForm(unit);
  }

  const marker = state.markers.get(unitId);
  if (marker && state.map) {
    state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 18));
    marker.openPopup();
  }

  renderUnitList();
}

function populateUnitForm(unit) {
  els.unitId.value = unit.id;
  els.unitNumber.value = unit.unit_number || '';
  els.unitDisplayName.value = unit.display_name || '';
  els.unitBuilding.value = unit.building || '';
  els.unitLat.value = unit.lat || '';
  els.unitLng.value = unit.lng || '';
  els.unitNotes.value = unit.notes || '';
  els.unitIsActive.checked = Boolean(unit.is_active);
}

function resetUnitForm() {
  els.unitForm.reset();
  els.unitId.value = '';
  els.unitIsActive.checked = true;
  if (state.tempMarker) {
    state.tempMarker.remove();
    state.tempMarker = null;
  }
}

async function saveUnitItem(event) {
  event.preventDefault();
  if (!canEditItems()) return;

  const unitId = els.unitSelect.value;
  const itemTypeId = els.itemSelect.value;
  const status = els.statusSelect.value;

  if (!unitId || !itemTypeId || !status) {
    setMessage('Choose a unit, item, and status.', 'error');
    return;
  }

  els.updateButton.disabled = true;
  setMessage('Saving update…');

  const payload = {
    unit_id: unitId,
    item_type_id: itemTypeId,
    status,
    completed_date: toDateInputValue(els.completedDate.value) || null,
    due_date: toDateInputValue(els.dueDate.value) || null,
    notes: els.notes.value.trim() || null,
    updated_by: state.user.id,
  };

  const { error } = await supabase
    .from('unit_items')
    .upsert(payload, { onConflict: 'unit_id,item_type_id' });

  if (error) {
    setMessage(error.message, 'error');
    els.updateButton.disabled = false;
    return;
  }

  await supabase.from('activity_log').insert({
    user_id: state.user.id,
    unit_id: unitId,
    action: 'unit_item_upsert',
    new_value: payload,
  });

  els.updateForm.reset();
  els.unitSelect.value = unitId;
  els.updateButton.disabled = false;
  await loadData();
  selectUnit(unitId);
  setMessage('Unit update saved.', 'success');
}

async function saveUnit(event) {
  event.preventDefault();
  if (!canEditUnits()) return;

  const unitNumber = els.unitNumber.value.trim();
  const lat = els.unitLat.value ? Number(els.unitLat.value) : null;
  const lng = els.unitLng.value ? Number(els.unitLng.value) : null;

  if (!unitNumber) {
    setMessage('Unit number is required.', 'error');
    return;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    setMessage('Choose a valid map location for this unit.', 'error');
    return;
  }

  els.saveUnit.disabled = true;
  setMessage('Saving unit…');

  const payload = {
    unit_number: unitNumber,
    display_name: els.unitDisplayName.value.trim() || `Unit ${unitNumber}`,
    building: els.unitBuilding.value.trim() || null,
    lat,
    lng,
    notes: els.unitNotes.value.trim() || null,
    is_active: els.unitIsActive.checked,
  };

  const id = els.unitId.value;
  const request = id
    ? supabase.from('units').update(payload).eq('id', id).select('id').single()
    : supabase.from('units').insert(payload).select('id').single();

  const { data, error } = await request;

  if (error) {
    setMessage(error.message, 'error');
    els.saveUnit.disabled = false;
    return;
  }

  await supabase.from('activity_log').insert({
    user_id: state.user.id,
    unit_id: data.id,
    action: id ? 'unit_update' : 'unit_create',
    new_value: payload,
  });

  resetUnitForm();
  els.saveUnit.disabled = false;
  await loadData();
  selectUnit(data.id);
  setMessage(id ? 'Unit saved.' : 'Unit added.', 'success');
}

function setupRealtime() {
  if (state.realtimeChannel) return;

  state.realtimeChannel = supabase
    .channel('admin-map-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_items' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => loadData())
    .subscribe();
}

function bindEvents() {
  els.signOut?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.assign(loginUrl);
  });

  els.searchInput?.addEventListener('input', () => {
    renderMap();
    renderUnitList();
  });

  els.statusFilter?.addEventListener('change', () => {
    renderMap();
    renderUnitList();
  });

  els.unitSelect?.addEventListener('change', () => {
    if (els.unitSelect.value) selectUnit(els.unitSelect.value);
  });

  els.updateForm?.addEventListener('submit', saveUnitItem);
  els.unitForm?.addEventListener('submit', saveUnit);

  els.newUnit?.addEventListener('click', () => {
    resetUnitForm();
    els.unitNumber.focus();
  });

  els.placeUnit?.addEventListener('click', () => {
    if (!state.map) return;
    state.placingLocation = true;
    setMessage('Click the map where this unit should go. You can drag the temporary marker after placing it.');
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function init() {
  const allowed = await requireSession();
  if (!allowed) return;

  els.profileName.textContent = state.profile.full_name || state.profile.email || state.user.email;
  els.profileRole.textContent = state.profile.role;

  show(els.loading, false);
  show(els.dashboard, true);
  show(els.unitEditor, canEditUnits());

  if (!canEditItems()) {
    els.updateForm.querySelectorAll('input, select, textarea, button').forEach((input) => {
      input.disabled = true;
    });
  }

  bindEvents();

  try {
    await loadData();
    setupRealtime();
    setMessage('Admin dashboard loaded.', 'success');
  } catch (error) {
    setMessage(error.message || 'Unable to load admin data.', 'error');
  }
}

init();
