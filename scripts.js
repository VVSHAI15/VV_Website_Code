/**
 * AviShai Dayanim — Cinematic Website JavaScript
 * Handles: nav scroll, scroll-reveal, marquees, WaveSurfer audio, credit hover audio
 */

/* Assigned by initCreditAudioHover(); called on the first real user gesture
   so Safari/iOS will let the credit previews play later on hover. */
let primeCreditAudio = () => {};

document.addEventListener('DOMContentLoaded', () => {
    initCreditAudioHover();
    initIntroOverlay();
    initNavScroll();
    initNavActiveSection();
    initMobileNav();
    initScrollReveal();
    initScrollProgress();
    initHeroParallax();
    initCreditsMarquee();
    initArticlesMarquee();
    initWaveSurferPlayer();
});

/* ============================================
   Navigation — transparent → glass on scroll
   ============================================ */
function initNavScroll() {
    const nav = document.getElementById('site-nav');
    if (!nav) return;

    const heroEl = document.querySelector('.hero');
    const threshold = heroEl ? 60 : 20;

    const update = () => {
        if (window.scrollY > threshold) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* ============================================
   Mobile Nav — Hamburger Toggle
   ============================================ */
function initMobileNav() {
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks  = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;

    const open  = () => {
        navLinks.classList.add('nav-open');
        hamburger.classList.add('is-open');
        hamburger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };
    const close = () => {
        navLinks.classList.remove('nav-open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    hamburger.addEventListener('click', () => {
        navLinks.classList.contains('nav-open') ? close() : open();
    });

    // Close on any link click
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

    // Close on Escape
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ============================================
   Nav — Active Section Tracking
   Highlights the correct nav link as you scroll
   ============================================ */
function initNavActiveSection() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!navLinks.length) return;

    const sections = [];
    navLinks.forEach(link => {
        const id = link.getAttribute('href').slice(1);
        const el = document.getElementById(id);
        if (el) sections.push({ el, link });
    });
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(l => l.classList.remove('active'));
                const match = sections.find(s => s.el === entry.target);
                if (match) match.link.classList.add('active');
            }
        });
    }, { threshold: 0.25, rootMargin: '-8% 0px -60% 0px' });

    sections.forEach(s => observer.observe(s.el));
}

/* ============================================
   Hero Parallax — content drifts on scroll
   ============================================ */
function initHeroParallax() {
    const content   = document.querySelector('.hero-content');
    const indicator = document.querySelector('.hero-scroll-indicator');
    if (!content) return;

    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        content.style.transform = `translateY(${y * 0.28}px)`;
        if (indicator) indicator.style.opacity = Math.max(0, 1 - y / 180);
    }, { passive: true });
}

/* ============================================
   Scroll Reveal — IntersectionObserver
   ============================================ */
function initScrollReveal() {
    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(el => observer.observe(el));
}

/* ============================================
   Infinite Marquee — shared engine
   Clones items until track is 4× viewport wide,
   uses origSetWidth for a pixel-perfect seamless reset.
   ============================================ */
function createInfiniteMarquee(wrapEl, trackEl, speed) {
    if (!wrapEl || !trackEl) return;

    let origSetWidth = 0;
    let position     = 0;
    let paused       = false;
    let raf          = null;

    const fill = () => {
        const origItems = Array.from(trackEl.children);
        // Measure the original set BEFORE adding any clones
        origSetWidth = trackEl.scrollWidth;
        if (origSetWidth === 0) return;

        // Clone until we have at least 4× viewport width of content
        const needed = window.innerWidth * 4;
        while (trackEl.scrollWidth < needed) {
            origItems.forEach(item => trackEl.appendChild(item.cloneNode(true)));
        }
    };

    const tick = () => {
        if (!paused && origSetWidth > 0) {
            position -= speed;
            // Seamless reset: jump forward exactly one original set width
            if (position <= -origSetWidth) position += origSetWidth;
            trackEl.style.transform = `translateX(${position}px)`;
        }
        raf = requestAnimationFrame(tick);
    };

    // Pause on hover / touch
    wrapEl.addEventListener('mouseenter', () => { paused = true; });
    wrapEl.addEventListener('mouseleave', () => { paused = false; });
    wrapEl.addEventListener('touchstart', () => { paused = true; },  { passive: true });
    wrapEl.addEventListener('touchend',   () => { paused = false; }, { passive: true });

    window.addEventListener('beforeunload', () => cancelAnimationFrame(raf));

    // Init after first paint so offsetWidths are available
    requestAnimationFrame(() => {
        fill();
        tick();
    });
}

function initCreditsMarquee() {
    createInfiniteMarquee(
        document.querySelector('.credits-strip'),
        document.querySelector('.credits-track'),
        0.55
    );
}

function initArticlesMarquee() {
    createInfiniteMarquee(
        document.querySelector('.articles-marquee-wrap'),
        document.querySelector('.articles-marquee'),
        0.4
    );
}

/* ============================================
   WaveSurfer Audio Player
   ============================================ */
function initWaveSurferPlayer() {
    const section = document.getElementById('reel-section');
    if (!section) return;
    if (typeof WaveSurfer === 'undefined') {
        console.warn('WaveSurfer not loaded');
        return;
    }

    const waveformEl  = section.querySelector('#waveform-hybrid');
    const playBtn     = section.querySelector('#play-pause-btn');
    const titleEl     = section.querySelector('.now-playing-title');
    const trackItems  = section.querySelectorAll('.track-item');
    const equalizerEl = section.querySelector('#equalizer');
    const waveWrap    = section.querySelector('.waveform-wrap');

    if (!waveformEl) return;

    const ws = WaveSurfer.create({
        container:     waveformEl,
        waveColor:     'rgba(200, 169, 110, 0.45)',
        progressColor: '#c8a96e',
        cursorColor:   'rgba(240, 218, 150, 0.7)',
        cursorWidth:   1,
        barWidth:      2,
        barGap:        2,
        barRadius:     3,
        height:        96,
        normalize:     true,
        responsive:    true,
    });

    // --- Playing state helpers ---
    const setPlaying = (playing) => {
        if (playBtn) {
            playBtn.innerHTML = playing
                ? '<i class="fas fa-pause"></i>'
                : '<i class="fas fa-play"></i>';
            playBtn.classList.toggle('is-playing', playing);
        }
        if (equalizerEl) equalizerEl.classList.toggle('active', playing);
        if (waveWrap)    waveWrap.classList.toggle('is-playing', playing);
    };

    const loadTrack = (item, autoPlay = false) => {
        const src   = item.getAttribute('data-src');
        const title = item.getAttribute('data-title');
        if (!src) return;

        // Crossfade the title
        if (titleEl) {
            titleEl.style.opacity = '0';
            setTimeout(() => {
                titleEl.textContent = title;
                titleEl.style.opacity = '1';
            }, 200);
        }

        trackItems.forEach(t => t.classList.remove('active'));
        item.classList.add('active');

        ws.load(src);

        if (autoPlay) {
            ws.once('ready', () => ws.play());
        }
    };

    // Load first track
    const first = section.querySelector('.track-item');
    if (first) loadTrack(first, false);

    // Track click
    trackItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('active')) {
                ws.isPlaying() ? ws.pause() : ws.play();
            } else {
                loadTrack(item, true);
            }
        });
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
        });
    });

    // Play/pause button
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            ws.isPlaying() ? ws.pause() : ws.play();
        });
    }

    // WaveSurfer events → drive visual state
    ws.on('play',   () => setPlaying(true));
    ws.on('pause',  () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));

    // Seek starts playback
    ws.on('seek', () => { if (!ws.isPlaying()) ws.play(); });

    // Prevent waveform click propagation
    waveformEl.addEventListener('click', e => e.stopPropagation());

    // Spacebar control
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.code === 'Space') {
            e.preventDefault();
            ws.isPlaying() ? ws.pause() : ws.play();
        }
    });

    // Fade out and pause when section leaves viewport
    let fadeInterval = null;

    const fadeOutAndPause = () => {
        if (!ws.isPlaying()) return;
        clearInterval(fadeInterval);
        fadeInterval = setInterval(() => {
            const vol = ws.getVolume();
            if (vol > 0.06) {
                ws.setVolume(Math.max(0, vol - 0.06));
            } else {
                clearInterval(fadeInterval);
                ws.pause();
                ws.setVolume(1);
            }
        }, 50);
    };

    const cancelFade = () => {
        clearInterval(fadeInterval);
        ws.setVolume(1);
    };

    new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                cancelFade();
            } else {
                fadeOutAndPause();
            }
        });
    }, { threshold: 0.05 }).observe(section);
}

/* ============================================
   Credit Card Audio
   Hover previews on pointer devices, tap-to-play on
   touch devices. Delegated on the strip so it covers
   the marquee clones automatically.
   ============================================ */
function initCreditAudioHover() {
    const strip = document.querySelector('.credits-strip');
    if (!strip) return;

    // Shared audio pool keyed by src — one Audio object per track
    const pool       = {};
    const fadeTimers = new WeakMap();
    let   current    = null;   // card whose cue is playing (touch mode)

    const getAudio = (src) => {
        if (!pool[src]) {
            pool[src] = new Audio(src);
            pool[src].preload = 'none';
        }
        return pool[src];
    };

    const startFade = (card, audio) => {
        const timer = setInterval(() => {
            if (audio.volume > 0.08) {
                audio.volume = Math.max(0, audio.volume - 0.08);
            } else {
                clearInterval(timer);
                fadeTimers.delete(card);
                audio.pause();
                audio.currentTime = 0;
                audio.volume = 1;
            }
        }, 50);
        fadeTimers.set(card, timer);
    };

    const play = (card) => {
        const audio = getAudio(card.getAttribute('data-audio'));
        const existing = fadeTimers.get(card);
        if (existing) { clearInterval(existing); fadeTimers.delete(card); }
        audio.volume      = 1;
        audio.currentTime = 0;
        audio.play().catch(() => {});   // blocked until the visitor interacts
        return audio;
    };

    const stop = (card) => {
        startFade(card, getAudio(card.getAttribute('data-audio')));
    };

    /* Unlock: browsers only allow playback once the visitor has interacted,
       and Safari wants each Audio element's first play() to happen inside
       that gesture. Play-then-pause every cue at zero volume to satisfy it. */
    primeCreditAudio = () => {
        document.querySelectorAll('.credit-card[data-audio]').forEach(card => {
            const audio = getAudio(card.getAttribute('data-audio'));
            const restore = () => { audio.pause(); audio.currentTime = 0; audio.volume = 1; };
            audio.volume = 0;
            const p = audio.play();
            if (p && p.then) p.then(restore).catch(restore);
            else restore();
        });
    };

    // Hover previews use pointer events so we can inspect pointerType per
    // event: only a real mouse triggers hover-play. Touch/pen bail out here
    // and fall through to the tap-to-play click handler below. This avoids
    // the load-time media-query snapshot that mis-fires on some phones.
    strip.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        const card = e.target.closest('.credit-card[data-audio]');
        if (card) play(card);
    }, true);

    strip.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        const card = e.target.closest('.credit-card[data-audio]');
        if (card) stop(card);
    }, true);

    // Touch: tap to start, tap again (or tap another card) to stop.
    strip.addEventListener('click', (e) => {
        if (window.matchMedia('(pointer: fine)').matches) return; // mouse clicks handled by hover above
        const card = e.target.closest('.credit-card[data-audio]');
        if (!card) return;
        if (current && current !== card) stop(current);
        if (current === card) {
            stop(card);
            card.classList.remove('is-playing');
            current = null;
        } else {
            if (current) current.classList.remove('is-playing');
            play(card);
            card.classList.add('is-playing');
            current = card;
        }
    });
}

/* ============================================
   Intro Overlay
   Lives on the homepage rather than its own page.
   The Enter click is also what unlocks audio.
   ============================================ */
function initIntroOverlay() {
    const overlay = document.getElementById('overlay-page');

    // Returning visitors this session never see it — prime on their first
    // gesture instead, so hover previews still work after a reload.
    const primeOnce = () => primeCreditAudio();
    document.addEventListener('pointerdown', primeOnce, { once: true });
    document.addEventListener('keydown',     primeOnce, { once: true });

    if (!overlay) return;
    const btn = document.getElementById('overlay-enter-btn');
    if (!btn) return;

    const dismiss = () => {
        primeCreditAudio();
        try { sessionStorage.setItem('visited', 'true'); } catch (e) {}
        overlay.classList.add('is-leaving');
        setTimeout(() => overlay.remove(), 1300);
    };

    btn.addEventListener('click', dismiss);
}

/* ============================================
   Scroll Progress Bar
   ============================================ */
function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
        const scrollTop  = window.scrollY;
        const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width  = (docHeight > 0 ? (scrollTop / docHeight) * 100 : 0) + '%';
    }, { passive: true });
}
