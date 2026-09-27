/* =========================================================
   VƯỜN PHỐ — Phiên đăng nhập khách hàng, điều hướng & đo lường
   Được nhúng trên mọi trang public. Không phụ thuộc api-loader.js.
   ========================================================= */
(function () {
  "use strict";

  var TOKEN_KEY = "vuonpho_token";
  var USER_KEY = "vuonpho_user";
  var VISITOR_KEY = "vuonpho_visitor";
  var UTM_KEY = "vuonpho_utm";

  /* ---------- API base (nguồn duy nhất) ----------
     - Deploy: app Express phục vụ luôn frontend ⇒ dùng same-origin "/api"
       (không CORS, không mixed-content).
     - Dev: thử cùng origin trước; nếu backend không nằm cùng cổng
       (vd Live Server 5500) thì fallback về localhost:3000.
     - Mở trực tiếp file:// thì buộc phải dùng localhost:3000.
     Có thể override bằng window.__API_BASE__. */
  var _basePromise = null;

  function resolveBase() {
    if (typeof window !== "undefined" && window.__API_BASE__) {
      return Promise.resolve(window.__API_BASE__);
    }
    if (_basePromise) return _basePromise;

    var host = location.hostname;
    var isLocal = host === "" || host === "localhost" || host === "127.0.0.1" || host === "::1";
    var FALLBACK = "http://localhost:3000/api";

    if (location.protocol === "file:") {
      _basePromise = Promise.resolve(FALLBACK);
      return _basePromise;
    }

    _basePromise = fetch("/api/health", { signal: AbortSignal.timeout(2500) })
      .then(function (r) { return r.ok ? "/api" : null; })
      .catch(function () { return null; })
      .then(function (found) {
        return found || (isLocal ? FALLBACK : "/api");
      });

    return _basePromise;
  }

  /* ---------- Lưu trữ an toàn ---------- */
  var store = {
    get: function (k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) {}
    },
    del: function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    },
  };

  /* ---------- Danh tính người truy cập (đếm unique visitor cho OC2) ---------- */
  function visitorId() {
    var v = store.get(VISITOR_KEY);
    if (!v) {
      v = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      store.set(VISITOR_KEY, v);
    }
    return v;
  }

  /* ---------- Ghi nhận nguồn kênh (utm_source) từ link bio TikTok/Facebook ---------- */
  function captureUtm() {
    var p = new URLSearchParams(location.search);
    var utm = {
      source: p.get("utm_source") || "",
      medium: p.get("utm_medium") || "",
      campaign: p.get("utm_campaign") || "",
    };
    if (utm.source || utm.medium || utm.campaign) {
      store.set(UTM_KEY, JSON.stringify(utm));
      return utm;
    }
    try { return JSON.parse(store.get(UTM_KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  var UTM = captureUtm();

  /* ---------- Phiên ---------- */
  function token() { return store.get(TOKEN_KEY); }
  function user() {
    try { return JSON.parse(store.get(USER_KEY) || "null"); } catch (e) { return null; }
  }
  function isLoggedIn() { return !!token(); }

  function saveSession(data) {
    store.set(TOKEN_KEY, data.token);
    store.set(USER_KEY, JSON.stringify(data.user || {}));
  }

  function logout(redirect) {
    store.del(TOKEN_KEY);
    store.del(USER_KEY);
    if (redirect !== false) location.href = "index.html";
  }

  /* ---------- Gọi API kèm token ---------- */
  function api(path, opts) {
    opts = opts || {};

    return resolveBase().then(function (base) {
      var headers = {};
      if (opts.body) headers["Content-Type"] = "application/json";
      if (token()) headers.Authorization = "Bearer " + token();

      return fetch(base + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (res.status === 401) logout(false);
        return { ok: res.ok, status: res.status, json: json };
      });
    });
  }

  /* ---------- Đo lường (best effort, không chặn UI) ---------- */
  function track(type, label, extra) {
    resolveBase()
      .then(function (base) {
        return fetch(base + "/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: type,
            path: location.pathname,
            label: label || "",
            visitor_id: visitorId(),
            source: UTM.source || "",
            medium: UTM.medium || "",
            campaign: UTM.campaign || "",
          }),
        });
      })
      .catch(function () {});
  }

  /* ---------- Thông báo nhỏ ---------- */
  function notify(msg) {
    var t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
      document.body.appendChild(t);
    }
    t.querySelector("span").textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function alertBox(el, kind, msg) {
    if (!el) return;
    el.className = "auth-alert " + kind + " show";
    el.textContent = msg;
  }

  /* ---------- Điều hướng theo trạng thái đăng nhập ---------- */
  function injectNav() {
    var logged = isLoggedIn();
    var href = logged ? "account.html" : "login.html";
    var label = logged ? "Tài khoản" : "Đăng nhập";

    document.querySelectorAll(".nav, .mobile-nav").forEach(function (nav) {
      if (nav.querySelector("[data-auth-link]")) return;
      var a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      a.setAttribute("data-auth-link", "");

      var cta = nav.querySelector(".btn");
      if (cta) nav.insertBefore(a, cta);
      else nav.appendChild(a);

      if (location.pathname.indexOf(href) !== -1) a.classList.add("active");
    });
  }

  /* ---------- Bảo vệ trang chỉ dành cho khách đã đăng nhập ---------- */
  function requireLogin() {
    if (!isLoggedIn()) {
      location.href = "login.html?next=" + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    return true;
  }

  /* ---------- Prefill form liên hệ bằng hồ sơ ---------- */
  function prefillContact() {
    if (!isLoggedIn() || !document.getElementById("name")) return;
    var u = user() || {};
    var set = function (id, val) {
      var el = document.getElementById(id);
      if (el && val && !el.value) el.value = val;
    };
    set("name", u.name);
    set("phone", u.phone);
    set("email", u.email);
    if (u.house_type) {
      var ht = document.getElementById("houseType");
      if (ht && !ht.value) ht.value = u.house_type;
    }
    set("areaInstall", u.area);
    set("budgetContact", u.budget);
    set("goal", u.goal);
  }

  /* ---------- Bootstrap theo trang ---------- */
  function initLogin() {
    var form = document.getElementById("loginForm");
    if (!form) return;
    var box = document.getElementById("authAlert");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("loginEmail").value.trim();
      var password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        alertBox(box, "error", "Vui lòng nhập email và mật khẩu.");
        return;
      }

      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Đang đăng nhập...";

      api("/customers/login", { method: "POST", body: { email: email, password: password } })
        .then(function (r) {
          if (!r.ok) {
            alertBox(box, "error", (r.json && r.json.error) || "Đăng nhập thất bại.");
            return;
          }
          saveSession(r.json.data);
          var next = new URLSearchParams(location.search).get("next");
          location.href = next || "account.html";
        })
        .catch(function () {
          alertBox(box, "error", "Không kết nối được máy chủ. Vui lòng thử lại.");
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Đăng nhập";
        });
    });
  }

  function initRegister() {
    var form = document.getElementById("registerForm");
    if (!form) return;
    var box = document.getElementById("authAlert");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
      };

      var payload = {
        name: val("regName"),
        phone: val("regPhone"),
        email: val("regEmail"),
        password: document.getElementById("regPassword").value,
        house_type: val("regHouseType"),
        area: val("regArea"),
        budget: val("regBudget"),
        goal: val("regGoal"),
        source: UTM.source || "website",
      };

      if (!payload.name || !payload.phone || !payload.email || !payload.password) {
        alertBox(box, "error", "Vui lòng nhập đủ họ tên, số điện thoại, email và mật khẩu.");
        return;
      }
      if (payload.password.length < 6) {
        alertBox(box, "error", "Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }

      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Đang tạo tài khoản...";

      api("/customers/register", { method: "POST", body: payload })
        .then(function (r) {
          if (!r.ok) {
            alertBox(box, "error", (r.json && r.json.error) || "Đăng ký thất bại.");
            return;
          }
          saveSession(r.json.data);
          track("register", "account_page");
          location.href = "account.html";
        })
        .catch(function () {
          alertBox(box, "error", "Không kết nối được máy chủ. Vui lòng thử lại.");
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Tạo tài khoản";
        });
    });
  }

  var STATUS_LABEL = {
    pending: "Chưa gọi",
    contacted: "Đã tư vấn",
    installed: "Đã lắp đặt",
    closed: "Đã đóng",
  };

  var HOUSE_LABEL = {
    chungcu: "Chung cư / Căn hộ",
    nhapho: "Nhà phố / Nhà riêng",
    santhuong: "Sân thượng",
    bietthu: "Biệt thự",
    khac: "Khác",
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderRequests(listEl, items) {
    if (!items || !items.length) {
      listEl.innerHTML =
        '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 12h6M9 16h6M9 8h6"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>' +
        "<p>Bạn chưa có yêu cầu tư vấn nào.<br/>Hãy chọn một gói phù hợp để bắt đầu.</p></div>" +
        '<a class="btn" href="products.html" style="width:100%;justify-content:center;margin-top:6px;">Xem các gói giải pháp</a>';
      return;
    }

    listEl.innerHTML = items
      .map(function (r) {
        var q = r.quotation;
        var quoteLine = q
          ? '<p style="margin-top:8px"><b>Báo giá:</b> ' +
            Number(q.totalAmount || 0).toLocaleString("vi-VN") +
            "₫ · <b>Đặt cọc:</b> " +
            Number(q.depositAmount || 0).toLocaleString("vi-VN") +
            "₫</p>"
          : "";

        return (
          '<div class="req-item"><h4>' +
          esc(HOUSE_LABEL[r.house_type] || r.house_type || "Yêu cầu tư vấn") +
          ' <span class="req-badge">' +
          esc(STATUS_LABEL[r.status] || r.status) +
          "</span></h4>" +
          "<p>" +
          esc(r.note || "Chưa có mô tả") +
          "</p>" +
          quoteLine +
          '<div class="req-meta"><span>Diện tích: ' +
          esc(r.area || "—") +
          "</span><span>Ngân sách: " +
          esc(r.budget || "—") +
          "</span><span>Ngày gửi: " +
          esc(r.created_at || "—") +
          "</span></div></div>"
        );
      })
      .join("");
  }

  function initAccount() {
    // Chỉ áp dụng cho trang hồ sơ — tránh chặn nhầm các trang khác
    if (!document.getElementById("reqList")) return;
    if (!requireLogin()) return;

    var u = user() || {};
    var nameEl = document.getElementById("accName");
    if (nameEl) nameEl.textContent = u.name || "Khách hàng";
    var helloEl = document.getElementById("accHello");
    if (helloEl) helloEl.textContent = u.name || "Khách hàng";
    var emailEl = document.getElementById("accEmail");
    if (emailEl) emailEl.textContent = u.email || "";
    var avatarEl = document.getElementById("accAvatar");
    if (avatarEl && u.name) avatarEl.textContent = u.name.trim().charAt(0).toUpperCase();

    var logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", function () { logout(true); });

    track("account_view", "account_page");

    api("/customers/me/requests").then(function (r) {
      var listEl = document.getElementById("reqList");
      if (listEl) renderRequests(listEl, r.ok ? r.json.data : []);
    });

    // Hồ sơ
    var profForm = document.getElementById("profileForm");
    if (profForm) {
      ["profileName", "profilePhone", "profileHouseType", "profileArea", "profileBudget", "profileGoal"].forEach(
        function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          var key = id.replace("profile", "").toLowerCase();
          if (key === "housetype") key = "house_type";
          if (el.value === "" && u[key]) el.value = u[key];
        }
      );

      var box = document.getElementById("profileAlert");
      profForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var val = function (id) {
          var el = document.getElementById(id);
          return el ? el.value.trim() : "";
        };

        var btn = profForm.querySelector("button[type=submit]");
        btn.disabled = true;

        api("/customers/me", {
          method: "PUT",
          body: {
            name: val("profileName"),
            phone: val("profilePhone"),
            house_type: val("profileHouseType"),
            area: val("profileArea"),
            budget: val("profileBudget"),
            goal: val("profileGoal"),
          },
        })
          .then(function (r) {
            if (!r.ok) {
              alertBox(box, "error", (r.json && r.json.error) || "Cập nhật thất bại.");
              return;
            }
            store.set(USER_KEY, JSON.stringify(r.json.data));
            alertBox(box, "success", "Đã lưu hồ sơ.");
            notify("Đã lưu hồ sơ");
          })
          .catch(function () {
            alertBox(box, "error", "Không kết nối được máy chủ.");
          })
          .finally(function () { btn.disabled = false; });
      });
    }
  }

  function initNewRequest() {
    var form = document.getElementById("requestForm");
    if (!form) return;
    var box = document.getElementById("reqAlert");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
      };

      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;

      api("/customers/me/requests", {
        method: "POST",
        body: {
          house_type: val("reqHouseType"),
          area: val("reqArea"),
          budget: val("reqBudget"),
          goal: val("reqGoal"),
          note: val("reqNote"),
          purchase_type: val("reqPurchase"),
          source: UTM.source || "account",
        },
      })
        .then(function (r) {
          if (!r.ok) {
            alertBox(box, "error", (r.json && r.json.error) || "Gửi yêu cầu thất bại.");
            return;
          }
          alertBox(box, "success", "Đã gửi yêu cầu! VƯỜN PHỐ sẽ liên hệ trong 24 giờ.");
          notify("Đã gửi yêu cầu tư vấn");
          form.reset();
          return api("/customers/me/requests").then(function (r2) {
            var listEl = document.getElementById("reqList");
            if (listEl) renderRequests(listEl, r2.ok ? r2.json.data : []);
          });
        })
        .catch(function () {
          alertBox(box, "error", "Không kết nối được máy chủ.");
        })
        .finally(function () { btn.disabled = false; });
    });
  }

  /* ---------- Khởi động ---------- */
  function boot() {
    injectNav();

    // Không đo lường các trang quản trị
    if (location.pathname.indexOf("/admin") === -1) track("page_view", document.title.slice(0, 60));

    initLogin();
    initRegister();
    initAccount();
    initNewRequest();
    prefillContact();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* ---------- API công khai cho các script khác ---------- */
  window.VuonPho = {
    apiBaseAsync: resolveBase,
    api: api,
    token: token,
    user: user,
    isLoggedIn: isLoggedIn,
    logout: logout,
    track: track,
    notify: notify,
    utm: function () { return UTM; },
    visitorId: visitorId,
  };
})();
