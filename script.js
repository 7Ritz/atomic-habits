// Auto-save to localStorage
const SUPABASE_URL = 'https://sntqufxijlkupaukqrsb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNudHF1ZnhpamxrdXBhdWtxcnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTAzODcsImV4cCI6MjA5NjU2NjM4N30.BdJNlnESsci_fpO05gC1iFQ9aMPsbpUUYFEG8ynUrpQ';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Auth gate ──
async function doLogin() {
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('loginError').textContent = error.message;
  } else {
    document.getElementById('loginGate').style.display = 'none';
  }
}

async function checkAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    document.getElementById('loginGate').style.display = 'flex';
  }
}

checkAuth();

function cardTemplate(id) {
  return `
   <div class="habit-card" id="card-${id}">
      <button class="card-trash" title="Clear card" aria-label="Clear card">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
    </button>
    <div class="habit-label">
      <span>Habit</span>
      <input type="text" class="habit-name" placeholder="Name your habit…">
    </div>
    <div class="loop-grid">
      <div class="quadrant top-left">
        <span class="quad-label">Cue</span>
        <textarea placeholder="What triggers it?"></textarea>
        <span class="num">1</span>
      </div>
      <div class="quadrant top-right">
        <span class="quad-label">Craving</span>
        <textarea placeholder="What do you want?"></textarea>
        <span class="num">2</span>
      </div>
      <div class="quadrant bottom-left">
        <span class="quad-label">Reward</span>
        <textarea placeholder="What do you get?"></textarea>
        <span class="num">4</span>
      </div>
      <div class="quadrant bottom-right">
        <span class="quad-label">Response</span>
        <textarea placeholder="What do you do?"></textarea>
        <span class="num">3</span>
      </div>
      <div class="loop-arrows">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 10 A40 40 0 1 1 10 50" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <polygon points="10,44 6,54 16,51" fill="currentColor"/>
        </svg>
      </div>
    </div>
  </div>`;
}

function collectData() {
  const cards = document.querySelectorAll('.habit-card');
  return Array.from(cards).map(card => ({
    name: card.querySelector('.habit-name').value,
    quadrants: Array.from(card.querySelectorAll('textarea')).map(t => t.value)
  }));
}

async function save() {
  const data = collectData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); // keep as fallback
  await db.from('habit_cards').upsert(
    data.map((d, i) => ({ id: i + 1, name: d.name, quadrants: JSON.stringify(d.quadrants) }))
  );
}

function attachCardListeners(card) {
  card.querySelectorAll('.habit-name, .quadrant textarea').forEach(el => {
    el.addEventListener('input', save);
  });
  const trash = card.querySelector('.card-trash');
  if (trash) trash.addEventListener('click', () => {
    card.querySelector('.habit-name').value = '';
    card.querySelectorAll('textarea').forEach(t => t.value = '');
    save();
  });
}

async function restoreData() {
  try {
    // Try Supabase first
    const { data, error } = await db.from('habit_cards').select('*').order('id');
    if (data && data.length) {
      const container = document.querySelector('.container');
      const addBtn    = document.getElementById('addCardBtn');
      const extraCount = Math.min(data.length - 4, 4);
      for (let i = 0; i < extraCount; i++) {
        const id = 5 + i;
        const temp = document.createElement('div');
        temp.innerHTML = cardTemplate(id);
        const newCard = temp.firstElementChild;
        container.insertBefore(newCard, addBtn.parentElement);
        attachCardListeners(newCard);
      }
      updateGridCols();
      const cards = document.querySelectorAll('.habit-card');
      data.forEach((row, i) => {
        if (!cards[i]) return;
        cards[i].querySelector('.habit-name').value = row.name || '';
        const quadrants = JSON.parse(row.quadrants || '[]');
        const areas = cards[i].querySelectorAll('textarea');
        quadrants.forEach((val, j) => { if (areas[j]) areas[j].value = val; });
      });
      return;
    }
  } catch(e) {}

  // Fall back to localStorage
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    const container = document.querySelector('.container');
    const addBtn    = document.getElementById('addCardBtn');
    const extraCount = Math.min(saved.length - 4, 4);
    for (let i = 0; i < extraCount; i++) {
      const id = 5 + i;
      const temp = document.createElement('div');
      temp.innerHTML = cardTemplate(id);
      const newCard = temp.firstElementChild;
      container.insertBefore(newCard, addBtn.parentElement);
      attachCardListeners(newCard);
    }
    updateGridCols();
    const cards = document.querySelectorAll('.habit-card');
    saved.forEach((data, i) => {
      if (!cards[i]) return;
      cards[i].querySelector('.habit-name').value = data.name || '';
      const areas = cards[i].querySelectorAll('textarea');
      data.quadrants.forEach((val, j) => { if (areas[j]) areas[j].value = val; });
    });
  } catch(e) {}
}

function updateGridCols() {
  const container  = document.querySelector('.container');
  const cardCount  = container.querySelectorAll('.habit-card').length;
  container.classList.toggle('cols-3', cardCount > 4);
  // Hide + button once at max (6 cards fits 3×2 nicely; beyond that hide)
  const addBtn = document.getElementById('addCardBtn');
  if (addBtn) addBtn.style.visibility = cardCount >= 6 ? 'hidden' : 'visible';
}

// Attach listeners to the 4 original cards
document.querySelectorAll('.habit-card').forEach(card => attachCardListeners(card));

// Add-card button
(function() {
  const container = document.querySelector('.container');
  const addBtn    = document.getElementById('addCardBtn');
  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const cardCount = container.querySelectorAll('.habit-card').length;
    if (cardCount >= 6) return;
    const id   = cardCount + 1;
    const temp = document.createElement('div');
    temp.innerHTML = cardTemplate(id);
    const newCard = temp.firstElementChild;
    container.insertBefore(newCard, addBtn.parentElement);
    attachCardListeners(newCard);
    updateGridCols();
    save();
  });

  updateGridCols();
})();

restoreData();

// ── Quote Slider ──
(function() {
  const track  = document.getElementById('quoteTrack');
  const slides = document.querySelectorAll('.quote-slide');
  const dotsEl = document.getElementById('quoteDots');
  let current  = 0;

  slides.forEach((_, i) => {
    const d = document.createElement('span');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(d);
  });

  function goTo(n) {
    slides[current].classList.remove('active');
    document.querySelectorAll('.dot')[current].classList.remove('active');
    current = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    slides[current].classList.add('active');
    document.querySelectorAll('.dot')[current].classList.add('active');
  }

  slides[0].classList.add('active');

  document.querySelector('.quote-btn.prev').addEventListener('click', () => goTo(current - 1));
  document.querySelector('.quote-btn.next').addEventListener('click', () => goTo(current + 1));

  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(current + (dx < 0 ? 1 : -1));
  });
})();

// ── Wind-Drift Particles (right → left) ──
(function() {
  const container = document.getElementById('particles');
  if (!container) return;

  // Respect user motion preferences
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const palettes = [
    // soft gold dot
    'radial-gradient(circle at 30% 30%, rgba(255,240,210,0.85), rgba(201,169,110,0.25) 55%, transparent 75%)',
    // dust white
    'radial-gradient(circle at 30% 30%, rgba(230,225,215,0.75), rgba(180,175,165,0.15) 55%, transparent 75%)',
    // cool moonlight
    'radial-gradient(circle at 30% 30%, rgba(190,205,220,0.7), rgba(120,140,160,0.15) 55%, transparent 75%)',
    // warm petal
    'linear-gradient(135deg, rgba(220,180,150,0.6), rgba(180,120,110,0.15))',
    // muted rose petal
    'linear-gradient(135deg, rgba(200,160,170,0.55), rgba(140,100,110,0.1))'
  ];

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawn() {
    const p = document.createElement('span');
    const isPetal = Math.random() < 0.35;
    p.className = 'particle' + (isPetal ? ' petal' : '');

    const size = isPetal ? rand(5, 11) : rand(2, 6);
    const top = rand(-5, 105);          // vh
    const duration = rand(11, 22);       // s
    const opacity = rand(0.35, 0.85);
    const sway1 = rand(-60, 60) + 'px';
    const sway2 = rand(-80, 80) + 'px';
    const sway3 = rand(-40, 40) + 'px';
    const bg = palettes[Math.floor(Math.random() * palettes.length)];

    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.top = top + 'vh';
    p.style.right = '-30px';
    p.style.background = bg;
    p.style.animationDuration = duration + 's';
    p.style.setProperty('--op', opacity);
    p.style.setProperty('--sway1', sway1);
    p.style.setProperty('--sway2', sway2);
    p.style.setProperty('--sway3', sway3);

    container.appendChild(p);
    setTimeout(() => p.remove(), duration * 1000 + 300);
  }

  // Initial scatter so the screen isn't empty at load
  for (let i = 0; i < 20; i++) {
    setTimeout(spawn, i * 250);
  }
  // Steady wind
  setInterval(spawn, 500);
})();

// ══════════════════════════════════════
// Habit Tracker — Calendar + Events + Drag + Export
// ══════════════════════════════════════
(function() {
  const tbody    = document.getElementById('calendarBody');
  const overlay  = document.getElementById('eventModalOverlay');
  const nameIn   = document.getElementById('eventName');
  const colourIn = document.getElementById('eventColour');
  const slotLbl  = document.getElementById('modalSlot');
  const saveBtn  = document.getElementById('eventSave');
  const delBtn   = document.getElementById('eventDelete');
  const closeBtn = document.getElementById('modalClose');

  if (!tbody) return;

  const DAYS = ['mon','tues','weds','thurs','fri','sat','sun'];
  const DAY_LABELS = ['Mon','Tues','Weds','Thurs','Fri','Sat','Sun'];
  const CAL_STORAGE = 'atomic-habits-calendar';

  function hourLabel(h) {
    const period = h < 12 ? 'a.m.' : 'p.m.';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display} ${period}`;
  }

  let events = {};
try { events = JSON.parse(localStorage.getItem(CAL_STORAGE)) || {}; } catch(e) {}

// Overwrite with Supabase data if available
(async () => {
  const { data } = await db.from('calendar_events').select('*');
  if (data && data.length) {
    events = {};
    data.forEach(row => { events[row.key] = { name: row.name, colour: row.colour }; });
    localStorage.setItem(CAL_STORAGE, JSON.stringify(events)); // sync localStorage too
    build(); // redraw the calendar with the loaded data
  }
})();
function saveEvents() {
  localStorage.setItem(CAL_STORAGE, JSON.stringify(events)); // keep as fallback
  db.from('calendar_events').delete().neq('key', '')   // clear old data
    .then(() => {
      const rows = Object.entries(events).map(([key, ev]) => ({
        key,
        name: ev.name,
        colour: ev.colour
      }));
      if (rows.length) db.from('calendar_events').insert(rows);
    });
}

// ── Undo / Redo stacks ──
  const undoStack = [];
  const redoStack = [];
  function snapshot() {
    undoStack.push(JSON.stringify(events));
    redoStack.length = 0;
  }

  function build() {
    const rows = [];
    for (let h = 0; h < 24; h++) {
      const cells = DAYS.map(d => {
        const key = `${d}-${h}`;
        const ev = events[key];
        const cls = ev ? `hour-cell has-event ${ev.colour}` : 'hour-cell';
        const text = ev ? ev.name : '';
        return `<td class="${cls}" data-day="${d}" data-hour="${h}" data-key="${key}">${text}</td>`;
      }).join('');
      rows.push(`<tr><td class="time-cell">${hourLabel(h)}</td>${cells}</tr>`);
    }
    tbody.innerHTML = rows.join('');
  }
  build();

  // ── Colour picker ──
  const colourTrigger = colourIn.querySelector('.colour-trigger');
  const colourTrigSw  = colourTrigger.querySelector('.colour-swatch');
  const colourOptions = colourIn.querySelectorAll('.colour-option');

  function setColour(val) {
    colourIn.dataset.value = val;
    colourTrigSw.dataset.colour = val;
  }

  colourTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    colourIn.classList.toggle('open');
  });
  colourOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      setColour(opt.dataset.value);
      colourIn.classList.remove('open');
    });
  });

  // ── Modal logic (supports multi-cell from drag/CLI) ──
  let currentKeys = [];

  function openModal(keys, label) {
    if (!keys.length) return;
    currentKeys = keys;
    slotLbl.textContent = label;
    const existing = keys.map(k => events[k]).find(Boolean);
    nameIn.value = existing ? existing.name : '';
    setColour(existing ? existing.colour : 'cue');
    const hasAnyEvent = keys.some(k => events[k]);
    delBtn.style.display = hasAnyEvent ? '' : 'none';
    overlay.classList.add('open');
    setTimeout(() => nameIn.focus(), 80);
  }

  function clearDragSelection() {
    tbody.querySelectorAll('.drag-selected').forEach(c => c.classList.remove('drag-selected'));
  }

  function closeModal() {
    overlay.classList.remove('open');
    colourIn.classList.remove('open');
    currentKeys = [];
    clearDragSelection();
  }

  saveBtn.addEventListener('click', () => {
    if (!currentKeys.length) return;
    const name = nameIn.value.trim();
    if (!name) { nameIn.focus(); return; }
    currentKeys.forEach(k => { events[k] = { name, colour: colourIn.dataset.value }; });
    saveEvents();
    build();
    closeModal();
  });

  delBtn.addEventListener('click', () => {
    if (!currentKeys.length) return;
    currentKeys.forEach(k => delete events[k]);
    saveEvents();
    build();
    closeModal();
  });

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    if (e.key === 'Enter' && overlay.classList.contains('open') && document.activeElement === nameIn) saveBtn.click();
  });

  // ── Drag-to-fill selection ──
  let dragState = null;

  function cellAt(target) {
    return target && target.closest ? target.closest('.hour-cell') : null;
  }

  function getCellsInRect(c1, c2) {
    const d1 = DAYS.indexOf(c1.dataset.day);
    const d2 = DAYS.indexOf(c2.dataset.day);
    const h1 = parseInt(c1.dataset.hour, 10);
    const h2 = parseInt(c2.dataset.hour, 10);
    const dMin = Math.min(d1, d2), dMax = Math.max(d1, d2);
    const hMin = Math.min(h1, h2), hMax = Math.max(h1, h2);
    const cells = [];
    for (let h = hMin; h <= hMax; h++) {
      for (let d = dMin; d <= dMax; d++) {
        const cell = tbody.querySelector(`[data-key="${DAYS[d]}-${h}"]`);
        if (cell) cells.push(cell);
      }
    }
    return cells;
  }

  function buildRangeLabel(cells) {
    if (cells.length === 1) {
      const c = cells[0];
      return `${DAY_LABELS[DAYS.indexOf(c.dataset.day)]} · ${hourLabel(parseInt(c.dataset.hour, 10))}`;
    }
    const dayIdxs = [...new Set(cells.map(c => DAYS.indexOf(c.dataset.day)))].sort((a,b)=>a-b);
    const hours   = [...new Set(cells.map(c => parseInt(c.dataset.hour, 10)))].sort((a,b)=>a-b);
    const dayStr  = dayIdxs.length === 1 ? DAY_LABELS[dayIdxs[0]] : `${DAY_LABELS[dayIdxs[0]]}–${DAY_LABELS[dayIdxs[dayIdxs.length-1]]}`;
    const hourStr = hours.length === 1 ? hourLabel(hours[0]) : `${hourLabel(hours[0])}–${hourLabel(hours[hours.length-1])}`;
    return `${dayStr} · ${hourStr}  (${cells.length} slots)`;
  }

  tbody.addEventListener('mousedown', (e) => {
    const cell = cellAt(e.target);
    if (!cell) return;
    e.preventDefault();
    dragState = { start: cell, last: cell, moved: false };
    clearDragSelection();
    cell.classList.add('drag-selected');
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    const cell = cellAt(e.target);
    if (!cell) return;
    if (cell !== dragState.last) {
      dragState.moved = true;
      dragState.last = cell;
      clearDragSelection();
      getCellsInRect(dragState.start, cell).forEach(c => c.classList.add('drag-selected'));
    }
  });

  document.addEventListener('mouseup', () => {
    if (!dragState) return;
    const cells = getCellsInRect(dragState.start, dragState.last);
    const keys  = cells.map(c => c.dataset.key);
    const label = buildRangeLabel(cells);
    dragState = null;
    openModal(keys, label);
  });

  // Prevent native click after drag (avoids double-open)
  tbody.addEventListener('click', (e) => { e.stopPropagation(); });

  // ══════════════════════════════════════
  // Export — CSV / XLSX / TXT
  // ══════════════════════════════════════
  const exportPicker  = document.getElementById('exportPicker');
  const exportTrigger = document.getElementById('exportTrigger');

  function buildTable() {
    const head = ['Time', ...DAY_LABELS];
    const rows = [head];
    for (let h = 0; h < 24; h++) {
      const row = [hourLabel(h)];
      DAYS.forEach(d => {
        const ev = events[`${d}-${h}`];
        row.push(ev ? `${ev.name} (${ev.colour})` : '');
      });
      rows.push(row);
    }
    return rows;
  }

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    const csv = buildTable().map(row => row.map(cell => {
      const s = String(cell);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    download('habit-tracker.csv', csv, 'text/csv;charset=utf-8;');
  }

  function exportTXT() {
    const lines = ['HABIT TRACKER', '='.repeat(36), ''];
    let any = false;
    DAYS.forEach((d, i) => {
      const dayLines = [];
      for (let h = 0; h < 24; h++) {
        const ev = events[`${d}-${h}`];
        if (ev) dayLines.push(`  ${hourLabel(h).padEnd(8)} — ${ev.name} (${ev.colour})`);
      }
      if (dayLines.length) {
        any = true;
        lines.push(DAY_LABELS[i].toUpperCase());
        lines.push('-'.repeat(20));
        lines.push(...dayLines, '');
      }
    });
    if (!any) lines.push('(no events scheduled)');
    download('habit-tracker.txt', lines.join('\n'), 'text/plain;charset=utf-8;');
  }

  function exportXLSX() {
    if (typeof XLSX === 'undefined') {
      alert('Excel library failed to load — check your internet connection.');
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet(buildTable());
    ws['!cols'] = [{wch: 10}, ...DAYS.map(() => ({wch: 22}))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Habit Tracker');
    XLSX.writeFile(wb, 'habit-tracker.xlsx');
  }

  if (exportTrigger) {
    exportTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      exportPicker.classList.toggle('open');
    });
    exportPicker.querySelectorAll('.export-menu button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fmt = btn.dataset.format;
        if (fmt === 'csv')  exportCSV();
        if (fmt === 'xlsx') exportXLSX();
        if (fmt === 'txt')  exportTXT();
        exportPicker.classList.remove('open');
      });
    });
  }

  document.addEventListener('click', () => {
    colourIn.classList.remove('open');
    if (exportPicker) exportPicker.classList.remove('open');
    if (importPicker) importPicker.classList.remove('open');
  });

  // ══════════════════════════════════════
  // Import — CSV / XLSX / TXT
  // ══════════════════════════════════════
  const importPicker   = document.getElementById('importPicker');
  const importTrigger  = document.getElementById('importTrigger');
  const importFileInput = document.getElementById('importFileInput');
  let pendingImportFmt = null;

  // Toast helper
  function showImportToast(msg) {
    let toast = document.getElementById('importToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'importToast';
      toast.className = 'import-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // Parse a time label like "12 a.m." / "1 p.m." back to 0-23
  function parseLabelToHour(label) {
    const m = String(label).trim().match(/^(\d{1,2})\s*(a\.m\.|p\.m\.|am|pm)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const period = m[2].replace(/\./g,'').toLowerCase();
    if (period === 'am') { if (h === 12) h = 0; }
    else                 { if (h !== 12) h += 12; }
    return (h >= 0 && h <= 23) ? h : null;
  }

  // Parse "Name (colour)" cell value
  function parseCellValue(val) {
    const s = String(val).trim();
    if (!s) return null;
    const m = s.match(/^(.+?)\s*\((\w+)\)\s*$/);
    if (m) {
      const colour = m[2].toLowerCase();
      const valid = ['cue','craving','response','reward'];
      return { name: m[1].trim(), colour: valid.includes(colour) ? colour : 'cue' };
    }
    // No colour tag — use default
    return { name: s, colour: 'cue' };
  }

  // Apply a parsed rows array (first row = header) to events
  function applyRows(rows) {
    if (!rows || rows.length < 2) return 0;
    const header = rows[0].map(c => String(c).trim().toLowerCase());
    // Find which column index maps to which day
    const dayColMap = {}; // dayIndex (0-6) -> colIndex
    DAYS.forEach((d, di) => {
      const label = DAY_LABELS[di].toLowerCase();
      const ci = header.indexOf(label);
      if (ci !== -1) dayColMap[di] = ci;
    });

    let count = 0;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const timeLabel = row[0];
      const hour = parseLabelToHour(timeLabel);
      if (hour === null) continue;
      DAYS.forEach((d, di) => {
        const ci = dayColMap[di];
        if (ci === undefined) return;
        const cell = row[ci];
        const ev = parseCellValue(cell);
        if (ev) {
          events[`${d}-${hour}`] = ev;
          count++;
        }
      });
    }
    saveEvents();
    build();
    return count;
  }

  function importCSV(text) {
    // RFC 4180-compliant parser
    const rows = [];
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let row = [], cell = '', inQ = false, i = 0;
    while (i < lines.length) {
      const ch = lines[i];
      if (inQ) {
        if (ch === '"' && lines[i+1] === '"') { cell += '"'; i += 2; continue; }
        if (ch === '"') { inQ = false; i++; continue; }
        cell += ch;
      } else {
        if (ch === '"') { inQ = true; i++; continue; }
        if (ch === ',') { row.push(cell); cell = ''; i++; continue; }
        if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
        cell += ch;
      }
      i++;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return applyRows(rows);
  }

  function importXLSX(arrayBuffer) {
    if (typeof XLSX === 'undefined') { showImportToast('Excel library not loaded'); return 0; }
    const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    return applyRows(rows);
  }

  function importTXT(text) {
    // Format: day heading (MON), dashes, then "  HH:MM — Name (colour)"
    const rows = [['Time', ...DAY_LABELS]];
    // Pre-fill all 24 time slots
    const grid = {};
    for (let h = 0; h < 24; h++) {
      const label = (() => {
        const period = h < 12 ? 'a.m.' : 'p.m.';
        const d = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${d} ${period}`;
      })();
      grid[h] = { label, cells: {} };
    }
    let currentDay = null;
    const lines = text.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      // Day heading e.g. "MON" or "MONDAY"
      const dayMatch = DAY_LABELS.find(dl => line.toUpperCase().startsWith(dl.toUpperCase()) && line.length <= dl.length + 2);
      if (dayMatch) { currentDay = dayMatch; continue; }
      if (!currentDay) continue;
      // Event line: "  8 a.m.     — Name (colour)"
      const m = line.match(/^(\d{1,2}\s*(?:a\.m\.|p\.m\.))\s*[—\-]+\s*(.+)$/i);
      if (!m) continue;
      const hour = parseLabelToHour(m[1]);
      if (hour === null) continue;
      const ev = parseCellValue(m[2]);
      if (ev && grid[hour]) grid[hour].cells[currentDay] = `${ev.name} (${ev.colour})`;
    }
    for (let h = 0; h < 24; h++) {
      const row = [grid[h].label];
      DAY_LABELS.forEach(dl => row.push(grid[h].cells[dl] || ''));
      rows.push(row);
    }
    return applyRows(rows);
  }

  function handleImportFile(file, fmt, onDone) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();
    if (fmt === 'xlsx' || ext === 'xlsx' || ext === 'xls') {
      reader.onload = e => {
        const n = importXLSX(e.target.result);
        const msg = n ? `✓ imported ${n} event${n===1?'':'s'}` : 'no events found in file';
        showImportToast(msg);
        if (onDone) onDone(n, msg);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = e => {
        const text = e.target.result;
        const n = (fmt === 'txt' || ext === 'txt') ? importTXT(text) : importCSV(text);
        const msg = n ? `✓ imported ${n} event${n===1?'':'s'}` : 'no events found in file';
        showImportToast(msg);
        if (onDone) onDone(n, msg);
      };
      reader.readAsText(file);
    }
  }

  if (importTrigger) {
    importTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      importPicker.classList.toggle('open');
    });
    importPicker.querySelectorAll('.import-menu button[data-import]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pendingImportFmt = btn.dataset.import;
        importPicker.classList.remove('open');
        // Set accept filter then open file picker
        const accepts = { csv: '.csv', xlsx: '.xlsx,.xls', txt: '.txt' };
        importFileInput.accept = accepts[pendingImportFmt] || '*';
        importFileInput.value = '';
        importFileInput.click();
      });
    });
  }

  if (importFileInput) {
    importFileInput.addEventListener('change', () => {
      const file = importFileInput.files[0];
      if (file) handleImportFile(file, pendingImportFmt);
    });
  }


  // ══════════════════════════════════════
  // Public API — used by the CLI
  // ══════════════════════════════════════
  window.habitCalendar = {
    DAYS, DAY_LABELS, hourLabel,
    getEvents: () => JSON.parse(JSON.stringify(events)),
    pushSnapshot() { snapshot(); },
    setEvent(day, hour, name, colour) {
      events[`${day}-${hour}`] = { name, colour };
    },
    removeEvent(day, hour) {
      const key = `${day}-${hour}`;
      const existed = !!events[key];
      delete events[key];
      return existed;
    },
    clearAll() { events = {}; },
    flush() { saveEvents(); build(); },
    importFile(file, fmt, onDone) { handleImportFile(file, fmt, onDone); },
    undo() {
      if (!undoStack.length) return false;
      redoStack.push(JSON.stringify(events));
      events = JSON.parse(undoStack.pop());
      saveEvents(); build();
      return true;
    },
    redo() {
      if (!redoStack.length) return false;
      undoStack.push(JSON.stringify(events));
      events = JSON.parse(redoStack.pop());
      saveEvents(); build();
      return true;
    },
    undoCount() { return undoStack.length; },
    redoCount()  { return redoStack.length; },
    exportAs(fmt) {
      if (fmt === 'csv')  exportCSV();
      else if (fmt === 'xlsx') exportXLSX();
      else if (fmt === 'txt')  exportTXT();
      else return false;
      return true;
    }
  };
})();

// ══════════════════════════════════════
// CLI — Command Line Interface
// ══════════════════════════════════════
(function() {
  const toggle   = document.getElementById('cliToggle');
  const panel    = document.getElementById('cliPanel');
  const closeBtn = document.getElementById('cliClose');
  const output   = document.getElementById('cliOutput');
  const form     = document.getElementById('cliForm');
  const input    = document.getElementById('cliInput');

  if (!toggle || !panel || !window.habitCalendar) return;

  const CAL = window.habitCalendar;
  const DAYS = CAL.DAYS;
  const DAY_LABELS = CAL.DAY_LABELS;

  const HISTORY_KEY = 'atomic-habits-cli-history';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch(e) {}
  let histIdx = history.length;

  // ── UI helpers ──
  function print(text, cls) {
    const line = document.createElement('div');
    line.className = 'cli-line' + (cls ? ' ' + cls : '');
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function clearOutput() { output.innerHTML = ''; }

  function openPanel() {
    panel.classList.add('open');
    toggle.classList.add('active');
    setTimeout(() => input.focus(), 100);
    if (!output.childElementCount) {
      print("habit-cli — type 'help' for commands", 'dim');
    }
  }
  function closePanel() {
    panel.classList.remove('open');
    toggle.classList.remove('active');
  }

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  // ── Parsers ──
  const DAY_MAP = { mon:0, tue:1, tues:1, wed:2, weds:2, thu:3, thur:3, thurs:3, fri:4, sat:5, sun:6 };
  const DAY_ALIAS = {
    all: [0,1,2,3,4,5,6],
    weekdays: [0,1,2,3,4],
    weekday:  [0,1,2,3,4],
    weekend:  [5,6]
  };

  function parseDays(str) {
    if (!str) return null;
    const s = str.toLowerCase().trim();
    if (DAY_ALIAS[s]) return DAY_ALIAS[s];

    if (s.includes(',')) {
      const out = [];
      for (const part of s.split(',')) {
        const d = DAY_MAP[part.trim()];
        if (d === undefined) return null;
        if (!out.includes(d)) out.push(d);
      }
      return out;
    }
    if (s.includes('-') || s.includes('..')) {
      const [a, b] = s.split(/-|\.\./).map(p => DAY_MAP[p.trim()]);
      if (a === undefined || b === undefined) return null;
      const out = [];
      const step = a <= b ? 1 : -1;
      for (let i = a; step > 0 ? i <= b : i >= b; i += step) out.push(i);
      return out;
    }
    return DAY_MAP[s] !== undefined ? [DAY_MAP[s]] : null;
  }

  function parseHour(s) {
    s = s.toLowerCase().trim();
    let m = s.match(/^(\d{1,2}):?(\d{2})?(am|pm)$/);
    if (m) {
      let h = parseInt(m[1], 10);
      const period = m[3];
      if (period === 'am') { if (h === 12) h = 0; }
      else { if (h !== 12) h += 12; }
      return (h >= 0 && h <= 23) ? h : null;
    }
    m = s.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (m) {
      const h = parseInt(m[1], 10);
      return (h >= 0 && h <= 23) ? h : null;
    }
    if (s === 'noon')     return 12;
    if (s === 'midnight') return 0;
    return null;
  }

  function parseTimes(str) {
    if (!str) return null;
    const s = str.toLowerCase().trim();
    if (s.includes(',')) {
      const out = [];
      for (const p of s.split(',')) {
        const h = parseHour(p.trim());
        if (h === null) return null;
        if (!out.includes(h)) out.push(h);
      }
      return { hours: out.sort((a,b)=>a-b), overnight: false };
    }
    if (s.includes('-')) {
      const parts = s.split('-');
      const a = parseHour(parts[0].trim());
      const b = parseHour(parts[1].trim());
      if (a === null || b === null) return null;
      if (a === b) return { hours: [a], overnight: false };
      const out = [];
      if (a < b) {
        // Normal same-day range, end-exclusive: 10am-12pm => [10,11]
        for (let h = a; h < b; h++) out.push(h);
        return { hours: out, overnight: false };
      } else {
        // Overnight: 11pm-8am => 23,0,1,2,3,4,5,6,7
        for (let h = a; h < 24; h++) out.push(h);
        for (let h = 0; h < b; h++) out.push(h);
        return { hours: out, overnight: true, startHour: a, endHour: b };
      }
    }
    const h = parseHour(s);
    return h !== null ? { hours: [h], overnight: false } : null;
  }

  const COLOUR_MAP = {
    cue:'cue', craving:'craving', response:'response', reward:'reward',
    blue:'cue', navy:'cue', steel:'cue',
    green:'craving', sage:'craving', mint:'craving',
    purple:'response', violet:'response', plum:'response',
    red:'reward', amber:'reward', orange:'reward', brown:'reward', warm:'reward'
  };
  function parseColour(s) {
    return s ? (COLOUR_MAP[s.toLowerCase().trim()] || null) : null;
  }

  // Tokenizer (handles quoted strings)
  function tokenize(str) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let m;
    while ((m = re.exec(str)) !== null) tokens.push(m[1] ?? m[2] ?? m[3]);
    return tokens;
  }

  // ── Help text ──
  function helpText() {
    print('AVAILABLE COMMANDS', 'head');
    print('  help                              show this help', 'dim');
    print('  clear                             clear the terminal', 'dim');
    print('  undo                              undo last calendar change', 'dim');
    print('  redo                              redo last undone change', 'dim');
    print('', 'dim');
    print('CALENDAR', 'head');
    print('  calendar --add event "Name" <days> <times> <colour>', 'dim');
    print('  calendar --remove <days> <times>', 'dim');
    print('  calendar --list', 'dim');
    print('  calendar --clear', 'dim');
    print('  calendar --import <csv|xlsx|txt>', 'dim');
    print('  calendar --export <csv|xlsx|txt>', 'dim');
    print('', 'dim');
    print('FORMATS', 'head');
    print('  days     mon | tue | wed | thu | fri | sat | sun', 'dim');
    print('           mon-fri  |  mon,wed,fri  |  weekdays  |  weekend  |  all', 'dim');
    print('  times    8am | 14:00 | noon | midnight', 'dim');
    print('           10am-12pm   (end-exclusive: fills 10am & 11am)', 'dim');
    print('           8am,10am,2pm', 'dim');
    print('  colours  blue (cue) · green (craving) · purple (response) · red (reward)', 'dim');
    print('           or use the category names directly', 'dim');
    print('', 'dim');
    print('EXAMPLES', 'head');
    print('  calendar --add event "Morning run" mon-fri 6am-7am green', 'dim');
    print('  calendar --add event "Meditate" all 9pm purple', 'dim');
    print('  calendar --add event "Coffee" weekdays 8am,10am,2pm blue', 'dim');
    print('  calendar --remove mon-fri 6am-7am', 'dim');
  }

  // ── Command handlers ──
  function handleCalendar(args) {
    const sub = args[0];

    if (sub === '--list') {
      const ev = CAL.getEvents();
      const keys = Object.keys(ev).sort((a,b) => {
        const [da, ha] = a.split('-'); const [db, hb] = b.split('-');
        return (DAYS.indexOf(da) - DAYS.indexOf(db)) || (parseInt(ha,10) - parseInt(hb,10));
      });
      if (!keys.length) { print('(no events scheduled)', 'dim'); return; }
      print(`${keys.length} event${keys.length===1?'':'s'}:`, 'head');
      keys.forEach(k => {
        const [d, h] = k.split('-');
        const e = ev[k];
        print(`  ${DAY_LABELS[DAYS.indexOf(d)].padEnd(6)} ${CAL.hourLabel(parseInt(h,10)).padEnd(8)}  ${e.name}  (${e.colour})`, 'dim');
      });
      return;
    }

    if (sub === '--clear') {
      CAL.pushSnapshot();
      CAL.clearAll(); CAL.flush();
      print('calendar cleared', 'ok');
      return;
    }

    if (sub === '--import' || sub === '--im') {
      const fmt = (args[1] || '').replace(/^\./, '').toLowerCase();
      if (!['csv','xlsx','txt'].includes(fmt)) {
        print(`usage: calendar --import <csv|xlsx|txt>`, 'error');
        return;
      }
      // Open the file picker with the right accept filter
      const importFileInput = document.getElementById('importFileInput');
      if (!importFileInput) { print('import element missing', 'error'); return; }
      const accepts = { csv: '.csv', xlsx: '.xlsx,.xls', txt: '.txt' };
      importFileInput.accept = accepts[fmt];
      importFileInput.value = '';
      // Listen for result once
      function onFile() {
        importFileInput.removeEventListener('change', onFile);
        const file = importFileInput.files[0];
        if (!file) { print('no file selected', 'dim'); return; }
        print(`importing ${file.name} …`, 'dim');
        CAL.importFile(file, fmt, (n, msg) => print(msg, n ? 'ok' : 'dim'));
      }
      importFileInput.addEventListener('change', onFile);
      importFileInput.click();
      print(`opening file picker for .${fmt} …`, 'dim');
      return;
    }

    if (sub === '--export') {
      const fmt = (args[1] || 'csv').toLowerCase();
      if (!['csv','xlsx','txt'].includes(fmt)) { print(`unknown format: ${fmt}`, 'error'); return; }
      const ok = CAL.exportAs(fmt);
      print(ok ? `exporting as .${fmt} ...` : `export failed`, ok ? 'ok' : 'error');
      return;
    }

    if (sub === '--add') {
      CAL.pushSnapshot();
      if (args[1] !== 'event') { print("expected 'event' after --add", 'error'); return; }
      const name = args[2];
      const daysIn = args[3], timesIn = args[4], colourIn = args[5];
      if (!name)    { print('missing event name (use quotes: "Name")', 'error'); return; }
      if (!daysIn)  { print('missing days', 'error'); return; }
      if (!timesIn) { print('missing times', 'error'); return; }
      if (!colourIn){ print('missing colour', 'error'); return; }
      const days   = parseDays(daysIn);
      const times  = parseTimes(timesIn);
      const colour = parseColour(colourIn);
      if (!days)   { print(`invalid days: ${daysIn}`, 'error'); return; }
      if (!times)  { print(`invalid times: ${timesIn}`, 'error'); return; }
      if (!colour) { print(`invalid colour: ${colourIn}`, 'error'); return; }

      let count = 0;
      if (!times.overnight) {
        // Normal: apply all hours to all days
        days.forEach(d => times.hours.forEach(h => { CAL.setEvent(DAYS[d], h, name, colour); count++; }));
      } else {
        // Overnight: hours from startHour–23 go on each listed day,
        // hours from 0–endHour-1 go on the NEXT day
        const afterMidnight = times.hours.filter(h => h < times.endHour);
        const beforeMidnight = times.hours.filter(h => h >= times.startHour);
        days.forEach(d => {
          beforeMidnight.forEach(h => { CAL.setEvent(DAYS[d], h, name, colour); count++; });
          // Next day wraps around the DAYS array
          const nextD = (d + 1) % 7;
          afterMidnight.forEach(h => { CAL.setEvent(DAYS[nextD], h, name, colour); count++; });
        });
      }
      CAL.flush();
      print(`+ added "${name}" to ${count} slot${count===1?'':'s'} (${colour})`, 'ok');
      return;
    }

    if (sub === '--remove' || sub === '--rm' || sub === '--delete') {
      CAL.pushSnapshot();
      const daysIn = args[1], timesIn = args[2];
      const days  = parseDays(daysIn);
      const times = parseTimes(timesIn);
      if (!days)  { print(`invalid days: ${daysIn}`, 'error'); return; }
      if (!times) { print(`invalid times: ${timesIn}`, 'error'); return; }
      let count = 0;
      days.forEach(d => times.hours.forEach(h => { if (CAL.removeEvent(DAYS[d], h)) count++; }));
      CAL.flush();
      print(`- removed ${count} event${count===1?'':'s'}`, count ? 'ok' : 'dim');
      return;
    }

    print(`unknown subcommand: ${sub || '(none)'} — try --add, --remove, --list, --clear, --export`, 'error');
  }

  function run(raw) {
    print(`$ ${raw}`, 'input');
    const tokens = tokenize(raw);
    if (!tokens.length) return;
    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    if (cmd === 'help' || cmd === '?')   { helpText(); return; }
    if (cmd === 'clear' || cmd === 'cls'){ clearOutput(); return; }
    if (cmd === 'undo') {
      const ok = CAL.undo();
      if (ok) {
        print(`↩ undone  (${CAL.undoCount()} more undo${CAL.undoCount()===1?'':'s'} available, ${CAL.redoCount()} redo${CAL.redoCount()===1?'':'s'})`, 'ok');
      } else {
        print('nothing to undo', 'dim');
      }
      return;
    }
    if (cmd === 'redo') {
      const ok = CAL.redo();
      if (ok) {
        print(`↪ redone  (${CAL.redoCount()} more redo${CAL.redoCount()===1?'':'s'} available)`, 'ok');
      } else {
        print('nothing to redo', 'dim');
      }
      return;
    }
    if (cmd === 'calendar' || cmd === 'cal') { handleCalendar(args); return; }
    if (cmd === 'echo') { print(args.join(' ')); return; }
    print(`unknown command: ${cmd} (try 'help')`, 'error');
  }

  // ── Input handling ──
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    history.push(value);
    if (history.length > 100) history.shift();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    histIdx = history.length;
    input.value = '';
    try { run(value); }
    catch(err) { print(`error: ${err.message}`, 'error'); }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      if (histIdx > 0) { histIdx--; input.value = history[histIdx] || ''; }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (histIdx < history.length) { histIdx++; input.value = history[histIdx] || ''; }
      e.preventDefault();
    }
  });

  // Esc closes panel when input focused
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open') && !document.querySelector('.event-modal-overlay.open')) {
      closePanel();
    }
    // Backtick toggles CLI
    if (e.key === '`' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      panel.classList.contains('open') ? closePanel() : openPanel();
    }
  });
})();
