(() => {
  'use strict';
  const { categories, items } = window.VuonPhoMaterials;
  const grid = document.querySelector('#materials-grid');
  const search = document.querySelector('#material-search');
  const category = document.querySelector('#material-category');
  const more = document.querySelector('#materials-more');
  const dialog = document.querySelector('#material-detail');
  const content = document.querySelector('#material-detail-content');
  let limit = 4;
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi').trim();
  const price = item => item.price === null || item.price === '' || item.price === undefined ? (item.priceLabel || 'Đang cập nhật') : new Intl.NumberFormat('vi-VN', {maximumFractionDigits:0}).format(item.price) + 'đ';
  // Real products share a public presentation; unverified inventory stays internal.
  const isRealProduct = item => item.isDemo === false;
  const stockInformation = item => {
    if (isRealProduct(item) && item.stockStatusConfirmed !== true) return '';
    return '<p>Tình trạng: ' + escape(item.stockStatus || 'Đang cập nhật') + '</p>';
  };
  const displayName = item => item.isDemo ? item.name.replace(/\s*\(DEMO\)/gi, '').trim() : item.name;
  const displayDescription = item => item.isDemo ? 'Mô tả đang cập nhật' : (item.description || 'Mô tả đang cập nhật');
  const contact = item => 'contact.html?material=' + encodeURIComponent(displayName(item)) + '#note';
  const placeholder = '<div class="material-placeholder"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M32 54V28M32 40C12 40 10 24 10 16c18 0 22 10 22 24Zm0-10C32 14 42 10 54 10c0 16-8 20-22 20Z"/></svg><span>Hình ảnh đang cập nhật</span></div>';
  const image = item => item.image ? `<div class="material-image"><img src="${escape(item.image)}" alt="${escape(displayName(item))}" loading="lazy"></div>` : placeholder;
  function fallbackImages(root) {
    root.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {img.parentElement.outerHTML = placeholder;}, {once:true}));
  }
  let galleryImages = [];
  function gallery(item) {
    galleryImages = item.images?.length ? item.images : [];
    if (!galleryImages.length) return image(item);
    return '<div class="material-gallery"><div class="material-gallery-stage"><img id="material-gallery-main" src="' + escape(galleryImages[0].src) + '" alt="' + escape(galleryImages[0].alt) + '"></div><div class="material-thumbnails" role="group" aria-label="Ảnh sản phẩm">' + galleryImages.map((img, index) => '<button type="button" data-gallery-index="' + index + '" aria-label="Xem ảnh ' + (index + 1) + ': ' + escape(img.alt) + '" aria-pressed="' + (index === 0) + '"><img src="' + escape(img.src) + '" alt="" loading="lazy"></button>').join('') + '</div></div>';
  }
  content.addEventListener('click', event => {
    const button = event.target.closest('[data-gallery-index]');
    if (!button) return;
    const img = galleryImages[Number(button.dataset.galleryIndex)];
    if (!img) return;
    const main = content.querySelector('#material-gallery-main');
    if (!main) return;
    main.src = img.src;
    main.alt = img.alt;
    content.querySelectorAll('[data-gallery-index]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
  });
  categories.forEach(name => category.add(new Option(name, name)));
  function render() {
    const matches = items.filter(item => normalize(item.name).includes(normalize(search.value)) && (!category.value || item.category === category.value));
    grid.innerHTML = matches.slice(0, limit).map(item => `<article class="material-card">${image(item)}<div class="material-card-body"><p class="material-category">${escape(item.category)}</p><h3>${escape(displayName(item))}</h3><p class="material-price">${escape(price(item))}</p><div class="material-actions"><button type="button" class="material-detail-button" data-id="${escape(item.id)}" aria-label="Xem chi tiết ${escape(displayName(item))}">Xem chi tiết</button><a class="btn" href="${escape(contact(item))}">Liên hệ tư vấn</a></div></div></article>`).join('');
    document.querySelector('#materials-count').textContent = `Hiển thị ${Math.min(limit, matches.length)} / ${matches.length} vật tư`;
    document.querySelector('#materials-empty').hidden = matches.length > 0;
    more.hidden = matches.length <= limit;
    fallbackImages(grid);
  }
  [search, category].forEach(el => el.addEventListener(el === search ? 'input' : 'change', () => {limit = 4; render();}));
  more.addEventListener('click', () => {limit += 4; render();});
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    const item = items.find(item => item.id === button.dataset.id);
    if (!item) return;
    const specs = Object.entries(item.specifications || {});
    content.innerHTML = `${gallery(item)}<p class="material-category">${escape(item.category)}</p>${item.isDemo ? "" : `<p class="material-category">Mã sản phẩm: ${escape(item.id)}</p>`}<h2 id="material-detail-title">${escape(displayName(item))}</h2>${isRealProduct(item) ? `<p class="material-price">${escape(price(item))}</p>` : ""}<p class="material-description">${escape(displayDescription(item))}</p>${!isRealProduct(item) ? `<p class="material-price">${escape(price(item))}</p>` : ""}${!isRealProduct(item) && item.referencePrice != null ? `<p class="material-reference-price">Giá tham khảo: ${escape(new Intl.NumberFormat("vi-VN").format(item.referencePrice))} VNĐ (không phải giá bán Vườn Phố)</p>` : ""}${item.advantages?.length ? `<h3>Ưu điểm</h3><ul class="material-advantages">${item.advantages.map(text => `<li>${escape(text)}</li>`).join("")}</ul>` : ""}<h3>Thông số kỹ thuật</h3>${specs.length ? '<dl>' + specs.map(([key,value]) => `<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`).join('') + '</dl>' : '<p>Đang cập nhật</p>'}${stockInformation(item)}<a class="btn" href="${escape(contact(item))}">Liên hệ tư vấn</a>`;
    fallbackImages(content);
    dialog.showModal();
  });
  dialog.querySelector('.material-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {if (event.target === dialog) {const box = dialog.getBoundingClientRect(); if(event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();}});
  render();
})();
