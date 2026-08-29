/* ============================================================
   OnePercent — storage.js
   Single source of truth for all persisted data.
   Everything lives under one localStorage key as structured JSON.
   ============================================================ */

const STORAGE_KEY = 'onepercent_data_v1';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return dateToStr(d);
}

function dateToStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultData() {
  return {
    profile: { name: '', bio: '', focus: '', image: '', setupDone: false },
    settings: { theme: 'system', notifications: false, weekStart: 'Monday', onboarded: false },
    goals: [],
    habits: [],
    activities: [],   // {id, date, kind:'habit'|'challenge'|'task', refId, name, completed, completedAt}
    challenges: [],   // {id, name, description, difficulty, target, date, completed}
    journal: [],
    achievementsUnlocked: {} // { achievementId: dateStringUnlocked }
  };
}

let _cache = null;

function loadData() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      _cache = defaultData();
      return _cache;
    }
    const parsed = JSON.parse(raw);
    // merge with defaults so new fields introduced later never crash old data
    const base = defaultData();
    _cache = Object.assign({}, base, parsed);
    for (const k of Object.keys(base)) {
      if (parsed[k] === undefined) _cache[k] = base[k];
    }
    return _cache;
  } catch (e) {
    console.error('OnePercent: failed to load data, resetting.', e);
    _cache = defaultData();
    return _cache;
  }
}

function saveData(data) {
  _cache = data;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('OnePercent: failed to save data.', e);
    return false;
  }
}

function resetAllData() {
  localStorage.removeItem(STORAGE_KEY);
  _cache = defaultData();
  saveData(_cache);
}

/* ---------------- Goals ---------------- */

function createGoal(goal) {
  const data = loadData();
  const g = {
    id: uid(),
    name: goal.name.trim(),
    description: goal.description || '',
    category: goal.category || 'Other',
    target: Number(goal.target) || 0,
    targetUnit: goal.targetUnit || 'tasks',
    startDate: goal.startDate || todayStr(),
    targetDate: goal.targetDate || '',
    status: 'Active',
    progress: 0,
    createdAt: new Date().toISOString()
  };
  data.goals.push(g);
  saveData(data);
  return g;
}

function updateGoal(id, patch) {
  const data = loadData();
  const g = data.goals.find(x => x.id === id);
  if (!g) return null;
  Object.assign(g, patch);
  saveData(data);
  return g;
}

function deleteGoal(id) {
  const data = loadData();
  data.goals = data.goals.filter(x => x.id !== id);
  data.activities = data.activities.filter(a => !(a.kind === 'habit' && a.goalId === id));
  saveData(data);
}

/* ---------------- Habits ---------------- */

function createHabit(habit) {
  const data = loadData();
  const h = {
    id: uid(),
    name: habit.name.trim(),
    description: habit.description || '',
    frequency: habit.frequency || 'Daily', // Daily | Weekdays | Custom
    customDays: habit.customDays || [], // 0=Sun..6=Sat, used when frequency === 'Custom'
    category: habit.category || 'Other',
    target: habit.target || '',
    reminderTime: habit.reminderTime || '',
    goalId: habit.goalId || null,
    active: true,
    createdAt: new Date().toISOString()
  };
  data.habits.push(h);
  saveData(data);
  return h;
}

function updateHabit(id, patch) {
  const data = loadData();
  const h = data.habits.find(x => x.id === id);
  if (!h) return null;
  Object.assign(h, patch);
  saveData(data);
  return h;
}

function deleteHabit(id) {
  const data = loadData();
  data.habits = data.habits.filter(x => x.id !== id);
  data.activities = data.activities.filter(a => a.refId !== id);
  saveData(data);
}

function habitAppliesOn(habit, dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 Sun .. 6 Sat
  if (habit.frequency === 'Daily') return true;
  if (habit.frequency === 'Weekdays') return dow >= 1 && dow <= 5;
  if (habit.frequency === 'Custom') return (habit.customDays || []).includes(dow);
  return true;
}

/* ---------------- Activities (completions) ---------------- */

function getActivityFor(dateStr, kind, refId) {
  const data = loadData();
  return data.activities.find(a => a.date === dateStr && a.kind === kind && a.refId === refId);
}

function toggleActivity(dateStr, kind, refId, name) {
  const data = loadData();
  let a = data.activities.find(x => x.date === dateStr && x.kind === kind && x.refId === refId);
  if (a) {
    a.completed = !a.completed;
    a.completedAt = a.completed ? new Date().toISOString() : null;
  } else {
    a = { id: uid(), date: dateStr, kind, refId, name, completed: true, completedAt: new Date().toISOString() };
    data.activities.push(a);
  }
  saveData(data);
  checkAndUnlockAchievements();
  return a;
}

function addCustomTask(dateStr, name) {
  const data = loadData();
  const a = { id: uid(), date: dateStr, kind: 'task', refId: uid(), name, completed: false, completedAt: null };
  data.activities.push(a);
  saveData(data);
  return a;
}

function deleteActivity(id) {
  const data = loadData();
  data.activities = data.activities.filter(a => a.id !== id);
  saveData(data);
}

/* Build the list of "things due today" (habits applicable + tasks added for that date) */
function getDueForDate(dateStr) {
  const data = loadData();
  const items = [];
  data.habits.filter(h => h.active && habitAppliesOn(h, dateStr)).forEach(h => {
    const act = getActivityFor(dateStr, 'habit', h.id);
    items.push({
      kind: 'habit', refId: h.id, name: h.name, category: h.category,
      completed: !!(act && act.completed), meta: h
    });
  });
  data.activities.filter(a => a.date === dateStr && a.kind === 'task').forEach(a => {
    items.push({ kind: 'task', refId: a.refId, activityId: a.id, name: a.name, completed: a.completed });
  });
  return items;
}

/* ---------------- Challenges ---------------- */

function createChallenge(challenge) {
  const data = loadData();
  const c = {
    id: uid(),
    name: challenge.name.trim(),
    description: challenge.description || '',
    difficulty: challenge.difficulty || 'Medium',
    target: challenge.target || '',
    date: challenge.date || todayStr(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  data.challenges.push(c);
  saveData(data);
  return c;
}

function toggleChallenge(id) {
  const data = loadData();
  const c = data.challenges.find(x => x.id === id);
  if (!c) return null;
  c.completed = !c.completed;
  saveData(data);
  checkAndUnlockAchievements();
  return c;
}

function deleteChallenge(id) {
  const data = loadData();
  data.challenges = data.challenges.filter(x => x.id !== id);
  saveData(data);
}

/* ---------------- Journal ---------------- */

function createJournalEntry(entry) {
  const data = loadData();
  const j = {
    id: uid(),
    date: entry.date || todayStr(),
    mood: entry.mood || '',
    title: entry.title.trim(),
    note: entry.note || '',
    createdAt: new Date().toISOString()
  };
  data.journal.unshift(j);
  saveData(data);
  return j;
}

function updateJournalEntry(id, patch) {
  const data = loadData();
  const j = data.journal.find(x => x.id === id);
  if (!j) return null;
  Object.assign(j, patch);
  saveData(data);
  return j;
}

function deleteJournalEntry(id) {
  const data = loadData();
  data.journal = data.journal.filter(x => x.id !== id);
  saveData(data);
}

/* ---------------- Streak calculation ---------------- */

function dayHasCompletion(dateStr) {
  const data = loadData();
  return data.activities.some(a => a.date === dateStr && a.completed);
}

function calculateStreak() {
  const data = loadData();
  const hasAnyHistory = data.activities.some(a => a.completed);
  if (!hasAnyHistory) return { current: 0, longest: 0 };

  // Build set of dates with at least one completion
  const completedDates = new Set(data.activities.filter(a => a.completed).map(a => a.date));

  // Current streak: walk backward from today
  let current = 0;
  let cursor = new Date();
  // if today has no completion yet, start counting from yesterday (today still "in progress")
  if (!completedDates.has(dateToStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDates.has(dateToStr(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak: scan sorted unique dates for consecutive runs
  const sorted = Array.from(completedDates).sort();
  let longest = 0, run = 0, prev = null;
  for (const ds of sorted) {
    if (prev) {
      const prevDate = new Date(prev + 'T00:00:00');
      const curDate = new Date(ds + 'T00:00:00');
      const diffDays = Math.round((curDate - prevDate) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = ds;
  }

  return { current, longest };
}

/* ---------------- Statistics ---------------- */

function calculateStatistics() {
  const data = loadData();
  const totalGoals = data.goals.length;
  const completedGoals = data.goals.filter(g => g.status === 'Completed').length;
  const activeGoals = data.goals.filter(g => g.status === 'Active').length;
  const totalActivities = data.activities.length;
  const completedActivities = data.activities.filter(a => a.completed).length;
  const completionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
  const streak = calculateStreak();

  // weekly progress: last 7 days completion counts
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const ds = todayStr(-i);
    const dayActs = data.activities.filter(a => a.date === ds);
    const done = dayActs.filter(a => a.completed).length;
    weekly.push({ date: ds, total: dayActs.length, completed: done });
  }

  // monthly progress: last 30 days
  const monthly = [];
  for (let i = 29; i >= 0; i--) {
    const ds = todayStr(-i);
    const dayActs = data.activities.filter(a => a.date === ds);
    monthly.push({ date: ds, total: dayActs.length, completed: dayActs.filter(a => a.completed).length });
  }

  return {
    totalGoals, completedGoals, activeGoals,
    totalActivities, completedActivities, completionRate,
    currentStreak: streak.current, longestStreak: streak.longest,
    weekly, monthly
  };
}

/* ---------------- Goal progress ---------------- */

function calculateGoalProgress(goal) {
  const data = loadData();
  const relatedHabits = data.habits.filter(h => h.goalId === goal.id);
  if (relatedHabits.length === 0) return goal.progress || 0;
  const relatedIds = relatedHabits.map(h => h.id);
  const completions = data.activities.filter(a => a.kind === 'habit' && relatedIds.includes(a.refId) && a.completed).length;
  if (!goal.target || goal.target <= 0) return 0;
  return Math.min(100, Math.round((completions / goal.target) * 100));
}

/* ---------------- Achievements ---------------- */

const ACHIEVEMENT_DEFS = [
  { id: 'first_step', name: 'First Step', description: 'Complete your first activity.', icon: '🚀' },
  { id: 'streak_7', name: '7 Day Streak', description: 'Complete activities for 7 consecutive days.', icon: '🔥' },
  { id: 'streak_30', name: '30 Day Streak', description: 'Complete activities for 30 consecutive days.', icon: '🏆' },
  { id: 'goal_crusher', name: 'Goal Crusher', description: 'Complete your first goal.', icon: '🎯' },
  { id: 'consistency', name: 'Consistency', description: 'Complete activities on 30 different days.', icon: '📅' },
  { id: 'ten_habits', name: 'Habit Builder', description: 'Complete 10 total habit check-ins.', icon: '🧱' },
  { id: 'first_journal', name: 'Reflector', description: 'Write your first journal entry.', icon: '📝' }
];

function checkAndUnlockAchievements() {
  const data = loadData();
  const stats = calculateStatistics();
  const distinctDays = new Set(data.activities.filter(a => a.completed).map(a => a.date)).size;
  const habitCompletions = data.activities.filter(a => a.kind === 'habit' && a.completed).length;

  const conditions = {
    first_step: stats.completedActivities >= 1,
    streak_7: stats.longestStreak >= 7,
    streak_30: stats.longestStreak >= 30,
    goal_crusher: data.goals.some(g => g.status === 'Completed'),
    consistency: distinctDays >= 30,
    ten_habits: habitCompletions >= 10,
    first_journal: data.journal.length >= 1
  };

  let changed = false;
  for (const [id, met] of Object.entries(conditions)) {
    if (met && !data.achievementsUnlocked[id]) {
      data.achievementsUnlocked[id] = todayStr();
      changed = true;
    }
  }
  if (changed) saveData(data);
  return changed;
}

/* ---------------- Export / Import ---------------- */

function exportDataAsJSON() {
  const data = loadData();
  return JSON.stringify(data, null, 2);
}

function importDataFromJSON(jsonStr) {
  const parsed = JSON.parse(jsonStr);
  const base = defaultData();
  const merged = Object.assign({}, base, parsed);
  saveData(merged);
  return merged;
}
