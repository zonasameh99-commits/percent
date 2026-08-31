/* ============================================================
   OnePercent — journal.js
   ============================================================ */

const MOODS = ['😄', '🙂', '😐', '😕', '😣'];

function renderJournal(root) {
  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Journal</h1>
        <p class="page-sub">Reflect on the day, in your own words.</p>
      </div>
      <button class="btn btn-primary" id="new-entry-btn">${icon('plus')} New Entry</button>
    </div>
    <div class="filter-bar">
      <div class="search-box">
        ${icon('search')}
        <input type="text" id="journal-search" placeholder="Search your entries..." />
      </div>
    </div>
    <div id="journal-list"></div>
  `;

  qs('#new-entry-btn', root).addEventListener('click', () => openJournalForm());
  qs('#journal-search', root).addEventListener('input', renderList);

  function renderList() {
    const q = qs('#journal-search', root).value.trim().toLowerCase();
    const data = loadData();
    const entries = data.journal.filter(j =>
      !q || j.title.toLowerCase().includes(q) || (j.note || '').toLowerCase().includes(q)
    );
    const listEl = qs('#journal-list', root);

    if (data.journal.length === 0) {
      listEl.innerHTML = emptyState({
        title: 'Your journal is empty',
        body: 'Write your first reflection.',
        actionLabel: 'New Entry',
        actionId: 'empty-new-entry'
      });
      qs('#empty-new-entry', listEl).addEventListener('click', () => openJournalForm());
      return;
    }
    if (entries.length === 0) {
      listEl.innerHTML = `<p class="empty-inline">No entries match "${escapeHTML(q)}".</p>`;
      return;
    }
    listEl.innerHTML = `<div class="journal-grid">${entries.map(journalCardHTML).join('')}</div>`;
    entries.forEach(j => bindJournalCard(listEl, j));
  }

  renderList();
}

function journalCardHTML(j) {
  return `
    <div class="card journal-card" data-id="${j.id}">
      <div class="journal-top">
        <span class="muted small">${formatDate(j.date)}</span>
        ${j.mood ? `<span class="journal-mood">${j.mood}</span>` : ''}
      </div>
      <h3>${escapeHTML(j.title)}</h3>
      <p class="journal-note">${escapeHTML(j.note)}</p>
      <div class="card-actions">
        <button class="icon-btn" data-act="edit">${icon('edit')}</button>
        <button class="icon-btn danger" data-act="delete">${icon('trash')}</button>
      </div>
    </div>`;
}

function bindJournalCard(listEl, j) {
  const cardEl = listEl.querySelector(`.journal-card[data-id="${j.id}"]`);
  cardEl.querySelector('[data-act="edit"]').addEventListener('click', () => openJournalForm(j));
  cardEl.querySelector('[data-act="delete"]').addEventListener('click', async () => {
    const ok = await confirmModal({ title: 'Delete this entry?', body: 'This action cannot be undone.' });
    if (ok) { deleteJournalEntry(j.id); renderJournal(qs('#view-root')); showToast('Entry deleted'); }
  });
}

function openJournalForm(existing) {
  const isEdit = !!existing;
  const html = `
    <button class="modal-close" data-act="close">&times;</button>
    <h2>${isEdit ? 'Edit Entry' : 'New Journal Entry'}</h2>
    <form id="journal-form" novalidate>
      <div class="field-row">
        <label>Date
          <input name="date" type="date" value="${existing?.date || todayStr()}" />
        </label>
        <label>Mood <span class="muted small">(optional)</span>
          <select name="mood">
            <option value="">—</option>
            ${MOODS.map(m => `<option value="${m}" ${existing?.mood === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </label>
      </div>
      <label>Title
        <input name="title" type="text" value="${escapeHTML(existing?.title || '')}" placeholder="e.g. A good study session" />
        <span class="field-error" data-error-for="title"></span>
      </label>
      <label>Note
        <textarea name="note" rows="5" placeholder="Write your reflection...">${escapeHTML(existing?.note || '')}</textarea>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="close">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Save Entry'}</button>
      </div>
    </form>`;
  openModal(html, {
    onOpen(overlay, close) {
      const form = qs('#journal-form', overlay);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const err = validateRequired(fd.get('title'), 'Please enter a title.');
        showFieldError(form, 'title', err);
        if (err) return;
        const vals = Object.fromEntries(fd.entries());
        if (isEdit) { updateJournalEntry(existing.id, vals); showToast('Entry updated'); }
        else { createJournalEntry(vals); checkAndUnlockAchievements(); showToast('Entry saved', 'success'); }
        close();
        renderJournal(qs('#view-root'));
      });
    }
  });
}
