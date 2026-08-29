/* ============================================================
   OnePercent — goals.js
   ============================================================ */

const GOAL_CATEGORIES = ['Health', 'Study', 'Career', 'Fitness', 'Personal', 'Other'];
const GOAL_UNITS = ['minutes', 'days', 'pages', 'tasks', 'custom'];

function renderGoals(root) {
  const data = loadData();
  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Goals</h1>
        <p class="page-sub">Big outcomes, built from small daily actions.</p>
      </div>
      <button class="btn btn-primary" id="new-goal-btn">${icon('plus')} Create Goal</button>
    </div>
    <div class="filter-bar">
      <select id="goal-filter-status">
        <option value="">All statuses</option>
        <option value="Active">Active</option>
        <option value="Paused">Paused</option>
        <option value="Completed">Completed</option>
      </select>
      <select id="goal-filter-category">
        <option value="">All categories</option>
        ${GOAL_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
      </select>
    </div>
    <div id="goals-list" class="grid grid-3"></div>
  `;

  qs('#new-goal-btn', root).addEventListener('click', () => openGoalForm());
  qs('#goal-filter-status', root).addEventListener('change', renderList);
  qs('#goal-filter-category', root).addEventListener('change', renderList);

  function renderList() {
    const status = qs('#goal-filter-status', root).value;
    const category = qs('#goal-filter-category', root).value;
    const goals = loadData().goals.filter(g =>
      (!status || g.status === status) && (!category || g.category === category)
    );
    const listEl = qs('#goals-list', root);

    if (loadData().goals.length === 0) {
      listEl.className = '';
      listEl.innerHTML = emptyState({
        title: 'No goals yet',
        body: 'Create your first goal and start making progress.',
        actionLabel: 'Create Goal',
        actionId: 'empty-create-goal'
      });
      qs('#empty-create-goal', listEl).addEventListener('click', () => openGoalForm());
      return;
    }
    if (goals.length === 0) {
      listEl.className = '';
      listEl.innerHTML = `<p class="empty-inline">No goals match these filters.</p>`;
      return;
    }
    listEl.className = 'grid grid-3';
    listEl.innerHTML = goals.map(goalCardHTML).join('');
    goals.forEach(g => bindGoalCard(listEl, g));
  }

  renderList();
}

function goalCardHTML(g) {
  const progress = calculateGoalProgress(g);
  return `
    <div class="card goal-card status-${g.status.toLowerCase()}" data-id="${g.id}">
      <div class="goal-card-top">
        <span class="badge badge-${g.category.toLowerCase()}">${escapeHTML(g.category)}</span>
        <span class="status-pill status-${g.status.toLowerCase()}">${g.status}</span>
      </div>
      <h3>${escapeHTML(g.name)}</h3>
      ${g.description ? `<p class="muted">${escapeHTML(g.description)}</p>` : ''}
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="goal-meta">
        <span>${progress}% • ${g.target ? `${g.target} ${escapeHTML(g.targetUnit)}` : 'no target set'}</span>
        ${g.targetDate ? `<span>Due ${formatDate(g.targetDate)}</span>` : ''}
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-act="edit" title="Edit">${icon('edit')}</button>
        ${g.status !== 'Completed' ? `<button class="icon-btn" data-act="complete" title="Mark complete">${icon('check')}</button>` : ''}
        ${g.status === 'Active' ? `<button class="icon-btn" data-act="pause" title="Pause">${icon('pause')}</button>` : ''}
        ${g.status === 'Paused' ? `<button class="icon-btn" data-act="resume" title="Resume">${icon('play')}</button>` : ''}
        <button class="icon-btn danger" data-act="delete" title="Delete">${icon('trash')}</button>
      </div>
    </div>`;
}

function bindGoalCard(listEl, g) {
  const cardEl = listEl.querySelector(`.goal-card[data-id="${g.id}"]`);
  cardEl.querySelector('[data-act="edit"]').addEventListener('click', () => openGoalForm(g));
  const completeBtn = cardEl.querySelector('[data-act="complete"]');
  if (completeBtn) completeBtn.addEventListener('click', () => {
    updateGoal(g.id, { status: 'Completed', progress: 100 });
    checkAndUnlockAchievements();
    renderGoals(qs('#view-root'));
    showToast('Goal marked complete 🎉', 'success');
  });
  const pauseBtn = cardEl.querySelector('[data-act="pause"]');
  if (pauseBtn) pauseBtn.addEventListener('click', () => { updateGoal(g.id, { status: 'Paused' }); renderGoals(qs('#view-root')); });
  const resumeBtn = cardEl.querySelector('[data-act="resume"]');
  if (resumeBtn) resumeBtn.addEventListener('click', () => { updateGoal(g.id, { status: 'Active' }); renderGoals(qs('#view-root')); });
  cardEl.querySelector('[data-act="delete"]').addEventListener('click', async () => {
    const ok = await confirmModal({ title: 'Delete this goal?', body: 'This action cannot be undone.' });
    if (ok) { deleteGoal(g.id); renderGoals(qs('#view-root')); showToast('Goal deleted'); }
  });
}

function openGoalForm(existing) {
  const isEdit = !!existing;
  const html = `
    <button class="modal-close" data-act="close">&times;</button>
    <h2>${isEdit ? 'Edit Goal' : 'Create Goal'}</h2>
    <form id="goal-form" novalidate>
      <label>Goal Name
        <input name="name" type="text" value="${escapeHTML(existing?.name || '')}" placeholder="e.g. Learn JavaScript" />
        <span class="field-error" data-error-for="name"></span>
      </label>
      <label>Description
        <textarea name="description" rows="2" placeholder="Optional">${escapeHTML(existing?.description || '')}</textarea>
      </label>
      <div class="field-row">
        <label>Category
          <select name="category">${GOAL_CATEGORIES.map(c => `<option ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </label>
        <label>Target Unit
          <select name="targetUnit">${GOAL_UNITS.map(u => `<option ${existing?.targetUnit === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
        </label>
      </div>
      <div class="field-row">
        <label>Target
          <input name="target" type="number" min="0" value="${existing?.target ?? ''}" placeholder="e.g. 30" />
          <span class="field-error" data-error-for="target"></span>
        </label>
      </div>
      <div class="field-row">
        <label>Start Date
          <input name="startDate" type="date" value="${existing?.startDate || todayStr()}" />
        </label>
        <label>Target Date
          <input name="targetDate" type="date" value="${existing?.targetDate || ''}" />
          <span class="field-error" data-error-for="targetDate"></span>
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="close">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Goal'}</button>
      </div>
    </form>
  `;
  openModal(html, {
    onOpen(overlay, close) {
      const form = qs('#goal-form', overlay);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const vals = Object.fromEntries(fd.entries());
        let hasError = false;
        const nameErr = validateRequired(vals.name, 'Please enter a goal name.');
        showFieldError(form, 'name', nameErr); if (nameErr) hasError = true;
        const targetErr = validateNonNegative(vals.target, 'Target cannot be negative.');
        showFieldError(form, 'target', targetErr); if (targetErr) hasError = true;
        const dateErr = validateDateOrder(vals.startDate, vals.targetDate, 'Target date must be after the start date.');
        showFieldError(form, 'targetDate', dateErr); if (dateErr) hasError = true;
        if (hasError) return;

        if (isEdit) {
          updateGoal(existing.id, vals);
          showToast('Goal updated');
        } else {
          createGoal(vals);
          showToast('Goal created 🎉', 'success');
        }
        close();
        renderGoals(qs('#view-root'));
      });
    }
  });
}

function emptyState({ title, body, actionLabel, actionId, icon: iconName }) {
  return `
    <div class="empty-state">
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(body)}</p>
      ${actionLabel ? `<button class="btn btn-primary" id="${actionId}">${icon('plus')} ${escapeHTML(actionLabel)}</button>` : ''}
    </div>`;
}
