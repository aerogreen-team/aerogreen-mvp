/* Product cards link to the articles already registered in the existing library. */
(() => {
  'use strict';
  const grid = document.querySelector('.product-grid');
  if (!grid) return;
  const articles = window.VUONPHO_ARTICLES || [];
  function linkCards() {
    grid.querySelectorAll('.product-kit').forEach(card => {
      const title = card.querySelector('h3');
      if (!title || title.querySelector('.product-article-link')) return;
      const name = title.textContent.trim();
      const article = articles.find(item => item.related_product === name && item.slug);
      if (!article) return;
      const link = document.createElement('a');
      link.className = 'product-article-link';
      link.href = 'noi-dung.html?slug=' + encodeURIComponent(article.slug);
      link.setAttribute('aria-label', 'Đọc bài viết về ' + name);
      link.textContent = name;
      title.replaceChildren(link);
    });
  }
  linkCards();
  // The existing API renderer may replace the cards after the initial page load.
  new MutationObserver(linkCards).observe(grid, {childList:true});
})();
