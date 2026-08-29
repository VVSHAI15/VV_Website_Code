/* ============================================================
   Scoring Stage — app scaffold (Chunk 1)
   • loads the JSON data layer (single source of truth)
   • builds the hero waveform motif
   • nav scroll state
   Sections (reel, credits, player, contact) are wired in later chunks.
   ============================================================ */

const DATA = { site: null, tracks: [], credits: [], press: [], peaks: {} };

async function loadData() {
    try {
        const [site, tracks, credits, press, peaks] = await Promise.all([
            fetch('data/site.json').then(r => r.json()),
            fetch('data/tracks.json').then(r => r.json()),
            fetch('data/credits.json').then(r => r.json()),
            fetch('data/press.json').then(r => r.json()),
            fetch('data/peaks.json').then(r => r.json()).catch(() => ({})),
        ]);
        DATA.site = site; DATA.tracks = tracks; DATA.credits = credits; DATA.press = press; DATA.peaks = peaks;
        renderFooterSocial();
        Player.init(tracks);
        Reel.init(tracks, peaks);
    } catch (err) {
        console.warn('[data] failed to load JSON layer:', err);
    }
}

function renderFooterSocial() {
    const wrap = document.getElementById('footer-social');
    if (!wrap || !DATA.site) return;
    wrap.innerHTML = DATA.site.social.map(s =>
        `<a href="${s.href}" target="_blank" rel="noopener noreferrer">${s.label}</a>`
    ).join('');
}

/* Hero waveform — procedural bars, seeded so it reads like a real signal */
function buildHeroWave() {
    const host = document.getElementById('hero-wave');
    if (!host) return;
    const COUNT = 96;
    const W = 1200, H = 100, mid = H / 2;
    const gap = W / COUNT;
    const bw = gap * 0.42;
    let bars = '';
    for (let i = 0; i < COUNT; i++) {
        // smooth pseudo-envelope so it looks musical, not random noise
        const env = Math.sin((i / COUNT) * Math.PI) ** 0.7;
        const h = Math.max(3, env * (H * 0.9) * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7))));
        const x = i * gap + (gap - bw) / 2;
        const delay = (i / COUNT) * 1.8;
        bars += `<rect class="bar" x="${x.toFixed(1)}" y="${(mid - h / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${(bw/2).toFixed(1)}" fill="var(--text-faint)" style="animation-delay:${delay.toFixed(2)}s"></rect>`;
    }
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

function initNavScroll() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const update = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    window.addEventListener('scroll', update, { passive: true });
    update();
}

function initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const links = document.querySelector('.nav__links');
    if (!toggle || !links) return;

    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    const ul = document.createElement('ul');
    links.querySelectorAll('a').forEach(a => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = a.getAttribute('href');
        link.textContent = a.textContent;
        li.appendChild(link);
        ul.appendChild(li);
    });
    menu.appendChild(ul);
    document.body.appendChild(menu);

    const close = () => { menu.classList.remove('is-open'); toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
    const open  = () => { menu.classList.add('is-open'); toggle.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; };
    toggle.addEventListener('click', () => menu.classList.contains('is-open') ? close() : open());
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ============================================================
   Player — single shared audio engine + docked UI
   Native <audio>, preload="none", loads on play (mobile-friendly).
   The reel tracklist (later chunk) drives this same engine.
   ============================================================ */
const Player = {
    audio: null, tracks: [], i: -1, ready: false,
    els: {}, ctx: null, analyser: null, freq: null, bars: [], raf: null,

    init(tracks) {
        if (this.ready) { this.tracks = tracks; return; }
        this.tracks = tracks;
        this.audio = new Audio();
        this.audio.preload = 'none';

        const $ = id => document.getElementById(id);
        this.els = {
            player: $('player'), toggle: $('player-toggle'),
            title: $('player-title'), project: $('player-project'),
            cur: $('player-cur'), dur: $('player-dur'),
            track: $('player-track'), fill: $('player-fill'), knob: $('player-knob'),
            prev: $('player-prev'), next: $('player-next'), close: $('player-close'),
        };
        this.bars = Array.from(document.querySelectorAll('#hero-wave rect.bar'));

        // Controls
        this.els.toggle.addEventListener('click', () => this.toggle());
        this.els.next.addEventListener('click', () => this.next());
        this.els.prev.addEventListener('click', () => this.prev());
        this.els.close.addEventListener('click', () => this.stop());
        const heroPlay = document.getElementById('hero-play');
        if (heroPlay) heroPlay.addEventListener('click', () => this.playIndex(0));

        // Audio events
        this.audio.addEventListener('play',  () => this.setState('playing'));
        this.audio.addEventListener('pause', () => this.setState('paused'));
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('timeupdate', () => this.onTime());
        this.audio.addEventListener('loadedmetadata', () => {
            if (this.pendingSeek != null && this.audio.duration) {
                this.audio.currentTime = this.pendingSeek * this.audio.duration;
                this.pendingSeek = null;
            }
            this.onTime();
        });

        this.initScrub();
        this.initKeys();
        this.ready = true;
    },

    show() {
        if (this.els.player.hidden) {
            this.els.player.hidden = false;
            document.body.classList.add('has-player');
            requestAnimationFrame(() => this.els.player.classList.add('is-visible'));
        }
    },

    load(i, autoplay = true) {
        if (i < 0 || i >= this.tracks.length) return;
        this.i = i;
        const t = this.tracks[i];
        this.audio.src = encodeURI(t.src);
        this.els.title.textContent = t.title || '—';
        this.els.project.textContent = t.project || '';
        this.els.dur.textContent = t.duration || '0:00';
        this.els.fill.style.width = '0%';
        this.els.knob.style.left = '0%';
        document.dispatchEvent(new CustomEvent('player:trackchange', { detail: { index: i } }));
        this.show();
        if (autoplay) this.play();
    },

    playIndex(i) { (i === this.i) ? this.toggle() : this.load(i, true); },

    /* Play track i and seek to fraction 0..1 — used by the row waveforms.
       If the track isn't loaded yet, the seek is applied once metadata arrives. */
    playIndexAt(i, frac) {
        if (i === this.i) {
            if (this.audio.duration) this.audio.currentTime = frac * this.audio.duration;
            if (this.audio.paused) this.play();
        } else {
            this.pendingSeek = frac;
            this.load(i, true);
        }
    },
    pendingSeek: null,

    play() {
        this.ensureGraph();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        this.audio.play().catch(() => {});
    },
    pause() { this.audio.pause(); },
    toggle() {
        if (this.i === -1) return this.load(0, true);
        this.audio.paused ? this.play() : this.pause();
    },
    next() { this.load((this.i + 1) % this.tracks.length, true); },
    prev() {
        if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
        this.load((this.i - 1 + this.tracks.length) % this.tracks.length, true);
    },
    stop() {
        this.pause();
        this.els.player.classList.remove('is-visible');
        this.setState('paused');
    },

    setState(s) {
        this.els.player.dataset.state = s;
        this.els.toggle.setAttribute('aria-label', s === 'playing' ? 'Pause' : 'Play');
        document.dispatchEvent(new CustomEvent('player:state', { detail: { state: s, index: this.i } }));
        if (s === 'playing') this.startViz(); else this.stopViz();
    },

    onTime() {
        const d = this.audio.duration || 0;
        const c = this.audio.currentTime || 0;
        const pct = d ? (c / d) * 100 : 0;
        this.els.fill.style.width = pct + '%';
        this.els.knob.style.left = pct + '%';
        this.els.cur.textContent = fmt(c);
        if (d && isFinite(d)) this.els.dur.textContent = fmt(d);
        this.els.track.setAttribute('aria-valuenow', Math.round(pct));
    },

    initScrub() {
        const seek = (clientX) => {
            const r = this.els.track.getBoundingClientRect();
            const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
            if (this.audio.duration) this.audio.currentTime = pct * this.audio.duration;
        };
        let dragging = false;
        this.els.track.addEventListener('pointerdown', e => { dragging = true; seek(e.clientX); try { this.els.track.setPointerCapture(e.pointerId); } catch {} });
        this.els.track.addEventListener('pointermove', e => { if (dragging) seek(e.clientX); });
        this.els.track.addEventListener('pointerup', () => { dragging = false; });
        this.els.track.addEventListener('keydown', e => {
            if (!this.audio.duration) return;
            if (e.key === 'ArrowRight') { this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 5); e.preventDefault(); }
            if (e.key === 'ArrowLeft')  { this.audio.currentTime = Math.max(0, this.audio.currentTime - 5); e.preventDefault(); }
        });
    },

    initKeys() {
        document.addEventListener('keydown', e => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
            if (e.code === 'Space' && this.i !== -1) { e.preventDefault(); this.toggle(); }
        });
    },

    /* Web Audio graph → drives the hero waveform when playing */
    ensureGraph() {
        if (this.ctx || !this.bars.length) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            const src = this.ctx.createMediaElementSource(this.audio);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            this.freq = new Uint8Array(this.analyser.frequencyBinCount);
            src.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);
        } catch { this.ctx = null; }
    },
    startViz() {
        if (!this.analyser || !this.bars.length) return;
        const host = document.getElementById('hero-wave');
        if (host) host.classList.add('is-live');
        const loop = () => {
            this.analyser.getByteFrequencyData(this.freq);
            const n = this.bars.length, bins = this.freq.length;
            for (let b = 0; b < n; b++) {
                const v = this.freq[Math.floor((b / n) * bins)] / 255;
                this.bars[b].style.transform = `scaleY(${Math.max(0.08, v)})`;
                this.bars[b].style.opacity = 0.4 + v * 0.6;
            }
            this.raf = requestAnimationFrame(loop);
        };
        cancelAnimationFrame(this.raf); loop();
    },
    stopViz() {
        cancelAnimationFrame(this.raf);
        const host = document.getElementById('hero-wave');
        if (host) host.classList.remove('is-live');
        this.bars.forEach(bar => { bar.style.transform = ''; bar.style.opacity = ''; });
    },
};

function fmt(s) {
    s = Math.floor(s || 0);
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
}

/* Draw a centered bar waveform onto a canvas.
   `progress` 0..1 fills bars up to that point in amber. */
function drawWave(canvas, peaks, progress, colPlayed, colBase) {
    if (!canvas || !peaks || !peaks.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const n = peaks.length;
    const gap = w / n < 3 ? 1 : 1.5;
    const bw = Math.max(1, (w / n) - gap);
    const mid = h / 2;
    const cut = progress * w;

    for (let i = 0; i < n; i++) {
        const x = i * (w / n);
        const bh = Math.max(2, peaks[i] * (h * 0.92));
        ctx.fillStyle = (x < cut) ? colPlayed : colBase;
        ctx.fillRect(x, mid - bh / 2, bw, bh);
    }
}

/* ============================================================
   Reel — track list + featured waveform, synced to Player
   ============================================================ */
const Reel = {
    tracks: [], peaks: {}, els: {}, curPeaks: null, curKey: null,
    AMBER: '#e2873a', BASE: 'rgba(236,231,222,0.16)', BASE_DIM: 'rgba(236,231,222,0.10)',

    init(tracks, peaks) {
        this.tracks = tracks; this.peaks = peaks;
        const $ = id => document.getElementById(id);
        this.els = {
            list: $('tracklist'), canvas: $('reel-canvas'), filters: $('reel-filters'),
            npTitle: $('reel-np-title'), npProject: $('reel-np-project'), npLabel: $('reel-np-label'),
            cur: $('reel-cur'), dur: $('reel-dur'),
        };
        if (!this.els.list) return;

        this.renderRows();
        this.renderFilters();
        this.bind();

        // Idle preview: draw the first track's shape, faintly
        const first = tracks[0];
        if (first && peaks[first.src]) {
            this.curPeaks = peaks[first.src]; this.curKey = first.src;
            drawWave(this.els.canvas, this.curPeaks, 0, this.BASE, this.BASE_DIM);
        }
        window.addEventListener('resize', () => this.redraw(), { passive: true });
    },

    renderRows() {
        this.els.list.innerHTML = this.tracks.map((t, i) => `
            <li class="track" data-i="${i}" data-genre="${escapeHtml(t.genre || '')}" role="button" tabindex="0" aria-label="Play ${escapeHtml(t.title)}">
                <span class="track__num">${String(i + 1).padStart(2, '0')}</span>
                <span class="track__name">
                    <span class="track__title">${escapeHtml(t.title)}</span>
                    <span class="track__project">${escapeHtml(t.project || t.genre || '')}</span>
                </span>
                <canvas class="track__spark" aria-label="Seek ${escapeHtml(t.title)}"></canvas>
                <span class="track__end">
                    <span class="track__eq" aria-hidden="true"><i></i><i></i><i></i></span>
                    <span class="track__dur">${t.duration || '—'}</span>
                </span>
            </li>`).join('');

        // Draw static sparklines from peaks
        this.els.list.querySelectorAll('.track').forEach(row => {
            const i = +row.dataset.i;
            const spark = row.querySelector('.track__spark');
            const pk = this.peaks[this.tracks[i].src];
            if (pk) requestAnimationFrame(() => drawWave(spark, pk, 0, this.BASE, this.BASE));
        });
    },

    renderFilters() {
        if (!this.els.filters) return;
        const genres = [...new Set(this.tracks.map(t => t.genre).filter(Boolean))];
        if (genres.length < 2) { this.els.filters.hidden = true; return; }  // nothing to filter by
        const chips = ['All', ...genres];
        this.els.filters.innerHTML = chips.map((g, k) =>
            `<button type="button" class="chip${k === 0 ? ' is-on' : ''}" data-genre="${escapeHtml(g)}">${escapeHtml(g)}</button>`
        ).join('');
        this.els.filters.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => this.applyFilter(chip.dataset.genre, chip));
        });
    },

    applyFilter(genre, chip) {
        this.els.filters.querySelectorAll('.chip').forEach(c => c.classList.toggle('is-on', c === chip));
        this.els.list.querySelectorAll('.track').forEach(row => {
            row.hidden = !(genre === 'All' || row.dataset.genre === genre);
        });
    },

    bind() {
        this.els.list.querySelectorAll('.track').forEach(row => {
            const i = +row.dataset.i;
            row.addEventListener('click', () => Player.playIndex(i));
            row.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Player.playIndex(i); }
            });
            // Row waveform → click/drag to seek within that track (loads it if needed)
            const spark = row.querySelector('.track__spark');
            if (spark) {
                const seekRow = clientX => {
                    const r = spark.getBoundingClientRect();
                    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
                    Player.playIndexAt(i, frac);
                };
                let drag = false;
                spark.addEventListener('pointerdown', e => { e.stopPropagation(); drag = true; seekRow(e.clientX); try { spark.setPointerCapture(e.pointerId); } catch {} });
                spark.addEventListener('pointermove', e => { if (drag && i === Player.i) seekRow(e.clientX); });
                spark.addEventListener('pointerup', () => { drag = false; });
            }
        });

        // Seek on featured waveform
        const seek = clientX => {
            const r = this.els.canvas.getBoundingClientRect();
            const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
            if (Player.audio.duration) Player.audio.currentTime = p * Player.audio.duration;
        };
        let drag = false;
        this.els.canvas.addEventListener('pointerdown', e => { drag = true; seek(e.clientX); try { this.els.canvas.setPointerCapture(e.pointerId); } catch {} });
        this.els.canvas.addEventListener('pointermove', e => { if (drag) seek(e.clientX); });
        this.els.canvas.addEventListener('pointerup', () => { drag = false; });

        // Sync to player
        document.addEventListener('player:trackchange', e => this.onTrackChange(e.detail.index));
        document.addEventListener('player:state', e => this.onState(e.detail));
        Player.audio.addEventListener('timeupdate', () => this.onTime());
    },

    onTrackChange(i) {
        const t = this.tracks[i];
        this.curPeaks = this.peaks[t.src] || null;
        this.curKey = t.src;
        this.els.npLabel.textContent = 'Now Playing';
        this.els.npTitle.textContent = t.title;
        this.els.npProject.textContent = t.project || t.genre || '';
        this.els.dur.textContent = t.duration || '0:00';

        this.els.list.querySelectorAll('.track').forEach(r => r.classList.remove('is-active', 'is-playing'));
        const row = this.els.list.querySelector(`.track[data-i="${i}"]`);
        this.activeSpark = row ? row.querySelector('.track__spark') : null;
        if (row) { row.classList.add('is-active'); row.scrollIntoView({ block: 'nearest' }); }
        this.redraw();
    },

    onState({ state, index }) {
        const row = this.els.list.querySelector(`.track[data-i="${index}"]`);
        if (row) row.classList.toggle('is-playing', state === 'playing');
    },

    onTime() {
        const d = Player.audio.duration || 0, c = Player.audio.currentTime || 0;
        const p = d ? c / d : 0;
        if (this.curPeaks) drawWave(this.els.canvas, this.curPeaks, p, this.AMBER, this.BASE);
        if (this.activeSpark && this.curPeaks) drawWave(this.activeSpark, this.curPeaks, p, this.AMBER, this.BASE);
        this.els.cur.textContent = fmt(c);
        if (d && isFinite(d)) this.els.dur.textContent = fmt(d);
        this.els.canvas.setAttribute('aria-valuenow', Math.round(p * 100));
    },

    redraw() {
        const d = Player.audio.duration || 0, c = Player.audio.currentTime || 0;
        const p = (d && this.curKey === (this.tracks[Player.i] && this.tracks[Player.i].src)) ? c / d : 0;
        if (this.curPeaks) drawWave(this.els.canvas, this.curPeaks, p, p ? this.AMBER : this.BASE, this.BASE_DIM);
        this.els.list.querySelectorAll('.track').forEach(row => {
            const pk = this.peaks[this.tracks[+row.dataset.i].src];
            const spark = row.querySelector('.track__spark');
            if (pk && spark) drawWave(spark, pk, 0, this.BASE, this.BASE);
        });
    },
};

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
    buildHeroWave();
    initNavScroll();
    initMobileNav();
    loadData();
});
