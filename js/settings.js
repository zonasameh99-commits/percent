/* ============================================================
   OnePercent — settings.js
   ============================================================ */

function renderSettings(root) {
  const data = loadData();
  root.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Settings</h1>
        <p class="page-sub">Your profile, theme, and data — all stored locally.</p>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3>Profile</h3>
        ${data.profile.setupDone ? '' : `<p class="empty-inline">Set up your profile</p>`}
        <form id="profile-form">
          <label>Name
            <input name="name" type="text" value="${escapeHTML(data.profile.name)}" placeholder="Your Name" />
          </label>
          <label>Short Bio
            <textarea name="bio" rows="2" placeholder="A line about you">${escapeHTML(data.profile.bio)}</textarea>
          </label>
          <label>Main Focus
            <input name="focus" type="text" value="${escapeHTML(data.profile.focus)}" placeholder="e.g. Getting fit and learning Spanish" />
          </label>
          <button type="submit" class="btn btn-primary btn-sm">Save Profile</button>
        </form>
      </div>

      <div class="card">
        <h3>Preferences</h3>
        <form id="prefs-form">
          <label>Theme
            <select name="theme">
              <option value="light" ${data.settings.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${data.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="system" ${data.settings.theme === 'system' ? 'selected' : ''}>System</option>
            </select>
          </label>
          <label>Week Starts On
            <select name="weekStart">
              <option value="Sunday" ${data.settings.weekStart === 'Sunday' ? 'selected' : ''}>Sunday</option>
              <option value="Monday" ${data.settings.weekStart === 'Monday' ? 'selected' : ''}>Monday</option>
            </select>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" name="notifications" ${data.settings.notifications ? 'checked' : ''} />
            Enable habit reminder notifications
          </label>
          <button type="submit" class="btn btn-primary btn-sm">Save Preferences</button>
        </form>
      </div>
    </div>

    <div class="card">
      <h3>Data</h3>
      <p class="muted">All your data lives only in this browser's local storage. Nothing is sent anywhere.</p>
      <div class="data-actions">
        <button class="btn btn-secondary" id="export-btn">Export Data</button>
        <label class="btn btn-secondary file-btn">
          Import Data
          <input type="file" id="import-input" accept="application/json" hidden />
        </label>
        <button class="btn btn-danger" id="delete-all-btn">Delete All Data</button>
      </div>
    </div>
  `;

  qs('#profile-form', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const d = loadData();
    d.profile.name = fd.get('name').trim();
    d.profile.bio = fd.get('bio').trim();
    d.profile.focus = fd.get('focus').trim();
    d.profile.setupDone = !!d.profile.name;
    saveData(d);
    showToast('Profile saved');
    updateSidebarProfile();
  });

  qs('#prefs-form', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const d = loadData();
    d.settings.theme = fd.get('theme');
    d.settings.weekStart = fd.get('weekStart');
    d.settings.notifications = fd.get('notifications') === 'on';
    saveData(d);
    applyTheme();
    if (d.settings.notifications && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    showToast('Preferences saved');
  });

  qs('#export-btn', root).addEventListener('click', () => {
    const blob = new Blob([exportDataAsJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onepercent-export-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  });

  qs('#import-input', root).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      importDataFromJSON(text);
      showToast('Data imported', 'success');
      navigateTo('dashboard');
    } catch (err) {
      showToast('That file could not be read as valid data.', 'error');
    }
    e.target.value = '';
  });

  qs('#delete-all-btn', root).addEventListener('click', async () => {
    const ok = await confirmModal({
      title: 'Delete all data?',
      body: 'This permanently erases every goal, habit, journal entry, and achievement. This cannot be undone.',
      confirmLabel: 'Delete Everything'
    });
    if (ok) {
      resetAllData();
      showToast('All data deleted');
      navigateTo('dashboard');
    }
  });
}
