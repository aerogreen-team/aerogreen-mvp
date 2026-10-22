// Preserve legacy introduction links without changing product or account flows.
(() => {
  'use strict';
  const destinations = { comparison: 'comparison', 'how-it-works': 'how-it-works', faq: 'faq', packages: 'packages', 'quy-trinh': 'quy-trinh', 'lien-he': 'lien-he' };
  const target = destinations[window.location.hash.slice(1)] || 'gioi-thieu';
  window.location.replace('index.html' + window.location.search + '#' + target);
})();
