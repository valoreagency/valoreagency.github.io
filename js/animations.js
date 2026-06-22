(function () {
  'use strict';

  // Nav: transparent over dark hero, immediately solid on pages without one
  var nav = document.querySelector('.nav');
  var hasDarkHero = document.querySelector('.hero, .page-hero');
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
  var heroEl = document.querySelector('.hero, .page-hero');
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
  var SKIP = ['/marketing-cost-calculator', '/brand-assessment', '/pricing-readiness', '/thank-you', '/contact'];
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
      '<h2 class="vx-title" id="vxTitle">What is your marketing actually costing you?</h2>' +
      '<p class="vx-body">A two-minute calculator shows what a full-time marketing manager really costs, and how much you could free up each month for the work that brings in clients.</p>' +
      '<a class="vx-cta" href="/marketing-cost-calculator/">Run the Numbers</a>' +
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
    if (window.gtag) gtag('event', 'exit_intent_shown', { event_category: 'lead_magnet', event_label: 'cost_calculator' });
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
    if (window.gtag) gtag('event', 'exit_intent_calculator_click', { event_category: 'lead_magnet', event_label: 'cost_calculator' });
  });

  // Arm after a short delay so it never fires on an immediate bounce
  setTimeout(function () { document.addEventListener('mouseout', onMouseOut); }, 5000);
}());
