/* =========================================================
   AeroGreen Hub — Interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Sticky header + scroll progress + back-to-top ---------- */
  const header = $(".header");
  const onScroll = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 20);
    const bar = $(".progress-bar");
    if (bar) {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.width = scrolled * 100 + "%";
    }
    const tt = $(".to-top");
    if (tt) tt.classList.toggle("show", window.scrollY > 480);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $(".burger");
  const drawer = $(".mobile-nav");
  const overlay = $(".overlay");
  function closeMenu() {
    burger && burger.classList.remove("open");
    drawer && drawer.classList.remove("open");
    overlay && overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
  function toggleMenu() {
    const open = drawer && drawer.classList.toggle("open");
    burger && burger.classList.toggle("open", open);
    overlay && overlay.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger && burger.addEventListener("click", toggleMenu);
  overlay && overlay.addEventListener("click", closeMenu);
  $$(".mobile-nav a").forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  /* ---------- Scroll reveal ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$("[data-count]");
  if ("IntersectionObserver" in window && counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const dur = 1400, start = performance.now();
        const step = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    let t = $(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
      document.body.appendChild(t);
    }
    $("span", t).textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- Product carry-over ---------- */
  window.chooseProduct = function (productName) {
    try { localStorage.setItem("selectedProduct", productName); } catch (e) {}
    window.location.href = "contact.html";
  };

  /* ---------- Contact form ---------- */
  window.submitForm = function () {
    const val = (s) => { const el = $(s); return el ? el.value : ""; };
    const name = val("#name");
    const phone = val("#phone");
    const areaInstall = val("#areaInstall");
    const budgetContact = val("#budgetContact");
    const note = val("#note");

    if (name.trim() === "") { toast("Vui lòng nhập họ và tên."); const n = $("#name"); n && n.focus(); return; }
    if (!/^[0-9 +().-]{8,15}$/.test(phone.trim())) { toast("Số điện thoại chưa hợp lệ."); const p = $("#phone"); p && p.focus(); return; }

    console.log("Lead:", { name, phone, areaInstall, budgetContact, note });

    const ok = $("#success");
    if (ok) {
      ok.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>Đã ghi nhận! AeroGreen Hub sẽ liên hệ tư vấn trong vòng 24 giờ.</span>';
      ok.classList.add("show");
    }
    toast("Gửi thông tin thành công!");
    ["#name", "#phone", "#areaInstall", "#budgetContact", "#note"].forEach((s) => { const el = $(s); if (el) el.value = ""; });
    try { localStorage.removeItem("selectedProduct"); } catch (e) {}
  };

  /* ---------- Kit advisor ---------- */
  window.showAdvice = function () {
    const val = (s) => { const el = $(s); return el ? el.value : ""; };
    const houseType = val("#houseType");
    const area = val("#area");
    const budget = val("#budget");

    let product, reason;
    if (houseType === "chungcu" || area === "small" || budget === "low") {
      product = "Mini Kit";
      reason = "Phù hợp với chung cư, ban công nhỏ và khách hàng muốn bắt đầu trải nghiệm khí canh với chi phí hợp lý. Dễ lắp đặt, dễ chăm sóc.";
    } else if (area === "medium" || budget === "mid") {
      product = "Family Kit";
      reason = "Mẫu bán chạy nhất — phù hợp nhà phố hoặc ban công vừa, đủ sản lượng rau sạch cho cả gia đình mỗi ngày.";
    } else {
      product = "Rooftop Kit";
      reason = "Năng suất tối đa cho sân thượng hoặc không gian lớn, dành cho khách hàng muốn xây dựng vườn rau đô thị thực sự tại nhà.";
    }

    const result = $("#adviceResult");
    if (!result) return;
    result.innerHTML =
      "<h3>Gợi ý phù hợp cho bạn: " + product + "</h3>" +
      '<p class="rec-price">Giá: Liên hệ báo giá — tư vấn miễn phí</p>' +
      "<p><b>Vì sao phù hợp:</b> " + reason + "</p>" +
      "<p><b>Vai trò của AeroGreen Hub:</b> Tư vấn trung lập và kết nối bạn với giải pháp khí canh phù hợp nhất.</p>" +
      "<button class=\"btn\" type=\"button\" onclick=\"chooseProduct('" + product + "')\">Đăng ký tư vấn gói này" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg></button>';
    result.classList.add("show");
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  /* ---------- Prefill note from chosen product ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    let selected = null;
    try { selected = localStorage.getItem("selectedProduct"); } catch (e) {}
    const note = $("#note");
    if (selected && note && !note.value) {
      note.value = "Tôi muốn được tư vấn gói " + selected + ".";
    }
  });
})();
