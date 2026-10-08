(() => {
  'use strict';

  const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
  const WIB = 7 * HOUR; // Asia/Jakarta, tanpa daylight saving
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const KEY = {
    tasks: 'kuliah.tasks',
    settings: 'kuliah.settings',
    fired: 'kuliah.fired',
    theme: 'kuliah.theme',
    hidden: 'kuliah.hiddenSeeds',
  };
  const TABS = ['beranda', 'jadwal', 'tugas', 'pengingat'];

  // ---------- Utilitas ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  const store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : fallback;
      } catch { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage penuh / diblokir */ }
    },
  };

  // Objek Date yang field UTC-nya = jam dinding di Jakarta.
  const wib = t => new Date(t + WIB);
  const fromWib = (y, m, d, hh = 0, mm = 0) => Date.UTC(y, m, d, hh, mm) - WIB;
  const hm = s => s.split(':').map(Number);
  const dayNumber = t => { const w = wib(t); return Math.floor(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) / DAY); };
  const fmtTime = t => { const w = wib(t); return `${pad(w.getUTCHours())}.${pad(w.getUTCMinutes())}`; };
  const fmtDate = (t, year = false) => {
    const w = wib(t);
    return `${HARI[w.getUTCDay()]}, ${w.getUTCDate()} ${BULAN[w.getUTCMonth()]}${year ? ' ' + w.getUTCFullYear() : ''}`;
  };
  const jam = c => `${c.mulai.replace(':', '.')}–${c.selesai.replace(':', '.')}`;

  // Tombol masuk kelas; kalau link tidak dicantumkan, tampilkan keterangan saja.
  const joinBtn = (c, cls = '', label = `Masuk ${esc(c.platform)}`) => c.link
    ? `<a class="btn btn-primary ${cls}" data-join href="${esc(c.link)}" target="_blank" rel="noopener">${label}</a>`
    : `<span class="btn btn-disabled ${cls}" data-join title="${esc(c.infoLink || 'Link belum diisi')}">${esc(c.infoLink || 'Link belum diisi')}</span>`;
  const copyLinkBtn = (c, cls = '') => c.link
    ? `<button type="button" class="btn btn-ghost ${cls}" data-copy="${esc(c.link)}">Salin link</button>` : '';

  function countdown(ms) {
    ms = Math.max(0, ms);
    const d = Math.floor(ms / DAY);
    const h = Math.floor((ms % DAY) / HOUR);
    const m = Math.floor((ms % HOUR) / MIN);
    const s = Math.floor((ms % MIN) / 1000);
    return d ? `${d} hari ${h} jam` : `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  // Pertemuan berikutnya (atau yang sedang berlangsung) untuk satu mata kuliah.
  function occurrence(c, now) {
    const w = wib(now);
    const diff = (c.hari - w.getUTCDay() + 7) % 7;
    const [y, mo, d] = [w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() + diff];
    const [sh, sm] = hm(c.mulai), [eh, em] = hm(c.selesai);
    let start = fromWib(y, mo, d, sh, sm);
    let end = fromWib(y, mo, d, eh, em);
    if (end <= now) { start += 7 * DAY; end += 7 * DAY; }
    return { c, start, end };
  }
  const schedule = now => MATKUL.map(c => occurrence(c, now)).sort((a, b) => a.start - b.start);

  const byId = Object.fromEntries(MATKUL.map(c => [c.id, c]));
  const LAINNYA = { id: 'lain', nama: 'Lainnya', warna: '#7a87a0' };
  const course = id => byId[id] || LAINNYA;

  // ---------- State ----------
  let tasks = store.get(KEY.tasks, []);
  let settings = { notif: false, leadMin: 15, taskNotif: true, ...store.get(KEY.settings, {}) };
  let filter = { status: 'aktif', matkul: 'semua' };
  let editingId = null;
  let heroKey = '';

  // Gabungkan tugas bawaan dari data.js. Status selesai & checklist milik browser
  // ini dipertahankan; isi tugas diperbarui kalau `rev` di data.js naik.
  function mergeSeedTasks() {
    const hidden = new Set(store.get(KEY.hidden, []));
    let changed = false;
    for (const seed of (typeof TUGAS !== 'undefined' ? TUGAS : [])) {
      if (hidden.has(seed.id)) continue;
      const i = tasks.findIndex(t => t.id === seed.id);
      if (i === -1) {
        tasks.push({ ...seed, bawaan: true, selesai: false, langkahSelesai: [], dibuat: Date.now() });
        changed = true;
      } else if ((tasks[i].rev || 0) < (seed.rev || 0)) {
        const { selesai, langkahSelesai = [], dibuat } = tasks[i];
        tasks[i] = { ...seed, bawaan: true, selesai, dibuat,
          langkahSelesai: langkahSelesai.filter(n => n < (seed.langkah || []).length) };
        changed = true;
      }
    }
    if (changed) store.set(KEY.tasks, tasks);
  }
  mergeSeedTasks();

  const saveSettings = () => store.set(KEY.settings, settings);
  const saveTasks = () => { store.set(KEY.tasks, tasks); renderTaskViews(Date.now()); };

  const deadlineAbs = t => {
    const [date, time = '23:59'] = t.deadline.split('T');
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return fromWib(y, m - 1, d, hh, mm);
  };

  // ---------- Toast & clipboard ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Disalin ke clipboard');
  }

  // ---------- Header ----------
  function renderClock(now) {
    $('#clock-time').textContent = fmtTime(now) + ' WIB';
    $('#clock-date').textContent = fmtDate(now, true);
  }

  // ---------- Hero: kelas sekarang / berikutnya ----------
  function renderHero(now) {
    const list = schedule(now);
    const live = list.find(o => o.start <= now && now < o.end);
    const o = live || list[0];
    const key = `${o.c.id}:${o.start}:${!!live}`;
    const soon = live || o.start - now <= 15 * MIN;

    if (key !== heroKey) {
      heroKey = key;
      const c = o.c;
      const dosen = c.dosen.length ? c.dosen.join(' · ') : `${SEMESTER.program} · ${c.kode}`;
      const relDay = dayNumber(o.start) - dayNumber(now);
      const when = relDay === 0 ? 'Hari ini' : relDay === 1 ? 'Besok' : fmtDate(o.start);
      $('#hero').innerHTML = `
        <div class="hero-top">
          <span class="pill ${live ? 'live' : ''}">${live ? 'Sedang berlangsung' : 'Kelas berikutnya'}</span>
          <span class="hero-when">${when} · ${jam(c)} WIB</span>
        </div>
        <h1 class="hero-title">${esc(c.nama)}</h1>
        <p class="hero-meta">${esc(dosen)}</p>
        <div class="hero-count">
          <small>${live ? 'Selesai dalam' : 'Mulai dalam'}</small>
          <strong data-countdown></strong>
        </div>
        ${live ? '<div class="progress"><span data-progress></span></div>' : ''}
        <div class="hero-actions">
          ${joinBtn(c)}
          ${copyLinkBtn(c)}
          ${c.passcode ? `<button type="button" class="btn btn-ghost" data-copy="${esc(c.passcode)}">Passcode ${esc(c.passcode)}</button>` : ''}
        </div>`;
    }

    $('[data-countdown]').textContent = countdown(live ? o.end - now : o.start - now);
    $('[data-join]').classList.toggle('pulse', !!soon && !!o.c.link);
    const bar = $('[data-progress]');
    if (bar) bar.style.width = `${Math.min(100, ((now - o.start) / (o.end - o.start)) * 100).toFixed(1)}%`;
  }

  // ---------- Kelas hari ini ----------
  function renderToday(now) {
    const today = wib(now).getUTCDay();
    const items = MATKUL.filter(c => c.hari === today);
    const el = $('#today-list');

    if (!items.length) {
      const next = schedule(now)[0];
      el.innerHTML = `<div class="empty">Tidak ada kelas hari ini.<br>
        Kelas berikutnya: <strong>${esc(next.c.nama)}</strong>, ${fmtDate(next.start)} pukul ${fmtTime(next.start)}.</div>`;
      return;
    }

    el.innerHTML = items.map(c => {
      const o = occurrence(c, now);
      const isToday = dayNumber(o.start) === dayNumber(now);
      let status;
      if (!isToday) status = '<span class="tag ok">Selesai</span>';
      else if (o.start <= now) status = '<span class="tag live">Berlangsung</span>';
      else status = `<span class="tag">${o.start - now < HOUR ? Math.ceil((o.start - now) / MIN) + ' menit lagi' : 'Nanti'}</span>`;
      return `
        <div class="card class-row" style="--c:${c.warna}">
          <div class="class-time">${c.mulai.replace(':', '.')}<small>${c.selesai.replace(':', '.')}</small></div>
          <div class="class-body">
            <strong>${esc(c.nama)}</strong>
            <small>${esc(c.platform)} · ${status}</small>
          </div>
          ${c.link ? joinBtn(c, 'btn-sm', 'Masuk') : ''}
        </div>`;
    }).join('');
  }

  // ---------- Jadwal mingguan ----------
  function renderWeek(now) {
    const today = wib(now).getUTCDay();
    const days = [1, 2, 3, 4, 5, 6];
    $('#week').innerHTML = days.map(d => {
      const items = MATKUL.filter(c => c.hari === d).sort((a, b) => a.mulai.localeCompare(b.mulai));
      return `
        <div class="day ${d === today ? 'today' : ''}">
          <h3>${HARI[d]}${d === today ? '<em>Hari ini</em>' : ''}</h3>
          <div>
            ${items.length ? items.map(c => `
              <${c.link ? 'a' : 'div'} class="slot" style="--c:${c.warna}" ${c.link ? `href="${esc(c.link)}" target="_blank" rel="noopener" title="Buka ${esc(c.platform)}"` : ''}>
                <b>${esc(c.singkat || c.nama)}</b>
                <span>${jam(c)} · ${esc(c.platform)}</span>
              </${c.link ? 'a' : 'div'}>`).join('') : '<span class="none">Tidak ada kelas</span>'}
          </div>
        </div>`;
    }).join('');
  }

  function renderCourses() {
    const sorted = [...MATKUL].sort((a, b) => a.hari - b.hari);
    $('#courses').innerHTML = sorted.map(c => `
      <article class="card course" style="--c:${c.warna}">
        <div class="course-head">
          <div>
            <h3>${esc(c.nama)}</h3>
            <div class="course-meta">${esc(c.kode)} · ${esc(SEMESTER.kelas)}</div>
          </div>
          <span class="tag">${c.sks} SKS</span>
        </div>
        <dl class="kv">
          <dt>Jadwal</dt><dd>${HARI[c.hari]}, ${jam(c)} WIB</dd>
          <dt>Dosen</dt><dd>${c.dosen.length
            ? `<ul>${c.dosen.map(d => `<li>${esc(d)}</li>`).join('')}</ul>`
            : '<span class="muted">Belum diisi</span>'}</dd>
          <dt>Kelas</dt><dd>${esc(c.platform)}</dd>
          ${c.meetingId ? `<dt>Meeting ID</dt><dd><button type="button" class="copyable" data-copy="${esc(c.meetingId.replace(/\s/g, ''))}" title="Salin">${esc(c.meetingId)}</button></dd>` : ''}
          ${c.passcode ? `<dt>Passcode</dt><dd><button type="button" class="copyable" data-copy="${esc(c.passcode)}" title="Salin">${esc(c.passcode)}</button></dd>` : ''}
        </dl>
        <div class="course-actions">
          ${joinBtn(c, 'btn-sm')}
          ${copyLinkBtn(c, 'btn-sm')}
          <button type="button" class="btn btn-ghost btn-sm" data-add-task="${c.id}">+ Tugas</button>
        </div>
      </article>`).join('');
  }

  // ---------- Tugas ----------
  function dueInfo(t, now) {
    if (t.selesai) return { label: 'Selesai', cls: 'ok' };
    const dl = deadlineAbs(t);
    const diff = dl - now;
    if (diff < 0) return { label: 'Terlambat', cls: 'danger' };
    if (diff < HOUR) return { label: `${Math.max(1, Math.ceil(diff / MIN))} menit lagi`, cls: 'danger' };
    const days = dayNumber(dl) - dayNumber(now);
    if (days === 0) return { label: `Hari ini · ${Math.floor(diff / HOUR)} jam lagi`, cls: 'danger' };
    if (days === 1) return { label: 'Besok', cls: 'warn' };
    if (days <= 3) return { label: `${days} hari lagi`, cls: 'warn' };
    return { label: `${days} hari lagi`, cls: '' };
  }

  const sortTasks = list => [...list].sort((a, b) =>
    (a.selesai - b.selesai) || (a.selesai ? deadlineAbs(b) - deadlineAbs(a) : deadlineAbs(a) - deadlineAbs(b)));

  function taskHtml(t, now, compact = false) {
    const c = course(t.matkulId);
    const due = dueInfo(t, now);
    const dl = deadlineAbs(t);
    const steps = t.langkah || [];
    const doneSteps = new Set(t.langkahSelesai || []);
    const pct = steps.length ? Math.round((doneSteps.size / steps.length) * 100) : 0;
    let given = '';
    if (t.mulai) {
      const [y, m, d] = t.mulai.split('-').map(Number);
      given = `<span>Diberikan ${fmtDate(fromWib(y, m - 1, d))}</span>`;
    }
    return `
      <div class="card task ${t.selesai ? 'done' : ''}" style="--c:${c.warna}" data-id="${esc(t.id)}">
        <input type="checkbox" data-action="toggle" ${t.selesai ? 'checked' : ''} aria-label="Tandai selesai">
        <div class="task-body">
          <span class="task-title">${esc(t.judul)}</span>
          <div class="task-meta">
            <span class="chip" style="--c:${c.warna}">${esc(c.singkat || c.nama)}</span>
            ${compact ? '' : given}
            <span>Deadline ${fmtDate(dl)}, ${fmtTime(dl)}</span>
            <span class="tag ${due.cls}">${due.label}</span>
          </div>
          ${steps.length ? `
            <div class="task-progress">
              <div class="progress"><span style="width:${pct}%"></span></div>
              <small>${doneSteps.size}/${steps.length} langkah</small>
            </div>` : ''}
          ${!compact && t.catatan ? `<div class="task-note">${esc(t.catatan)}</div>` : ''}
          ${!compact && steps.length ? `
            <details class="steps" ${t.selesai ? '' : 'open'}>
              <summary>Checklist pengerjaan</summary>
              <ul>${steps.map((s, i) => `
                <li><label class="check">
                  <input type="checkbox" data-action="step" data-step="${i}" ${doneSteps.has(i) ? 'checked' : ''}>
                  <span>${esc(s)}</span>
                </label></li>`).join('')}
              </ul>
            </details>` : ''}
          ${!compact ? `
            <div class="task-actions">
              ${t.link ? `<a href="${esc(t.link)}" target="_blank" rel="noopener">${esc(t.linkLabel || 'Buka link')} ↗</a>` : ''}
              <button type="button" class="icon-btn" data-action="edit">Edit</button>
              <button type="button" class="icon-btn" data-action="delete">Hapus</button>
            </div>` : ''}
        </div>
      </div>`;
  }

  function renderTasks(now) {
    let list = tasks;
    if (filter.status === 'aktif') list = list.filter(t => !t.selesai);
    if (filter.status === 'selesai') list = list.filter(t => t.selesai);
    if (filter.matkul !== 'semua') list = list.filter(t => t.matkulId === filter.matkul);

    const empty = !tasks.length
      ? 'Belum ada tugas. Tambahkan lewat formulir di atas.'
      : filter.status === 'aktif' ? 'Tidak ada tugas aktif untuk filter ini. 🎉' : 'Tidak ada tugas untuk filter ini.';
    $('#task-list').innerHTML = list.length
      ? sortTasks(list).map(t => taskHtml(t, now)).join('')
      : `<div class="empty">${empty}</div>`;
  }

  function renderUpcoming(now) {
    const active = sortTasks(tasks.filter(t => !t.selesai)).slice(0, 4);
    $('#upcoming-tasks').innerHTML = active.length
      ? active.map(t => taskHtml(t, now, true)).join('')
      : `<div class="empty">Tidak ada tugas aktif. <a class="link" href="#tugas">Tambah tugas</a></div>`;

    const urgent = tasks.filter(t => !t.selesai && deadlineAbs(t) - now < 3 * DAY).length;
    const badge = $('#task-badge');
    badge.hidden = !urgent;
    badge.textContent = urgent;
    badge.title = `${urgent} tugas mendekati deadline`;
  }

  function renderTaskViews(now) {
    renderTasks(now);
    renderUpcoming(now);
  }

  function fillMatkulSelects() {
    const opts = MATKUL.map(c => `<option value="${c.id}">${esc(c.nama)}</option>`).join('');
    $('#task-matkul').innerHTML = opts + `<option value="lain">Lainnya</option>`;
    $('#filter-matkul').innerHTML = `<option value="semua">Semua mata kuliah</option>` + opts + `<option value="lain">Lainnya</option>`;
  }

  function resetForm() {
    editingId = null;
    $('#task-form').reset();
    $('#form-heading').textContent = 'Tambah tugas';
    $('#submit-task').textContent = 'Simpan tugas';
    $('#cancel-edit').hidden = true;
  }

  function startEdit(t) {
    editingId = t.id;
    const f = $('#task-form');
    f.matkulId.value = t.matkulId;
    f.judul.value = t.judul;
    f.deadline.value = t.deadline;
    f.link.value = t.link || '';
    f.catatan.value = t.catatan || '';
    $('#form-heading').textContent = 'Edit tugas';
    $('#submit-task').textContent = 'Simpan perubahan';
    $('#cancel-edit').hidden = false;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    f.judul.focus({ preventScroll: true });
  }

  function onTaskSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const data = {
      matkulId: f.matkulId.value,
      judul: f.judul.value.trim(),
      deadline: f.deadline.value,
      link: f.link.value.trim(),
      catatan: f.catatan.value.trim(),
    };
    if (!data.judul || !data.deadline) return;

    if (editingId) {
      tasks = tasks.map(t => t.id === editingId ? { ...t, ...data } : t);
      toast('Tugas diperbarui');
    } else {
      tasks.push({ id: uid(), selesai: false, dibuat: Date.now(), ...data });
      toast('Tugas ditambahkan');
    }
    resetForm();
    saveTasks();
  }

  function onTaskAction(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.closest('[data-id]').dataset.id;
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    if (btn.dataset.action === 'toggle') {
      t.selesai = btn.checked;
      saveTasks();
      if (t.selesai) toast('Mantap, satu tugas selesai ✓');
    } else if (btn.dataset.action === 'step') {
      const n = Number(btn.dataset.step);
      const set = new Set(t.langkahSelesai || []);
      btn.checked ? set.add(n) : set.delete(n);
      t.langkahSelesai = [...set].sort((a, b) => a - b);
      saveTasks();
    } else if (btn.dataset.action === 'edit') {
      location.hash = '#tugas';
      startEdit(t);
    } else if (btn.dataset.action === 'delete') {
      if (confirm(`Hapus tugas "${t.judul}"?`)) {
        tasks = tasks.filter(x => x.id !== id);
        if (t.bawaan) store.set(KEY.hidden, [...new Set([...store.get(KEY.hidden, []), id])]);
        if (editingId === id) resetForm();
        saveTasks();
        toast('Tugas dihapus');
      }
    }
  }

  // ---------- Notifikasi ----------
  const notifSupported = () => 'Notification' in window;

  function renderNotifStatus() {
    const pill = $('#notif-status');
    const btn = $('#notif-toggle');
    pill.className = 'status-pill';
    if (!notifSupported()) {
      pill.textContent = 'Tidak didukung browser';
      btn.hidden = true;
      return;
    }
    if (Notification.permission === 'denied') {
      pill.textContent = 'Diblokir. Izinkan lewat pengaturan situs';
      pill.classList.add('blocked');
      btn.hidden = true;
      return;
    }
    const on = settings.notif && Notification.permission === 'granted';
    pill.textContent = on ? 'Aktif' : 'Nonaktif';
    pill.classList.toggle('on', on);
    btn.textContent = on ? 'Matikan' : 'Aktifkan';
    btn.hidden = false;
  }

  async function toggleNotif() {
    if (settings.notif && Notification.permission === 'granted') {
      settings.notif = false;
    } else {
      const p = await Notification.requestPermission();
      settings.notif = p === 'granted';
      if (settings.notif) toast('Notifikasi aktif');
    }
    saveSettings();
    renderNotifStatus();
  }

  async function showNotification(title, body, url, tag) {
    toast(`${title}: ${body}`);
    if (!notifSupported() || Notification.permission !== 'granted') return;
    const opts = { body, icon: 'icon.svg', badge: 'icon.svg', tag, data: { url } };
    try {
      const reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration();
      if (reg) { await reg.showNotification(title, opts); return; }
    } catch { /* fallback di bawah */ }
    try {
      const n = new Notification(title, opts);
      n.onclick = () => { window.focus(); if (url) window.open(url, '_blank', 'noopener'); n.close(); };
    } catch { /* mis. Android tanpa service worker */ }
  }

  function checkReminders(now) {
    if (!settings.notif || !notifSupported() || Notification.permission !== 'granted') return;
    const fired = store.get(KEY.fired, {});
    const fire = (key, ...args) => {
      if (fired[key]) return;
      fired[key] = now;
      showNotification(...args, key);
    };

    const lead = settings.leadMin * MIN;
    for (const c of MATKUL) {
      const o = occurrence(c, now);
      // Jangan kirim notifikasi kalau web baru dibuka setelah kelas berjalan > 5 menit.
      if (now >= o.start - lead && now < o.start + 5 * MIN) {
        const sisa = Math.round((o.start - now) / MIN);
        fire(`c:${c.id}:${o.start}`,
          sisa > 0 ? `Kelas ${sisa} menit lagi` : 'Kelas dimulai',
          `${c.nama} · ${jam(c)} via ${c.platform}`, c.link || location.href.split('#')[0]);
      }
    }

    if (settings.taskNotif) {
      for (const t of tasks) {
        if (t.selesai) continue;
        const dl = deadlineAbs(t);
        if (now >= dl) continue;
        // Kirim satu notifikasi untuk ambang terdekat yang sudah lewat (3 jam, lalu 1 hari).
        const step = [[3 * HOUR, '3 jam lagi'], [DAY, 'besok']].find(([ms]) => now >= dl - ms);
        if (step) {
          fire(`t:${t.id}:${t.deadline}:${step[0]}`,
            `Deadline ${step[1]}`,
            `${t.judul} (${course(t.matkulId).singkat || course(t.matkulId).nama}), ${fmtTime(dl)} WIB`,
            t.link || location.href.split('#')[0] + '#tugas');
          if (step[0] === 3 * HOUR) fired[`t:${t.id}:${t.deadline}:${DAY}`] = now;
        }
      }
    }

    // Bersihkan catatan notifikasi yang lebih lama dari 30 hari.
    for (const k in fired) if (now - fired[k] > 30 * DAY) delete fired[k];
    store.set(KEY.fired, fired);
  }

  // ---------- Ekspor kalender (.ics) ----------
  const icsDate = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
  function fold(line) {
    const out = [];
    while (line.length > 70) { out.push(line.slice(0, 70)); line = ' ' + line.slice(70); }
    out.push(line);
    return out.join('\r\n');
  }

  function buildIcs(name, events) {
    const stamp = icsDate(Date.now());
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kuliah S2 MTI//ID', 'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH', `X-WR-CALNAME:${icsText(name)}`, 'X-WR-TIMEZONE:Asia/Jakarta',
    ];
    for (const e of events) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${e.uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDate(e.start)}`,
        `DTEND:${icsDate(e.end)}`,
        e.rrule && `RRULE:${e.rrule}`,
        `SUMMARY:${icsText(e.title)}`,
        e.desc && `DESCRIPTION:${icsText(e.desc)}`,
        e.location && `LOCATION:${icsText(e.location)}`,
        e.url && `URL:${e.url}`,
        ...e.alarms.flatMap(a => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.title)}`, `TRIGGER:-${a}`, 'END:VALARM']),
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.filter(Boolean).map(fold).join('\r\n') + '\r\n';
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const semesterEnd = () => {
    const [y, m, d] = SEMESTER.akhir.split('-').map(Number);
    return fromWib(y, m - 1, d, 23, 59);
  };

  function exportClassesIcs() {
    const now = Date.now();
    const until = icsDate(semesterEnd());
    const events = MATKUL.map(c => {
      const o = occurrence(c, now);
      const desc = [
        `${SEMESTER.program} · ${c.kode} · ${c.sks} SKS`,
        c.dosen.length && `Dosen: ${c.dosen.join('; ')}`,
        c.link ? `${c.platform}: ${c.link}` : `${c.platform}${c.infoLink ? ` (${c.infoLink})` : ''}`,
        c.meetingId && `Meeting ID: ${c.meetingId}`,
        c.passcode && `Passcode: ${c.passcode}`,
      ].filter(Boolean).join('\n');
      return {
        uid: `${c.id}-${c.kode}@kuliah-mti`,
        start: o.start,
        end: o.end,
        rrule: `FREQ=WEEKLY;UNTIL=${until}`,
        title: `Kuliah: ${c.nama}`,
        desc,
        location: c.link || c.platform,
        url: c.link || '',
        alarms: [`PT${settings.leadMin}M`],
      };
    });
    download('jadwal-kuliah.ics', buildIcs('Kuliah S2 MTI', events), 'text/calendar;charset=utf-8');
    toast('File jadwal diunduh. Buka untuk menambahkan ke kalender.');
  }

  function exportTasksIcs() {
    const active = tasks.filter(t => !t.selesai && deadlineAbs(t) > Date.now());
    if (!active.length) { toast('Belum ada tugas aktif untuk diekspor'); return; }
    const events = active.map(t => {
      const c = course(t.matkulId);
      const dl = deadlineAbs(t);
      return {
        uid: `tugas-${t.id}@kuliah-mti`,
        start: dl - 30 * MIN,
        end: dl,
        title: `Deadline: ${t.judul} (${c.singkat || c.nama})`,
        desc: [t.catatan, t.link].filter(Boolean).join('\n'),
        url: t.link || '',
        alarms: ['P1D', 'PT3H'],
      };
    });
    download('deadline-tugas.ics', buildIcs('Deadline Tugas', events), 'text/calendar;charset=utf-8');
    toast(`${events.length} deadline diunduh sebagai file kalender`);
  }

  // ---------- Cadangan ----------
  function exportJson() {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`tugas-kuliah-${stamp}.json`, JSON.stringify({ versi: 1, tasks }, null, 2), 'application/json');
  }

  async function importJson(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const list = (Array.isArray(data) ? data : data.tasks || [])
        .filter(t => t && typeof t.judul === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.deadline))
        .map(t => ({ ...t, id: String(t.id || uid()), matkulId: String(t.matkulId || 'lain'), judul: t.judul, deadline: t.deadline,
          link: String(t.link || ''), catatan: String(t.catatan || ''), selesai: !!t.selesai, dibuat: t.dibuat || Date.now(),
          langkah: Array.isArray(t.langkah) ? t.langkah.map(String) : undefined,
          langkahSelesai: Array.isArray(t.langkahSelesai) ? t.langkahSelesai.filter(Number.isInteger) : [] }));
      if (!list.length) throw new Error('kosong');
      const ids = new Set(tasks.map(t => t.id));
      const baru = list.filter(t => !ids.has(t.id));
      tasks = tasks.concat(baru);
      saveTasks();
      toast(`${baru.length} tugas diimpor`);
    } catch {
      toast('File tidak valid');
    }
  }

  // ---------- Tema ----------
  function applyTheme(v) {
    if (v === 'light' || v === 'dark') document.documentElement.dataset.theme = v;
    else delete document.documentElement.dataset.theme;
    try { v === 'auto' ? localStorage.removeItem(KEY.theme) : localStorage.setItem(KEY.theme, v); } catch { /* abaikan */ }
  }

  // ---------- Navigasi tab ----------
  function showTab() {
    const id = location.hash.slice(1);
    const tab = TABS.includes(id) ? id : 'beranda';
    for (const v of $$('.view')) v.hidden = v.id !== tab;
    for (const a of $$('.tabs a')) {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    window.scrollTo(0, 0);
  }

  // ---------- Init ----------
  function init() {
    $('#semester-label').textContent = `${SEMESTER.program} · ${SEMESTER.nama}`;
    $('#semester-end').textContent = fmtDate(semesterEnd(), true);

    fillMatkulSelects();
    renderCourses();

    // Pengaturan
    $('#lead-select').value = String(settings.leadMin);
    $('#task-notif').checked = settings.taskNotif;
    let theme = 'auto';
    try { theme = localStorage.getItem(KEY.theme) || 'auto'; } catch { /* abaikan */ }
    $('#theme-select').value = theme;
    renderNotifStatus();

    // Event
    window.addEventListener('hashchange', showTab);
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-copy]');
      if (c) copy(c.dataset.copy);
      const add = e.target.closest('[data-add-task]');
      if (add) {
        resetForm();
        location.hash = '#tugas';
        $('#task-form').matkulId.value = add.dataset.addTask;
        $('#task-form').judul.focus();
      }
    });
    $('#task-form').addEventListener('submit', onTaskSubmit);
    $('#cancel-edit').addEventListener('click', resetForm);
    $('#task-list').addEventListener('click', onTaskAction);
    $('#task-list').addEventListener('change', onTaskAction);
    $('#upcoming-tasks').addEventListener('change', onTaskAction);
    $$('.segmented button').forEach(b => b.addEventListener('click', () => {
      filter.status = b.dataset.status;
      $$('.segmented button').forEach(x => x.classList.toggle('active', x === b));
      renderTasks(Date.now());
    }));
    $('#filter-matkul').addEventListener('change', e => { filter.matkul = e.target.value; renderTasks(Date.now()); });

    $('#notif-toggle').addEventListener('click', toggleNotif);
    $('#notif-test').addEventListener('click', async () => {
      if (notifSupported() && Notification.permission === 'default') await toggleNotif();
      const next = schedule(Date.now())[0];
      showNotification('Tes pengingat', `Kelas berikutnya: ${next.c.nama}, ${fmtDate(next.start)} ${fmtTime(next.start)}`, next.c.link, 'test');
    });
    $('#lead-select').addEventListener('change', e => { settings.leadMin = Number(e.target.value); saveSettings(); });
    $('#task-notif').addEventListener('change', e => { settings.taskNotif = e.target.checked; saveSettings(); });
    $('#ics-classes').addEventListener('click', exportClassesIcs);
    $('#ics-tasks').addEventListener('click', exportTasksIcs);
    $('#export-json').addEventListener('click', exportJson);
    $('#import-json').addEventListener('change', importJson);
    $('#theme-select').addEventListener('change', e => applyTheme(e.target.value));

    // Render awal + timer
    const slow = () => {
      const now = Date.now();
      renderToday(now);
      renderWeek(now);
      renderTaskViews(now);
      checkReminders(now);
    };
    const fast = () => {
      const now = Date.now();
      renderClock(now);
      renderHero(now);
    };
    showTab();
    fast();
    slow();
    setInterval(fast, 1000);
    setInterval(slow, 30 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { fast(); slow(); } });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode opsional */ });
    }
  }

  init();
})();
