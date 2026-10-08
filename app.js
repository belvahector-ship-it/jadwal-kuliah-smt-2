(() => {
  'use strict';

  // Halaman baca-saja: data hanya dari data.js. Pengunjung bisa membuka link
  // kelas/tugas dan menyalin link, tapi tidak bisa mencentang atau mengubah isi.

  const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
  const WIB = 7 * HOUR; // Asia/Jakarta, tanpa daylight saving
  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // ---------- Utilitas ----------
  const $ = (s, el = document) => el.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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
    : `<span class="btn btn-disabled ${cls}" data-join>${esc(c.infoLink || 'Link belum diisi')}</span>`;
  const copyLinkBtn = (c, cls = '') => c.link
    ? `<button type="button" class="btn btn-ghost ${cls}" data-copy="${esc(c.link)}">Salin link</button>` : '';

  // ---------- Toast & clipboard ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
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

  const tasks = typeof TUGAS !== 'undefined' ? TUGAS : [];
  const deadlineAbs = t => {
    const [date, time = '23:59'] = t.deadline.split('T');
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return fromWib(y, m - 1, d, hh, mm);
  };

  let heroKey = '';

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
        </div>`;
    }

    $('[data-countdown]').textContent = countdown(live ? o.end - now : o.start - now);
    // Tombol masuk berdenyut mulai 15 menit sebelum kelas.
    $('[data-join]').classList.toggle('pulse', (!!live || o.start - now <= 15 * MIN) && !!o.c.link);
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

  // Kartu mata kuliah, dengan tugasnya langsung di bawah detail kelas.
  function renderCourses(now) {
    const sorted = [...MATKUL].sort((a, b) => a.hari - b.hari);
    $('#courses').innerHTML = sorted.map(c => {
      const list = sortTasks(tasks.filter(t => t.matkulId === c.id), now);
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
          <dt>Dosen</dt><dd>${c.dosen.length
            ? `<ul>${c.dosen.map(d => `<li>${esc(d)}</li>`).join('')}</ul>`
            : '<span class="muted">Belum diisi</span>'}</dd>
          <dt>Kelas</dt><dd>${esc(c.platform)}</dd>
        </dl>
        <div class="course-actions">
          ${joinBtn(c, 'btn-sm')}
          ${copyLinkBtn(c, 'btn-sm')}
        </div>
        <div class="course-tasks">
          <h4>Tugas ${esc(c.singkat || c.nama)}${list.length ? ` <span class="count">${list.length}</span>` : ''}</h4>
          ${list.length
            ? list.map(t => taskHtml(t, now)).join('')
            : '<p class="muted none-task">Belum ada tugas.</p>'}
        </div>
      </article>`;
    }).join('');
  }

  // ---------- Tugas ----------
  function dueInfo(t, now) {
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

  function taskHtml(t, now) {
    const c = course(t.matkulId);
    const due = dueInfo(t, now);
    const dl = deadlineAbs(t);
    const steps = t.langkah || [];
    let given = '';
    if (t.mulai) {
      const [y, m, d] = t.mulai.split('-').map(Number);
      given = `<span>Diberikan ${fmtDate(fromWib(y, m - 1, d))}</span>`;
    }
    return `
      <div class="task ${dl < now ? 'done' : ''}" style="--c:${c.warna}">
        <div class="task-body">
          <span class="task-title">${esc(t.judul)}</span>
          <div class="task-meta">
            ${given}
            <span>Deadline ${fmtDate(dl)}, ${fmtTime(dl)}</span>
            <span class="tag ${due.cls}">${due.label}</span>
          </div>
          ${t.catatan ? `<div class="task-note">${esc(t.catatan)}</div>` : ''}
          ${steps.length ? `
            <div class="steps">
              <h4>Langkah pengerjaan</h4>
              <ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
            </div>` : ''}
          ${t.link ? `
            <div class="task-actions">
              <a class="btn btn-ghost btn-sm" href="${esc(t.link)}" target="_blank" rel="noopener">${esc(t.linkLabel || 'Buka link')} ↗</a>
            </div>` : ''}
        </div>
      </div>`;
  }

  // Tugas aktif dulu (deadline terdekat), lalu yang sudah lewat (terbaru dulu).
  const sortTasks = (list, now) => [...list].sort((a, b) => {
    const da = deadlineAbs(a), db = deadlineAbs(b);
    const pa = da < now, pb = db < now;
    return (pa - pb) || (pa ? db - da : da - db);
  });

  // ---------- Init ----------
  function init() {
    $('#semester-label').textContent = `${SEMESTER.program} · ${SEMESTER.nama}`;

    document.addEventListener('click', e => {
      const c = e.target.closest('[data-copy]');
      if (c) copy(c.dataset.copy);
    });

    const slow = () => {
      const now = Date.now();
      renderToday(now);
      renderCourses(now);
      renderWeek(now);
    };
    const fast = () => {
      const now = Date.now();
      renderClock(now);
      renderHero(now);
    };
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
