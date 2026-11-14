/* Gallery for the homepage installation section only. Existing galleries are untouched. */
(() => {
  'use strict';
  const section = document.querySelector('.home-installations');
  if (!section) return;
  const items = (window.VuonPhoInstallations || []).filter(item => item.confirmedReal === true && item.src);
  if (!items.length) return;
  const creditLabels = {vuonpho:'Công trình VƯỜN PHỐ',partner:'Ảnh do đối tác cung cấp','project-provided':'Ảnh thực tế do dự án cung cấp'};
  const credit = item => (creditLabels[item.credit?.type] || creditLabels['project-provided']) + (item.credit?.type === 'partner' && item.credit.name ? ': ' + item.credit.name : '');
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox installation-lightbox';
  dialog.setAttribute('aria-labelledby', 'installation-lightbox-title');
  dialog.innerHTML = '<div class="lightbox-header"><h2 id="installation-lightbox-title">Hình ảnh lắp đặt thực tế</h2><button type="button" class="lightbox-close" aria-label="Đóng bộ sưu tập ảnh">×</button></div><figure><img class="installation-full-image" alt="" decoding="async"><figcaption id="installation-lightbox-caption"></figcaption></figure><p class="installation-photo-credit"></p><p class="installation-image-error" role="alert" hidden>Không tải được ảnh. Vui lòng thử ảnh khác.</p><div class="installation-controls"><button type="button" class="installation-nav installation-prev" aria-label="Ảnh trước">← Trước</button><span class="installation-counter" role="status" aria-live="polite"></span><button type="button" class="installation-nav installation-next" aria-label="Ảnh tiếp theo">Sau →</button></div>';
  document.body.appendChild(dialog);
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const source = dialog.querySelector('.installation-photo-credit');
  const count = dialog.querySelector('.installation-counter');
  const error = dialog.querySelector('.installation-image-error');
  let current = 0, previousFocus = null, previousOverflow = '';
  function render() {
    const item = items[current];
    image.src = item.src;
    image.alt = item.alt || item.caption || '';
    image.width = item.width || 1600;
    image.height = item.height || 1200;
    caption.textContent = item.caption || '';
    source.textContent = credit(item);
    count.textContent = (current + 1) + ' / ' + items.length;
    error.hidden = true;
  }
  function change(delta) {current = (current + delta + items.length) % items.length; render();}
  function open(index, trigger) {
    current = Math.min(Math.max(index,0),items.length - 1);
    previousFocus = trigger;
    previousOverflow = document.body.style.overflow;
    render();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
  image.addEventListener('error', () => {error.hidden = false;});
  dialog.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.installation-prev').addEventListener('click', () => change(-1));
  dialog.querySelector('.installation-next').addEventListener('click', () => change(1));
  dialog.querySelectorAll('.installation-nav').forEach(button => {button.disabled = items.length < 2;});
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {event.preventDefault(); change(-1);}
    if (event.key === 'ArrowRight') {event.preventDefault(); change(1);}
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    previousFocus?.focus({preventScroll:true});
  });
  // Keep previews aligned with the data file when a confirmed image is added/reordered.
  section.querySelectorAll('[data-installation-index]').forEach(trigger => {
    const index = Math.min(Number(trigger.dataset.installationIndex) || 0, items.length - 1);
    const item = items[index];
    trigger.href = item.src;
    const preview = trigger.querySelector('img');
    if (preview) {
      preview.src = item.src;
      preview.alt = item.alt;
      preview.width = item.width;
      preview.height = item.height;
      const variant = trigger.querySelector('source');
      if (variant) variant.srcset = item.thumbnail ? item.thumbnail + ' 800w, ' + item.src + ' ' + item.width + 'w' : item.src;
      const figure = trigger.closest('figure');
      figure.querySelector('[data-installation-caption]').textContent = item.caption || '';
      figure.querySelector('[data-installation-credit]').textContent = credit(item);
    }
    trigger.addEventListener('click', event => {event.preventDefault(); open(index, trigger);});
  });
})();
