/* =========================================================
   Israel Andy T. Maliwat | Portfolio interactions
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Navbar: mobile toggle + scrolled state ---------- */
  var nav = document.getElementById('nav');
  var toggle = nav.querySelector('.nav__toggle');
  var menu = document.getElementById('nav-menu');
  var toggleLabel = toggle.querySelector('.sr-only');

  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggleLabel.textContent = open ? 'Close menu' : 'Open menu';
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !nav.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  function onScrollNav() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ---------- Scroll spy (active nav link) ---------- */
  var links = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]'));
  var linkFor = {};
  links.forEach(function (a) { linkFor[a.getAttribute('href').slice(1)] = a; });

  function setActive(id) {
    links.forEach(function (a) {
      var on = a === linkFor[id];
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  if (hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Reveal on scroll (pop / slide / depth) ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (reducedMotion || !hasIO) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealIO = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; });
      batch.forEach(function (en, i) {
        var el = en.target;
        el.style.setProperty('--delay', (i * 0.09).toFixed(2) + 's');
        el.classList.add('is-in');
        el.addEventListener('transitionend', function clear() {
          el.style.removeProperty('--delay');
          el.removeEventListener('transitionend', clear);
        });
        revealIO.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------- Section title "impact" ---------- */
  var titles = document.querySelectorAll('.sfx-title');
  if (reducedMotion || !hasIO) {
    titles.forEach(function (t) { t.classList.add('is-impact'); });
  } else {
    var titleIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-impact');
          titleIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    titles.forEach(function (t) { titleIO.observe(t); });
  }

  /* ---------- Skill stat bars ---------- */
  document.querySelectorAll('.stat[data-level]').forEach(function (bar) {
    var lvl = Math.max(0, Math.min(100, parseFloat(bar.getAttribute('data-level')) || 0));
    bar.style.setProperty('--lvl', lvl + '%');
  });

  /* ---------- Skill flip cards ---------- */
  // Mouse users flip on hover (CSS). Touch and keyboard users flip with tap / Enter / Space.
  var lastPointerType = 'mouse';
  document.addEventListener('pointerdown', function (e) { lastPointerType = e.pointerType || 'mouse'; }, true);

  document.querySelectorAll('.skill-card').forEach(function (card) {
    card.addEventListener('click', function () {
      if (finePointer.matches && lastPointerType === 'mouse') return;
      card.classList.toggle('is-flipped');
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.classList.toggle('is-flipped');
      }
    });
  });

  /* ---------- Layered manga panels: scroll parallax ---------- */
  var depthEls = Array.prototype.slice.call(document.querySelectorAll('[data-depth]'));
  if (!reducedMotion && hasIO && depthEls.length) {
    var visibleDepth = new Set();
    var depthIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visibleDepth.add(en.target); else visibleDepth.delete(en.target);
      });
      requestDepth();
    }, { rootMargin: '120px 0px' });
    depthEls.forEach(function (el) { depthIO.observe(el); });

    var depthTicking = false;
    var updateDepth = function () {
      depthTicking = false;
      var vh = window.innerHeight;
      visibleDepth.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        p = Math.max(-1, Math.min(1, p));
        el.style.setProperty('--p', p.toFixed(3));
      });
    };
    var requestDepth = function () {
      if (!depthTicking) { depthTicking = true; requestAnimationFrame(updateDepth); }
    };
    window.addEventListener('scroll', requestDepth, { passive: true });
    window.addEventListener('resize', requestDepth);
  }

  /* ---------- Project cards: cursor tilt + glare ---------- */
  if (!reducedMotion && finePointer.matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      var inner = card.querySelector('.tcard__inner');
      var raf = 0;
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          inner.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
          inner.style.setProperty('--rx', ((0.5 - y) * 11).toFixed(2) + 'deg');
          inner.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          inner.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
        card.classList.add('is-tilting');
      });
      card.addEventListener('pointerleave', function () {
        cancelAnimationFrame(raf);
        card.classList.remove('is-tilting');
        inner.style.setProperty('--rx', '0deg');
        inner.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Project detail dialogs ---------- */
  var lastOpener = null;
  document.querySelectorAll('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = document.getElementById(btn.getAttribute('data-open'));
      if (!dlg) return;
      lastOpener = btn;
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    });
  });
  document.querySelectorAll('dialog.dlg').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { dlg.close(); });
    });
    dlg.addEventListener('close', function () { if (lastOpener) lastOpener.focus(); });
  });

  /* ---------- Contact form (opens the visitor's email app) ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var status = document.getElementById('cf-status');
    var messages = {
      name: 'Please enter your name.',
      email: 'Please enter a valid email address.',
      message: 'Please write a short message.'
    };
    var fieldNames = ['name', 'email', 'message'];

    var validate = function (name) {
      var el = form.elements[name];
      var err = document.getElementById('cf-' + name + '-err');
      var ok = el.value.trim() !== '' && el.checkValidity();
      el.setAttribute('aria-invalid', String(!ok));
      if (ok) el.removeAttribute('aria-describedby'); else el.setAttribute('aria-describedby', err.id);
      err.textContent = ok ? '' : messages[name];
      return ok;
    };

    fieldNames.forEach(function (name) {
      form.elements[name].addEventListener('input', function () {
        if (form.elements[name].getAttribute('aria-invalid') === 'true') validate(name);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fieldNames.forEach(function (name) {
        if (!validate(name) && !firstBad) firstBad = form.elements[name];
      });
      if (firstBad) { firstBad.focus(); status.textContent = ''; return; }

      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      var subject = 'Portfolio inquiry from ' + name;
      var body = message + '\n\nFrom: ' + name + '\nEmail: ' + email;
      window.location.href = 'mailto:israelmaliwat45@gmail.com?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      status.textContent = 'Opening your email app… If nothing opens, email israelmaliwat45@gmail.com directly.';
    });
  }

  /* ---------- Hero 3D scene: lazy-loaded, skipped on small / low-end devices ---------- */
  var hero = document.getElementById('hero');
  var canvas = document.getElementById('hero-canvas');

  function webglAvailable() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return false;
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (err) {
      return false;
    }
  }

  function shouldUse3D() {
    if (window.matchMedia('(max-width: 760px)').matches) return false;
    var conn = navigator.connection;
    if (conn && conn.saveData) return false;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false;
    return webglAvailable();
  }

  var heroStarted = false;
  function startHero3D() {
    if (heroStarted || !hero || !canvas) return;
    heroStarted = true;
    if (!shouldUse3D()) { hero.classList.add('no-3d'); return; }

    var script = document.createElement('script');
    script.src = 'js/hero3d.js';
    script.async = true;
    script.onload = function () {
      if (!window.HeroScene) return;
      window.HeroScene.init({ canvas: canvas, container: hero, reducedMotion: reducedMotion })
        .then(function (ok) { if (ok) hero.classList.add('has-3d'); })
        .catch(function () { /* keep the static illustration */ });
    };
    document.head.appendChild(script);
  }

  function whenIdle(fn) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2000 });
    else setTimeout(fn, 300);
  }

  function scheduleHero() {
    if (!hasIO) { whenIdle(startHero3D); return; }
    var heroIO = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) {
        heroIO.disconnect();
        whenIdle(startHero3D);
      }
    });
    heroIO.observe(hero);
  }

  if (document.readyState === 'complete') scheduleHero();
  else window.addEventListener('load', scheduleHero, { once: true });
})();
