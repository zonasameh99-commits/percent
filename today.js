/* ============================================================
   OnePercent — today.js
   ============================================================ */

function renderToday(root) {
  const ds = todayStr();
  const data = loadData();
  const due = getDueForDate(ds);
  const todaysChallenges = data.challenges.filter(c => c.date === ds);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Today</h1>
        <p class="page-sub">${formatDate(ds, { weekday: 'long' })}</p>
      </div>
      <button class="btn btn-primary" id="add-task-btn">${icon('plus')} Add Activity</button>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>Today's Activities</h3>
        <div id="today-due-list"></div>
      </div>

      <div class="card">
        <h3>Today's Challenge</h3>
        <div id="today-challenge-area"></div>
        <button class="btn btn-ghost btn-sm" id="add-challenge-btn">${icon('plus')} Create Challenge</button>
      </div>
    </div>
  `;

  qs('#add-task-btn', root).addEventListener('click', () => openAddTaskForm(ds));
  qs('#add-challenge-btn', root).addEventListener('click', () => openChallengeForm(ds));

  renderDueList(qs('#today-due-list', root), due, ds);
  renderChallengeArea(qs('#today-challenge-area', root), todaysChallenges);
}

function renderDueList(container, due, ds) {
  if (due.length === 0) {
    container.innerHTML = `<p class="empty-inline">Nothing planned for today.</p><p class="muted small">Add a habit from the Habits page, or add a one-off activity here.</p>`;
    return;
  }
  container.innerHTML = `<ul class="check-list">
    ${due.map(item => `
      <li class="check-item ${item.completed ? 'done' : ''}" data-kind="${item.kind}" data-ref="${item.refId}" data-activity="${item.activityId || ''}">
        <button class="check-box" aria-label="Toggle complete">${item.completed ? icon('check') : ''}</button>
        <span class="check-label">${escapeHTML(item.name)}${item.category ? ` <span class="badge badge-${item.category.toLowerCase()}">${escapeHTML(item.category)}</span>` : ''}</span>
        ${item.kind === 'task' ? `<button class="icon-btn danger sm" data-act="remove-task" title="Remove">${icon('trash')}</button>` : ''}
      </li>`).join('')}
  </ul>`;
  container.querySelectorAll('.check-item').forEach((li, idx) => {
    const item = due[idx];
    li.querySelector('.check-box').addEventListener('click', () => {
      toggleActivity(ds, li.dataset.kind, li.dataset.ref, item.name);
      renderToday(qs('#view-root'));
    });
    const removeBtn = li.querySelector('[data-act="remove-task"]');
    if (removeBtn) removeBtn.addEventListener('click', () => {
      if (li.dataset.activity) deleteActivity(li.dataset.activity);
      renderToday(qs('#view-root'));
    });
  });
}

function renderChallengeArea(container, challenges) {
  if (challenges.length === 0) {
    container.innerHTML = `<p class="empty-inline">No challenge set for today yet.</p>`;
    return;
  }
  container.innerHTML = `<ul class="challenge-list">
    ${challenges.map(c => `
      <li class="challenge-item ${c.completed ? 'done' : ''}" data-id="${c.id}">
        <div>
          <strong>${escapeHTML(c.name)}</strong>
          <span class="status-pill diff-${c.difficulty.toLowerCase()}">${c.difficulty}</span>
          ${c.description ? `<p class="muted small">${escapeHTML(c.description)}</p>` : ''}
          ${c.target ? `<p class="muted small">Target: ${escapeHTML(c.target)}</p>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn btn-sm ${c.completed ? 'btn-ghost' : 'btn-primary'}" data-act="toggle">
            ${c.completed ? 'Completed ✓' : 'Mark Complete'}
          </button>
          <button class="icon-btn danger" data-act="delete">${icon('trash')}</button>
        </div>
      </li>`).join('')}
  </ul>`;
  container.querySelectorAll('.challenge-item').forEach(liEl => {
    const id = liEl.dataset.id;
    liEl.querySelector('[data-act="toggle"]').addEventListener('click', () => {
      toggleChallenge(id);
      renderToday(qs('#view-root'));
    });
    liEl.querySelector('[data-act="delete"]').addEventListener('click', async () => {
      const ok = await confirmModal({ title: 'Delete this challenge?', body: 'This action cannot be undone.' });
      if (ok) { deleteChallenge(id); renderToday(qs('#view-root')); }
    });
  });
}

function openAddTaskForm(ds) {
  const html = `
    <button class="modal-close" data-act="close">&times;</button>
    <h2>Add Activity</h2>
    <form id="task-form" novalidate>
      <label>Activity Name
        <input name="name" type="text" placeholder="e.g. Prep tomorrow's slides" />
        <span class="field-error" data-error-for="name"></span>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="close">Cancel</button>
        <button type="submit" class="btn btn-primary">Add</button>
      </div>
    </form>`;
  openModal(html, {
    onOpen(overlay, close) {
      const form = qs('#task-form', overlay);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = new FormData(form).get('name');
        const err = validateRequired(name, 'Please enter an activity name.');
        showFieldError(form, 'name', err);
        if (err) return;
        addCustomTask(ds, name.trim());
        close();
        renderToday(qs('#view-root'));
      });
    }
  });
}

function openChallengeForm(ds) {
  const html = `
    <button class="modal-close" data-act="close">&times;</button>
    <h2>Create Challenge</h2>
    <form id="challenge-form" novalidate>
      <label>Challenge Name
        <input name="name" type="text" placeholder="e.g. No phone before 9am" />
        <span class="field-error" data-error-for="name"></span>
      </label>
      <label>Description
        <textarea name="description" rows="2" placeholder="Optional"></textarea>
      </label>
      <div class="field-row">
        <label>Difficulty
          <select name="difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select>
        </label>
        <label>Target <span class="muted small">(optional)</span>
          <input name="target" type="text" placeholder="e.g. all day" />
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="close">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Challenge</button>
      </div>
    </form>`;
  openModal(html, {
    onOpen(overlay, close) {
      const form = qs('#challenge-form', overlay);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const err = validateRequired(fd.get('name'), 'Please enter a challenge name.');
        showFieldError(form, 'name', err);
        if (err) return;
        createChallenge({
          name: fd.get('name'), description: fd.get('description'),
          difficulty: fd.get('difficulty'), target: fd.get('target'), date: ds
        });
        close();
        renderToday(qs('#view-root'));
      });
    }
  });
}
