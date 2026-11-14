/**
 * VƯỜN PHỐ — Thư viện bài viết (noi-dung.html)
 *
 *  - noi-dung.html              → danh sách bài viết (bài có sẵn + bài đăng từ admin)
 *  - noi-dung.html?slug=abc-xyz → chi tiết một bài viết
 *
 * Bài có sẵn nằm trong js/articles-data.js (body_html tin cậy, viết tay).
 * Bài do admin tạo đọc từ /api/pages/:slug; body là mini-markdown nên được
 * escape toàn bộ rồi mới dựng HTML — không render HTML thô từ dữ liệu người dùng.
 */
(function () {
  "use strict";

  const STATIC_ARTICLES = Array.isArray(window.VUONPHO_ARTICLES) ? window.VUONPHO_ARTICLES : [];

  const CATEGORY_LABELS = {
    "bo-khi-canh": "Bộ khí canh",
    "kien-thuc": "Kiến thức",
    "huong-dan": "Hướng dẫn",
  };

  const ARROW =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
  const ICON_DOC =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';

  const el = (id) => document.getElementById(id);

  /** Đang xem danh sách hay chi tiết */
  let currentFilter = "all";
  let libraryItems = [];
  let relatedItemsCategory = "";

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Chỉ cho phép ảnh nội bộ hoặc http(s) — chặn javascript:, data:, file:… */
  function isSafeImageUrl(url) {
    const value = String(url == null ? "" : url).trim();
    if (!value) return false;
    if (/^https?:\/\//i.test(value)) return true;
    return !value.startsWith("//") && /^[a-z0-9._%()/-]+$/i.test(value);
  }

  /** **đậm**, [chữ](link), ![mô tả](ảnh) và `mã` — chạy sau escapeHtml nên an toàn */
  function inline(text) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_m, alt, url) {
        return isSafeImageUrl(url)
          ? '<img src="' + url + '" alt="' + alt + '" loading="lazy">'
          : alt;
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_m, label, url) {
        return /^(https?:\/\/|mailto:|\/|#|[\w.-]+\.html|[\w-]+\?)/i.test(url)
          ? '<a href="' + url + '">' + label + "</a>"
          : label;
      });
  }

  /** Văn bản thuần → HTML: đoạn văn, "##"/"###" là tiêu đề mục, "-" là gạch đầu dòng */
  function renderBody(text) {
    const lines = String(text || "")
      .replace(/\r\n/g, "\n")
      .split("\n");
    const out = [];
    let bullets = null;

    const flushList = () => {
      if (bullets) {
        out.push("<ul>" + bullets.join("") + "</ul>");
        bullets = null;
      }
    };

    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) {
        flushList();
        return;
      }

      const standalone = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (standalone) {
        flushList();
        const alt = standalone[1].trim();
        out.push(
          isSafeImageUrl(standalone[2])
            ? '<figure class="article-image"><img src="' +
                escapeHtml(standalone[2]) +
                '" alt="' +
                escapeHtml(alt) +
                '" loading="lazy">' +
                (alt ? "<figcaption>" + escapeHtml(alt) + "</figcaption>" : "") +
                "</figure>"
            : "<p>" + escapeHtml(alt) + "</p>"
        );
      } else if (line.startsWith("### ")) {
        flushList();
        out.push("<h3>" + inline(line.slice(4)) + "</h3>");
      } else if (line.startsWith("## ") || line.startsWith("# ")) {
        flushList();
        out.push("<h2>" + inline(line.replace(/^#+\s+/, "")) + "</h2>");
      } else if (/^[-*]\s+/.test(line)) {
        bullets = bullets || [];
        bullets.push("<li>" + inline(line.replace(/^[-*]\s+/, "")) + "</li>");
      } else {
        flushList();
        out.push("<p>" + inline(line) + "</p>");
      }
    });

    flushList();
    return out.join("\n");
  }

  function normalize(item, source) {
    return {
      slug: String(item.slug || ""),
      title: String(item.title || ""),
      summary: String(item.summary || ""),
      category: CATEGORY_LABELS[item.category] ? item.category : "kien-thuc",
      cover_image: item.related_product === "Rooftop Kit" ? "public/images/installations/optimized/ban-cong-05.jpg" : String(item.cover_image || ""),
      related_product: String(item.related_product || ""),
      sort_order: Number(item.sort_order) || 0,
      updated_at: item.updated_at || "",
      specs: Array.isArray(item.specs) ? item.specs : [],
      body_html: typeof item.body_html === "string" ? item.body_html : "",
      body: typeof item.body === "string" ? item.body : "",
      source: source,
    };
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || "Kiến thức";
  }

  function articleHref(slug) {
    return "noi-dung.html?slug=" + encodeURIComponent(slug);
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  /* ===================== Tải dữ liệu ===================== */

  async function getApiBase() {
    try {
      return typeof apiUrl === "function" ? await apiUrl("") : null;
    } catch {
      return null;
    }
  }

  async function fetchApiPages() {
    const base = await getApiBase();
    if (!base) return null;
    try {
      const res = await fetch(base.replace(/\/$/, "") + "/pages", {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      const result = await res.json();
      return Array.isArray(result.data) ? result.data : [];
    } catch {
      return null;
    }
  }

  async function fetchApiPage(slug) {
    const base = await getApiBase();
    if (!base) return null;
    try {
      const res = await fetch(base.replace(/\/$/, "") + "/pages/" + encodeURIComponent(slug), {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return null;
      const result = await res.json();
      return result && result.data ? result.data : null;
    } catch {
      return null;
    }
  }

  function mergeItems(apiPages) {
    const bySlug = new Map();
    STATIC_ARTICLES.forEach((item) => {
      bySlug.set(item.slug, normalize(item, "static"));
    });
    apiPages.forEach((item) => {
      const page = normalize(item, "api");
      if (page.slug) bySlug.set(page.slug, page);
    });
    return Array.from(bySlug.values()).sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.title.localeCompare(b.title, "vi");
    });
  }

  /* ===================== Danh sách ===================== */

  function cardHtml(item) {
    const media = isSafeImageUrl(item.cover_image)
      ? '<img src="' + escapeHtml(item.cover_image) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
      : ICON_DOC;
    return (
      '<a class="content-card" href="' +
      escapeHtml(articleHref(item.slug)) +
      '">' +
      '<div class="cc-media">' +
      media +
      "</div>" +
      '<div class="cc-body">' +
      '<span class="cc-cat">' +
      escapeHtml(categoryLabel(item.category)) +
      "</span>" +
      "<h3>" +
      escapeHtml(item.title) +
      "</h3>" +
      "<p>" +
      escapeHtml(item.summary) +
      "</p>" +
      '<span class="cc-more">Đọc bài viết ' +
      ARROW +
      "</span>" +
      "</div></a>"
    );
  }

  function renderFilters(items) {
    const box = el("nd-filters");
    if (!box) return;
    const counts = { all: items.length };
    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });

    const options = [{ value: "all", label: "Tất cả" }].concat(
      Object.keys(CATEGORY_LABELS).map((value) => ({ value: value, label: CATEGORY_LABELS[value] }))
    );

    box.innerHTML = options
      .filter((opt) => opt.value === "all" || counts[opt.value])
      .map(
        (opt) =>
          '<button type="button" class="filter-chip' +
          (currentFilter === opt.value ? " active" : "") +
          '" data-filter="' +
          opt.value +
          '">' +
          escapeHtml(opt.label) +
          ' <span aria-hidden="true">' +
          (counts[opt.value] || 0) +
          "</span></button>"
      )
      .join("");

    box.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        renderFilters(libraryItems);
        renderList();
      });
    });
  }

  function renderList() {
    const grid = el("nd-list");
    if (!grid) return;
    const items =
      currentFilter === "all"
        ? libraryItems
        : libraryItems.filter((item) => item.category === currentFilter);

    grid.innerHTML = items.length
      ? items.map(cardHtml).join("")
      : '<p class="content-empty">Chưa có bài viết trong danh mục này.</p>';
  }

  async function loadLibrary() {
    libraryItems = mergeItems([]);
    renderFilters(libraryItems);
    renderList();

    const apiPages = await fetchApiPages();
    if (Array.isArray(apiPages) && apiPages.length) {
      libraryItems = mergeItems(apiPages);
      renderFilters(libraryItems);
      renderList();
      const note = el("nd-api-note");
      if (note) note.hidden = false;
    }
  }

  /* ===================== Chi tiết ===================== */

  function relatedHtml(currentSlug) {
    const others = libraryItems.filter((item) => item.slug !== currentSlug);
    const sameCategory = others.filter((item) => item.category === relatedItemsCategory);
    const pool = sameCategory.concat(others.filter((item) => !sameCategory.includes(item)));
    return pool
      .slice(0, 2)
      .map(
        (item) =>
          '<a class="related-card" href="' +
          escapeHtml(articleHref(item.slug)) +
          '">' +
          '<span class="cc-cat">' +
          escapeHtml(categoryLabel(item.category)) +
          "</span>" +
          "<h3>" +
          escapeHtml(item.title) +
          "</h3>" +
          "<p>" +
          escapeHtml(item.summary) +
          "</p>" +
          '<span class="cc-more">Đọc tiếp ' +
          ARROW +
          "</span>" +
          "</a>"
      )
      .join("");
  }

  function showState(title, text, actionHref, actionLabel) {
    const box = el("nd-state");
    if (!box) return;
    box.innerHTML =
      '<span class="sb-ic">' +
      ICON_DOC +
      "</span>" +
      "<h2>" +
      escapeHtml(title) +
      "</h2>" +
      "<p>" +
      escapeHtml(text) +
      "</p>" +
      (actionHref
        ? '<a class="btn" href="' + escapeHtml(actionHref) + '">' + escapeHtml(actionLabel) + "</a>"
        : "");
    const section = el("nd-state-section");
    if (section) section.hidden = false;
  }

  function renderDetail(item) {
    relatedItemsCategory = item.category;
    document.title = item.title + " | VƯỜN PHỐ";

    const crumb = el("nd-crumb");
    if (crumb) crumb.textContent = item.title;

    const heroEyebrow = el("nd-hero-eyebrow");
    if (heroEyebrow) heroEyebrow.textContent = categoryLabel(item.category);

    const title = el("nd-title");
    if (title) title.textContent = item.title;

    const heroLead = el("nd-hero-lead");
    if (heroLead) heroLead.textContent = item.summary || "Bài viết do VƯỜN PHỐ cập nhật.";

    const meta = el("nd-meta");
    if (meta) {
      const date = formatDate(item.updated_at);
      meta.innerHTML =
        '<span class="cc-cat">' +
        escapeHtml(categoryLabel(item.category)) +
        "</span>" +
        (date ? "<span>" + escapeHtml(date) + "</span>" : "<span>VƯỜN PHỐ</span>");
    }

    const cover = el("nd-cover");
    if (cover) {
      cover.innerHTML = isSafeImageUrl(item.cover_image)
        ? '<figure class="article-cover"><img src="' +
          escapeHtml(item.cover_image) +
          '" alt="' +
          escapeHtml(item.title) +
          '" loading="eager"></figure>'
        : "";
    }

    const body = el("nd-body");
    if (body) {
      body.innerHTML = item.body_html ? item.body_html : renderBody(item.body);
    }

    const specsCard = el("nd-specs-card");
    const specsList = el("nd-specs");
    if (specsCard && specsList) {
      if (item.specs.length) {
        specsList.innerHTML = item.specs
          .map(
            (spec) =>
              "<li><span>" +
              escapeHtml(spec.label) +
              "</span><b>" +
              escapeHtml(spec.value) +
              "</b></li>"
          )
          .join("");
        specsCard.hidden = false;
      } else {
        specsCard.hidden = true;
      }
    }

    const productCard = el("nd-product-card");
    const productText = el("nd-product-name");
    if (productCard && productText) {
      if (item.related_product) {
        productText.textContent = item.related_product;
        productCard.hidden = false;
      } else {
        productCard.hidden = true;
      }
    }

    const related = el("nd-related");
    if (related) related.innerHTML = relatedHtml(item.slug);

    const listSection = el("nd-list-section");
    if (listSection) listSection.hidden = true;
    const detailSection = el("nd-detail-section");
    if (detailSection) detailSection.hidden = false;
    const stateSection = el("nd-state-section");
    if (stateSection) stateSection.hidden = true;
  }

  async function loadDetail(slug) {
    libraryItems = mergeItems([]);

    const staticItem = libraryItems.find((item) => item.slug === slug);
    if (staticItem) {
      renderDetail(staticItem);
    } else {
      const title = el("nd-title");
      if (title) title.textContent = "Đang tải bài viết…";
    }

    const apiPages = await fetchApiPages();
    if (Array.isArray(apiPages) && apiPages.length) {
      libraryItems = mergeItems(apiPages);
    }

    if (!staticItem && apiPages === null) {
      const title = el("nd-title");
      if (title) title.textContent = "Không kết nối được máy chủ";
      const lead = el("nd-hero-lead");
      if (lead) lead.textContent = "Bài viết này cần backend đang chạy để tải nội dung.";
      showState(
        "Không kết nối được máy chủ",
        "Bài viết này được đăng từ trang quản trị nên cần backend đang chạy. Vui lòng kiểm tra kết nối rồi thử lại.",
        "noi-dung.html",
        "Về thư viện bài viết"
      );
      return;
    }

    const isApiPage = Array.isArray(apiPages) && apiPages.some((item) => item.slug === slug);
    const apiItem = isApiPage ? await fetchApiPage(slug) : null;
    if (apiItem) {
      renderDetail(normalize(apiItem, "api"));
      return;
    }

    if (staticItem) return;

    const title = el("nd-title");
    if (title) title.textContent = "Không tìm thấy bài viết";
    const lead = el("nd-hero-lead");
    if (lead) lead.textContent = "Bài viết có thể đã bị xoá hoặc chưa được xuất bản.";
    showState(
      "Không tìm thấy bài viết",
      "Bài viết có thể đã bị xoá hoặc chưa được xuất bản.",
      "noi-dung.html",
      "Về thư viện bài viết"
    );
  }

  /* ===================== Khởi động ===================== */

  const slug = (new URLSearchParams(window.location.search).get("slug") || "").trim();
  if (slug) {
    const listSection = el("nd-list-section");
    if (listSection) listSection.hidden = true;
    const heroTitle = el("nd-title");
    if (heroTitle) heroTitle.textContent = "Bài viết";
    const heroLead = el("nd-hero-lead");
    if (heroLead) heroLead.textContent = "Đang tải nội dung…";
    const crumb = el("nd-crumb");
    if (crumb) crumb.textContent = "Chi tiết";
    document.title = "Bài viết | VƯỜN PHỐ";

    loadDetail(slug);
  } else {
    loadLibrary();
  }
})();
