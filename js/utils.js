/* ============================================================
   OnePercent — utils.js
   Small shared helpers used across every page module.
   ============================================================ */

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, Object.assign({ month: 'short', day: 'numeric', year: 'numeric' }, opts));
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ---------------- Toasts ---------------- */

function showToast(message, type = 'info') {
  let host = qs('#toast-host');
  if (!host) {
    host = el('<div id="toast-host" class="toast-host"></div>');
    document.body.appendChild(host);
  }
  const toast = el(`<div class="toast toast-${type}">${escapeHTML(message)}</div>`);
  host.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

/* ---------------- Confirm modal ---------------- */

function confirmModal({ title = 'Are you sure?', body = 'This action cannot be undone.', confirmLabel = 'Delete', cancelLabel = 'Cancel', danger = true }) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="modal-overlay">
        <div class="modal-card" role="dialog" aria-modal="true">
          <h3 class="modal-title">${escapeHTML(title)}</h3>
          <p class="modal-body">${escapeHTML(body)}</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" data-act="cancel">${escapeHTML(cancelLabel)}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="confirm">${escapeHTML(confirmLabel)}</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    function close(result) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
      const act = e.target.closest('[data-act]');
      if (act) close(act.dataset.act === 'confirm');
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', esc); }
    });
  });
}

/* ---------------- Generic modal (forms) ---------------- */

function openModal(contentHTML, { onOpen } = {}) {
  const overlay = el(`<div class="modal-overlay"><div class="modal-card modal-card-form">${contentHTML}</div></div>`);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  function close() {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 200);
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-act="close"]')) close();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  if (onOpen) onOpen(overlay, close);
  return { overlay, close };
}

/* ---------------- Validation ---------------- */

function validateRequired(value, message) {
  if (!value || !String(value).trim()) return message;
  return null;
}

function validateDateOrder(startStr, endStr, message) {
  if (!startStr || !endStr) return null;
  if (new Date(endStr) < new Date(startStr)) return message;
  return null;
}

function validateNonNegative(value, message) {
  if (value !== '' && value !== null && value !== undefined && Number(value) < 0) return message;
  return null;
}

function showFieldError(form, fieldName, message) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (errorEl) errorEl.textContent = message || '';
  if (field) field.classList.toggle('input-error', !!message);
}

/* ---------------- Icons (inline SVG, no external deps) ---------------- */

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2s5 5.5 5 10a5 5 0 0 1-10 0c0-1.3.7-2.4 1.5-3.3.2 1 1 1.8 1.8 1.3-.4-2 .3-4 1.7-8Z"/></svg>',
  chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4v16M14 4v16"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4l14 8-14 8V4Z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'
};

function icon(name, cls = '') {
  return `<span class="icon ${cls}">${ICONS[name] || ''}</span>`;
}
