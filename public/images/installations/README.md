# Ảnh lắp đặt thực tế

Đặt ảnh công trình mới trong thư mục này, ví dụ `san-thuong-01.webp`. Không ghi đè ảnh gốc đang dùng trong `images/`.

Danh sách gallery nằm trong `js/installations-data.js`. Mỗi ảnh cần có `id`, `src`, `thumbnail` (nếu có), `width`, `height`, `alt`, `caption`, `confirmedReal` và `credit`.

- Chỉ đặt `confirmedReal: true` sau khi đã xác nhận đó là ảnh thực tế phù hợp để hiển thị.
- `credit.type: "vuonpho"`: chỉ dùng khi đã xác nhận công trình của VƯỜN PHỐ.
- `credit.type: "partner"`, `credit.name`: ảnh đối tác cung cấp, ghi tên đối tác khi có xác nhận.
- `credit.type: "project-provided"`: ảnh thực tế do dự án cung cấp, chưa xác định đơn vị thi công. Không tự coi là công trình của VƯỜN PHỐ.
- Caption chỉ mô tả nội dung thấy trong ảnh; không tự thêm khách hàng, địa chỉ, thời điểm, cấu hình hay kết quả kinh doanh.

Hiện gallery sử dụng đủ 11 ảnh JPG do người dùng cung cấp trong thư mục này. Bản tối ưu nằm trong `optimized/`; ảnh gốc được giữ nguyên. Hai ảnh đầu: `ban-cong-06.jpg` và `ban-cong-04.jpg`. Ảnh `ban-cong-05.jpg` được dùng làm ảnh Rooftop Kit và vẫn giữ trong gallery. Chưa xác nhận đơn vị thi công nên dùng nhãn nguồn trung lập.

Thêm phần tử vào mảng để bổ sung ảnh; gallery tự cập nhật số lượng và chuyển ảnh. Hai phần tử đầu tiên được dùng cho ảnh lớn và ảnh nhỏ ở section trang chủ. Lightbox luôn hiển thị ảnh theo tỷ lệ gốc.
