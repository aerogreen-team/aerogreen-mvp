# 📋 AeroGreen Hub — Backend Development TODO List

> Dựa trên tài liệu *AeroGreenHub_Summary.md* và yêu cầu MVP Checkpoint 3

---

## Cấu trúc dự án hiện tại

```
aerogreen-mvp/
├── index.html              # Trang chủ
├── about.html              # Giới thiệu
├── services.html           # Dịch vụ
├── products.html           # Sản phẩm (tĩnh + dynamic từ API)
├── contact.html            # Liên hệ (form → API)
├── css/style.css           # Stylesheet
├── js/
│   ├── script.js           # Form handler (gọi API)
│   ├── api-loader.js       # Module API chung
│   └── products-api.js     # Load sản phẩm từ API
├── images/                 # Hình ảnh
└── server/                 # 🟢 Backend Node.js
    ├── server.js           # Entry point (port 3000)
    ├── database.js         # SQLite schema
    ├── seed.js             # Seed 3 sản phẩm mẫu
    ├── package.json
    ├── TODO.md             # File này
    ├── routes/
    │   ├── contacts.js     # POST/GET/PATCH/DELETE
    │   ├── products.js     # GET products + compare
    │   ├── recommend.js    # GET recommend
    │   └── stats.js        # GET stats
    └── admin/
        ├── index.html      # Dashboard quản lý
        ├── style.css
        └── script.js
```

---

## ✅ Priority 1 — Đã hoàn thành

### 1. Backend Server
- [x] Express server port 3000
- [x] CORS cho phép frontend gọi API
- [x] SQLite database (file-based, không cần cài server)

### 2. Database
- [x] Bảng **contacts**: id, name, phone, house_type, area, budget, goal, note, status, created_at
- [x] Bảng **products**: id, name, description, holes, suitable_for, size, price, price_label, image, features
- [x] Seed 3 sản phẩm: Mini Kit, Family Kit, Rooftop Kit

### 3. API Endpoints
| Method | Endpoint | Mô tả | Trạng thái |
|--------|----------|-------|-----------|
| POST | `/api/contact` | Lưu đăng ký tư vấn | ✅ |
| GET | `/api/contacts` | Danh sách contacts (phân trang, lọc) | ✅ |
| PATCH | `/api/contacts/:id` | Cập nhật trạng thái | ✅ |
| DELETE | `/api/contacts/:id` | Xóa contact | ✅ |
| GET | `/api/products` | Danh sách sản phẩm | ✅ |
| GET | `/api/products/:id` | Chi tiết sản phẩm | ✅ |
| GET | `/api/products/compare?ids=1,2` | So sánh sản phẩm | ✅ |
| GET | `/api/recommend?house_type=&area=&budget=` | Gợi ý sản phẩm | ✅ |
| GET | `/api/stats` | Thống kê dashboard | ✅ |
| GET | `/api/health` | Health check | ✅ |

### 4. Admin Dashboard (`/admin`)
- [x] 4 thẻ thống kê: Tổng / Chưa gọi / Đã tư vấn / Đã lắp đặt
- [x] Bảng danh sách khách hàng (phân trang, lọc, tìm kiếm)
- [x] Cập nhật trạng thái (dropdown) & xóa
- [x] Biểu đồ phân bố loại nhà & trạng thái
- [x] Yêu cầu tư vấn gần đây

### 5. Frontend Integration
- [x] `contact.html` → form gọi `POST /api/contact`
- [x] `products.html` → tự động tải sản phẩm từ API nếu backend chạy
- [x] `js/api-loader.js` → module dùng chung

---

## 🔄 Priority 2 — Có thể phát triển thêm

- [ ] **Thêm field Loại nhà vào form contact** (hiện tại form chỉ có name, phone, area, budget, note)
- [ ] **Tích hợp gợi ý sản phẩm vào services.html** — gọi `/api/recommend`
- [ ] **Dashboard biểu đồ nâng cao** — thêm Chart.js cho chart đẹp hơn
- [ ] **Authentication** — thêm username/password cho admin
- [ ] **Deploy** — đưa lên Render / Vercel / Railway

---

## 🚀 Cách chạy

```bash
cd aerogreen-mvp/server
npm install        # Cài dependencies
npm start          # Server tại http://localhost:3000
```

**Frontend:** Mở `aerogreen-mvp/index.html` bằng Live Server (port 5500)
**Admin:** http://localhost:3000/admin
