/**
 * AviShai Dayanim — Cinematic Website JavaScript
 * Handles: nav scroll, scroll-reveal, marquees, WaveSurfer audio, credit hover audio
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavScroll();
    initNavActiveSection();
    initMobileNav();
    initScrollReveal();
    initScrollProgress();
    initHeroParallax();
    initStatCounters();
    initCreditsMarquee();
    initArticlesMarquee();
    initWaveSurferPlayer();
    initCreditAudioHover();
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
   Overlay is appended to <body> directly so it
   isn't trapped by backdrop-filter on the nav.
   ============================================ */
function initMobileNav() {
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks  = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;

    // Build a body-level overlay from the existing nav links
    const overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay';

    const ul = document.createElement('ul');
    navLinks.querySelectorAll('a').forEach(original => {
        const li = document.createElement('li');
        const a  = document.createElement('a');
        a.setAttribute('href', original.getAttribute('href'));
        a.textContent = original.textContent;
        if (original.classList.contains('active')) a.classList.add('active');
        li.appendChild(a);
        ul.appendChild(li);
    });
    overlay.appendChild(ul);
    document.body.appendChild(overlay);

    const open  = () => {
        overlay.classList.add('is-open');
        hamburger.classList.add('is-open');
        hamburger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };
    const close = () => {
        overlay.classList.remove('is-open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    hamburger.addEventListener('click', () => {
        overlay.classList.contains('is-open') ? close() : open();
    });

    overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
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
   Credit Card Hover Audio
   Uses event delegation on the strip so it works
   for original cards AND all clones automatically.
   ============================================ */
function initCreditAudioHover() {
    const strip = document.querySelector('.credits-strip');
    if (!strip) return;

    // Shared audio pool keyed by src — one Audio object per track
    const pool      = {};
    const fadeTimers = new WeakMap();

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

    // mouseover / mouseout bubble — perfect for delegation
    strip.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.credit-card[data-audio]');
        if (!card) return;
        // Ignore if we're just moving between child elements
        if (card.contains(e.relatedTarget)) return;

        const src   = card.getAttribute('data-audio');
        const audio = getAudio(src);

        // Cancel any active fade on this card
        const existing = fadeTimers.get(card);
        if (existing) { clearInterval(existing); fadeTimers.delete(card); }

        audio.volume      = 1;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    });

    strip.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.credit-card[data-audio]');
        if (!card) return;
        // Ignore if still inside the card
        if (card.contains(e.relatedTarget)) return;

        const src   = card.getAttribute('data-audio');
        const audio = getAudio(src);
        startFade(card, audio);
    });
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

/* ============================================
   Stat Counter — counts up on scroll-enter
   ============================================ */
function initStatCounters() {
    const statEls = document.querySelectorAll('.stat-number');
    if (!statEls.length) return;

    const parse = (el) => {
        const raw    = el.textContent.trim();
        const num    = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
        const suffix = raw.replace(/[0-9.]/g, '').trim();
        // store original for re-use
        el.dataset.target  = num;
        el.dataset.suffix  = suffix;
        return { num, suffix };
    };

    const animate = (el, target, suffix) => {
        const from     = 0;
        const duration = 1400;
        const start    = performance.now();
        const step     = (now) => {
            const p     = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);          // cubic ease-out
            el.textContent = Math.round(from + eased * (target - from)) + suffix;
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const { num, suffix } = parse(el);
                animate(el, num, suffix);
                observer.unobserve(el); // fire once
            }
        });
    }, { threshold: 0.5 });

    statEls.forEach(el => observer.observe(el));
}

/* ============================================
   Overlay Fade-out on Enter
   ============================================ */
(function initOverlay() {
    const btn     = document.getElementById('overlay-enter-btn');
    const overlay = document.getElementById('overlay-page');
    if (!btn || !overlay) return;

    btn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        sessionStorage.setItem('visited', 'true');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    });
})();
