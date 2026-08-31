/* ============================================================
   OnePercent — dashboard.js
   ============================================================ */

function renderDashboard(root) {
  const data = loadData();
  const ds = todayStr();
  const due = getDueForDate(ds);
  const completed = due.filter(i => i.completed).length;
  const total = due.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const streak = calculateStreak();
  const activeGoals = data.goals.filter(g => g.status === 'Active').slice(0, 3);

  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Welcome${data.profile.name ? ', ' + escapeHTML(data.profile.name) : ''}</h1>
        <p class="page-sub">${formatDate(ds, { weekday: 'long' })}</p>
      </div>
    </div>

    <div class="grid grid-3 dash-top">
      <div class="card card-progress">
        <h3>Today's Progress</h3>
        ${total === 0 ? `
          <p class="empty-inline">No activities planned for today.</p>
          <button class="btn btn-primary btn-sm" data-nav="today">${icon('plus')} Add Activity</button>
        ` : `
          <div class="progress-row">
            <canvas id="today-ring"></canvas>
            <div class="progress-figures">
              <div class="big-num">${completed} / ${total}</div>
              <div class="muted">Completed</div>
              <div class="big-num accent">${pct}%</div>
            </div>
          </div>
        `}
      </div>

      <div class="card card-streak">
        <h3>${icon('flame')} Current Streak</h3>
        ${streak.current > 0
          ? `<div class="streak-num">${streak.current} <span>day${streak.current === 1 ? '' : 's'}</span></div>
             <p class="muted">Longest streak: ${streak.longest} day${streak.longest === 1 ? '' : 's'}</p>`
          : `<p class="empty-inline">Complete an activity today to start your streak.</p>`
        }
      </div>

      <div class="card card-goals-mini">
        <h3>Active Goals</h3>
        ${activeGoals.length === 0
          ? `<p class="empty-inline">You haven't created any goals yet.</p>
             <button class="btn btn-primary btn-sm" data-nav="goals">${icon('plus')} Create Your First Goal</button>`
          : `<ul class="mini-list">
              ${activeGoals.map(g => `
                <li>
                  <span class="mini-list-name">${escapeHTML(g.name)}</span>
                  <span class="mini-bar"><span style="width:${calculateGoalProgress(g)}%"></span></span>
                </li>`).join('')}
             </ul>
             <button class="btn btn-ghost btn-sm" data-nav="goals">View all goals</button>`
        }
      </div>
    </div>

    <div class="grid grid-2 dash-bottom">
      <div class="card">
        <h3>Today's Focus</h3>
        <div id="dash-today-list"></div>
      </div>
      <div class="card">
        <h3>This Week</h3>
        <div class="chart-wrap"><canvas id="dash-week-chart" data-height="180"></canvas></div>
      </div>
    </div>
  `;

  root.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.nav)));

  if (total > 0) {
    const ring = qs('#today-ring', root);
    drawProgressRing(ring, pct, { size: 96, stroke: 10 });
  }

  renderDashTodayList(qs('#dash-today-list', root), due, ds);

  const stats = calculateStatistics();
  drawBarChart(qs('#dash-week-chart', root), stats.weekly.map(w => ({
    label: new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' }),
    value: w.completed
  })));
}

function renderDashTodayList(container, due, ds) {
  if (due.length === 0) {
    container.innerHTML = `<p class="empty-inline">Nothing planned for today. <a href="#" data-nav="today">Add an activity</a></p>`;
    container.querySelector('[data-nav]').addEventListener('click', (e) => { e.preventDefault(); navigateTo('today'); });
    return;
  }
  container.innerHTML = `<ul class="check-list">
    ${due.slice(0, 6).map(item => `
      <li class="check-item ${item.completed ? 'done' : ''}" data-kind="${item.kind}" data-ref="${item.refId}">
        <button class="check-box" aria-label="Toggle complete">${item.completed ? icon('check') : ''}</button>
        <span>${escapeHTML(item.name)}</span>
      </li>`).join('')}
  </ul>`;
  container.querySelectorAll('.check-item').forEach(li => {
    li.querySelector('.check-box').addEventListener('click', () => {
      toggleActivity(ds, li.dataset.kind, li.dataset.ref, li.querySelector('span').textContent);
      renderDashboard(qs('#view-root'));
    });
  });
}
