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
