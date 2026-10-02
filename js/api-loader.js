/**
 * VƯỜN PHỐ — API Loader
 * Tự động tải dữ liệu từ backend nếu server đang chạy,
 * fallback về dữ liệu tĩnh nếu không kết nối được.
 *
 * API base do `js/auth.js` (window.VuonPho) quyết định ⇒ **auth.js phải nạp TRƯỚC** file này:
 *   - Deploy: same-origin "/api"
 *   - Dev: cùng origin, hoặc fallback localhost:3000 (vd Live Server cổng 5500)
 *   - Có thể override bằng `window.__API_BASE__`
 */
async function apiUrl(path) {
  const base =
    window.VuonPho && window.VuonPho.apiBaseAsync
      ? await window.VuonPho.apiBaseAsync()
      : window.__API_BASE__ || "http://localhost:3000/api";
  return base + path;
}

/**
 * Kiểm tra backend có đang chạy không
 */
async function checkBackend() {
  try {
    const res = await fetch(await apiUrl("/health"), {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Tải danh sách sản phẩm từ API
 * Nếu không kết nối được, giữ nguyên dữ liệu tĩnh trong HTML
 */
async function loadProductsFromAPI() {
  try {
    const res = await fetch(await apiUrl("/products"), {
      signal: AbortSignal.timeout(3000),
    });
    const result = await res.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Gửi yêu cầu tư vấn lên backend
 */
async function submitContact(data) {
  const res = await fetch(await apiUrl("/contact"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return await res.json();
}

/**
 * Lấy gợi ý sản phẩm từ backend
 */
async function getRecommendation(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(await apiUrl("/recommend?" + query), {
    signal: AbortSignal.timeout(3000),
  });
  return await res.json();
}

// Export for use in other scripts
window.AeroGreenAPI = {
  checkBackend,
  loadProductsFromAPI,
  submitContact,
  getRecommendation,
};
