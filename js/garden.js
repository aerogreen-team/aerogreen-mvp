/* Tương tác bổ sung: xem ảnh đầy đủ và chuyển động nhẹ có kiểm soát. */
(function () {
  "use strict";
  const triggers = document.querySelectorAll("[data-lightbox]");
  if (triggers.length) {
    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.setAttribute("aria-labelledby", "lightbox-title");
    dialog.innerHTML =
      '<div class="lightbox-header"><h2 id="lightbox-title">Thành quả thực tế</h2><button type="button" class="lightbox-close" aria-label="Đóng ảnh">×</button></div><figure><img width="1600" height="1200" alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(dialog);
    const img = dialog.querySelector("img");
    const caption = dialog.querySelector("figcaption");
    let previousFocus;
    const close = () => dialog.close();
    dialog.querySelector("button").addEventListener("click", close);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener("close", () => {
      document.body.style.overflow = "";
      if (previousFocus) previousFocus.focus();
    });
    triggers.forEach((button) =>
      button.addEventListener("click", () => {
        previousFocus = button;
        img.src = button.dataset.lightbox;
        img.alt = button.querySelector("img").alt;
        caption.textContent = button.dataset.caption;
        dialog.showModal();
        document.body.style.overflow = "hidden";
      }),
    );
  }
  const hero = document.querySelector(".garden-hero");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let scheduled = false;
  if (hero) {
    const update = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          hero.style.setProperty(
            "--hero-shift",
            motion.matches ? "0px" : Math.min(window.scrollY * 0.06, 28) + "px",
          );
          scheduled = false;
        });
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    motion.addEventListener("change", update);
  }
})();
