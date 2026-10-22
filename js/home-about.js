// Open grouped content when a legacy or direct anchor points inside it.
(() => {
  'use strict';
  function revealAnchor() {
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    let parent = target.parentElement;
    let opened = false;
    while (parent) {
      if (parent.tagName === 'DETAILS' && !parent.open) {parent.open = true; opened = true;}
      parent = parent.parentElement;
    }
    if (opened) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange', revealAnchor);
  revealAnchor();
})();
