/**
 * VƯỜN PHỐ — Products dynamic loader
 * Tự động thay thế sản phẩm tĩnh bằng dữ liệu từ API nếu backend đang chạy.
 */

(async function () {
  const apiReady = await AeroGreenAPI.checkBackend();
  if (!apiReady) {
    console.log(
      "ℹ️ Backend chưa chạy, sử dụng dữ liệu sản phẩm tĩnh."
    );
    return;
  }

  console.log("✅ Backend đang chạy, tải sản phẩm từ API...");
  const products = await AeroGreenAPI.loadProductsFromAPI();
  if (!products || products.length === 0) return;

  const grid = document.querySelector(".product-grid");
  if (!grid) return;

  // Render products from API data
  grid.innerHTML = products
    .map(
      (p) => `
    <div class="product-kit">
      <img src="${p.image}" alt="${p.name}">
      <div class="product-kit-content">
        <h3>${p.name}</h3>
        <p class="product-desc">${p.description}</p>

        <div class="product-info">
          <span>Số lỗ trồng:</span>
          <b>${p.holes} lỗ</b>
        </div>

        <div class="product-info">
          <span>Phù hợp:</span>
          <b>${p.suitable_for}</b>
        </div>

        <div class="product-info">
          <span>Kích thước:</span>
          <b>${p.size}</b>
        </div>

        <div class="product-bottom">
          <div>
            <span>Giá tham khảo</span>
            <h4>${p.price_label || p.price.toLocaleString("vi-VN") + "₫"}</h4>
          </div>

          <button onclick="chooseProduct('${p.name}')">Tôi quan tâm</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
})();
