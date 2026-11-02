// เส้นทางเกี่ยวกับคำสั่งซื้อ: POST /api/orders, GET /api/orders, GET /api/orders/:id, PATCH /api/orders/:id/status (staff/admin)
const express = require("express");
const { pool } = require("../../db");
const { toPositiveInt, sendError } = require("../utils");
const { authenticateToken, requireRole } = require("../middlewares/auth");

const router = express.Router();

const ALL_STATUSES = ["pending", "preparing", "delivered", "cancelled"];
// สถานะปัจจุบัน -> สถานะที่เปลี่ยนไปได้
const NEXT_STATUS = {
  pending: ["preparing", "cancelled"],
  preparing: ["delivered"],
  delivered: [],
  cancelled: [],
};

// ตรวจ body ของ POST /api/orders คืน array ของข้อผิดพลาด (ว่าง = ผ่าน)
function validateOrderBody(body) {
  const errors = [];
  const { customer_name, items } = body || {};

  if (typeof customer_name !== "string" || customer_name.trim() === "") {
    errors.push({ field: "customer_name", message: "ต้องระบุ customer_name" });
  } else if (customer_name.trim().length > 100) {
    errors.push({ field: "customer_name", message: "customer_name ยาวได้ไม่เกิน 100 ตัวอักษร" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push({ field: "items", message: "items ต้องเป็น array ที่มีอย่างน้อย 1 รายการ" });
    return errors;
  }
  if (items.length > 20) errors.push({ field: "items", message: "สั่งได้ไม่เกิน 20 รายการต่อครั้ง" });

  items.forEach((item, i) => {
    if (!Number.isInteger(item?.menu_item_id) || item.menu_item_id <= 0) {
      errors.push({ field: `items[${i}].menu_item_id`, message: "menu_item_id ต้องเป็นจำนวนเต็มบวก" });
    }
    if (!Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 20) {
      errors.push({ field: `items[${i}].quantity`, message: "quantity ต้องเป็นจำนวนเต็ม 1-20" });
    }
  });

  // cross-field validation: ห้ามมี menu_item_id ซ้ำในคำสั่งซื้อเดียว (ให้รวมเป็น quantity เดียว)
  const ids = items.map((item) => item?.menu_item_id);
  if (new Set(ids).size !== ids.length) {
    errors.push({ field: "items", message: "menu_item_id ห้ามซ้ำกันในคำสั่งซื้อเดียว" });
  }
  return errors;
}

// POST /api/orders  body: { customer_name, items: [{ menu_item_id, quantity }] }
router.post("/", async (req, res, next) => {
  // 1) validate ก่อนแตะฐานข้อมูล
  const errors = validateOrderBody(req.body);
  if (errors.length > 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "ข้อมูลคำสั่งซื้อไม่ถูกต้อง", errors);
  }
  const customerName = req.body.customer_name.trim();
  const { items } = req.body;

  let conn;
  try {
    // 2) ขอ connection เดี่ยว แล้วเริ่ม transaction (ทุก query ต้องใช้ conn ตัวนี้)
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 3) ดึงเมนูทั้งหมดที่สั่งในครั้งเดียว: IN (?) + array จะถูกขยายเป็น IN (1, 15)
    const ids = items.map((item) => item.menu_item_id);
    const [menuRows] = await conn.query(
      "SELECT id, name, price, available FROM menu_items WHERE id IN (?)",
      [ids]
    );
    const menuById = new Map(menuRows.map((m) => [m.id, m]));

    // 4) ตรวจว่าเมนูมีจริงและยังขายอยู่ ถ้าไม่ผ่านให้ rollback แล้ว return ทันที
    for (const item of items) {
      const menu = menuById.get(item.menu_item_id);
      if (!menu) {
        await conn.rollback();
        return sendError(res, 404, "MENU_NOT_FOUND", `ไม่พบเมนู id ${item.menu_item_id}`);
      }
      if (!menu.available) {
        await conn.rollback();
        return sendError(res, 409, "MENU_UNAVAILABLE", `เมนู ${menu.name} หมดชั่วคราว`);
      }
    }

    // 5) บันทึก order แล้วใช้ insertId ไปบันทึก order_items
    const [orderResult] = await conn.query("INSERT INTO orders (customer_name) VALUES (?)", [customerName]);
    const orderId = orderResult.insertId;
    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
        [orderId, item.menu_item_id, item.quantity]
      );
    }

    // 6) ทุกขั้นสำเร็จจึง commit
    await conn.commit();

    const total = items.reduce(
      (sum, item) => sum + Number(menuById.get(item.menu_item_id).price) * item.quantity,
      0
    );
    return res.status(201).json({
      data: { id: orderId, customer_name: customerName, status: "pending", total, items },
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {}); // ยกเลิกทุกอย่างที่ทำไปใน transaction
    return next(err);
  } finally {
    if (conn) conn.release(); // คืน connection ให้ pool เสมอ ไม่ว่าสำเร็จหรือล้ม
  }
});

// GET /api/orders?status=pending&page=1&limit=10  รายการคำสั่งซื้อพร้อมยอดรวม (ใหม่สุดก่อน)
router.get("/", async (req, res, next) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = toPositiveInt(req.query.limit, 10);
    const { status } = req.query;

    const errors = [];
    if (page === null) errors.push({ field: "page", message: "page ต้องเป็นจำนวนเต็มตั้งแต่ 1" });
    if (limit === null || limit > 50) errors.push({ field: "limit", message: "limit ต้องเป็นจำนวนเต็ม 1-50" });
    if (status !== undefined && !ALL_STATUSES.includes(status)) {
      errors.push({ field: "status", message: `status ต้องเป็นหนึ่งใน ${ALL_STATUSES.join(", ")}` });
    }
    if (errors.length > 0) return sendError(res, 400, "VALIDATION_ERROR", "query string ไม่ถูกต้อง", errors);

    const whereSql = status ? "WHERE o.status = ?" : "";
    const params = status ? [status] : [];

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`, params);
    const totalItems = countRows[0].total;

    // LEFT JOIN เพื่อให้ order ที่ยังไม่มีรายการอาหารยังแสดงอยู่ (ยอดรวม 0)
    const [rows] = await pool.query(
      `SELECT o.id, o.customer_name, o.status, o.created_at,
              COALESCE(SUM(oi.quantity * m.price), 0) AS total
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN menu_items m ON m.id = oi.menu_item_id
       ${whereSql}
       GROUP BY o.id, o.customer_name, o.status, o.created_at
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    return res.status(200).json({
      data: rows.map((r) => ({ ...r, total: Number(r.total) })), // SUM ของ DECIMAL มาเป็น string
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/orders/:id  คืน order พร้อมรายการอาหารและยอดรวม
router.get("/:id", async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (id === null) return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");

    const [orders] = await pool.query(
      "SELECT id, customer_name, status, created_at FROM orders WHERE id = ?",
      [id]
    );
    if (orders.length === 0) return sendError(res, 404, "ORDER_NOT_FOUND", `ไม่พบคำสั่งซื้อ id ${id}`);

    // JOIN เพื่อเอาชื่อและราคาเมนูมาด้วย
    const [itemRows] = await pool.query(
      `SELECT oi.menu_item_id, m.name, m.price, oi.quantity
       FROM order_items oi
       JOIN menu_items m ON m.id = oi.menu_item_id
       WHERE oi.order_id = ?
       ORDER BY oi.id`,
      [id]
    );
    const items = itemRows.map((r) => ({
      menu_item_id: r.menu_item_id,
      name: r.name,
      price: Number(r.price),
      quantity: r.quantity,
      subtotal: Number(r.price) * r.quantity,
    }));
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    return res.status(200).json({ data: { ...orders[0], items, total } });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/orders/:id/status  body: { status }
router.patch("/:id/status", authenticateToken, requireRole("staff", "admin"), async (req, res, next) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");
  const { status } = req.body || {};
  if (!ALL_STATUSES.includes(status)) {
    return sendError(res, 400, "VALIDATION_ERROR", `status ต้องเป็นหนึ่งใน ${ALL_STATUSES.join(", ")}`);
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // FOR UPDATE ล็อกแถวนี้ไว้จนจบ transaction กันสองคำขอเปลี่ยนสถานะพร้อมกัน
    const [rows] = await conn.query("SELECT id, status FROM orders WHERE id = ? FOR UPDATE", [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return sendError(res, 404, "ORDER_NOT_FOUND", `ไม่พบคำสั่งซื้อ id ${id}`);
    }

    const current = rows[0].status;
    if (!(NEXT_STATUS[current] || []).includes(status)) {
      await conn.rollback();
      return sendError(res, 409, "INVALID_STATUS_TRANSITION", `เปลี่ยนสถานะจาก ${current} เป็น ${status} ไม่ได้`);
    }

    await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    await conn.commit();
    return res.status(200).json({ data: { id, status } });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    return next(err);
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
