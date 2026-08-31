/* ============================================================
   OnePercent — habits.js
   ============================================================ */

const HABIT_CATEGORIES = ['Health', 'Study', 'Career', 'Fitness', 'Personal', 'Other'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function renderHabits(root) {
  const data = loadData();
  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Habits</h1>
        <p class="page-sub">Small, repeatable actions that compound.</p>
      </div>
      <button class="btn btn-primary" id="new-habit-btn">${icon('plus')} Create Habit</button>
    </div>
    <div id="habits-list" class="grid grid-3"></div>
  `;
  qs('#new-habit-btn', root).addEventListener('click', () => openHabitForm());

  const listEl = qs('#habits-list', root);
  if (data.habits.length === 0) {
    listEl.className = '';
    listEl.innerHTML = emptyState({
      title: 'No habits yet',
      body: 'Create a habit you can check off every day it applies.',
      actionLabel: 'Create Habit',
      actionId: 'empty-create-habit'
    });
    qs('#empty-create-habit', listEl).addEventListener('click', () => openHabitForm());
    return;
  }
  listEl.className = 'grid grid-3';
  listEl.innerHTML = data.habits.map(habitCardHTML).join('');
  data.habits.forEach(h => bindHabitCard(listEl, h));
}

function habitCardHTML(h) {
  const freqLabel = h.frequency === 'Custom'
    ? (h.customDays || []).map(d => WEEKDAY_LABELS[d]).join(', ') || 'Custom'
    : h.frequency;
  const data = loadData();
  const totalDone = data.activities.filter(a => a.kind === 'habit' && a.refId === h.id && a.completed).length;
  return `
    <div class="card habit-card" data-id="${h.id}">
      <div class="goal-card-top">
        <span class="badge badge-${h.category.toLowerCase()}">${escapeHTML(h.category)}</span>
        <span class="status-pill">${escapeHTML(freqLabel)}</span>
      </div>
      <h3>${escapeHTML(h.name)}</h3>
      ${h.description ? `<p class="muted">${escapeHTML(h.description)}</p>` : ''}
      <p class="muted small">Completed ${totalDone} time${totalDone === 1 ? '' : 's'}${h.target ? ` • target: ${escapeHTML(String(h.target))}` : ''}</p>
      ${h.reminderTime ? `<p class="muted small">⏰ ${h.reminderTime}</p>` : ''}
      <div class="card-actions">
        <button class="icon-btn" data-act="edit" title="Edit">${icon('edit')}</button>
        <button class="icon-btn danger" data-act="delete" title="Delete">${icon('trash')}</button>
      </div>
    </div>`;
}

function bindHabitCard(listEl, h) {
  const cardEl = listEl.querySelector(`.habit-card[data-id="${h.id}"]`);
  cardEl.querySelector('[data-act="edit"]').addEventListener('click', () => openHabitForm(h));
  cardEl.querySelector('[data-act="delete"]').addEventListener('click', async () => {
    const ok = await confirmModal({ title: 'Delete this habit?', body: 'This action cannot be undone.' });
    if (ok) { deleteHabit(h.id); renderHabits(qs('#view-root')); showToast('Habit deleted'); }
  });
}

function openHabitForm(existing) {
  const isEdit = !!existing;
  const data = loadData();
  const html = `
    <button class="modal-close" data-act="close">&times;</button>
    <h2>${isEdit ? 'Edit Habit' : 'Create Habit'}</h2>
    <form id="habit-form" novalidate>
      <label>Habit Name
        <input name="name" type="text" value="${escapeHTML(existing?.name || '')}" placeholder="e.g. Read 10 pages" />
        <span class="field-error" data-error-for="name"></span>
      </label>
      <label>Description
        <textarea name="description" rows="2" placeholder="Optional">${escapeHTML(existing?.description || '')}</textarea>
      </label>
      <div class="field-row">
        <label>Frequency
          <select name="frequency" id="habit-frequency">
            <option ${existing?.frequency === 'Daily' || !existing ? 'selected' : ''}>Daily</option>
            <option ${existing?.frequency === 'Weekdays' ? 'selected' : ''}>Weekdays</option>
            <option ${existing?.frequency === 'Custom' ? 'selected' : ''}>Custom</option>
          </select>
        </label>
        <label>Category
          <select name="category">${HABIT_CATEGORIES.map(c => `<option ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </label>
      </div>
      <div id="custom-days-row" class="days-picker" style="display:${existing?.frequency === 'Custom' ? 'flex' : 'none'}">
        ${WEEKDAY_LABELS.map((lbl, i) => `
          <label class="day-chip">
            <input type="checkbox" name="customDays" value="${i}" ${(existing?.customDays || []).includes(i) ? 'checked' : ''} />
            <span>${lbl}</span>
          </label>`).join('')}
      </div>
      <div class="field-row">
        <label>Target <span class="muted small">(optional)</span>
          <input name="target" type="text" value="${escapeHTML(existing?.target || '')}" placeholder="e.g. 30 minutes" />
        </label>
        <label>Reminder Time <span class="muted small">(optional)</span>
          <input name="reminderTime" type="time" value="${existing?.reminderTime || ''}" />
        </label>
      </div>
      <label>Link to Goal <span class="muted small">(optional)</span>
        <select name="goalId">
          <option value="">None</option>
          ${data.goals.map(g => `<option value="${g.id}" ${existing?.goalId === g.id ? 'selected' : ''}>${escapeHTML(g.name)}</option>`).join('')}
        </select>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="close">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Habit'}</button>
      </div>
    </form>
  `;
  openModal(html, {
    onOpen(overlay, close) {
      const form = qs('#habit-form', overlay);
      qs('#habit-frequency', overlay).addEventListener('change', (e) => {
        qs('#custom-days-row', overlay).style.display = e.target.value === 'Custom' ? 'flex' : 'none';
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const nameErr = validateRequired(fd.get('name'), 'Please enter a habit name.');
        showFieldError(form, 'name', nameErr);
        if (nameErr) return;
        const customDays = fd.getAll('customDays').map(Number);
        const vals = {
          name: fd.get('name'),
          description: fd.get('description'),
          frequency: fd.get('frequency'),
          customDays,
          category: fd.get('category'),
          target: fd.get('target'),
          reminderTime: fd.get('reminderTime'),
          goalId: fd.get('goalId') || null
        };
        if (isEdit) { updateHabit(existing.id, vals); showToast('Habit updated'); }
        else { createHabit(vals); showToast('Habit created', 'success'); }
        close();
        renderHabits(qs('#view-root'));
      });
    }
  });
}
