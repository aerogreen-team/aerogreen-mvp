function chooseProduct(productName) {
  localStorage.setItem("selectedProduct", productName);
  window.location.href = "contact.html";
}

function submitForm() {
  const name = document.getElementById("name").value;
  const phone = document.getElementById("phone").value;
  const space = document.getElementById("space").value;
  const note = document.getElementById("note").value;

  if (name.trim() === "" || phone.trim() === "") {
    alert("Vui lòng nhập họ tên và số điện thoại.");
    return;
  }

  console.log({
    name,
    phone,
    space,
    note
  });

  document.getElementById("success").innerText =
    "Đã ghi nhận thông tin. AeroGreen Hub sẽ liên hệ tư vấn.";

  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("note").value = "";
}

window.onload = function () {
  const selectedProduct = localStorage.getItem("selectedProduct");

  if (selectedProduct && document.getElementById("note")) {
    document.getElementById("note").value =
      "Tôi muốn được tư vấn gói " + selectedProduct;
  }
};
function showAdvice() {
  const houseType = document.getElementById("houseType").value;
  const area = document.getElementById("area").value;
  const budget = document.getElementById("budget").value;

  let product = "";
  let reason = "";
  let price = "";

  if (houseType === "chungcu" || area === "small" || budget === "low") {
    product = "AeroGreen Mini";
    price = "5.990.000đ";
    reason = "Phù hợp với chung cư, ban công nhỏ và khách hàng muốn bắt đầu trải nghiệm khí canh với chi phí vừa phải.";
  } else if (area === "medium" || budget === "mid") {
    product = "AeroGreen Standard";
    price = "8.490.000đ";
    reason = "Phù hợp với nhà phố hoặc căn hộ có ban công vừa, đáp ứng tốt nhu cầu trải nghiệm sống xanh cho gia đình.";
  } else {
    product = "AeroGreen Family";
    price = "12.990.000đ";
    reason = "Phù hợp với sân thượng hoặc không gian lớn, dành cho khách hàng muốn đầu tư một khu vườn khí canh tại nhà.";
  }

  const result = document.getElementById("adviceResult");

  result.innerHTML = `
    <h3>Gợi ý phù hợp: ${product}</h3>
    <p><b>Giá dự kiến:</b> ${price}</p>
    <p><b>Lý do đề xuất:</b> ${reason}</p>
    <p><b>Vai trò của AeroGreen Hub:</b> Tư vấn và kết nối khách hàng với nhà cung cấp phù hợp.</p>
    <button onclick="chooseProduct('${product}')">Đăng ký tư vấn gói này</button>
  `;

  result.style.display = "block";
}