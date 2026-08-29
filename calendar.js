/* ============================================================
   OnePercent — calendar.js
   ============================================================ */

let _calYear, _calMonth; // 0-indexed month

function renderCalendar(root) {
  const now = new Date();
  if (_calYear === undefined) { _calYear = now.getFullYear(); _calMonth = now.getMonth(); }

  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Calendar</h1>
        <p class="page-sub">Your real progress, day by day.</p>
      </div>
    </div>
    <div class="card">
      <div class="cal-nav">
        <button class="icon-btn" id="cal-prev">${icon('chevronLeft')}</button>
        <h3 id="cal-title"></h3>
        <button class="icon-btn" id="cal-next">${icon('chevronRight')}</button>
      </div>
      <div class="cal-grid" id="cal-grid"></div>
      <div class="cal-legend">
        <span><i class="dot dot-none"></i> No activity</span>
        <span><i class="dot dot-partial"></i> Partial</span>
        <span><i class="dot dot-complete"></i> All completed</span>
      </div>
    </div>
    <div class="card" id="cal-day-detail" style="display:none"></div>
  `;

  qs('#cal-prev', root).addEventListener('click', () => { shiftMonth(-1); renderCalendar(root); });
  qs('#cal-next', root).addEventListener('click', () => { shiftMonth(1); renderCalendar(root); });

  buildCalendarGrid(root);
}

function shiftMonth(delta) {
  _calMonth += delta;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
}

function buildCalendarGrid(root) {
  const data = loadData();
  const weekStart = data.settings.weekStart === 'Monday' ? 1 : 0;
  const first = new Date(_calYear, _calMonth, 1);
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
  const firstDow = (first.getDay() - weekStart + 7) % 7;

  qs('#cal-title', root).textContent = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const dowLabels = weekStart === 1
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let html = dowLabels.map(l => `<div class="cal-dow">${l}</div>`).join('');
  for (let i = 0; i < firstDow; i++) html += `<div class="cal-cell empty"></div>`;

  const todayDs = todayStr();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(_calYear, _calMonth, day);
    const ds = dateToStr(dateObj);
    const due = getDueForDate(ds);
    const totalItems = due.length;
    const doneItems = due.filter(i => i.completed).length;

    let state = 'none';
    if (totalItems > 0 && doneItems === totalItems) state = 'complete';
    else if (doneItems > 0) state = 'partial';

    html += `
      <button class="cal-cell state-${state} ${ds === todayDs ? 'is-today' : ''}" data-date="${ds}">
        <span class="cal-daynum">${day}</span>
        ${totalItems > 0 ? `<span class="cal-dot dot-${state}"></span>` : ''}
      </button>`;
  }

  qs('#cal-grid', root).innerHTML = html;
  qsa('.cal-cell:not(.empty)', root).forEach(cell => {
    cell.addEventListener('click', () => showDayDetail(root, cell.dataset.date));
  });
}

function showDayDetail(root, ds) {
  const detail = qs('#cal-day-detail', root);
  const due = getDueForDate(ds);
  detail.style.display = 'block';
  if (due.length === 0) {
    detail.innerHTML = `<h3>${formatDateShort(ds)}</h3><p class="empty-inline">No activity recorded for this day.</p>`;
    return;
  }
  detail.innerHTML = `
    <h3>${formatDateShort(ds)}</h3>
    <ul class="check-list">
      ${due.map(item => `
        <li class="check-item ${item.completed ? 'done' : ''}">
          <span class="check-box static">${item.completed ? icon('check') : ''}</span>
          <span>${escapeHTML(item.name)}</span>
        </li>`).join('')}
    </ul>`;
}
