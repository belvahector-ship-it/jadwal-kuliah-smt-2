(() => {
  'use strict';

  // Halaman baca-saja: jadwal & tugas hanya dari data.js. Pengunjung bisa
  // membuka link, menyalin link, mengunduh kalender, dan mengatur notifikasi
  // di browsernya sendiri, tapi tidak bisa mencentang atau mengubah isi.

  const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
  const WIB = 7 * HOUR; // Asia/Jakarta, tanpa daylight saving
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const HARI3 = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus',
    'September', 'Oktober', 'November', 'Desember'];
  const CAL_YEAR = 2026;
  const KEY = { settings: 'kuliah.settings', fired: 'kuliah.fired', theme: 'kuliah.theme' };
  const TABS = ['beranda', 'jadwal', 'kalender', 'tugas', 'pengingat'];

  // ---------- Utilitas ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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
  // "Nomor hari" = jumlah hari sejak 1 Jan 1970 menurut kalender WIB.
  const dayNumber = t => { const w = wib(t); return Math.floor(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) / DAY); };
  const isoDay = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
  const weekday = day => (day + 4) % 7; // 1 Jan 1970 = Kamis
  const dayStart = (day, time = '00:00') => { const [h, m] = hm(time); return day * DAY + h * HOUR + m * MIN - WIB; };
  const fmtTime = t => { const w = wib(t); return `${pad(w.getUTCHours())}.${pad(w.getUTCMinutes())}`; };
  const fmtDate = (t, year = false) => {
    const w = wib(t);
    return `${HARI[w.getUTCDay()]}, ${w.getUTCDate()} ${BULAN[w.getUTCMonth()]}${year ? ' ' + w.getUTCFullYear() : ''}`;
  };
  const jam = c => `${c.mulai.replace(':', '.')}–${c.selesai.replace(':', '.')}`;

  // Tombol masuk kelas; kalau link tidak dicantumkan, tampilkan keterangan saja.
  const joinBtn = (c, cls = '', label = `Masuk ${esc(c.platform)}`) => c.link
    ? `<a class="btn btn-primary ${cls}" data-join href="${esc(c.link)}" target="_blank" rel="noopener">${label}</a>`
    : `<span class="btn btn-disabled ${cls}" data-join>${esc(c.infoLink || 'Link belum diisi')}</span>`;
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

  // ---------- Pertemuan ----------
  // Pertemuan 1 tiap mata kuliah = hari kuliahnya yang pertama pada/sesudah SEMESTER.mulai.
  const SEM_START = isoDay(SEMESTER.mulai);
  const TOTAL = SEMESTER.pertemuan || 16;
  const firstDay = c => SEM_START + ((c.hari - weekday(SEM_START)) + 7) % 7;
  function meetingNo(c, day) {
    const diff = day - firstDay(c);
    if (diff < 0 || diff % 7) return 0;
    const n = diff / 7 + 1;
    return n <= TOTAL ? n : 0;
  }
  const meetingLabel = n => n ? `Pertemuan ${n}` : '';

  // Pertemuan berikutnya (atau yang sedang berlangsung) untuk satu mata kuliah.
  function occurrence(c, now) {
    const w = wib(now);
    const diff = (c.hari - w.getUTCDay() + 7) % 7;
    const [y, mo, d] = [w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() + diff];
    const [sh, sm] = hm(c.mulai), [eh, em] = hm(c.selesai);
    let start = fromWib(y, mo, d, sh, sm);
    let end = fromWib(y, mo, d, eh, em);
    if (end <= now) { start += 7 * DAY; end += 7 * DAY; }
    return { c, start, end, n: meetingNo(c, dayNumber(start)) };
  }
  const schedule = now => MATKUL.map(c => occurrence(c, now)).sort((a, b) => a.start - b.start);

  const byId = Object.fromEntries(MATKUL.map(c => [c.id, c]));
  const LAINNYA = { id: 'lain', nama: 'Lainnya', warna: '#7a87a0' };
  const course = id => byId[id] || LAINNYA;
  const byDay = [...MATKUL].sort((a, b) => a.hari - b.hari || a.mulai.localeCompare(b.mulai));

  // ---------- Tugas ----------
  const tasks = typeof TUGAS !== 'undefined' ? TUGAS : [];
  const hasDeadline = t => !!t.deadline;
  const deadlineAbs = t => {
    const [date, time = '23:59'] = t.deadline.split('T');
    return dayStart(isoDay(date), time);
  };
  const isPast = (t, now) => hasDeadline(t) && deadlineAbs(t) < now;
  // Link tugas: `links: [{ label, url }]`, atau `link` + `linkLabel` untuk satu link saja.
  const taskLinks = t => t.links || (t.link ? [{ label: t.linkLabel || 'Buka link', url: t.link }] : []);

  // Urutan: deadline terdekat, lalu yang deadline-nya menyusul, lalu yang sudah lewat.
  const sortTasks = (list, now) => [...list].sort((a, b) => {
    const rank = t => isPast(t, now) ? 2 : hasDeadline(t) ? 0 : 1;
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 1) return a.mulai < b.mulai ? -1 : 1;
    return ra === 2 ? deadlineAbs(b) - deadlineAbs(a) : deadlineAbs(a) - deadlineAbs(b);
  });

  // ---------- State ----------
  let settings = { notif: false, leadMin: 15, ...store.get(KEY.settings, {}) };
  let heroKey = '';
  let calMonth = 0;

  const saveSettings = () => store.set(KEY.settings, settings);

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
    toast('Link disalin');
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
          <span class="pill ${live ? 'live' : ''}">${live ? 'Sedang berlangsung' : 'Kelas berikutnya'}${o.n ? ` · ${meetingLabel(o.n)}` : ''}</span>
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
      const n = meetingNo(c, dayNumber(now));
      let status;
      if (!isToday) status = '<span class="tag ok">Selesai</span>';
      else if (o.start <= now) status = '<span class="tag live">Berlangsung</span>';
      else status = `<span class="tag">${o.start - now < HOUR ? Math.ceil((o.start - now) / MIN) + ' menit lagi' : 'Nanti'}</span>`;
      return `
        <div class="card class-row" style="--c:${c.warna}">
          <div class="class-time">${c.mulai.replace(':', '.')}<small>${c.selesai.replace(':', '.')}</small></div>
          <div class="class-body">
            <strong>${esc(c.nama)}</strong>
            <small>${n ? `${meetingLabel(n)} · ` : ''}${esc(c.platform)} · ${status}</small>
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

  function renderCourses(now) {
    $('#courses').innerHTML = byDay.map(c => {
      const o = occurrence(c, now);
      const active = tasks.filter(t => t.matkulId === c.id && !isPast(t, now)).length;
      return `
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
          ${o.n ? `<dt>Berikutnya</dt><dd>${meetingLabel(o.n)} · ${fmtDate(o.start)}</dd>` : ''}
          <dt>Dosen</dt><dd>${c.dosen.length
            ? `<ul>${c.dosen.map(d => `<li>${esc(d)}</li>`).join('')}</ul>`
            : '<span class="muted">Belum diisi</span>'}</dd>
          <dt>Kelas</dt><dd>${esc(c.platform)}</dd>
          <dt>Tugas</dt><dd>${active ? `<a class="link" href="#tugas">${active} tugas aktif</a>` : '<span class="muted">Tidak ada tugas aktif</span>'}</dd>
        </dl>
        <div class="course-actions">
          ${joinBtn(c, 'btn-sm')}
          ${copyLinkBtn(c, 'btn-sm')}
        </div>
      </article>`;
    }).join('');
  }

  // ---------- Kalender ----------
  // Semua pertemuan pada satu nomor hari (bisa lebih dari satu mata kuliah).
  const meetingsOn = day => MATKUL
    .map(c => ({ c, n: meetingNo(c, day) }))
    .filter(m => m.n)
    .sort((a, b) => a.c.mulai.localeCompare(b.c.mulai));

  function renderCalendar(now) {
    const todayN = dayNumber(now);
    const first = Date.UTC(CAL_YEAR, calMonth, 1) / DAY;
    const daysIn = new Date(Date.UTC(CAL_YEAR, calMonth + 1, 0)).getUTCDate();
    const lead = (weekday(first) + 6) % 7; // minggu dimulai Senin

    $('#cal-title').textContent = `${BULAN_PANJANG[calMonth]} ${CAL_YEAR}`;
    $('#cal-prev').disabled = calMonth === 0;
    $('#cal-next').disabled = calMonth === 11;

    $$('#month-chips button').forEach((b, i) => b.classList.toggle('active', i === calMonth));

    const cells = [...[1, 2, 3, 4, 5, 6, 0].map(d => `<div class="cal-dow">${HARI3[d]}</div>`)];
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-day blank"></div>');
    const rows = [];
    for (let d = 1; d <= daysIn; d++) {
      const day = first + d - 1;
      const ms = meetingsOn(day);
      const cls = ['cal-day', ms.length && 'has', day === todayN && 'today', day < todayN && 'past',
        weekday(day) === 0 && 'sun'].filter(Boolean).join(' ');
      const tip = ms.map(m => `${m.c.nama} · ${meetingLabel(m.n)}`).join('\n');
      cells.push(`
        <div class="${cls}" ${ms.length ? `style="--c:${ms[0].c.warna}" title="${esc(tip)}"` : ''}>
          <span class="num">${d}</span>
          ${ms.map(m => `<span class="ev" style="--c:${m.c.warna}"><b>${esc(m.c.inisial || m.c.singkat || m.c.nama)}</b><i>P${m.n}</i></span>`).join('')}
        </div>`);
      for (const m of ms) rows.push({ ...m, day });
    }
    $('#cal-grid').innerHTML = cells.join('');

    $('#cal-list-title').textContent = `Pertemuan ${BULAN_PANJANG[calMonth]} ${CAL_YEAR}`;
    $('#cal-list').innerHTML = rows.length ? rows.map(({ c, n, day }) => {
      const start = dayStart(day, c.mulai);
      const status = day === todayN ? '<span class="tag live">Hari ini</span>'
        : day < todayN ? '<span class="tag ok">Selesai</span>' : '';
      return `
        <div class="card class-row meet-row ${day < todayN ? 'past' : ''}" style="--c:${c.warna}">
          <div class="meet-date"><b>${wib(start).getUTCDate()}</b><small>${HARI3[weekday(day)]}</small></div>
          <div class="class-body">
            <strong>${esc(c.nama)}</strong>
            <small>${meetingLabel(n)} dari ${TOTAL} · ${jam(c)} WIB · ${esc(c.platform)}</small>
          </div>
          ${status}
        </div>`;
    }).join('') : `<div class="empty">Tidak ada perkuliahan di bulan ${BULAN_PANJANG[calMonth]}.</div>`;
  }

  function setupCalendar(now) {
    const w = wib(now);
    calMonth = w.getUTCFullYear() === CAL_YEAR ? w.getUTCMonth() : w.getUTCFullYear() > CAL_YEAR ? 11 : 0;

    // Bulan yang punya perkuliahan diberi titik.
    const monthHas = m => {
      const first = Date.UTC(CAL_YEAR, m, 1) / DAY;
      const n = new Date(Date.UTC(CAL_YEAR, m + 1, 0)).getUTCDate();
      for (let d = 0; d < n; d++) if (meetingsOn(first + d).length) return true;
      return false;
    };
    $('#month-chips').innerHTML = BULAN.map((b, i) =>
      `<button type="button" data-month="${i}" class="${monthHas(i) ? 'has' : ''}">${b}</button>`).join('');

    $('#cal-legend').innerHTML = byDay.map(c =>
      `<span class="legend" style="--c:${c.warna}"><i></i><b>${esc(c.inisial || c.singkat || c.nama)}</b> ${esc(c.nama)}</span>`).join('');

    const lastDay = Math.max(...MATKUL.map(c => firstDay(c) + (TOTAL - 1) * 7));
    $('#cal-note').textContent = `Pertemuan 1 mulai ${fmtDate(dayStart(SEM_START), true)} · ${TOTAL} pertemuan per mata kuliah, `
      + `terakhir ${fmtDate(dayStart(lastDay), true)}`;

    $('#month-chips').addEventListener('click', e => {
      const b = e.target.closest('[data-month]');
      if (b) { calMonth = Number(b.dataset.month); renderCalendar(Date.now()); }
    });
    $('#cal-prev').addEventListener('click', () => { if (calMonth > 0) { calMonth--; renderCalendar(Date.now()); } });
    $('#cal-next').addEventListener('click', () => { if (calMonth < 11) { calMonth++; renderCalendar(Date.now()); } });
  }

  // ---------- Tugas ----------
  function dueInfo(t, now) {
    if (!hasDeadline(t)) return { label: 'Deadline menyusul', cls: '' };
    const dl = deadlineAbs(t);
    const diff = dl - now;
    if (diff < 0) return { label: 'Deadline lewat', cls: 'ok' };
    if (diff < HOUR) return { label: `${Math.max(1, Math.ceil(diff / MIN))} menit lagi`, cls: 'danger' };
    const days = dayNumber(dl) - dayNumber(now);
    if (days === 0) return { label: `Hari ini · ${Math.floor(diff / HOUR)} jam lagi`, cls: 'danger' };
    if (days === 1) return { label: 'Besok', cls: 'warn' };
    if (days <= 3) return { label: `${days} hari lagi`, cls: 'warn' };
    return { label: `${days} hari lagi`, cls: '' };
  }

  function taskHtml(t, now, compact = false) {
    const c = course(t.matkulId);
    const due = dueInfo(t, now);
    const steps = t.langkah || [];
    let given = '';
    if (t.mulai) {
      const day = isoDay(t.mulai);
      const n = meetingNo(c, day);
      given = `<span>Diberikan ${fmtDate(dayStart(day))}${n ? ` · ${meetingLabel(n).toLowerCase()}` : ''}</span>`;
    }
    const deadline = hasDeadline(t)
      ? `<span>Deadline ${fmtDate(deadlineAbs(t))}, ${fmtTime(deadlineAbs(t))}</span>` : '';
    return `
      <div class="task ${compact ? 'card' : ''} ${isPast(t, now) ? 'done' : ''}" style="--c:${c.warna}">
        <div class="task-body">
          <span class="task-title">${esc(t.judul)}</span>
          <div class="task-meta">
            ${compact ? `<span class="chip" style="--c:${c.warna}">${esc(c.singkat || c.nama)}</span>` : given}
            ${deadline}
            <span class="tag ${due.cls}">${due.label}</span>
          </div>
          ${!compact && t.catatan ? `<div class="task-note">${esc(t.catatan)}</div>` : ''}
          ${!compact && steps.length ? `
            <div class="steps">
              <h4>Yang harus dikerjakan</h4>
              <ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            </div>` : ''}
          ${!compact && taskLinks(t).length ? `
            <div class="task-actions">
              ${taskLinks(t).map((l, i) => `<a class="btn ${i ? 'btn-ghost' : 'btn-primary'} btn-sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}
            </div>` : ''}
        </div>
      </div>`;
  }

  // Tab Tugas: satu kelompok per mata kuliah, tugasnya di bawah nama mata kuliah.
  function renderTaskGroups(now) {
    $('#task-groups').innerHTML = byDay.map(c => {
      const list = sortTasks(tasks.filter(t => t.matkulId === c.id), now);
      return `
        <section class="card task-group" style="--c:${c.warna}">
          <div class="group-head">
            <div>
              <h2>${esc(c.nama)}</h2>
              <small>${HARI[c.hari]}, ${jam(c)} WIB · ${esc(c.kode)}</small>
            </div>
            <span class="tag">${list.length ? `${list.length} tugas` : 'Belum ada tugas'}</span>
          </div>
          ${list.map(t => taskHtml(t, now)).join('')}
        </section>`;
    }).join('');
  }

  function renderUpcoming(now) {
    const active = sortTasks(tasks.filter(t => !isPast(t, now)), now).slice(0, 4);
    $('#upcoming-tasks').innerHTML = active.length
      ? active.map(t => taskHtml(t, now, true)).join('')
      : '<div class="empty">Tidak ada tugas aktif. 🎉</div>';

    const urgent = tasks.filter(t => hasDeadline(t) && !isPast(t, now) && deadlineAbs(t) - now < 3 * DAY).length;
    const badge = $('#task-badge');
    badge.hidden = !urgent;
    badge.textContent = urgent;
    badge.title = `${urgent} tugas mendekati deadline`;
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
          `${c.nama}${o.n ? ` (${meetingLabel(o.n)})` : ''} · ${jam(c)} via ${c.platform}`,
          c.link || location.href.split('#')[0]);
      }
    }

    for (const t of tasks) {
      if (!hasDeadline(t)) continue;
      const dl = deadlineAbs(t);
      if (now >= dl) continue;
      // Kirim satu notifikasi untuk ambang terdekat yang sudah lewat (3 jam, lalu 1 hari).
      const step = [[3 * HOUR, '3 jam lagi'], [DAY, 'besok']].find(([ms]) => now >= dl - ms);
      if (step) {
        const c = course(t.matkulId);
        fire(`t:${t.id}:${t.deadline}:${step[0]}`,
          `Deadline ${step[1]}`,
          `${t.judul} (${c.singkat || c.nama}), ${fmtTime(dl)} WIB`,
          location.href.split('#')[0] + '#tugas');
        if (step[0] === 3 * HOUR) fired[`t:${t.id}:${t.deadline}:${DAY}`] = now;
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

  function exportClassesIcs() {
    const events = MATKUL.map(c => {
      const desc = [
        `${SEMESTER.program} · ${c.kode} · ${c.sks} SKS`,
        c.dosen.length && `Dosen: ${c.dosen.join('; ')}`,
        c.link ? `${c.platform}: ${c.link}` : `${c.platform}${c.infoLink ? ` (${c.infoLink})` : ''}`,
      ].filter(Boolean).join('\n');
      return {
        uid: `${c.id}-${c.kode}-${SEMESTER.mulai}@kuliah-mti`,
        start: dayStart(firstDay(c), c.mulai),
        end: dayStart(firstDay(c), c.selesai),
        rrule: `FREQ=WEEKLY;COUNT=${TOTAL}`,
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
    const active = tasks.filter(t => hasDeadline(t) && deadlineAbs(t) > Date.now());
    if (!active.length) { toast('Belum ada deadline tugas yang bisa diekspor'); return; }
    const events = active.map(t => {
      const c = course(t.matkulId);
      const dl = deadlineAbs(t);
      return {
        uid: `tugas-${t.id}@kuliah-mti`,
        start: dl - 30 * MIN,
        end: dl,
        title: `Deadline: ${t.judul} (${c.singkat || c.nama})`,
        desc: [t.catatan, ...taskLinks(t).map(l => `${l.label}: ${l.url}`)].filter(Boolean).join('\n'),
        url: taskLinks(t)[0]?.url || '',
        alarms: ['P1D', 'PT3H'],
      };
    });
    download('deadline-tugas.ics', buildIcs('Deadline Tugas', events), 'text/calendar;charset=utf-8');
    toast(`${events.length} deadline diunduh sebagai file kalender`);
  }

  // ---------- Tema ----------
  function applyTheme(v) {
    // Termux = bawaan; 'auto' mengikuti terang/gelap perangkat.
    if (v === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = v;
    $('meta[name="theme-color"]').content = v === 'termux' ? '#000000' : '#13305c';
    try { v === 'termux' ? localStorage.removeItem(KEY.theme) : localStorage.setItem(KEY.theme, v); } catch { /* abaikan */ }
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
    const now0 = Date.now();
    $('#semester-label').textContent = `${SEMESTER.program} · ${SEMESTER.nama}`;
    $('#ics-count').textContent = TOTAL;
    $('#ics-start').textContent = fmtDate(dayStart(SEM_START), true);

    setupCalendar(now0);

    // Pengaturan (hanya tersimpan di browser pengunjung sendiri)
    $('#lead-select').value = String(settings.leadMin);
    let theme = 'termux';
    try { theme = localStorage.getItem(KEY.theme) || 'termux'; } catch { /* abaikan */ }
    $('#theme-select').value = theme;
    renderNotifStatus();

    // Event
    window.addEventListener('hashchange', showTab);
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-copy]');
      if (c) copy(c.dataset.copy);
    });
    $('#notif-toggle').addEventListener('click', toggleNotif);
    $('#notif-test').addEventListener('click', async () => {
      if (notifSupported() && Notification.permission === 'default') await toggleNotif();
      const next = schedule(Date.now())[0];
      showNotification('Tes pengingat', `Kelas berikutnya: ${next.c.nama}, ${fmtDate(next.start)} ${fmtTime(next.start)}`, next.c.link, 'test');
    });
    $('#lead-select').addEventListener('change', e => { settings.leadMin = Number(e.target.value); saveSettings(); });
    $('#ics-classes').addEventListener('click', exportClassesIcs);
    $('#ics-tasks').addEventListener('click', exportTasksIcs);
    $('#theme-select').addEventListener('change', e => applyTheme(e.target.value));

    // Render awal + timer
    const slow = () => {
      const now = Date.now();
      renderToday(now);
      renderWeek(now);
      renderCourses(now);
      renderCalendar(now);
      renderTaskGroups(now);
      renderUpcoming(now);
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
