// ===== Configuration =====
const API_BASE = window.location.origin + "/api";
let currentPage = 1;

// ===== Auth =====
function getToken() {
  return localStorage.getItem("aerogreen_token") || sessionStorage.getItem("aerogreen_token");
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function apiFetch(url, options = {}) {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Token expired or invalid — redirect to login
    localStorage.removeItem("aerogreen_token");
    sessionStorage.removeItem("aerogreen_token");
    localStorage.removeItem("aerogreen_user");
    sessionStorage.removeItem("aerogreen_user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return res;
}

// Check auth on load
(function checkAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "/login";
    return;
  }

  // Show user info
  const userData = localStorage.getItem("aerogreen_user") || sessionStorage.getItem("aerogreen_user");
  if (userData) {
    try {
      const user = JSON.parse(userData);
      document.getElementById("header-user").textContent = `👤 ${user.displayName || user.username}`;
    } catch (e) {}
  }

  // Verify token is still valid
  fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() })
    .then((res) => res.json())
    .then((result) => {
      if (!result.data) {
        localStorage.removeItem("aerogreen_token");
        sessionStorage.removeItem("aerogreen_token");
        window.location.href = "/login";
      }
    })
    .catch(() => {
      window.location.href = "/login";
    });
})();

function logout() {
  localStorage.removeItem("aerogreen_token");
  sessionStorage.removeItem("aerogreen_token");
  localStorage.removeItem("aerogreen_user");
  sessionStorage.removeItem("aerogreen_user");
  window.location.href = "/login";
}

// ===== Utility =====
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount) {
  if (!amount) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}


/** Escape dữ liệu do người dùng nhập trước khi chèn vào innerHTML */
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PAGE_CATEGORY_MAP = {
  "bo-khi-canh": "Bộ khí canh",
  "kien-thuc": "Kiến thức",
  "huong-dan": "Hướng dẫn",
};

const STATUS_MAP = {
  pending: "Chưa gọi",
  contacted: "Đã tư vấn",
  installed: "Đã lắp đặt",
  closed: "Đã đóng",
};

const TAB_TITLES = {
  dashboard: "Dashboard",
  contacts: "Yêu cầu tư vấn",
  products: "Sản phẩm",
  pages: "Bài viết",
  quotations: "Báo giá & Hợp đồng",
  account: "Tài khoản",
};

// ===== Navigation =====
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const tab = item.dataset.tab;

    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    document.getElementById(`tab-${tab}`).classList.add("active");

    document.getElementById("page-title").textContent = TAB_TITLES[tab] || "Dashboard";

    if (tab === "dashboard") loadDashboard();
    if (tab === "contacts") loadContacts();
    if (tab === "products") loadProducts();
    if (tab === "pages") loadPages();
    if (tab === "quotations") { loadQuotations(); loadContactsForQuotation(); }
    if (tab === "account") resetPasswordForm();
  });
});

// ===== Dashboard =====
async function loadDashboard() {
  try {
    const res = await apiFetch(`${API_BASE}/stats`);
    const data = await res.json();

    document.getElementById("stat-total").textContent = data.totalContacts;
    document.getElementById("stat-pending").textContent = data.pending;
    document.getElementById("stat-contacted").textContent = data.contacted;
    document.getElementById("stat-installed").textContent = data.installed;

    renderSimpleChart("house-type-chart", data.byHouseType, "Loại nhà");
    renderSimpleChart("status-chart", data.byStatus, "Trạng thái");

    renderRecentContacts(data.recentContacts);
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

function renderSimpleChart(containerId, items, label) {
  const container = document.getElementById(containerId);
  if (!items || items.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:40px;">Chưa có dữ liệu</p>';
    return;
  }

  const total = items.reduce((sum, i) => sum + i.value, 0);
  const colors = ["#155c2e", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444"];

  let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
  items.forEach((item, idx) => {
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    const color = colors[idx % colors.length];
    html += `
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span style="font-weight:500;">${item.label || "Khác"}</span>
          <span style="font-weight:600;">${item.value} (${pct}%)</span>
        </div>
        <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.5s;"></div>
        </div>
      </div>
    `;
  });
  html += "</div>";
  container.innerHTML = html;
}

function renderRecentContacts(contacts) {
  const container = document.getElementById("recent-contacts");
  if (!contacts || contacts.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">Chưa có yêu cầu nào</p>';
    return;
  }

  let html = "";
  contacts.forEach((c) => {
    html += `
      <div class="recent-item">
        <div>
          <div class="recent-name">${c.name}</div>
          <div style="font-size:12px;color:#64748b;">${c.phone}${c.email ? ' · ' + c.email : ''} · ${formatDate(c.created_at)}</div>
        </div>
        <span class="status-badge status-${c.status}">${STATUS_MAP[c.status] || c.status}</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

// ===== Contacts =====
async function loadContacts(page = 1) {
  currentPage = page;
  const status = document.getElementById("filter-status").value;
  const search = document.getElementById("search-input").value.trim();

  let url = `${API_BASE}/contacts?page=${page}&limit=20`;
  if (status) url += `&status=${status}`;

  try {
    const res = await apiFetch(url);
    const result = await res.json();
    renderContactsTable(result.data, result.pagination);
  } catch (err) {
    console.error("Load contacts error:", err);
  }
}

function renderContactsTable(contacts, pagination) {
  const tbody = document.getElementById("contacts-table-body");

  if (!contacts || contacts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="loading">Không có yêu cầu nào</td></tr>';
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  let html = "";
  const offset = (pagination.page - 1) * pagination.limit;

  contacts.forEach((c, idx) => {
    html += `
      <tr>
        <td>${offset + idx + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td>${c.email || "-"}</td>
        <td>${c.house_type || "-"}</td>
        <td>${c.area || "-"}</td>
        <td>${c.budget || "-"}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${c.note || ""}">${c.note || "-"}</td>
        <td style="white-space:nowrap;font-size:12px;">${formatDate(c.created_at)}</td>
        <td>
          <select class="status-select" onchange="updateStatus(${c.id}, this.value)">
            <option value="pending" ${c.status === "pending" ? "selected" : ""}>Chưa gọi</option>
            <option value="contacted" ${c.status === "contacted" ? "selected" : ""}>Đã tư vấn</option>
            <option value="installed" ${c.status === "installed" ? "selected" : ""}>Đã lắp đặt</option>
            <option value="closed" ${c.status === "closed" ? "selected" : ""}>Đã đóng</option>
          </select>
        </td>
        <td>
          <button class="page-btn" style="padding:4px 10px;font-size:12px;color:#ef4444;border-color:#fecaca;" onclick="deleteContact(${c.id})">Xóa</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  renderPagination(pagination);
}

function renderPagination(pagination) {
  const container = document.getElementById("pagination");
  if (pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  for (let i = 1; i <= pagination.totalPages; i++) {
    html += `<button class="page-btn ${i === pagination.page ? "active" : ""}" onclick="loadContacts(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

async function updateStatus(id, status) {
  try {
    const res = await apiFetch(`${API_BASE}/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const result = await res.json();
    if (result.success) {
      loadContacts(currentPage);
      loadDashboard();
    } else {
      alert("Lỗi: " + result.error);
    }
  } catch (err) {
    alert("Lỗi kết nối server.");
  }
}

async function deleteContact(id) {
  if (!confirm("Bạn có chắc muốn xóa yêu cầu này?")) return;

  try {
    const res = await apiFetch(`${API_BASE}/contacts/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (result.success) {
      loadContacts(currentPage);
      loadDashboard();
    } else {
      alert("Lỗi: " + result.error);
    }
  } catch (err) {
    alert("Lỗi kết nối server.");
  }
}

// ===== Products =====
async function loadProducts() {
  try {
    const res = await apiFetch(`${API_BASE}/products`);
    const result = await res.json();
    renderProducts(result.data);
  } catch (err) {
    console.error("Load products error:", err);
  }
}

function renderProducts(products) {
  const container = document.getElementById("products-list");

  if (!products || products.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;">Chưa có sản phẩm</p>';
    return;
  }

  let html = '<div class="product-grid">';
  products.forEach((p) => {
    const features = JSON.parse(p.features || "[]");
    html += `
      <div class="product-card">
        <h4>${p.name}</h4>
        <div class="price">${p.price_label || formatCurrency(p.price)}</div>
        <p style="font-size:13px;color:#475569;margin-bottom:12px;">${p.description}</p>
        <div class="info-row">
          <span class="info-label">Số lỗ trồng</span>
          <span>${p.holes} lỗ</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phù hợp</span>
          <span>${p.suitable_for}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kích thước</span>
          <span>${p.size}</span>
        </div>
        ${features.map(f => `
          <div class="info-row">
            <span class="info-label">✓</span>
            <span>${f}</span>
          </div>
        `).join('')}
      </div>
    `;
  });
  html += "</div>";
  container.innerHTML = html;
}


// ===== Upload ảnh (kéo thả) =====
const MAX_UPLOAD_MB = 5;
const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Gửi 1 file ảnh lên server, trả về đường dẫn công khai. Ném Error nếu thất bại. */
async function uploadImage(file) {
  if (!file) throw new Error("Chưa chọn ảnh.");
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw new Error("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.");
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`Ảnh vượt quá ${MAX_UPLOAD_MB}MB, vui lòng chọn ảnh nhỏ hơn.`);
  }

  const formData = new FormData();
  formData.append("image", file);

  // Không dùng apiFetch được: phải để trình duyệt tự đặt Content-Type kèm boundary.
  const res = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${getToken()}` },
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem("aerogreen_token");
    sessionStorage.removeItem("aerogreen_token");
    window.location.href = "/login";
    throw new Error("Phiên đăng nhập đã hết hạn.");
  }

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || "Không tải được ảnh.");
  return result.data.url;
}

function updatePreview(previewId, url) {
  const box = document.getElementById(previewId);
  if (!box) return;
  const img = box.querySelector("img");
  if (img) {
    if (url) img.src = url;
    else img.removeAttribute("src");
  }
  box.hidden = !url;
}

function initUploadZones() {
  document.querySelectorAll("[data-upload-dropzone]").forEach((zone) => {
    const field = document.getElementById(zone.dataset.uploadInput);
    const previewId = zone.dataset.uploadPreview;
    const fileInput = zone.querySelector("[data-upload-file]");
    const hint = zone.querySelector(".uz-sub");
    if (!field || !fileInput) return;

    const defaultHint = hint ? hint.textContent : "";
    const setHint = (text) => {
      if (!hint) return;
      hint.textContent = text || defaultHint;
      hint.classList.toggle("uz-error", Boolean(text));
    };

    const handleFile = async (file) => {
      if (!file) return;
      zone.classList.add("uploading");
      setHint("⏳ Đang tải ảnh lên…");
      try {
        const url = await uploadImage(file);
        field.value = url;
        updatePreview(previewId, url);
        setHint("");
      } catch (err) {
        setHint("⚠️ " + err.message);
        setTimeout(() => setHint(""), 5000);
      } finally {
        zone.classList.remove("uploading");
      }
    };

    zone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      handleFile(fileInput.files[0]);
      fileInput.value = "";
    });

    ["dragenter", "dragover"].forEach((ev) =>
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.add("dragover");
      })
    );
    ["dragleave", "dragend"].forEach((ev) =>
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
      })
    );
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      handleFile(e.dataTransfer && e.dataTransfer.files[0]);
    });

    field.addEventListener("input", () => updatePreview(previewId, field.value.trim()));
  });

  document.querySelectorAll("[data-upload-clear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = btn.closest(".upload-preview");
      if (!box) return;
      const field = document.getElementById(box.id.replace(/-preview$/, ""));
      if (field) field.value = "";
      updatePreview(box.id, "");
    });
  });
}

/** Chèn "![mô tả](đường-dẫn)" vào vị trí con trỏ, tách thành dòng riêng để hiện dạng khối ảnh. */
function insertImageMarkdown(textarea, url, alt) {
  const value = textarea.value;
  const start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : value.length;
  const end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : start;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const label = String(alt || "Ảnh minh hoạ").replace(/[[\]]/g, "").trim() || "Ảnh minh hoạ";

  const lead = before === "" || /\n\s*$/.test(before) ? "" : "\n\n";
  const trail = after === "" || /^\s*\n/.test(after) ? "\n" : "\n\n";
  const snippet = `${lead}![${label}](${url})${trail}`;

  textarea.value = before + snippet + after;
  const caret = before.length + snippet.length;
  textarea.focus();
  textarea.setSelectionRange(caret, caret);
}

function initInsertImage() {
  document.querySelectorAll("[data-insert-image]").forEach((btn) => {
    const textarea = document.getElementById(btn.dataset.insertImage);
    const fileInput = document.querySelector(`[data-insert-file="${btn.dataset.insertImage}"]`);
    if (!textarea) return;

    const handleFile = async (file) => {
      if (!file) return;
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "⏳ Đang tải ảnh…";
      try {
        const url = await uploadImage(file);
        insertImageMarkdown(textarea, url, file.name.replace(/\.[^.]+$/, ""));
      } catch (err) {
        alert("❌ " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    };

    if (fileInput) {
      btn.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        handleFile(fileInput.files[0]);
        fileInput.value = "";
      });
    }

    textarea.addEventListener("dragover", (e) => {
      e.preventDefault();
      textarea.classList.add("dragover");
    });
    textarea.addEventListener("dragleave", () => textarea.classList.remove("dragover"));
    textarea.addEventListener("drop", (e) => {
      e.preventDefault();
      textarea.classList.remove("dragover");
      handleFile(e.dataTransfer && e.dataTransfer.files[0]);
    });
  });
}

// ===== Bài viết =====
async function loadPages() {
  const tbody = document.getElementById("pages-table-body");
  try {
    const res = await apiFetch(`${API_BASE}/pages`);
    const result = await res.json();
    renderPagesTable(result.data);
  } catch (err) {
    console.error("Load pages error:", err);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading">Không tải được danh sách</td></tr>';
    }
  }
}

function renderPagesTable(pages) {
  const tbody = document.getElementById("pages-table-body");
  if (!tbody) return;

  if (!pages || pages.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Chưa có bài viết nào</td></tr>';
    return;
  }

  tbody.innerHTML = pages
    .map((p) => {
      const cat = PAGE_CATEGORY_MAP[p.category] || p.category;
      const badge = Number(p.published)
        ? '<span style="color:#155c2e;font-weight:700;">● Đã xuất bản</span>'
        : '<span style="color:#b45309;font-weight:700;">● Bản nháp</span>';
      return `
      <tr>
        <td><strong style="color:#155c2e;">${escapeHtml(p.title)}</strong></td>
        <td><code style="font-size:12.5px;">${escapeHtml(p.slug)}</code></td>
        <td>${escapeHtml(cat)}</td>
        <td>${badge}</td>
        <td>${formatDate(p.updated_at)}</td>
        <td style="white-space:nowrap;">
          <button class="page-btn" style="padding:4px 10px;font-size:12px;color:#3b82f6;border-color:#bfdbfe;" onclick="editPage(${p.id})">✏️ Sửa</button>
          <a class="page-btn" style="padding:4px 10px;font-size:12px;color:#155c2e;border-color:#bbf7d0;text-decoration:none;" href="/noi-dung.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">🔗 Xem</a>
          <button class="page-btn" style="padding:4px 10px;font-size:12px;color:#ef4444;border-color:#fecaca;" onclick="deletePage(${p.id})">🗑️</button>
        </td>
      </tr>`;
    })
    .join("");
}

async function handlePageSubmit(event) {
  event.preventDefault();

  const editId = document.getElementById("page-edit-id").value;
  const payload = {
    title: document.getElementById("page-title-input").value.trim(),
    slug: document.getElementById("page-slug").value.trim(),
    category: document.getElementById("page-category").value,
    sort_order: Number(document.getElementById("page-sort").value || 0),
    cover_image: document.getElementById("page-cover").value.trim(),
    related_product: document.getElementById("page-related").value.trim(),
    summary: document.getElementById("page-summary").value.trim(),
    body: document.getElementById("page-body").value,
    published: document.getElementById("page-published").checked,
  };

  const btn = document.getElementById("page-submit-btn");
  btn.disabled = true;

  try {
    const res = await apiFetch(editId ? `${API_BASE}/pages/${editId}` : `${API_BASE}/pages`, {
      method: editId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (!res.ok) {
      alert("❌ " + (result.error || "Không lưu được bài viết."));
      return;
    }

    alert(
      (editId ? "✅ Đã cập nhật bài viết." : "✅ Đã đăng bài viết.") +
        `\nXem tại: /noi-dung.html?slug=${result.data.slug}`
    );
    resetPageForm();
    loadPages();
  } catch (err) {
    console.error("Save page error:", err);
    alert("❌ Không kết nối được máy chủ.");
  } finally {
    btn.disabled = false;
  }
}

async function editPage(id) {
  try {
    const res = await apiFetch(`${API_BASE}/pages`);
    const list = (await res.json()).data || [];
    const page = list.find((p) => p.id === id);
    if (!page) {
      alert("❌ Không tìm thấy bài viết.");
      return;
    }

    document.getElementById("page-edit-id").value = page.id;
    document.getElementById("page-title-input").value = page.title || "";
    document.getElementById("page-slug").value = page.slug || "";
    document.getElementById("page-category").value = page.category || "huong-dan";
    document.getElementById("page-sort").value = page.sort_order || 0;
    document.getElementById("page-cover").value = page.cover_image || "";
    document.getElementById("page-related").value = page.related_product || "";
    document.getElementById("page-summary").value = page.summary || "";
    document.getElementById("page-body").value = page.body || "";
    document.getElementById("page-published").checked = Number(page.published) === 1;
    updatePreview("page-cover-preview", page.cover_image || "");

    document.getElementById("page-form-title").textContent = "✏️ Sửa bài viết";
    document.getElementById("page-submit-btn").textContent = "💾 Lưu thay đổi";
    document.getElementById("page-cancel-btn").style.display = "inline-block";
    document.getElementById("page-form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("Edit page error:", err);
  }
}

async function deletePage(id) {
  if (!confirm("Xoá bài viết này?")) return;

  try {
    const res = await apiFetch(`${API_BASE}/pages/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (!res.ok) {
      alert("❌ " + (result.error || "Không xoá được."));
      return;
    }
    loadPages();
  } catch (err) {
    console.error("Delete page error:", err);
  }
}

function resetPageForm() {
  document.getElementById("page-form").reset();
  document.getElementById("page-edit-id").value = "";
  document.getElementById("page-published").checked = true;
  document.getElementById("page-sort").value = 0;
  document.getElementById("page-form-title").textContent = "➕ Tạo bài viết mới";
  document.getElementById("page-submit-btn").textContent = "📝 Đăng bài";
  document.getElementById("page-cancel-btn").style.display = "none";
  updatePreview("page-cover-preview", "");
}

initUploadZones();
initInsertImage();

// ===== Clock =====
function updateClock() {
  const now = new Date();
  document.getElementById("current-time").textContent = now.toLocaleString("vi-VN");
}
setInterval(updateClock, 1000);
updateClock();

// ===== Quotations =====
const QUOTATION_STATUS_MAP = {
  draft: "Bản nháp",
  sent: "Đã gửi KH",
  deposit_paid: "Đã đặt cọc",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

async function loadContactsForQuotation() {
  try {
    // Load contacts that don't have a quotation yet + all for editing
    const res = await apiFetch(`${API_BASE}/contacts?limit=200`);
    const result = await res.json();
    const select = document.getElementById("quotation-contact");
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
    if (result.data) {
      result.data.forEach((c) => {
        select.innerHTML += `<option value="${c.id}">${c.name} - ${c.phone} (${c.house_type || "N/A"})</option>`;
      });
    }
    if (currentVal) select.value = currentVal;
  } catch (err) {
    console.error("Load contacts for quotation error:", err);
  }
}

function autoCalcQuotation() {
  const eq = parseInt(document.getElementById("quotation-equipment").value) || 0;
  const ins = parseInt(document.getElementById("quotation-install").value) || 0;
  const nut = parseInt(document.getElementById("quotation-nutrient").value) || 0;
  const pct = parseFloat(document.getElementById("quotation-deposit").value) || 0;

  const total = eq + ins + nut;
  const deposit = Math.round(total * pct / 100);
  const remaining = total - deposit;

  const summary = document.getElementById("calc-summary");
  if (total > 0) {
    summary.style.display = "block";
    document.getElementById("calc-total").textContent = formatCurrency(total);
    document.getElementById("calc-pct").textContent = pct;
    document.getElementById("calc-deposit").textContent = formatCurrency(deposit);
    document.getElementById("calc-remaining").textContent = formatCurrency(remaining);
  } else {
    summary.style.display = "none";
  }
}

async function loadQuotations() {
  const status = document.getElementById("filter-quotation-status").value;
  let url = `${API_BASE}/quotations?limit=200`;
  if (status) url += `&status=${status}`;

  try {
    const res = await apiFetch(url);
    const result = await res.json();
    renderQuotationsTable(result.data);
  } catch (err) {
    console.error("Load quotations error:", err);
  }
}

function renderQuotationsTable(quotations) {
  const tbody = document.getElementById("quotations-table-body");

  if (!quotations || quotations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="loading">Chưa có báo giá nào</td></tr>';
    return;
  }

  let html = "";
  quotations.forEach((q) => {
    html += `
      <tr>
        <td><strong style="color:#155c2e;">${q.requestId}</strong></td>
        <td>${q.contactName || "-"}</td>
        <td>${q.contactPhone || "-"}</td>
        <td>${formatCurrency(q.equipmentPrice)}</td>
        <td>${formatCurrency(q.installPrice)}</td>
        <td>${formatCurrency(q.nutrientPrice)}</td>
        <td><strong>${formatCurrency(q.totalAmount)}</strong></td>
        <td>${formatCurrency(q.depositAmount)} (${q.depositPercent}%)</td>
        <td>${formatCurrency(q.remainingAmount)}</td>
        <td>
          <select class="status-select" onchange="updateQuotationStatus(${q.id}, this.value)">
            ${Object.entries(QUOTATION_STATUS_MAP).map(([k, v]) =>
              `<option value="${k}" ${q.status === k ? "selected" : ""}>${v}</option>`
            ).join("")}
          </select>
        </td>
        <td style="white-space:nowrap;">
          <button class="page-btn" style="padding:4px 10px;font-size:12px;color:#3b82f6;border-color:#bfdbfe;" onclick="editQuotation(${q.id})">✏️ Sửa</button>
          <button class="page-btn" style="padding:4px 10px;font-size:12px;color:#155c2e;border-color:#bbf7d0;" onclick="viewContract('${q.requestId}')">📋 Xem HĐ</button>
          <button class="page-btn" style="padding:4px 10px;font-size:12px;color:#ef4444;border-color:#fecaca;" onclick="deleteQuotation(${q.id})">🗑️</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

async function handleQuotationSubmit(event) {
  event.preventDefault();

  const editId = document.getElementById("quotation-edit-id").value;
  const contactId = document.getElementById("quotation-contact").value;
  const equipmentPrice = document.getElementById("quotation-equipment").value;
  const installPrice = document.getElementById("quotation-install").value;
  const nutrientPrice = document.getElementById("quotation-nutrient").value;
  const depositPercent = document.getElementById("quotation-deposit").value;
  const note = document.getElementById("quotation-note").value;

  const url = editId
    ? `${API_BASE}/quotations/${editId}`
    : `${API_BASE}/quotations`;
  const method = editId ? "PUT" : "POST";

  const body = editId
    ? { equipmentPrice, installPrice, nutrientPrice, depositPercent, note }
    : { contactId: parseInt(contactId), equipmentPrice, installPrice, nutrientPrice, depositPercent, note };

  try {
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(body),
    });
    const result = await res.json();

    if (result.success) {
      alert(result.message);
      resetQuotationForm();
      loadQuotations();
      loadContactsForQuotation();
    } else {
      alert("Lỗi: " + (result.error || "Không thể lưu báo giá."));
    }
  } catch (err) {
    alert("Lỗi kết nối server.");
  }
}

async function editQuotation(id) {
  try {
    const res = await apiFetch(`${API_BASE}/quotations/${id}`);
    const result = await res.json();
    const q = result.data;
    if (!q) return;

    document.getElementById("quotation-edit-id").value = q.id;
    document.getElementById("quotation-contact").value = q.contactId;
    document.getElementById("quotation-contact").disabled = true;
    document.getElementById("quotation-equipment").value = q.equipmentPrice;
    document.getElementById("quotation-install").value = q.installPrice;
    document.getElementById("quotation-nutrient").value = q.nutrientPrice;
    document.getElementById("quotation-deposit").value = q.depositPercent;
    document.getElementById("quotation-note").value = q.note || "";

    document.getElementById("quotation-form-title").textContent = "✏️ Chỉnh sửa báo giá " + q.requestId;
    document.getElementById("quotation-submit-btn").textContent = "💾 Cập nhật báo giá";
    document.getElementById("quotation-cancel-btn").style.display = "inline-block";

    autoCalcQuotation();

    // Scroll to form
    document.getElementById("quotation-form-card").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.error("Edit quotation error:", err);
  }
}

function cancelEdit() {
  resetQuotationForm();
}

function resetQuotationForm() {
  document.getElementById("quotation-edit-id").value = "";
  document.getElementById("quotation-contact").value = "";
  document.getElementById("quotation-contact").disabled = false;
  document.getElementById("quotation-equipment").value = "";
  document.getElementById("quotation-install").value = "";
  document.getElementById("quotation-nutrient").value = "";
  document.getElementById("quotation-deposit").value = "10";
  document.getElementById("quotation-note").value = "";
  document.getElementById("quotation-form-title").textContent = "➕ Tạo báo giá mới";
  document.getElementById("quotation-submit-btn").textContent = "📄 Tạo báo giá";
  document.getElementById("quotation-cancel-btn").style.display = "none";
  document.getElementById("calc-summary").style.display = "none";
}

async function updateQuotationStatus(id, status) {
  try {
    const res = await apiFetch(`${API_BASE}/quotations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const result = await res.json();
    if (!result.success) {
      alert("Lỗi: " + result.error);
      loadQuotations();
    }
  } catch (err) {
    alert("Lỗi kết nối server.");
  }
}

async function deleteQuotation(id) {
  if (!confirm("Bạn có chắc muốn xóa báo giá này?")) return;
  try {
    const res = await apiFetch(`${API_BASE}/quotations/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (result.success) {
      loadQuotations();
      loadContactsForQuotation();
    } else {
      alert("Lỗi: " + result.error);
    }
  } catch (err) {
    alert("Lỗi kết nối server.");
  }
}

function viewContract(requestId) {
  window.open(`/hop-dong?code=${requestId}`, "_blank");
}

// ===== Account: đổi mật khẩu =====
function showPasswordMessage(text, ok) {
  const msg = document.getElementById("pw-message");
  if (!msg) return;
  msg.textContent = text;
  msg.style.display = "block";
  msg.style.background = ok ? "#f0fdf4" : "#fef2f2";
  msg.style.color = ok ? "#166534" : "#991b1b";
  msg.style.border = "1px solid " + (ok ? "#86efac" : "#fecaca");
}

function resetPasswordForm() {
  const form = document.getElementById("password-form");
  if (form) form.reset();
  const msg = document.getElementById("pw-message");
  if (msg) msg.style.display = "none";
  const show = document.getElementById("pw-show");
  if (show) show.checked = false;
  togglePasswordVisibility();

  // Hiển thị tên tài khoản đang đăng nhập
  const usernameEl = document.getElementById("pw-username");
  const userData = localStorage.getItem("aerogreen_user") || sessionStorage.getItem("aerogreen_user");
  if (usernameEl && userData) {
    try {
      const user = JSON.parse(userData);
      usernameEl.textContent = user.username || "admin";
    } catch (e) {}
  }
}

function togglePasswordVisibility() {
  const show = document.getElementById("pw-show");
  const type = show && show.checked ? "text" : "password";
  ["pw-old", "pw-new", "pw-confirm"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.type = type;
  });
}

async function handleChangePassword(event) {
  event.preventDefault();

  const oldPassword = document.getElementById("pw-old").value;
  const newPassword = document.getElementById("pw-new").value;
  const confirmPassword = document.getElementById("pw-confirm").value;

  // Kiểm tra ngay trên trình duyệt để báo lỗi nhanh
  if (newPassword.length < 6) {
    showPasswordMessage("Mật khẩu mới phải có ít nhất 6 ký tự.", false);
    return;
  }
  if (newPassword !== confirmPassword) {
    showPasswordMessage("Mật khẩu nhập lại không khớp.", false);
    return;
  }
  if (newPassword === oldPassword) {
    showPasswordMessage("Mật khẩu mới phải khác mật khẩu hiện tại.", false);
    return;
  }

  const btn = document.getElementById("pw-submit");
  btn.disabled = true;
  btn.textContent = "Đang xử lý...";

  try {
    const res = await apiFetch(`${API_BASE}/auth/change-password`, {
      method: "PUT",
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      showPasswordMessage(result.error || "Đổi mật khẩu thất bại.", false);
      return;
    }

    document.getElementById("password-form").reset();
    showPasswordMessage(
      "✅ Đổi mật khẩu thành công. Đang đưa bạn về trang đăng nhập để xác nhận mật khẩu mới...",
      true
    );

    // Đăng xuất để buộc đăng nhập lại bằng mật khẩu mới (xác nhận đã lưu đúng)
    setTimeout(logout, 3000);
  } catch (err) {
    if (err.message !== "Unauthorized") {
      showPasswordMessage("Không kết nối được tới server. Vui lòng thử lại.", false);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "🔐 Đổi mật khẩu";
  }
}

// ===== Init =====
loadDashboard();
