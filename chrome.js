/**
 * Lecture deck chrome.
 * Hides the header while presenting, and adds session shortcuts that do not
 * collide with reveal.js, which already owns the arrow keys for slides.
 */
(function () {
  'use strict';

  var bar = document.querySelector('.jw-bar');
  if (!bar) return;

  var root = document.documentElement;

  function setHidden(hidden) {
    bar.classList.toggle('is-hidden', hidden);
    root.classList.toggle('jw-bare', hidden);
  }

  // Fullscreen means presenting, so get out of the way.
  document.addEventListener('fullscreenchange', function () {
    setHidden(Boolean(document.fullscreenElement));
  });

  function go(rel) {
    var link = bar.querySelector('a[rel="' + rel + '"]');
    if (link) window.location.href = link.getAttribute('href');
  }

  document.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    var target = event.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

    // Shift with the arrows jumps deck to deck; plain arrows stay with reveal.
    if (event.shiftKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      go('prev');
    } else if (event.shiftKey && event.key === 'ArrowRight') {
      event.preventDefault();
      go('next');
    } else if (event.key === 'h' || event.key === 'H') {
      setHidden(!bar.classList.contains('is-hidden'));
    }
  });
})();
