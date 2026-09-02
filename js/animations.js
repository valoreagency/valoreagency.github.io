/* ── RIVER re-skin bootstrap — runs only on pages with <body class="river"> ──
   Injects the living-water background + river spine, drives the night→day
   glow-up, the sticky values, hero ripples, the Brand Brain gate, the starter
   prompt copy, and the setup helper (wired to the Valore backend). Every other
   behaviour below (nav state, count-ups, scroll-reveal, exit-intent) is shared
   by all pages and left untouched. */
(function () {
  'use strict';
  if (!document.body || !document.body.classList.contains('river')) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Reading pages (long-form articles, blog index) get a heavier overlay so
  // text stays easy to read over the living-water background.
  if (document.querySelector('.post-body, .blog-grid')) { document.body.classList.add('reading'); }
  var API_BASE = 'https://valore-brand-builder-production.up.railway.app';
  var PATH = 'M 500 0 C 500 250, 300 350, 300 600 S 680 950, 680 1200 S 340 1550, 340 1800 S 660 2150, 660 2400 S 420 2750, 420 3000 S 600 3350, 600 3600 S 360 3950, 360 4200 S 620 4550, 620 4800 S 480 5150, 480 5400 S 500 5750, 500 6000';

  // 1. Living-water background (inject once, behind everything)
  if (!document.querySelector('.water-bg')) {
    var wb = document.createElement('div');
    wb.className = 'water-bg'; wb.setAttribute('aria-hidden', 'true');
    wb.innerHTML = '<div class="water-fallback"></div>' +
      '<video class="water-video" autoplay muted loop playsinline preload="auto">' +
      '<source src="/assets/river-bg.mp4" type="video/mp4"></video>' +
      '<div class="water-tint"></div>';
    document.body.insertBefore(wb, document.body.firstChild);
    if (reduce) { var vv = wb.querySelector('video'); if (vv) { try { vv.pause(); } catch (e) {} } }
  }
  // River spine
  if (!document.querySelector('.river-track')) {
    var rt = document.createElement('div');
    rt.className = 'river-track';
    rt.innerHTML = '<svg class="river-svg" viewBox="0 0 1000 6000" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="river-bed" d="' + PATH + '"/>' +
      '<path class="river-glow" d="' + PATH + '"/>' +
      '<path class="river-flow" id="riverFlow" d="' + PATH + '"/>' +
      '<path class="river-current" d="' + PATH + '"/></svg>';
    var anchor = document.querySelector('.water-bg');
    document.body.insertBefore(rt, anchor ? anchor.nextSibling : document.body.firstChild);
  }

  var flow = document.getElementById('riverFlow');
  var heroNight = document.getElementById('heroNight');
  var LEN = 0, rTick = false, activeIdx = -1;
  function initRiver() {
    if (!flow) return;
    LEN = flow.getTotalLength ? flow.getTotalLength() : 0;
    if (!LEN || LEN <= 1) { requestAnimationFrame(initRiver); return; }
    flow.style.strokeDasharray = LEN; flow.style.strokeDashoffset = LEN; onRiverScroll();
  }
  function setValue(idx) {
    if (idx === activeIdx) return; activeIdx = idx;
    document.querySelectorAll('.vw[data-i]').forEach(function (w) { w.classList.toggle('active', +w.dataset.i === idx); });
    document.querySelectorAll('.vcap').forEach(function (c) { c.classList.toggle('show', +c.dataset.i === idx); });
  }
  function onRiverScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (heroNight && heroNight.offsetParent !== null) {
      var np = Math.max(0, Math.min(1, y / (window.innerHeight * 0.92)));
      heroNight.style.opacity = 1 - (np * np * (3 - 2 * np));
    }
    if (LEN > 1) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var prog = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0;
      flow.style.strokeDashoffset = LEN * (1 - prog);
    }
    var vs = document.querySelector('.values');
    if (vs) {
      var r = vs.getBoundingClientRect();
      var total = vs.offsetHeight - window.innerHeight;
      var local = Math.min(1, Math.max(0, (-r.top) / (total || 1)));
      if (r.top < window.innerHeight && r.bottom > 0) { setValue(local < 0.34 ? 0 : (local < 0.67 ? 1 : 2)); }
    }
    rTick = false;
  }
  function reqRiverScroll() { if (!rTick) { rTick = true; requestAnimationFrame(onRiverScroll); } }
  window.addEventListener('scroll', reqRiverScroll, { passive: true });
  window.addEventListener('resize', function () { initRiver(); }, { passive: true });

  // 2. Hero water ripples (reactive canvas)
  (function () {
    var canvas = document.getElementById('heroRipple');
    if (!canvas || reduce) return;
    var ctx = canvas.getContext('2d'); var hero = canvas.parentElement;
    var W = 0, H = 0, ripples = [], lastT = 0, amb = 0;
    function resize() { var r = hero.getBoundingClientRect(); W = canvas.width = Math.max(1, Math.round(r.width)); H = canvas.height = Math.max(1, Math.round(r.height)); }
    resize(); window.addEventListener('resize', resize, { passive: true });
    function add(x, y, a, max) { ripples.push({ x: x, y: y, r: 5, max: max || (120 + Math.random() * 90), a: a || 0.5 }); if (ripples.length > 70) ripples.shift(); }
    hero.addEventListener('pointermove', function (e) { var rc = canvas.getBoundingClientRect(); var now = performance.now(); if (now - lastT > 50) { add(e.clientX - rc.left, e.clientY - rc.top, 0.5); lastT = now; } });
    hero.addEventListener('pointerdown', function (e) { var rc = canvas.getBoundingClientRect(); add(e.clientX - rc.left, e.clientY - rc.top, 0.85, 220); });
    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      if (t - amb > 1500) { add(Math.random() * W, H * (0.3 + Math.random() * 0.55), 0.3); amb = t; }
      for (var i = ripples.length - 1; i >= 0; i--) {
        var p = ripples[i]; p.r += 1.7; p.a *= 0.974;
        if (p.a < 0.012 || p.r > p.max) { ripples.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.strokeStyle = 'rgba(255,255,255,' + (p.a * 0.5) + ')'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.68, 0, 6.2832); ctx.strokeStyle = 'rgba(156,240,236,' + (p.a * 0.32) + ')'; ctx.lineWidth = 1; ctx.stroke();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  // 3. Reveal for authored .reveal elements (homepage / brand-brain)
  if (!reduce && ('IntersectionObserver' in window)) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var d = e.target.dataset.d ? parseInt(e.target.dataset.d, 10) : 0;
          e.target.style.transitionDelay = (d * 0.12) + 's';
          e.target.classList.add('is-visible'); rio.unobserve(e.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.river .reveal').forEach(function (el) { rio.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  // 4. Brand Brain gate → reveal setup + capture lead
  var gf = document.getElementById('gateForm2');
  if (gf) {
    gf.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = (gf.first.value || '').trim(), email = (gf.email.value || '').trim();
      var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      var note = document.getElementById('gateNote2');
      if (!first || !okEmail) { if (note) note.textContent = 'Please enter your first name and a valid email address.'; return; }
      gf.style.display = 'none'; if (note) note.hidden = true;
      var ok = document.getElementById('gateSuccess2'); if (ok) ok.hidden = false;
      var setup = document.getElementById('bbSetup');
      if (setup) { setup.hidden = false; setup.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (window.gtag) gtag('event', 'brand_brain_gate', { event_category: 'lead', event_label: 'brand_brain' });
      try {
        fetch(API_BASE + '/api/lead', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName: first, email: email, tool: 'Brand Brain Starter Kit', source: 'brand-brain' })
        }).catch(function () {});
      } catch (e2) {}
    });
  }

  // 5. Copy starter prompt (also selects the text, so manual copy always works)
  var cp = document.getElementById('copyPrompt');
  if (cp) {
    cp.addEventListener('click', function () {
      var pre = document.getElementById('starterPrompt');
      if (!pre) return;
      var t = pre.textContent;
      try {
        var range = document.createRange(); range.selectNodeContents(pre);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      } catch (e) {}
      var done = function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy'; }, 1800); };
      var manual = function () { cp.textContent = 'Selected, press Ctrl+C'; setTimeout(function () { cp.textContent = 'Copy'; }, 2800); };
      var tryExec = function () { try { return document.execCommand('copy'); } catch (e) { return false; } };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done).catch(function () { tryExec() ? done() : manual(); });
      } else {
        tryExec() ? done() : manual();
      }
    });
  }

  // 6. Brand Brain setup helper → Valore backend
  (function () {
    var form = document.getElementById('helperForm'); if (!form) return;
    var log = document.getElementById('helperLog'), input = document.getElementById('helperInput');
    var turns = [{ role: 'assistant', content: "Hi, we're here to get you set up and answer any questions. How can we help?" }];
    var busy = false;
    function bubble(role, text) { var d = document.createElement('div'); d.className = 'hb hb-' + role; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var msg = input.value.trim(); if (!msg || busy) return;
      input.value = ''; busy = true;
      bubble('user', msg); turns.push({ role: 'user', content: msg });
      var out = bubble('bot', 'Thinking...');
      try {
        var res = await fetch(API_BASE + '/api/brand-brain-helper', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: turns.slice(-12) })
        });
        var data = await res.json();
        if (!res.ok || !data.reply) { out.textContent = (data && data.error) ? data.error : 'The helper is unavailable right now. Email info@valore.agency and we will help.'; }
        else { out.textContent = data.reply; turns.push({ role: 'assistant', content: data.reply }); }
      } catch (err) {
        out.textContent = 'Something went wrong. Try again, or email info@valore.agency.';
      } finally { busy = false; }
    });
  })();

  // boot
  initRiver();
  if (document.readyState !== 'complete') { window.addEventListener('load', initRiver); }
})();

(function () {
  'use strict';

  // Nav: transparent over dark hero, immediately solid on pages without one
  var nav = document.querySelector('.nav');
  var hasDarkHero = document.querySelector('.hero, .page-hero, .r-hero');
  if (nav) {
    if (!hasDarkHero) {
      nav.classList.add('nav--scrolled');
    } else {
      window.addEventListener('scroll', function () {
        nav.classList.toggle('nav--scrolled', window.scrollY > 56);
      }, { passive: true });
    }
  }

  // Growth graph: sticky scroll-track. Progress is the section's travel through
  // the viewport, so the line and the tip ride the curve as you scroll.
  var growthSection = document.querySelector('.growth');
  var growthWrap = document.querySelector('.growth-graph');
  if (growthSection && growthWrap) {
    var growthPath = growthWrap.querySelector('.growth-line');
    var growthTip = growthWrap.querySelector('.growth-tip');
    if (growthPath && growthPath.getTotalLength) {
      var glen = growthPath.getTotalLength();
      if (glen > 1) { growthPath.style.strokeDasharray = glen; }
      var milestones = Array.prototype.slice.call(growthWrap.querySelectorAll('.milestone'));

      var drawGrowth = function (p) {
        // getTotalLength can read 0 before layout settles; retry until it is real
        if (glen <= 1) {
          glen = growthPath.getTotalLength();
          if (glen <= 1) { return; }
          growthPath.style.strokeDasharray = glen;
        }
        p = Math.max(0, Math.min(1, p));
        growthPath.style.strokeDashoffset = glen * (1 - p);
        if (growthTip) {
          var pt = growthPath.getPointAtLength(glen * p);
          growthTip.setAttribute('cx', pt.x);
          growthTip.setAttribute('cy', pt.y);
          growthTip.style.opacity = p > 0.02 ? '1' : '0';
        }
        milestones.forEach(function (m) {
          m.classList.toggle('is-on', p >= parseFloat(m.getAttribute('data-frac')) - 0.01);
        });
      };
      var growthReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (growthReduced) {
        drawGrowth(1);
      } else {
        var gTick = false;
        var onGrowthScroll = function () {
          if (gTick) { return; }
          gTick = true;
          requestAnimationFrame(function () {
            var rect = growthSection.getBoundingClientRect();
            var vh = window.innerHeight || document.documentElement.clientHeight;
            var scrollable = growthSection.offsetHeight - vh;
            var p = scrollable > 80
              ? (-rect.top) / scrollable
              : (vh * 0.85 - rect.top) / (vh * 0.6);
            drawGrowth(p);
            gTick = false;
          });
        };
        window.addEventListener('scroll', onGrowthScroll, { passive: true });
        window.addEventListener('resize', onGrowthScroll, { passive: true });
        drawGrowth(0);
        onGrowthScroll();
      }
    }
  }

  // Stat count-up on scroll (counts pure integers up to 100; skips years like 2015)
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animateCount(el) {
    var raw = el.textContent.trim();
    if (!/^[0-9]+$/.test(raw)) { return; }
    var target = parseInt(raw, 10);
    if (target <= 0 || target > 100 || prefersReduced) { return; }
    var dur = 1300, start = null;
    function step(ts) {
      if (!start) { start = ts; }
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) { requestAnimationFrame(step); } else { el.textContent = target; }
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  var statNums = Array.prototype.slice.call(document.querySelectorAll('.stat-item__num'));
  if (statNums.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); sio.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    statNums.forEach(function (el) { sio.observe(el); });
  }

  // Scroll-reveal: elements to animate in as they enter the viewport
  var targets = Array.prototype.slice.call(document.querySelectorAll([
    '.section__headline',
    '.pain-list',
    '.service-item',
    '.package',
    '.blog-card',
    '.process-step',
    '.service-block',
    '.faq-item',
    '.about-quote',
    '.about-split',
    '.pricing-box',
    '.post-takeaways',
    '.post-toc',
    '.post-callout',
    '.post-lead-magnet',
    '.post-cta-inline',
    '.post-author',
    '.post-faq',
    '.post-related',
    '.stat-item',
    '.manifesto__text',
    '.manifesto__eyebrow',
    '.pain-statement'
  ].join(', ')));

  // Exclude anything already inside the hero (those have CSS keyframe animations)
  var heroEl = document.querySelector('.hero, .page-hero, .r-hero');
  if (heroEl) {
    targets = targets.filter(function (el) { return !heroEl.contains(el); });
  }

  // Graceful fallback — if no IntersectionObserver, leave elements visible
  if (!('IntersectionObserver' in window)) { return; }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(function (el) {
    el.classList.add('reveal');
    io.observe(el);
  });
}());

// ── Exit-intent: invite the visitor into the Marketing Cost Calculator ──────────
// Tasteful, value-first, easy to dismiss. Desktop only (mouse toward the top),
// at most once every 7 days per visitor. Skips the calculator itself and the
// other lead/conversion pages.
(function () {
  'use strict';
  var path = location.pathname;
  var SKIP = ['/brand-brain', '/start', '/marketing-cost-calculator', '/brand-assessment', '/pricing-readiness', '/thank-you', '/contact'];
  for (var i = 0; i < SKIP.length; i++) { if (path.indexOf(SKIP[i]) === 0) return; }

  // Desktop only — exit intent does not translate to touch
  if (!(window.matchMedia && window.matchMedia('(pointer: fine)').matches)) return;

  // Frequency cap: once per 7 days
  var KEY = 'valore_calc_exit';
  try {
    var last = parseInt(localStorage.getItem(KEY) || '0', 10);
    if (last && (Date.now() - last) < 7 * 24 * 60 * 60 * 1000) return;
  } catch (e) {}

  var css = '' +
    '.vx-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:rgba(0,22,64,0.62);opacity:0;transition:opacity .3s ease;}' +
    '.vx-overlay.is-open{opacity:1;}' +
    '.vx-modal{position:relative;max-width:470px;width:100%;background:#002664;border:1px solid rgba(255,244,202,0.18);border-top:3px solid #fff4ca;border-radius:12px;padding:2.9rem 2.5rem 2.4rem;text-align:center;box-shadow:0 34px 90px rgba(0,22,64,0.5);transform:translateY(14px);transition:transform .35s ease;font-family:Inter,Arial,sans-serif;color:#eef1f7;}' +
    '.vx-overlay.is-open .vx-modal{transform:none;}' +
    '.vx-eyebrow{display:block;font-size:0.8rem;letter-spacing:0.2em;text-transform:uppercase;color:#fff4ca;margin-bottom:0.9rem;}' +
    '.vx-title{font-family:"Cormorant Garamond",Georgia,serif;font-weight:400;font-size:2rem;line-height:1.18;color:#ffffff;margin:0 0 0.9rem;}' +
    '.vx-body{font-size:1rem;line-height:1.65;color:#c7d0e4;margin:0 0 1.7rem;}' +
    '.vx-cta{display:inline-block;background:#fff4ca;color:#002664;font-weight:500;font-size:0.95rem;letter-spacing:0.04em;padding:0.95rem 2.1rem;border-radius:6px;text-decoration:none;transition:background .2s ease,transform .2s ease;}' +
    '.vx-cta:hover{background:#ede5a8;transform:translateY(-1px);}' +
    '.vx-dismiss{display:block;margin:1.2rem auto 0;background:none;border:none;color:#9aa6c2;font-size:0.9rem;cursor:pointer;font-family:inherit;}' +
    '.vx-dismiss:hover{color:#fff4ca;}' +
    '.vx-close{position:absolute;top:0.8rem;right:1.1rem;background:none;border:none;font-size:1.7rem;line-height:1;color:rgba(255,244,202,0.55);cursor:pointer;}' +
    '.vx-close:hover{color:#fff4ca;}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.className = 'vx-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'vxTitle');
  overlay.hidden = true;
  overlay.innerHTML = '' +
    '<div class="vx-modal">' +
      '<button class="vx-close" type="button" aria-label="Close">&times;</button>' +
      '<span class="vx-eyebrow">Before you go</span>' +
      '<h2 class="vx-title" id="vxTitle">Build your Brand Brain, complimentary.</h2>' +
      '<p class="vx-body">The single source of truth that keeps everything on brand. We hand you the tools and the prompt, and you build it in a day, on your own computer. Yours to keep, whether or not we ever work together.</p>' +
      '<a class="vx-cta" href="/brand-brain/">Get the Starter Kit</a>' +
      '<button class="vx-dismiss" type="button">Not now</button>' +
    '</div>';
  document.body.appendChild(overlay);

  var shown = false;
  function open() {
    if (shown) return;
    shown = true;
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    overlay.hidden = false;
    // next frame so the transition runs
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    document.removeEventListener('mouseout', onMouseOut);
    if (window.gtag) gtag('event', 'exit_intent_shown', { event_category: 'lead_magnet', event_label: 'brand_brain' });
  }
  function close() {
    overlay.classList.remove('is-open');
    setTimeout(function () { overlay.hidden = true; }, 300);
  }

  function onMouseOut(e) {
    if (e.clientY <= 0 && !e.relatedTarget) open();
  }

  overlay.querySelector('.vx-close').addEventListener('click', close);
  overlay.querySelector('.vx-dismiss').addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) close(); });
  overlay.querySelector('.vx-cta').addEventListener('click', function () {
    if (window.gtag) gtag('event', 'exit_intent_brand_brain_click', { event_category: 'lead_magnet', event_label: 'brand_brain' });
  });

  // Arm after a short delay so it never fires on an immediate bounce
  setTimeout(function () { document.addEventListener('mouseout', onMouseOut); }, 5000);
}());
