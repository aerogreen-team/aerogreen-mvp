# Kiến trúc hệ thống thương mại điện tử quy mô nhỏ

Tài liệu mô tả kiến trúc mục tiêu cho một website thương mại điện tử quy mô nhỏ – vừa, **thiên về Modular Monolith** (monolith dạng module), và cách áp dụng vào VƯỜN PHỐ (Node.js + Express + Turso/libSQL + HTML/CSS/JS thuần, deploy trên Render).

- **Phạm vi:** dưới ~1.000 đơn hàng/tháng, 1–2 người vận hành kỹ thuật, ngân sách hạ tầng gần 0.
- **Mục tiêu:** tinh gọn, dễ triển khai, dễ debug, nhưng có ranh giới module đủ rõ để tách dần khi tải tăng.
- **Không nằm trong phạm vi giai đoạn này:** microservices, Kubernetes, event streaming, đa vùng (multi-region), CQRS/Event Sourcing.

---

## 1. Vì sao chọn Modular Monolith

**Modular Monolith** là một ứng dụng **triển khai như một khối duy nhất** (một process, một pipeline deploy), nhưng mã nguồn được chia thành các **module nghiệp vụ độc lập** theo bounded context. Mỗi module:

- Sở hữu dữ liệu của riêng nó (bảng riêng, schema riêng).
- Chỉ công bố một **giao diện công khai** (hàm service + DTO) cho module khác dùng.
- Giao tiếp với module khác bằng lời gọi trong cùng process hoặc **domain event nội bộ**, không truy cập thẳng bảng của nhau.

Nói cách khác: **ranh giới giống microservices, nhưng vận hành như monolith**.

### So sánh nhanh

| Tiêu chí | Monolith cổ điển | **Modular Monolith** | Microservices |
|---|---|---|---|
| Độ phức tạp vận hành | Thấp | **Thấp – vừa** | Cao |
| Ranh giới nghiệp vụ | Mờ, dễ "rối" | **Rõ trong mã nguồn** | Rõ ở mức hạ tầng |
| Tốc độ phát triển ban đầu | Nhanh | **Nhanh** | Chậm (hạ tầng, contract, observability) |
| Nhất quán dữ liệu | Dễ (1 transaction) | **Dễ (1 database)** | Khó (saga, eventual consistency) |
| Debug & log | Dễ | **Dễ** | Khó (truy vết phân tán) |
| Chi phí hạ tầng | Thấp | **Thấp** | Cao |
| Mở rộng | Chủ yếu dọc | **Dọc + tách module khi cần** | Ngang theo từng service |
| Phù hợp với | MVP rất nhỏ | **E-commerce nhỏ – vừa** | Tổ chức lớn, nhiều team |

### Hệ quả thiết kế

1. Một lần deploy = một phiên bản của toàn hệ thống → rollback đơn giản.
2. Mọi thao tác đặt hàng – giữ tồn kho – thanh toán nằm trong **cùng một database**, nên dùng được transaction ACID thay vì saga.
3. Mã nguồn vẫn chia module, nên khi một module "nóng" (ví dụ Payments hoặc Notifications) có thể tách ra service riêng mà **không phải viết lại toàn bộ**.

---

## 2. Kiến trúc tổng quan

```
┌──────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT KHÁCH                     │
│      Trang sản phẩm · Giỏ hàng · Thanh toán · Tài khoản      │
│                (HTML/CSS/JS thuần, có thể SSR sau)           │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼──────────────────────────────────┐
│                     CDN / STATIC HOSTING                     │
│            Ảnh sản phẩm · Font · JS/CSS tĩnh                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                  MODULAR MONOLITH (Node.js + Express)        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Lớp API: route → validate → auth → rate limit          │  │
│  └────────────────────────┬───────────────────────────────┘  │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │ Application services (use case của từng module)        │  │
│  └────────────────────────┬───────────────────────────────┘  │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │ Domain modules                                         │  │
│  │ Catalog · Cart · Orders · Payments · Inventory         │  │
│  │ Customers · Content · Promotions · Reporting           │  │
│  │ Notifications                                          │  │
│  └────────────────────────┬───────────────────────────────┘  │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │ Infrastructure: repository libSQL · event bus nội bộ   │  │
│  │ · job định kỳ · upload · adapter cổng thanh toán       │  │
│  └────────────────────────┬───────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────┘
             ┌──────────────┴───────────────┐
             ▼                              ▼
┌────────────────────────┐      ┌───────────────────────────────┐
│  TURSO / libSQL        │      │  DỊCH VỤ BÊN THỨ BA           │
│  (nguồn sự thật)       │      │  Cổng thanh toán · Email/Zalo │
│  · Catalog             │      │  Vận chuyển · Lưu trữ ảnh     │
│  · Orders / Payments   │      └───────────────────────────────┘
│  · Inventory · ...     │
└────────────────────────┘
```

**Nguyên tắc vàng:** module không được `SELECT`/`JOIN` vào bảng của module khác. Cần dữ liệu thì gọi API công khai của module đó hoặc dùng read model được cập nhật qua event.

---

## 3. Các module nghiệp vụ

| Module | Trách nhiệm | Dữ liệu sở hữu | API công khai (ví dụ) |
|---|---|---|---|
| **Catalog** | Sản phẩm, danh mục, ảnh, giá niêm yết, tìm kiếm/gợi ý | `products`, `categories`, `product_media` | `getProduct(id)`, `listProducts(filter)` |
| **Cart** | Giỏ hàng theo session hoặc tài khoản, tính tạm tính | `carts`, `cart_items` | `addItem(cartId, sku, qty)`, `getCart(cartId)` |
| **Orders** | Tạo đơn, trạng thái đơn, lịch sử, hủy đơn | `orders`, `order_items`, `order_status_history` | `placeOrder(input)`, `cancelOrder(id)` |
| **Payments** | Giao dịch, xác thực webhook, đối soát, hoàn tiền | `payments`, `refunds`, `webhook_events` | `createPayment(orderId)`, `handleWebhook(payload)` |
| **Inventory** | Tồn kho, giữ chỗ, nhập/xuất, chống bán vượt | `inventory`, `stock_movements` | `reserve(items)`, `commit(items)`, `release(items)` |
| **Customers** | Tài khoản, hồ sơ, địa chỉ, xác thực | `customers`, `addresses`, `sessions` | `register()`, `authenticate()`, `getProfile()` |
| **Content** | Bài viết, trang tĩnh, SEO, media | `pages`, `page_media` | `listPublished()`, `getBySlug()` |
| **Promotions** *(gộp vào Orders ở giai đoạn đầu)* | Mã giảm giá, điều kiện áp dụng | `vouchers`, `voucher_redemptions` | `validate(code, cart)` |
| **Reporting** | Thống kê bán hàng, phễu chuyển đổi, tracking | `events`, view tổng hợp | `salesSummary(range)` |
| **Notifications** | Email xác nhận, Zalo OA, thông báo nội bộ | `notification_log` | `send(template, payload)` |

Quy ước đặt tên bảng theo tiền tố module (`orders_*`, `catalog_*`…) giúp nhìn schema là thấy ranh giới.

---

## 4. Cấu trúc thư mục mẫu

```
server/
├── server.js                  # Khởi động: init DB → mount module → listen
├── modules/
│   ├── catalog/
│   │   ├── catalog.routes.js      # HTTP adapter
│   │   ├── catalog.service.js     # use case + quy tắc nghiệp vụ
│   │   ├── catalog.repository.js  # truy vấn libSQL
│   │   └── catalog.schema.sql     # bảng do module sở hữu
│   ├── orders/
│   ├── payments/
│   ├── inventory/
│   ├── customers/
│   ├── content/
│   └── reporting/
├── shared/
│   ├── db.js                  # client libSQL dùng chung
│   ├── events.js              # event bus nội bộ
│   ├── errors.js              # lỗi nghiệp vụ có mã
│   └── middleware/            # auth, customer-auth, validate, rate limit
├── jobs/                      # job định kỳ (giải phóng giữ chỗ, gửi lại webhook)
└── admin/                     # giao diện quản trị (không phải domain)
```

Hiện tại VƯỜN PHỐ đang để phẳng `server/routes/*.js`. Không cần đổi ngay toàn bộ; khi một route phình to (như `quotations.js`), tách dần thành `modules/<tên>/` theo cấu trúc trên.

---

## 5. Các tầng trong hệ thống

### A. Tầng giao diện (Client / Frontend)

- Hiện tại: HTML/CSS/JS thuần, gọi REST API, phù hợp MVP và chi phí 0.
- Trách nhiệm: hiển thị, validate sơ bộ, giữ trạng thái giỏ hàng phía client; **không tin dữ liệu giá từ client**.
- Khi cần SEO mạnh hơn hoặc nhiều tương tác: cân nhắc Next.js/Nuxt (SSR) — nhưng chỉ sau khi luồng nghiệp vụ ổn định.

### B. Tầng API & xử lý nghiệp vụ (Backend)

- Route chỉ làm 4 việc: xác thực, validate input, gọi application service, định dạng response.
- Application service chứa use case (`placeOrder`, `confirmPayment`), điều phối repository và phát event.
- Lỗi nghiệp vụ trả về mã rõ ràng (`OUT_OF_STOCK`, `INVALID_VOUCHER`, `PAYMENT_FAILED`), không trả stack trace.

### C. Tầng Domain

- Entity/value object và quy tắc bất biến: tổng tiền, trạng thái đơn, điều kiện hủy, chính sách hoàn tiền.
- Tiền tệ lưu bằng **số nguyên VNĐ**, không dùng số thực.
- Mọi phép tính tiền được thực hiện lại ở server tại thời điểm đặt hàng.

### D. Tầng dữ liệu (Database & Cache)

- **Turso/libSQL** là nguồn sự thật duy nhất.
- Giai đoạn đầu chưa cần Redis: dùng cache HTTP (`ETag`, `Cache-Control`) cho catalog và cache in-memory TTL ngắn cho danh mục ít đổi.
- Thêm Redis khi chạy **nhiều instance** (session, rate limit, cache dùng chung).

### E. Tầng tích hợp bên thứ ba

- Cổng thanh toán (VNPay/MoMo/Stripe…): **không lưu số thẻ**, chỉ lưu mã giao dịch và trạng thái.
- Email/Zalo OA: gửi qua adapter, có retry và log.
- Lưu trữ ảnh: object storage/CDN thay vì đĩa ephemeral của hosting.

---

## 6. Giao tiếp giữa các module

### 6.1 Gọi đồng bộ (in-process)

```
orders.service ──► inventory.reserve(items)   // hàm công khai, không phải SQL
orders.service ──► catalog.getPrice(sku)      // lấy giá hiện hành
```

- Chỉ import **service công khai**, không import repository của module khác.
- Dữ liệu truyền qua DTO, không truyền row thô từ database.

### 6.2 Domain event nội bộ (bất đồng bộ)

Các sự kiện tiêu biểu:

| Event | Phát ra từ | Người nghe |
|---|---|---|
| `OrderPlaced` | Orders | Notifications, Reporting |
| `StockReserved` | Inventory | Orders (ghi log) |
| `PaymentSucceeded` | Payments | Orders, Notifications, Reporting |
| `OrderCancelled` | Orders | Inventory, Payments |
| `ContactSubmitted` | Sales/CRM | Notifications |

Giai đoạn đầu dùng `EventEmitter` trong process. Khi cần đảm bảo không mất event (gửi email, đối soát), dùng **outbox pattern nhẹ**: ghi event vào bảng `outbox` trong cùng transaction với nghiệp vụ, worker đọc và đánh dấu đã xử lý.

### 6.3 Quy tắc chống "rối module"

1. Không `JOIN` chéo bảng giữa hai module.
2. Không sửa dữ liệu của module khác bằng SQL trực tiếp.
3. Mọi thay đổi trạng thái quan trọng phải đi qua service của module sở hữu.
4. Review code: nếu thấy `require("../other-module/repository")` → từ chối.

---

## 7. Luồng dữ liệu chuẩn

### 7.1 Duyệt và thêm vào giỏ

```
Khách → trang sản phẩm → GET /api/products
     → POST /api/cart/items { sku, qty }
     → Cart kiểm tra SKU còn bán (gọi Catalog) → lưu cart_items
     → trả giỏ hàng kèm tạm tính (chỉ để hiển thị)
```

### 7.2 Đặt hàng và thanh toán

```
Khách            Web/API                 Orders              Inventory            Payments
  │  bấm đặt hàng   │                      │                    │                    │
  │────────────────►│ POST /api/orders     │                    │                    │
  │                 │─────────────────────►│ validate + tính giá │                    │
  │                 │                      │── reserve(items) ─►│ UPDATE có điều kiện │
  │                 │                      │◄── ok / hết hàng ──│                    │
  │                 │                      │ tạo order=pending  │                    │
  │                 │                      │── createPayment ──────────────────────►│
  │                 │◄── paymentUrl ───────│                    │                    │
  │── thanh toán tại cổng (bên thứ ba) ────────────────────────────────────────────►│
  │                 │◄── webhook (đã ký) ────────────────────────────────────────────│
  │                 │                      │◄── PaymentSucceeded ───────────────────│
  │                 │                      │── commit stock ───►│                    │
  │                 │                      │ order=confirmed    │                    │
  │                 │                      │── OrderConfirmed ─► Notifications (email) │
  │◄── trang cảm ơn │                      │                    │                    │
```

Điểm quan trọng:

- **Giá luôn tính lại ở server**; client chỉ hiển thị.
- **Giữ chỗ tồn kho** trước khi sang cổng thanh toán, tránh bán vượt.
- **Webhook phải xác thực chữ ký** và **idempotent** (cùng một mã giao dịch gọi lại nhiều lần chỉ xử lý một lần).
- Nếu khách không thanh toán trong N phút → job `releaseReservation` giải phóng tồn kho và đóng đơn.

### 7.3 Trạng thái đơn hàng

```
pending ──► confirmed ──► packing ──► shipping ──► delivered
   │            │            │            │
   └────────────┴────────────┴────────────┴──► cancelled
                                    │
                                    └────────► refunded
```

- Chỉ cho phép chuyển trạng thái theo bảng trên; lưu `order_status_history`.
- Hủy sau khi đã thanh toán → tạo yêu cầu hoàn tiền thay vì xóa dữ liệu.

### 7.4 Chống bán vượt (oversell)

Dùng cập nhật có điều kiện, kiểm tra số dòng bị ảnh hưởng:

```sql
UPDATE inventory
SET reserved = reserved + :qty
WHERE sku = :sku
  AND quantity - reserved >= :qty;
-- changes = 0 → hết hàng → rollback transaction, trả OUT_OF_STOCK
```

---

## 8. Dữ liệu và tính nhất quán

| Chủ đề | Cách làm |
|---|---|
| Transaction | Đặt hàng (order + order_items + reserve) trong một transaction libSQL |
| Migration | File SQL đánh số thứ tự (`001_init.sql`…), không sửa file đã chạy |
| Khóa ngoại | Trong cùng module: bật; giữa module: tham chiếu logic bằng ID |
| Index | `status`, `created_at`, `slug` (unique), `sku` (unique), khóa idempotency (unique) |
| Tiền tệ | Số nguyên VNĐ; lưu `currency` cố định `VND` |
| Xóa dữ liệu | Mềm (`deleted_at`) cho sản phẩm/khách; không xóa cứng đơn đã phát sinh |
| Sao lưu | Export định kỳ từ Turso; kiểm tra khôi phục mỗi quý |

---

## 9. Bảo mật

- **Xác thực:** JWT ngắn hạn + refresh token; mật khẩu hash bằng bcrypt; phân quyền `admin` / `customer` ở middleware.
- **Đầu vào:** validate bằng schema ở biên; luôn dùng tham số hóa SQL (libSQL bind args), không nối chuỗi.
- **Thanh toán:** không lưu số thẻ/CVV; xác thực chữ ký webhook; đối soát định kỳ.
- **Nội dung động:** sanitize HTML bài viết trước khi render để chống XSS.
- **Upload:** giới hạn dung lượng, kiểm tra MIME thực, đổi tên tệp, không cho thực thi.
- **Hạ tầng:** HTTPS bắt buộc, CORS danh sách trắng, `helmet` + CSP, rate limit cho login/liên hệ.
- **Bí mật:** chỉ đặt trong biến môi trường, không commit `.env`, xoay token khi lộ.
- **Log:** không ghi mật khẩu, token, số điện thoại đầy đủ; che dữ liệu cá nhân.

---

## 10. Vận hành và triển khai

| Hạng mục | Giai đoạn nhỏ | Khi tải tăng |
|---|---|---|
| Hosting | 1 Web Service (Render) | Thêm instance + load balancer |
| Database | Turso (libSQL) | Thêm read replica / tách DB theo module |
| Job | Chạy trong process với khóa DB | Worker riêng |
| CI | Lint + `node --check` + smoke test trước khi deploy | Thêm E2E test |
| Quan sát | Log JSON + `/api/health` | APM, tracing, alert 5xx/p95 |
| Deploy | Từ `main`, tự động qua Render | Blue-green / canary |

Nguyên tắc migration: **tương thích ngược** (thêm cột trước, deploy, rồi mới bỏ cột cũ) để có thể rollback bản trước.

---

## 11. Hiệu năng và lộ trình mở rộng

Với ~1.000 đơn/tháng (khoảng 0,0004 đơn/giây), một instance và một database là quá đủ. Tối ưu theo thứ tự:

1. **Đo trước, tối ưu sau:** log thời gian phản hồi, đếm truy vấn chậm.
2. Cache đọc catalog + CDN cho ảnh.
3. Đánh index theo truy vấn thực tế.
4. Chỉ thêm Redis khi chạy nhiều instance.
5. Chỉ tách service khi có lý do rõ ràng.

### Khi nào tách một module thành service riêng?

- Module có **tải khác biệt** (ví dụ Payments cần cô lập bảo mật, hoặc Notifications gửi hàng loạt).
- Module cần **deploy độc lập** theo nhịp riêng.
- Có **team riêng** chịu trách nhiệm.
- Đã có **contract ổn định** và test bao phủ.

Quy trình tách: giữ nguyên API công khai → thay lời gọi in-process bằng HTTP/queue → chuyển dữ liệu module sang database riêng → dùng outbox để không mất event trong giai đoạn chuyển tiếp.

---

## 12. Áp dụng vào VƯỜN PHỐ hiện tại

### 12.1 Bản đồ route hiện có → module mục tiêu

| Route hiện tại | Module mục tiêu | Ghi chú |
|---|---|---|
| `/api/products`, `/api/recommend` | Catalog | Gợi ý chọn gói có thể tách thành `recommendation` sau |
| `/api/contacts` | Sales/CRM | Yêu cầu tư vấn, trạng thái chăm sóc |
| `/api/auth` | Customers (admin auth) | Hiện phục vụ đăng nhập quản trị |
| `/api/customers` | Customers | Hồ sơ, yêu cầu của khách |
| `/api/pages`, `/api/uploads` | Content | Bài viết + media |
| `/api/quotations` | Orders (báo giá) | Giao diện quản trị đang tạm ẩn để hoàn thiện luồng |
| `/api/stats`, `/api/track` | Reporting | Thống kê, phễu, tracking |

### 12.2 Hiện trạng và khoảng cách

- Backend hiện là **monolith một tầng**: route gọi trực tiếp `database.js`.
- Chưa có transaction cho luồng nghiệp vụ phức tạp, chưa có outbox/event.
- Chưa có giỏ hàng/thanh toán thật; hợp đồng hiện dựa trên báo giá thủ công.

### 12.3 Ba bước nâng cấp, không "big bang"

1. **Tách truy cập dữ liệu:** mỗi route có repository riêng; route không viết SQL trực tiếp.
2. **Gom module:** tạo `modules/<tên>/` với `routes`, `service`, `repository`, `schema`; chuyển dần từng module, giữ nguyên URL API để frontend không phải sửa.
3. **Thêm event + outbox:** bắt đầu với `ContactSubmitted` và `QuotationCreated` để gửi thông báo; sau đó mở rộng cho đơn hàng/thanh toán.

---

## 13. Checklist kiểm tra kiến trúc

- [ ] Mỗi module có thư mục riêng và schema riêng.
- [ ] Không có truy vấn `JOIN`/`UPDATE` chéo bảng giữa hai module.
- [ ] Route không chứa quy tắc nghiệp vụ; logic nằm ở service.
- [ ] Giá và tổng tiền luôn tính lại ở server.
- [ ] Đặt hàng và giữ tồn kho nằm trong một transaction.
- [ ] Webhook thanh toán xác thực chữ ký và idempotent.
- [ ] Trạng thái đơn đi theo state machine, có lịch sử.
- [ ] Mỗi thay đổi schema có file migration đánh số.
- [ ] Có health check, log lỗi và cảnh báo 5xx.
- [ ] Bí mật nằm trong biến môi trường, không có trong repo.
- [ ] Có smoke test cho luồng: xem sản phẩm → đặt hàng → thanh toán → xác nhận.

---

## 14. Những thứ chưa cần làm ngay

- Microservices, service mesh, Kubernetes.
- Message broker (Kafka/RabbitMQ) khi chưa có nhu cầu thật.
- CQRS/Event Sourcing cho toàn hệ thống.
- Redis, CDN nâng cao khi lưu lượng còn thấp.
- Ứng dụng mobile riêng khi website responsive đã đáp ứng.

---

## Tham khảo

- Tổng quan kiến trúc nền tảng thương mại điện tử: <https://homenest.com.vn/ecommerce-platform-architecture>
- Tài liệu nội bộ: [Nâng cấp giao diện VƯỜN PHỐ](./NANG_CAP_GIAO_DIEN.md) · [README dự án](../README.md)

> Tài liệu này là đề xuất kiến trúc cho giai đoạn tiếp theo; nội dung được tổng hợp và viết lại cho bối cảnh VƯỜN PHỐ, không sao chép từ nguồn tham khảo.
