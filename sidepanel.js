(function () {
  const STORAGE_KEY = 'notebookData';
  const DEFAULT_DATA = { notes: [] };

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function load() {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        const data = result[STORAGE_KEY];
        resolve(data ? { ...DEFAULT_DATA, ...data } : { ...DEFAULT_DATA });
      });
    });
  }

  let saveDebounceTimer = null;
  function save(data, immediate = false) {
    return new Promise((resolve) => {
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      const doSave = () => {
        chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
        saveDebounceTimer = null;
      };
      if (immediate) doSave();
      else saveDebounceTimer = setTimeout(doSave, 150);
    });
  }

  let state = { notes: [] };

  function renderNotes() {
    const list = document.getElementById('notes-list');
    if (state.notes.length === 0) {
      list.innerHTML = '<li class="empty">No notes yet. Add one above.</li>';
      return;
    }
    const sorted = [...state.notes].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0));
    list.innerHTML = sorted.map((note) => {
      const contentEscaped = escapeHtml(note.content);
      const dateStr = formatDate(note.createdAt);
      const priority = !!note.priority;
      const priorityClass = priority ? ' priority' : '';
      return `
        <li class="note-item${priorityClass}" data-id="${escapeHtml(note.id)}">
          <div class="note-body">
            <div class="note-meta">
              ${dateStr ? `<span class="note-date">${escapeHtml(dateStr)}</span>` : ''}
              ${priority ? '<span class="priority-badge">Priority</span>' : ''}
            </div>
            <div class="content" data-id="${escapeHtml(note.id)}">${contentEscaped || '<em>Empty note</em>'}</div>
          </div>
          <div class="actions">
            <button type="button" class="priority-toggle" title="${priority ? 'Remove priority' : 'Mark as priority'}">${priority ? '★' : '☆'}</button>
            <button type="button" class="edit">Edit</button>
            <button type="button" class="delete">Delete</button>
          </div>
        </li>
      `;
    }).join('');

    list.querySelectorAll('.note-item .edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.note-item');
        const id = item.dataset.id;
        const note = state.notes.find((n) => n.id === id);
        if (!note) return;
        const contentEl = item.querySelector('.content');
        if (contentEl.classList.contains('editing')) {
          note.content = contentEl.querySelector('textarea').value.trim();
          contentEl.classList.remove('editing');
          contentEl.innerHTML = escapeHtml(note.content) || '<em>Empty note</em>';
          save(state, true);
          renderNotes();
        } else {
          contentEl.classList.add('editing');
          contentEl.innerHTML = `<textarea>${escapeHtml(note.content)}</textarea>`;
          contentEl.querySelector('textarea').focus();
          btn.textContent = 'Save';
        }
      });
    });

    list.querySelectorAll('.note-item .delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.note-item').dataset.id;
        state.notes = state.notes.filter((n) => n.id !== id);
        save(state, true);
        renderNotes();
      });
    });

    list.querySelectorAll('.note-item .priority-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.note-item').dataset.id;
        const note = state.notes.find((n) => n.id === id);
        if (note) {
          note.priority = !note.priority;
          save(state, true);
          renderNotes();
        }
      });
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  document.getElementById('add-note').addEventListener('click', () => {
    const textarea = document.getElementById('new-note');
    const content = textarea.value.trim();
    if (!content) return;
    const priority = document.getElementById('new-note-priority').checked;
    state.notes.push({ id: id(), content, createdAt: Date.now(), priority });
    textarea.value = '';
    document.getElementById('new-note-priority').checked = false;
    save(state, true);
    renderNotes();
  });

  load().then((data) => {
    state = data;
    renderNotes();
  });
})();
