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

const STATUS_MAP = {
  pending: "Chưa gọi",
  contacted: "Đã tư vấn",
  installed: "Đã lắp đặt",
  closed: "Đã đóng",
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

    document.getElementById("page-title").textContent =
      tab === "dashboard" ? "Dashboard" : tab === "contacts" ? "Yêu cầu tư vấn" : tab === "products" ? "Sản phẩm" : "Báo giá & Hợp đồng";

    if (tab === "dashboard") loadDashboard();
    if (tab === "contacts") loadContacts();
    if (tab === "products") loadProducts();
    if (tab === "quotations") { loadQuotations(); loadContactsForQuotation(); }
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
          <div style="font-size:12px;color:#64748b;">${c.phone} · ${formatDate(c.created_at)}</div>
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
    tbody.innerHTML = '<tr><td colspan="10" class="loading">Không có yêu cầu nào</td></tr>';
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

// ===== Init =====
loadDashboard();
