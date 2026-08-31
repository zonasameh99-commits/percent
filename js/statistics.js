/* ============================================================
   OnePercent — statistics.js
   ============================================================ */

function renderStatistics(root) {
  const data = loadData();
  const hasAnyData = data.goals.length > 0 || data.activities.length > 0 || data.habits.length > 0;

  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Statistics</h1>
        <p class="page-sub">Calculated entirely from your own activity.</p>
      </div>
    </div>
    <div id="stats-body"></div>
  `;
  const body = qs('#stats-body', root);

  if (!hasAnyData) {
    body.innerHTML = `<p class="empty-inline">Not enough data yet. Create a goal or habit and start checking things off to see your stats.</p>`;
    return;
  }

  const s = calculateStatistics();

  body.innerHTML = `
    <div class="grid grid-4 stat-tiles">
      ${statTile('Total Goals', s.totalGoals)}
      ${statTile('Completed Goals', s.completedGoals)}
      ${statTile('Active Goals', s.activeGoals)}
      ${statTile('Completion Rate', s.totalActivities > 0 ? s.completionRate + '%' : '—')}
      ${statTile('Total Activities', s.totalActivities)}
      ${statTile('Completed Activities', s.completedActivities)}
      ${statTile('Current Streak', s.currentStreak + (s.currentStreak === 1 ? ' day' : ' days'))}
      ${statTile('Longest Streak', s.longestStreak + (s.longestStreak === 1 ? ' day' : ' days'))}
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>Weekly Activity</h3>
        ${s.totalActivities > 0
          ? `<div class="chart-wrap"><canvas id="stat-week-chart" data-height="200"></canvas></div>`
          : `<p class="empty-inline">Not enough data yet</p>`}
      </div>
      <div class="card">
        <h3>Goal Progress</h3>
        <div id="stat-goal-progress"></div>
      </div>
    </div>

    <div class="card">
      <h3>Last 30 Days</h3>
      ${s.totalActivities > 0
        ? `<div class="chart-wrap"><canvas id="stat-month-chart" data-height="160"></canvas></div>`
        : `<p class="empty-inline">Not enough data yet</p>`}
    </div>
  `;

  if (s.totalActivities > 0) {
    drawBarChart(qs('#stat-week-chart', body), s.weekly.map(w => ({
      label: new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' }),
      value: w.completed
    })));
    drawBarChart(qs('#stat-month-chart', body), s.monthly.map((m, i) => ({
      label: (i % 5 === 0) ? String(new Date(m.date + 'T00:00:00').getDate()) : '',
      value: m.completed
    })));
  }

  const goalProgressEl = qs('#stat-goal-progress', body);
  if (data.goals.length === 0) {
    goalProgressEl.innerHTML = `<p class="empty-inline">No goals yet.</p>`;
  } else {
    goalProgressEl.innerHTML = `<ul class="mini-list">
      ${data.goals.map(g => `
        <li>
          <span class="mini-list-name">${escapeHTML(g.name)}</span>
          <span class="mini-bar"><span style="width:${calculateGoalProgress(g)}%"></span></span>
          <span class="muted small">${calculateGoalProgress(g)}%</span>
        </li>`).join('')}
    </ul>`;
  }
}

function statTile(label, value) {
  return `<div class="card stat-tile"><div class="stat-value">${value}</div><div class="stat-label">${escapeHTML(label)}</div></div>`;
}
