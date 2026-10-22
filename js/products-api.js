/* Tải sản phẩm qua API hiện có, giữ bản tĩnh khi máy chủ chưa sẵn sàng. */
(async function () {
  "use strict";
  const grid = document.querySelector(".product-grid");
  if (!grid || !(await AeroGreenAPI.checkBackend())) return;
  const products = await AeroGreenAPI.loadProductsFromAPI();
  if (!Array.isArray(products) || !products.length) return;
  const images = {
    "Mini Kit": {
      file: "anh3",
      width: 1600,
      height: 2133,
      alt: "Mô hình bốn trụ khí canh và thùng xanh tại sân nhà",
    },
    "Family Kit": {
      file: "anh7",
      width: 1600,
      height: 1067,
      alt: "Dãy tháp xà lách xanh tươi",
    },
    "Rooftop Kit": {
      file: "anh5",
      width: 1600,
      height: 1067,
      alt: "Dãy tám tháp khí canh sử dụng thùng đen",
    },
  };
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function priceLabel(product) {
    return (
      product.price_label ||
      Number(product.price || 0).toLocaleString("vi-VN") + "₫"
    );
  }
  const fragment = document.createDocumentFragment();
  products.forEach((storedProduct) => {
    const product = window.VuonPhoPackageCatalog ? window.VuonPhoPackageCatalog.apply(storedProduct) : storedProduct;
    // Dùng ảnh thật theo tên gói để DB cũ chưa cập nhật vẫn không hiển thị ảnh đã bỏ.
    const image = images[product.name] || images["Mini Kit"];
    const card = element("article", "product-kit");
    const media = element("div", "product-media");
    const picture = document.createElement("picture");
    const source = document.createElement("source");
    source.type = "image/webp";
    source.srcset =
      "images/" +
      image.file +
      "-800.webp 800w, images/" +
      image.file +
      ".webp 1600w";
    source.sizes = "(max-width: 767px) 100vw, 33vw";
    const img = document.createElement("img");
    img.src = "images/" + image.file + ".webp";
    img.width = image.width;
    img.height = image.height;
    img.alt = image.alt;
    img.loading = "lazy";
    img.decoding = "async";
    picture.append(source, img);
    media.append(
      picture,
      element("span", "kit-tag", product.holes + " lỗ trồng"),
    );
    const body = element("div", "product-body");
    body.append(
      element("span", "micro-label", "Gói khí canh tại nhà"),
      element("h3", "", product.name),
    );
    // Không đưa các tuyên bố bán chạy hoặc đủ rau mỗi ngày chưa có bằng chứng lên giao diện.
    body.append(
      element(
        "p",
        "product-desc",
        product.card_description || product.description || product.suitable_for,
      ),
    );
    const specs = element("dl", "kit-specs");
    [
      ["Số trụ", product.towers ? product.towers + " trụ" : ""],
      ["Số lỗ trồng", product.holes + " lỗ"],
      ["Diện tích bố trí", product.layout_area],
    ].forEach(([label, value]) => {
      if (!value) return;
      const row = element("div");
      row.append(element("dt", "", label), element("dd", "", value));
      specs.append(row);
    });
    body.append(specs);
    const foot = element("div", "product-foot");
    const price = element("div", "product-price");
    price.append(
      element("span", "pl", "Giá lắp đặt trọn gói"),
      element("p", "pv", priceLabel(product)),
    );
    const button = element("button", "btn", "Nhận tư vấn");
    button.type = "button";
    button.addEventListener("click", () => window.chooseProduct(product.name));
    foot.append(price, button);
    body.append(foot);
    card.append(media, body);
    fragment.append(card);
  });
  grid.replaceChildren(fragment);
})();
