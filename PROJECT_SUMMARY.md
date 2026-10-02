# 🌿 VƯỜN PHỐ — Tổng kết dự án (CP2 → CP3)

> **Giải pháp khí canh toàn diện: Tư vấn — So sánh — Lắp đặt — Bảo trì**

---

## 1. Tổng quan hành trình

| Giai đoạn | Nội dung | Trạng thái |
|-----------|----------|-----------|
| **CP2** | Proposal, khảo sát thị trường (24 online + 3 trực tiếp), VPC, SWOT, 4Ps | ✅ Hoàn thành |
| **CP3 — UX/UI** | MVP Website (5 trang), User Persona, User Flow, Wireframe, Mockup | ✅ Hoàn thành |
| **CP3 — Backend** | Node.js + Express + SQLite, REST API, Admin Dashboard | ✅ Hoàn thành |
| **CP3 — BMC** | 9 ô Business Model Canvas | ✅ Hoàn thành |

---

## 2. MVP Website — Frontend

5 trang HTML tĩnh với giao diện xanh lá — trắng, responsive:

| Trang | Mô tả |
|-------|-------|
| **`index.html`** | Hero + Problem/Solution section, CTA "Tư vấn ngay" |
| **`about.html`** | Giới thiệu sứ mệnh, giá trị cốt lõi |
| **`services.html`** | 4 dịch vụ: Tư vấn, So sánh, Lắp đặt, Bảo trì |
| **`products.html`** | 3 gói: Mini Kit, Family Kit, Rooftop Kit |
| **`contact.html`** | Form đăng ký tư vấn (họ tên, SĐT, diện tích, ngân sách, ghi chú) |

### Tích hợp API
- **`js/api-loader.js`** — Module kiểm tra backend, tải sản phẩm động, gửi form
- **`js/products-api.js`** — Tự động thay thế sản phẩm tĩnh bằng dữ liệu từ API nếu backend chạy
- **`js/script.js`** — Form gọi `POST /api/contact` thay vì chỉ log console

---

## 3. Backend Server

| Công nghệ | Mục đích |
|-----------|----------|
| **Node.js** | Runtime |
| **Express** | Web framework |
| **better-sqlite3** | Database file-based (không cần cài server) |
| **CORS** | Cho phép frontend (Live Server) gọi API |

### Cấu trúc thư mục

```
aerogreen-mvp/
└── server/
    ├── server.js           # Entry point — khởi động server port 3000
    ├── database.js         # SQLite schema (bảng contacts, products)
    ├── seed.js             # Seed 3 sản phẩm mẫu
    ├── package.json
    ├── TODO.md             # Checklist phát triển
    ├── routes/
    │   ├── contacts.js     # CRUD contacts
    │   ├── products.js     # Danh sách + chi tiết + so sánh
    │   ├── recommend.js    # Gợi ý sản phẩm theo nhu cầu
    │   └── stats.js        # Thống kê dashboard
    └── admin/
        ├── index.html      # Admin Dashboard
        ├── style.css
        └── script.js
```

### API Endpoints

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| `POST` | `/api/contact` | Lưu đăng ký tư vấn |
| `GET` | `/api/contacts` | Danh sách contacts (phân trang, lọc theo status) |
| `PATCH` | `/api/contacts/:id` | Cập nhật trạng thái (pending → contacted → installed → closed) |
| `DELETE` | `/api/contacts/:id` | Xóa contact |
| `GET` | `/api/products` | Danh sách sản phẩm |
| `GET` | `/api/products/:id` | Chi tiết 1 sản phẩm |
| `GET` | `/api/products/compare?ids=1,2` | So sánh nhiều sản phẩm |
| `GET` | `/api/recommend?house_type=&area=&budget=` | Gợi ý sản phẩm phù hợp |
| `GET` | `/api/stats` | Thống kê dashboard (tổng, theo loại nhà, theo trạng thái) |
| `GET` | `/api/health` | Health check |

### Database

**Bảng `contacts`**
| Column | Type | Mô tả |
|--------|------|-------|
| id | INTEGER PK | Auto increment |
| name | TEXT | Họ tên |
| phone | TEXT | Số điện thoại |
| house_type | TEXT | Loại nhà (chung cư/nhà phố) |
| area | TEXT | Diện tích |
| budget | TEXT | Ngân sách |
| goal | TEXT | Mục tiêu |
| note | TEXT | Ghi chú |
| status | TEXT | pending / contacted / installed / closed |
| created_at | DATETIME | Giờ Việt Nam (+7) |

**Bảng `products`**
| Column | Type | Mô tả |
|--------|------|-------|
| id | INTEGER PK | Auto increment |
| name | TEXT | Tên sản phẩm |
| description | TEXT | Mô tả |
| holes | INTEGER | Số lỗ trồng |
| suitable_for | TEXT | Phù hợp |
| size | TEXT | Kích thước |
| price | INTEGER | Giá (VNĐ) |
| price_label | TEXT | Giá hiển thị |
| image | TEXT | Đường dẫn ảnh |
| features | TEXT | JSON array |

**Seed data — 3 sản phẩm:**
| Sản phẩm | Giá | Số lỗ | Phù hợp |
|-----------|-----|-------|---------|
| Mini Kit | 5.990.000₫ | 20 | Ban công / Căn hộ nhỏ |
| Family Kit | 8.490.000₫ | 40 | Gia đình 4–6 người |
| Rooftop Kit | 12.990.000₫ | 80 | Sân thượng / Diện tích lớn |

---

## 4. Admin Dashboard

Truy cập: **`http://localhost:3000/admin`**

| Tính năng | Mô tả |
|-----------|-------|
| 📊 **4 thẻ thống kê** | Tổng yêu cầu / Chưa gọi / Đã tư vấn / Đã lắp đặt |
| 📋 **Bảng danh sách** | STT, Họ tên, SĐT, Loại nhà, Diện tích, Ngân sách, Ghi chú, Ngày ĐK, Trạng thái, Thao tác |
| 🔄 **Cập nhật trạng thái** | Dropdown: Chưa gọi → Đã tư vấn → Đã lắp đặt → Đã đóng |
| 🔍 **Lọc & tìm kiếm** | Lọc theo trạng thái, tìm kiếm theo tên/SĐT |
| 📊 **Biểu đồ** | Phân bố loại nhà, phân bố trạng thái (thanh ngang) |
| ⏰ **Yêu cầu gần đây** | 5 contact mới nhất |
| 🗑️ **Xóa** | Xóa contact với xác nhận |

---

## 5. Cách chạy dự án

### Backend
```bash
cd aerogreen-mvp/server
npm install        # Cài dependencies (chạy 1 lần)
npm start          # Server tại http://localhost:3000
```

### Frontend
```bash
# Mở aerogreen-mvp/index.html bằng Live Server (VS Code)
# Port thường là 5500
```

### Trang quản lý
```
http://localhost:3000/admin
```

---

## 6. Những việc đã hoàn thành trong phiên làm việc

| STT | Công việc | Chi tiết |
|-----|-----------|----------|
| 1 | 📋 **Tạo TODO list** | `server/TODO.md` — checklist chi tiết các chức năng đã làm & có thể phát triển |
| 2 | ♻️ **Tái cấu trúc dự án** | Hợp nhất `backend/` và `server/` thành một thư mục backend duy nhất |
| 3 | 🗑️ **Dọn dẹp** | Xoá thư mục `backend/` trùng lặp, xoá file rác trong `server/` |
| 4 | 🔧 **Cài đặt lại dependencies** | `npm install` trong `server/` — 106 packages |
| 5 | ✅ **Kiểm thử API** | Test tất cả endpoints: health ✅, products ✅, contact POST ✅, contacts GET ✅, recommend ✅ |
| 6 | 🔗 **Tích hợp Frontend** | Form contact gọi API thay vì chỉ log; products tải động từ backend nếu có |
| 7 | 📄 **Tạo file summary này** | `PROJECT_SUMMARY.md` — tổng kết toàn bộ dự án |

---

## 7. Có thể phát triển tiếp (Priority 2)

- [ ] **Thêm field "Loại nhà" vào form contact** (hiện form chỉ có name, phone, area, budget, note)
- [ ] **Tích hợp gợi ý sản phẩm** vào `services.html` — gọi `/api/recommend`
- [ ] **Dashboard biểu đồ nâng cao** — dùng Chart.js
- [ ] **Authentication** — thêm username/password cho admin
- [ ] **Deploy** — đưa lên Render / Vercel / Railway / GitHub Pages
- [ ] **API compare sản phẩm** — frontend gọi `/api/products/compare`

---

## 8. Liên kết hữu ích

| Tài liệu | Đường dẫn |
|----------|-----------|
| AeroGreen Hub Summary | `AeroGreenHub_Summary.md` |
| CP2 Proposal | `CP2/AeroGreenHub_Proposal_CP2.md` |
| CP2 Debate Questions | `CP2/CauHoi_PhanBien_PrintHub3D.txt` |
| CP3 Plan | `CP3/CP3_AeroGreenHub_Plan.md` |
| CP3 MVP/BMC/SWOT Guide | `CP3/HƯỚNG DẪN MVP_BMC_SWOT.md` |
| Backend Checklist | `server/TODO.md` |
| Backend Routes | `server/routes/` |
| Admin Dashboard | `http://localhost:3000/admin` |
| API Base URL | `http://localhost:3000/api` |

---

*Tạo ngày: 2026-06-28 — EXE101 - VƯỜN PHỐ*
