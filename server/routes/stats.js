const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");

// GET /api/stats — Dashboard statistics
router.get("/", async (req, res) => {
  try {
    const db = getDatabase();
    const count = async (sql) => Number((await db.get(sql)).value);

    const totalContacts = await count("SELECT COUNT(*) as value FROM contacts");
    const pending = await count("SELECT COUNT(*) as value FROM contacts WHERE status = 'pending'");
    const contacted = await count("SELECT COUNT(*) as value FROM contacts WHERE status = 'contacted'");
    const installed = await count("SELECT COUNT(*) as value FROM contacts WHERE status = 'installed'");

    const byHouseType = await db.all(
      `SELECT COALESCE(NULLIF(house_type, ''), 'Khác') as label, COUNT(*) as value 
       FROM contacts GROUP BY house_type ORDER BY value DESC`
    );

    const byStatus = await db.all(
      `SELECT 
        CASE status 
          WHEN 'pending' THEN 'Chưa gọi' 
          WHEN 'contacted' THEN 'Đã tư vấn' 
          WHEN 'installed' THEN 'Đã lắp đặt' 
          WHEN 'closed' THEN 'Đã đóng' 
        END as label, 
        COUNT(*) as value 
       FROM contacts GROUP BY status ORDER BY value DESC`
    );

    const recentContacts = await db.all(
      "SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5"
    );

    res.json({
      totalContacts,
      pending,
      contacted,
      installed,
      byHouseType,
      byStatus,
      recentContacts,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/stats/funnel — Chỉ số trỏ về sản phẩm (phục vụ Outcome 2)
router.get("/funnel", async (req, res) => {
  try {
    const db = getDatabase();
    const scalar = async (sql) => Number((await db.get(sql)).value);

    const visits = await scalar("SELECT COUNT(*) as value FROM events WHERE type = 'page_view'");
    const uniqueVisitors = await scalar(
      "SELECT COUNT(DISTINCT visitor_id) as value FROM events WHERE type = 'page_view' AND visitor_id <> ''"
    );
    const registrations = await scalar("SELECT COUNT(*) as value FROM customers");
    const requests = await scalar("SELECT COUNT(*) as value FROM contacts");
    const qualified = await scalar(
      "SELECT COUNT(*) as value FROM contacts WHERE status IN ('contacted','installed','closed')"
    );
    const orders = await scalar(
      "SELECT COUNT(*) as value FROM quotations WHERE status IN ('deposit_paid','confirmed','completed')"
    );
    const registeredWithRequest = await scalar(
      "SELECT COUNT(DISTINCT customer_id) as value FROM contacts WHERE customer_id IS NOT NULL"
    );

    const trafficBySource = await db.all(
      `SELECT COALESCE(NULLIF(source, ''), 'direct') as label, COUNT(*) as value
       FROM events WHERE type = 'page_view'
       GROUP BY label ORDER BY value DESC`
    );

    const leadsBySource = await db.all(
      `SELECT COALESCE(NULLIF(source, ''), 'direct') as label, COUNT(*) as value
       FROM contacts GROUP BY label ORDER BY value DESC`
    );

    const visitsByDay = await db.all(
      `SELECT substr(created_at, 1, 10) as label, COUNT(*) as value
       FROM events WHERE type = 'page_view'
       GROUP BY label ORDER BY label DESC LIMIT 30`
    );

    const eventsByType = await db.all(
      `SELECT type as label, COUNT(*) as value FROM events GROUP BY type ORDER BY value DESC`
    );

    const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

    res.json({
      visits,
      uniqueVisitors,
      registrations,
      registeredWithRequest,
      requests,
      qualified,
      orders,
      conversion: {
        visitToRegister: pct(registrations, uniqueVisitors),
        registerToRequest: pct(registeredWithRequest, registrations),
        requestToOrder: pct(orders, requests),
      },
      trafficBySource,
      leadsBySource,
      visitsByDay,
      eventsByType,
    });
  } catch (error) {
    console.error("GET /api/stats/funnel error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
