# Nâng cấp VƯỜN PHỐ — 20/10/2026

Giữ HTML, CSS, JavaScript thuần, các endpoint Express/Turso và luồng quản trị hiện có. Thay ảnh AI, bổ sung nội dung khí canh và đồng bộ giao diện xanh lá/nền kem. Tham khảo cách dẫn dắt khách từ giới thiệu đến giải pháp và liên hệ của https://rauxanhcasach.vn/; không sử dụng nội dung hoặc hình ảnh của trang đó.

## Tệp thay đổi

- `index.html`, `about.html`, `services.html`, `products.html`, `contact.html`: nội dung, cấu trúc, ảnh responsive, metadata SEO/Open Graph, menu truy cập bằng bàn phím.
- `login.html`, `register.html`, `account.html`: đồng bộ trình bày và heading; giữ ID và luồng xác thực/hồ sơ.
- `contract.html`: chỉ nối stylesheet, favicon và metadata; giữ logic hợp đồng.
- `css/style.css`: hệ thống giao diện, responsive, sơ đồ CSS, bảng chuyển thành card, lightbox, giảm chuyển động; bỏ quy tắc cũ không dùng.
- `css/auth.css`, `css/contract-theme.css`: đồng bộ trang tài khoản/hợp đồng; cho phép email dài xuống dòng.
- `js/script.js`: menu có quản lý focus, counter giữ phần thập phân và tôn trọng giảm chuyển động; giữ nguyên form và trợ lý chọn gói, thay mô tả “bán chạy” chưa có căn cứ.
- `js/products-api.js`: vẫn gọi API hiện có; dựng card bằng DOM, hiển thị ảnh thật, đồng bộ bảng giá và thông số với API, giữ nội dung tĩnh khi backend không sẵn sàng.
- `js/garden.js`: gallery dùng dialog, khôi phục focus khi đóng, parallax nhẹ và kiểm tra giảm chuyển động.
- `server/seed.js`: ảnh ba gói và mô tả Family Kit trung tính; không đổi schema/endpoint.
- `images/anh1.webp`…`anh11.webp` (rộng 1600 px), `images/anh1-800.webp`…`anh11-800.webp`: giữ tỉ lệ, tối đa 200.000 byte/tệp; bản 800 px tối đa 85.000 byte.
- `images/zalo-small.webp`: bản nhỏ từ logo có sẵn, giữ nguyên `zalo.png` làm fallback; giữ nguyên `favicon.svg` và 11 ảnh JPG gốc.
- `fonts/be-vietnam-pro-{400,600,700}.woff2`, `fonts/OFL.txt`: Be Vietnam Pro tự phục vụ, giữ ký tự tiếng Việt và giấy phép SIL OFL. Các mức chữ trung gian dùng kiểu gần nhất.
- Xóa các tệp ảnh AI cũ (.jpg/.png) tương ứng danh sách trong yêu cầu. Không còn tham chiếu tài nguyên tới các ảnh đó.

## Gán ảnh thực tế

| Ảnh | Vị trí |
| --- | --- |
| anh1 | Hero trang chủ; ảnh Open Graph |
| anh2 | Định nghĩa khí canh trên trang chủ/about; tư vấn chọn mô hình; bước khảo sát |
| anh3 | Mini Kit trong HTML, API renderer và seed |
| anh4 | Ảnh cấu tạo cạnh sơ đồ tuần hoàn; bước chọn cấu hình/báo giá |
| anh5 | Rooftop Kit trong HTML, API renderer và seed |
| anh6 | Dịch vụ lắp đặt tận nơi |
| anh7 | Bento về năng suất/không gian; Family Kit trong HTML, API renderer và seed |
| anh8 | Dịch vụ so sánh/lựa chọn; gallery đa dạng cây trồng |
| anh9 | Bước triển khai lắp đặt |
| anh10 | Banner Products; gallery toàn cảnh sân thượng |
| anh11 | Dịch vụ bảo trì; bước bàn giao; gallery thành quả |

Ảnh gói chỉ minh họa mô hình, không khẳng định ảnh chụp chính xác cấu hình 20/40/80 lỗ được bán. Không trùng ảnh trong cùng một section. Ảnh dọc được cắt bằng `object-fit: cover`, có kích thước nội tại và vị trí cắt phù hợp; lightbox hiển thị toàn bộ ảnh.

## Nội dung đã bổ sung

Định nghĩa khí canh; sơ đồ bể → bơm → phun sương lên rễ → nước hồi về bể; counter 95%, 98%, ≥2×, 1,5×; bento lợi ích; bảng khí canh/thủy canh/thổ canh; ưu và nhược điểm; bảng chọn gói; gallery có caption/lightbox; quy trình bốn bước; FAQ; cam kết tư vấn trung lập và hỗ trợ bảo trì; Zalo và bản đồ khu vực TP.HCM. Các con số chưa có nguồn nghiên cứu được ghi “số liệu tham khảo”. Không thêm đánh giá, chứng nhận hoặc số lượng khách hàng.

Giá và thông số gói lấy từ seed có sẵn: Mini 20 lỗ / 40×40×120 cm / 5.990.000₫; Family 40 lỗ / 60×60×160 cm / 8.490.000₫; Rooftop 80 lỗ / 100×100×180 cm / 12.990.000₫. Khi API trả dữ liệu, card và bảng so sánh nhận cùng thông số mới. Số người ăn của Family chỉ là tham khảo từ trường phù hợp có sẵn; Mini/Rooftop có placeholder.

## Cập nhật DB trước khi triển khai

**`npm run seed` chỉ thêm sản phẩm khi bảng trống. Chạy lại seed không thay ảnh của bản ghi đã tồn tại. Không xóa DB/bảng để ép seed.**

Nếu DB mới: chạy `npm run seed` trong `server/` hoặc khởi động server để tự seed.

Nếu DB đang có dữ liệu: thực hiện ba UPDATE sau bằng công cụ quản trị DB đang dùng, sau khi kiểm tra đúng môi trường:

```sql
UPDATE products SET image = '../images/anh3.webp' WHERE name = 'Mini Kit';
UPDATE products SET image = '../images/anh7.webp' WHERE name = 'Family Kit';
UPDATE products SET image = '../images/anh5.webp' WHERE name = 'Rooftop Kit';
```

Frontend đã ánh xạ ảnh theo tên gói nên ba gói vẫn hiển thị ảnh mới trong thời gian chờ cập nhật DB. Chưa cập nhật DB production trong công việc này. URL ảnh Open Graph đang dùng tên miền có sẵn trong README (`https://vuonpho.onrender.com`); cần đổi nếu đổi tên miền chính thức.

## Kiểm tra đã thực hiện

- `npm start` trong `server/`, dùng `PORT=4317` và file DB local riêng để tránh dịch vụ khác trên cổng 3000. Không dùng Turso production.
- Smoke test có sẵn: 14/14 đạt (API, gợi ý gói, đăng ký/đăng nhập, yêu cầu tư vấn, tracking, quản trị).
- Gửi form liên hệ bằng trình duyệt và xác nhận bản ghi thật trong DB local; trợ lý chọn Family Kit chuyển đúng gói, diện tích và ngân sách sang form.
- Kiểm tra card tải từ API, lightbox mở/đóng, khôi phục focus, FAQ và drawer mobile (gồm Escape).
- Kiểm tra bố cục tại 360/768/1024/1440 px cho 9 trang; điều chỉnh form liên hệ và email dài trong trang tài khoản. Không có tràn ngang sau chỉnh sửa.
- Console không phát hiện lỗi JS trong các luồng trình duyệt đã kiểm tra. `node --check` đạt cho các JS thay đổi.
- Kiểm tra toàn bộ 34 URL tài nguyên cục bộ qua HTTP: không lỗi; 35 thẻ ảnh tĩnh có alt và width/height; 22 bản WebP đúng giới hạn dung lượng; không ID trùng. Quét `images/` và các tên ảnh bị bỏ: không còn tham chiếu ảnh AI.
- Lighthouse mobile, giả lập Slow 4G mặc định, trên bản Express local, Chrome headless; mỗi trang một lần đo sau tối ưu. Điểm có thể thay đổi trên hosting thật:

| Trang | Performance | Accessibility | SEO |
| --- | ---: | ---: | ---: |
| index | 92 | 100 | 100 |
| about | 96 | 100 | 100 |
| services | 92 | 100 | 100 |
| products | 93 | 100 | 100 |
| contact | 98 | 100 | 100 |

Không dùng điểm SEO cho trang tài khoản/hợp đồng riêng tư; các trang này đặt `noindex` phù hợp. Chưa kiểm tra thực địa trên điện thoại vật lý hoặc kết nối Turso production. Hỗ trợ giảm chuyển động đã có trong CSS/JS, chưa giả lập thiết lập hệ điều hành khi đo Lighthouse.

## Dữ liệu cần chủ dự án bổ sung

1. Nguồn nghiên cứu và điều kiện đối chứng của các số 95%, 98%, ≥2 lần và 1,5 lần khi chiếu sáng.
2. Diện tích lắp đặt tối thiểu, số trụ, cấu hình thiết bị chính thức cho mỗi gói; số người ăn cho Mini/Rooftop và sản lượng kiểm chứng của cả ba gói.
3. Giá đã bao gồm những gì: vận chuyển, công lắp, dinh dưỡng, vật tư; chính sách phí theo khu vực.
4. Công suất bơm, chu kỳ chạy, mức tiêu thụ điện/nước đo thực tế.
5. Lịch thu hoạch theo giống và điều kiện trồng.
6. Lịch bảo trì, chi phí, thời gian phản hồi và chính sách bảo hành bằng văn bản.
7. Địa chỉ tiếp khách và phạm vi phục vụ ngoại ô cụ thể. Bản đồ hiện thể hiện khu vực TP.HCM, không giả định địa chỉ văn phòng.
8. Nếu muốn hiển thị: chứng nhận hoặc đánh giá khách hàng có bằng chứng và quyền sử dụng.

## Vấn đề cũ ngoài phạm vi, chưa sửa

- `submitForm()` cũ vẫn thông báo thành công nếu backend trả lỗi/mất kết nối; nhánh fallback không xác nhận đã lưu lên server. Lần thử thành công đã đối chiếu DB, không chỉ dựa trên toast.
- `contract.html` cũ có hotline `1900 1234` không khớp số `0354841103` trên các trang khác. Theo phạm vi chỉ đồng bộ style của trang hợp đồng, nội dung liên hệ này được giữ lại để chủ dự án xác nhận.
- Link Facebook đang có sẵn trỏ đến trang mang tên logisticsnyvcorp; cần xác nhận có đúng kênh VƯỜN PHỐ.
- Express hiện chưa bật nén response static; đây là hạng mục backend/hosting có thể tối ưu sau.

## Chạy bản nguồn

```sh
cd server
npm ci
npm start
```

Nếu cổng 3000 đang bận: `PORT=4317 npm start` (macOS/Linux). Nhánh bàn giao: `feat/nang-cap-vuon-pho`. Không merge vào main hoặc kích hoạt triển khai production trong công việc này.
