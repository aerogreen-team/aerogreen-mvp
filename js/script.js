/* =========================================================
   VƯỜN PHỐ — Interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  function setupSiteNavigation() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    const solutionPages = ["services.html", "products.html", "quotation.html", "materials.html"];
    const explorePages = ["customers.html", "guide.html", "news.html"];
    const link = (href, label) => `<a href="${href}"${page === href ? ' class="active"' : ""}>${label}</a>`;
    const desktop = $(".nav");
    const mobile = $(".mobile-nav");

    if (desktop) {
      desktop.innerHTML = `${link("index.html", "Trang chủ")}${link("about.html", "Giới thiệu")}<div class="nav-group${solutionPages.includes(page) ? " active" : ""}"><button class="nav-group-toggle" type="button" aria-expanded="false">Giải pháp <span aria-hidden="true">⌄</span></button><div class="nav-dropdown">${link("services.html", "Dịch vụ")}${link("products.html", "Sản phẩm")}${link("quotation.html", "Báo giá trọn gói")}${link("materials.html", "Giá vật tư")}</div></div><div class="nav-group${explorePages.includes(page) ? " active" : ""}"><button class="nav-group-toggle" type="button" aria-expanded="false">Khám phá <span aria-hidden="true">⌄</span></button><div class="nav-dropdown">${link("customers.html", "Khách hàng")}${link("guide.html", "Hướng dẫn")}${link("news.html", "Tin tức")}</div></div>${link("contact.html", "Liên hệ")}`;
      const groups = $$(".nav-group", desktop);
      groups.forEach((group) => {
        const toggle = $(".nav-group-toggle", group);
        toggle.addEventListener("click", () => {
          groups.forEach((other) => {
            if (other !== group) {
              other.classList.remove("open");
              $(".nav-group-toggle", other).setAttribute("aria-expanded", "false");
            }
          });
          const open = group.classList.toggle("open");
          toggle.setAttribute("aria-expanded", String(open));
        });
      });
      document.addEventListener("click", (event) => {
        if (!desktop.contains(event.target)) {
          groups.forEach((group) => {
            group.classList.remove("open");
            $(".nav-group-toggle", group).setAttribute("aria-expanded", "false");
          });
        }
      });
    }

    if (mobile) {
      mobile.innerHTML = `${link("index.html", "Trang chủ")}${link("about.html", "Giới thiệu")}<details class="mobile-nav-group"${solutionPages.includes(page) ? " open" : ""}><summary>Giải pháp</summary>${link("services.html", "Dịch vụ")}${link("products.html", "Sản phẩm")}${link("quotation.html", "Báo giá trọn gói")}${link("materials.html", "Giá vật tư")}</details><details class="mobile-nav-group"${explorePages.includes(page) ? " open" : ""}><summary>Khám phá</summary>${link("customers.html", "Khách hàng")}${link("guide.html", "Hướng dẫn")}${link("news.html", "Tin tức")}</details>${link("contact.html", "Liên hệ")}<a href="contact.html" class="btn">Tư vấn miễn phí</a>`;
    }
  }

  function setupSiteFooter() {
    document.querySelectorAll(".footer-grid").forEach((grid) => {
      const columns = Array.from(grid.querySelectorAll(":scope > div"));
      const linksColumn = columns.find((column) => column.querySelector("h4")?.textContent.trim() === "Liên kết");
      const productsColumn = columns.find((column) => column.querySelector("h4")?.textContent.trim() === "Sản phẩm");
      const appendLink = (column, href, label) => {
        if (!column || column.querySelector(`a[href="${href}"]`)) return;
        const list = $("ul", column);
        if (list) list.insertAdjacentHTML("beforeend", `<li><a href="${href}">${label}</a></li>`);
      };
      appendLink(linksColumn, "quotation.html", "Báo giá trọn gói");
      appendLink(linksColumn, "materials.html", "Giá vật tư");
      appendLink(linksColumn, "customers.html", "Khách hàng");
      appendLink(linksColumn, "guide.html", "Hướng dẫn");
      appendLink(linksColumn, "news.html", "Tin tức");
      appendLink(productsColumn, "quotation.html", "Báo giá trọn gói");
      appendLink(productsColumn, "materials.html", "Giá vật tư");
    });
  }

  setupSiteNavigation();
  setupSiteFooter();

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
  $$(".mobile-nav details").forEach((group) => group.addEventListener("toggle", () => {
    if (group.open) $$(".mobile-nav details").filter((other) => other !== group).forEach((other) => { other.open = false; });
  }));
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
  // Thông số khách chọn trong "Trợ lý chọn gói" — chỉ có giá trị khi khách
  // thật sự bấm "Gợi ý gói cho tôi" ở trang này (xem showAdvice bên dưới)
  let advisorParams = null;

  window.chooseProduct = function (productName) {
    try {
      localStorage.setItem("selectedProduct", productName);
      if (advisorParams) localStorage.setItem("selectedParams", JSON.stringify(advisorParams));
      else localStorage.removeItem("selectedParams");
    } catch (e) {}
    window.location.href = "contact.html";
  };

  /* ---------- Contact form ---------- */
  window.submitForm = async function () {
    const val = (s) => { const el = $(s); return el ? el.value : ""; };
    const name = val("#name");
    const phone = val("#phone");
    const email = val("#email");
    const houseType = val("#houseType");
    const areaInstall = val("#areaInstall");
    const budgetContact = val("#budgetContact");
    const goal = val("#goal");
    const note = val("#note");

    if (name.trim() === "") { toast("Vui lòng nhập họ và tên."); const n = $("#name"); n && n.focus(); return; }
    if (!/^[0-9 +().-]{8,15}$/.test(phone.trim())) { toast("Số điện thoại chưa hợp lệ."); const p = $("#phone"); p && p.focus(); return; }
    if (email.trim() === "") { toast("Vui lòng nhập email."); const em = $("#email"); em && em.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast("Email chưa hợp lệ."); const em2 = $("#email"); em2 && em2.focus(); return; }

    // Nguồn kênh (utm_source) — dùng cho báo cáo OC2
    const utmSource =
      typeof window.VuonPho !== "undefined" && window.VuonPho.utm
        ? window.VuonPho.utm().source || ""
        : "";

    const payload = { name: name.trim(), phone: phone.trim(), email: email.trim(), house_type: houseType, area: areaInstall, budget: budgetContact, goal, note, source: utmSource };

    // Gửi lên API (base URL do js/auth.js quyết định), fallback local nếu backend không chạy
    let apiSuccess = false;
    try {
      if (window.VuonPho && window.VuonPho.api) {
        const r = await window.VuonPho.api("/contact", { method: "POST", body: payload });
        apiSuccess = !!(r.ok && r.json && r.json.success);
        if (!apiSuccess) console.warn("API trả lỗi:", r.json && r.json.error);
      }
    } catch (err) {
      console.warn("Không gọi được API, dùng fallback local:", err.message);
    }

    // Khách đã đăng nhập: yêu cầu được lưu thẳng vào "Yêu cầu tư vấn của tôi"
    const loggedIn =
      typeof window.VuonPho !== "undefined" &&
      window.VuonPho.isLoggedIn &&
      window.VuonPho.isLoggedIn();

    const ok = $("#success");
    if (ok) {
      const msg =
        apiSuccess && loggedIn
          ? 'Đã lưu vào <a href="account.html" style="color:inherit;text-decoration:underline">Yêu cầu tư vấn của tôi</a> — VƯỜN PHỐ sẽ liên hệ trong vòng 24 giờ.'
          : "Đã ghi nhận! VƯỜN PHỐ sẽ liên hệ tư vấn trong vòng 24 giờ.";
      ok.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>' + msg + "</span>";
      ok.classList.add("show");
    }
    toast("Gửi thông tin thành công!");
    ["#name", "#phone", "#email", "#areaInstall", "#budgetContact", "#note"].forEach((s) => { const el = $(s); if (el) el.value = ""; });
    try { localStorage.removeItem("selectedProduct"); } catch (e) {}
    try { localStorage.removeItem("selectedParams"); } catch (e) {}
  };

  /* ---------- Kit advisor ---------- */
  window.showAdvice = function () {
    const val = (s) => { const el = $(s); return el ? el.value : ""; };
    // Lấy nhãn hiển thị của <select> (vd "Vừa (5–15m²)") để điền vào ô văn bản
    const label = (s) => {
      const el = $(s);
      return el && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text.trim() : "";
    };
    const houseType = val("#houseType");
    const area = val("#area");
    const budget = val("#budget");

    // Ghi nhớ thông số để mang sang trang Liên hệ khi khách bấm đăng ký tư vấn
    advisorParams = {
      house_type: houseType,
      area: label("#area"),
      budget: label("#budget"),
    };

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
      "<p><b>Vai trò của VƯỜN PHỐ:</b> Tư vấn trung lập và kết nối bạn với giải pháp khí canh phù hợp nhất.</p>" +
      "<button class=\"btn\" type=\"button\" onclick=\"chooseProduct('" + product + "')\">Đăng ký tư vấn gói này" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg></button>';
    result.classList.add("show");
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  /* ---------- Prefill note + thông số từ trợ lý chọn gói ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    let selected = null;
    let params = null;
    try {
      selected = localStorage.getItem("selectedProduct");
      params = JSON.parse(localStorage.getItem("selectedParams") || "null");
    } catch (e) {}

    const note = $("#note");
    if (selected && note && !note.value) {
      note.value = "Tôi muốn được tư vấn gói " + selected + ".";
    }

    // Thông số khách vừa chọn ở trợ lý được ưu tiên hơn hồ sơ đã lưu,
    // vì đây là nhu cầu khách vừa xác nhận.
    if (params) {
      const fill = (sel, value) => {
        const el = $(sel);
        if (el && value) el.value = value;
      };
      fill("#houseType", params.house_type);
      fill("#areaInstall", params.area);
      fill("#budgetContact", params.budget);
    }
  });
})();
