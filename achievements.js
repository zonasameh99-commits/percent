/* ============================================================
   OnePercent — achievements.js
   ============================================================ */

function renderAchievements(root) {
  checkAndUnlockAchievements();
  const data = loadData();
  const unlockedCount = Object.keys(data.achievementsUnlocked).length;

  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Achievements</h1>
        <p class="page-sub">${unlockedCount} of ${ACHIEVEMENT_DEFS.length} unlocked</p>
      </div>
    </div>
    <div class="grid grid-3">
      ${ACHIEVEMENT_DEFS.map(a => {
        const unlockedDate = data.achievementsUnlocked[a.id];
        const isUnlocked = !!unlockedDate;
        return `
          <div class="card achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">${isUnlocked ? a.icon : icon('lock')}</div>
            <h3>${escapeHTML(a.name)}</h3>
            <p class="muted">${escapeHTML(a.description)}</p>
            ${isUnlocked
              ? `<span class="status-pill status-completed">Unlocked ${formatDate(unlockedDate)}</span>`
              : `<span class="status-pill">${icon('lock')} Locked</span>`}
          </div>`;
      }).join('')}
    </div>
  `;
}
