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

  // Growth graph: draw the line as it scrolls into view
  var graphs = Array.prototype.slice.call(document.querySelectorAll('.growth-graph'));
  if (graphs.length) {
    if ('IntersectionObserver' in window) {
      var gio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-drawn'); gio.unobserve(entry.target); }
        });
      }, { threshold: 0.3 });
      graphs.forEach(function (g) { gio.observe(g); });
    } else {
      graphs.forEach(function (g) { g.classList.add('is-drawn'); });
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
