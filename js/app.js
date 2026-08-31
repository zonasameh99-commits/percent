/* ============================================================
   OnePercent — app.js
   Navigation shell, router, onboarding, theme.
   ============================================================ */

const ROUTES = {
  dashboard: { label: 'Dashboard', render: renderDashboard },
  goals: { label: 'Goals', render: renderGoals },
  habits: { label: 'Habits', render: renderHabits },
  today: { label: 'Today', render: renderToday },
  calendar: { label: 'Calendar', render: renderCalendar },
  statistics: { label: 'Statistics', render: renderStatistics },
  journal: { label: 'Journal', render: renderJournal },
  achievements: { label: 'Achievements', render: renderAchievements },
  settings: { label: 'Settings', render: renderSettings }
};

let currentRoute = 'dashboard';

function navigateTo(route) {
  if (!ROUTES[route]) route = 'dashboard';
  currentRoute = route;
  location.hash = route;
  renderApp();
}

function renderApp() {
  const root = qs('#view-root');
  qsa('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === currentRoute));
  qsa('.nav-link-mobile').forEach(a => a.classList.toggle('active', a.dataset.route === currentRoute));
  root.setAttribute('data-route', currentRoute);
  ROUTES[currentRoute].render(root);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  closeMobileMenu();
}

function buildNav() {
  const navHTML = Object.entries(ROUTES).map(([key, r]) =>
    `<a href="#${key}" class="nav-link" data-route="${key}">${escapeHTML(r.label)}</a>`
  ).join('');
  qs('#sidebar-nav').innerHTML = navHTML;
  qs('#mobile-nav').innerHTML = Object.entries(ROUTES).map(([key, r]) =>
    `<a href="#${key}" class="nav-link-mobile" data-route="${key}">${escapeHTML(r.label)}</a>`
  ).join('');

  qsa('#sidebar-nav .nav-link, #mobile-nav .nav-link-mobile').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(a.dataset.route);
    });
  });
}

function updateSidebarProfile() {
  const data = loadData();
  const nameEl = qs('#sidebar-profile-name');
  const focusEl = qs('#sidebar-profile-focus');
  if (data.profile.setupDone && data.profile.name) {
    nameEl.textContent = data.profile.name;
    focusEl.textContent = data.profile.focus || 'Getting 1% better';
  } else {
    nameEl.textContent = 'Set up your profile';
    focusEl.textContent = '';
  }
}

/* ---------------- Theme ---------------- */

function applyTheme() {
  const data = loadData();
  let theme = data.settings.theme || 'system';
  if (theme === 'system') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
}

/* ---------------- Mobile menu ---------------- */

function closeMobileMenu() {
  qs('#mobile-nav')?.classList.remove('open');
  qs('#menu-toggle')?.setAttribute('aria-expanded', 'false');
}

function initMobileMenu() {
  const toggle = qs('#menu-toggle');
  const nav = qs('#mobile-nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

/* ---------------- Onboarding ---------------- */

function maybeShowOnboarding() {
  const data = loadData();
  if (data.settings.onboarded) return;
  showWelcomeScreen();
}

function showWelcomeScreen() {
  const overlay = el(`
    <div class="onboarding-overlay">
      <div class="onboarding-card">
        <div class="onboarding-mark">1%</div>
        <h1>Become 1% Better Every Day</h1>
        <p>Build small habits, track your progress, and turn consistent effort into meaningful results.</p>
        <button class="btn btn-primary btn-lg" id="get-started-btn">Get Started</button>
      </div>
    </div>`);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  qs('#get-started-btn', overlay).addEventListener('click', () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 200);
    const data = loadData();
    data.settings.onboarded = true;
    saveData(data);
    showFirstGoalPrompt();
  });
}

function showFirstGoalPrompt() {
  const html = `
    <button class="modal-close" data-act="close">&times;</button>
    <h2>Create Your First Goal</h2>
    <p class="muted">What's something you want to get 1% better at?</p>
    <form id="first-goal-form" novalidate>
      <label>Goal Name
        <input name="name" type="text" placeholder="e.g. Learn JavaScript" />
        <span class="field-error" data-error-for="name"></span>
      </label>
      <label>Description
        <textarea name="description" rows="2" placeholder="Optional"></textarea>
      </label>
      <div class="field-row">
        <label>Category
          <select name="category">${GOAL_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select>
        </label>
        <label>Target Unit
          <select name="targetUnit">${GOAL_UNITS.map(u => `<option>${u}</option>`).join('')}</select>
        </label>
      </div>
      <div class="field-row">
        <label>Target
          <input name="target" type="number" min="0" placeholder="e.g. 30" />
        </label>
        <label>Target Date <span class="muted small">(optional)</span>
          <input name="targetDate" type="date" />
        </label>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" data-act="close">Skip for now</button>
        <button type="submit" class="btn btn-primary">Create Goal</button>
      </div>
    </form>`;
  openModal(html, {
    onOpen(overlay, close) {
      const form = qs('#first-goal-form', overlay);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const vals = Object.fromEntries(fd.entries());
        const err = validateRequired(vals.name, 'Please enter a goal name.');
        showFieldError(form, 'name', err);
        if (err) return;
        vals.startDate = todayStr();
        createGoal(vals);
        showToast('Welcome to OnePercent 🎉', 'success');
        close();
        navigateTo('dashboard');
      });
    }
  });
}

/* ---------------- Init ---------------- */

function initApp() {
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (loadData().settings.theme === 'system') applyTheme();
  });

  buildNav();
  updateSidebarProfile();
  initMobileMenu();

  const startRoute = (location.hash || '#dashboard').replace('#', '');
  currentRoute = ROUTES[startRoute] ? startRoute : 'dashboard';
  window.addEventListener('hashchange', () => {
    const r = location.hash.replace('#', '');
    if (ROUTES[r]) { currentRoute = r; renderApp(); }
  });

  renderApp();
  maybeShowOnboarding();
}

document.addEventListener('DOMContentLoaded', initApp);
