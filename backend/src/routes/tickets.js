const express = require("express");
const router = express.Router();
const pool = require("../db");

// تذاكر مستخدم معيّن (My Tickets) مع بيانات الفعالية مدموجة بنفس الاستعلام
router.get("/owner/:address", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, e.name AS event_name, e.price_units
       FROM tickets t
       JOIN events e ON e.event_id = t.event_id
       WHERE t.owner_address = $1
       ORDER BY t.purchased_at DESC`,
      [req.params.address.toLowerCase()]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "فشل جلب التذاكر" });
  }
});

// كل تذاكر فعالية معيّنة (يفيد المنظّم بمراجعة الحضور)
router.get("/event/:eventId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tickets WHERE event_id = $1 ORDER BY purchased_at DESC",
      [req.params.eventId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "فشل جلب تذاكر الفعالية" });
  }
});

// تذكرة واحدة بالتفصيل عبر tokenId
router.get("/:tokenId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, e.name AS event_name, e.organizer_address
       FROM tickets t JOIN events e ON e.event_id = t.event_id
       WHERE t.token_id = $1`,
      [req.params.tokenId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "التذكرة غير موجودة" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "فشل جلب التذكرة" });
  }
});

module.exports = router;
