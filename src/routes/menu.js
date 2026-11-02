// เส้นทางเกี่ยวกับเมนูอาหาร: GET /api/menu, GET /api/menu/:id, POST /api/menu (admin), DELETE /api/menu/:id (admin)
const express = require("express");
const { pool } = require("../../db");
const { toPositiveInt, sendError } = require("../utils");
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateMenuBody } = require("../validators/menu-validator");

const router = express.Router();

// คอลัมน์ที่อนุญาตให้ sort (allowlist) ห้ามเอาค่าจาก client ไปต่อ SQL ตรง ๆ
const SORT_COLUMNS = { id: "id", name: "name", price: "price" };

// แปลงแถวจาก MySQL ให้เป็นชนิดที่ถูกต้อง (DECIMAL มาเป็น string, BOOLEAN มาเป็น 1/0)
function toMenuDto(row) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    available: Boolean(row.available),
  };
}

// GET /api/menu?page=1&limit=10&available=true&sort=price&order=desc
router.get("/", async (req, res, next) => {
  try {
    // 1) ตรวจและแปลง query string (ค่าใน req.query เป็น string เสมอ)
    const page = toPositiveInt(req.query.page, 1);
    const limit = toPositiveInt(req.query.limit, 10);
    const errors = [];
    if (page === null) errors.push({ field: "page", message: "page ต้องเป็นจำนวนเต็มตั้งแต่ 1" });
    if (limit === null || limit > 50) errors.push({ field: "limit", message: "limit ต้องเป็นจำนวนเต็ม 1-50" });

    const { available, sort = "id", order = "asc" } = req.query;
    if (available !== undefined && available !== "true" && available !== "false") {
      errors.push({ field: "available", message: "available ต้องเป็น true หรือ false" });
    }
    if (!SORT_COLUMNS[sort]) errors.push({ field: "sort", message: "sort ต้องเป็น id, name หรือ price" });
    if (order !== "asc" && order !== "desc") errors.push({ field: "order", message: "order ต้องเป็น asc หรือ desc" });

    if (errors.length > 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "query string ไม่ถูกต้อง", errors);
    }

    // 2) สร้าง WHERE จากเงื่อนไขที่มีจริง ค่าใส่ผ่าน ? เสมอ
    const where = [];
    const params = [];
    if (available !== undefined) {
      where.push("available = ?");
      params.push(available === "true");
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    // 3) นับจำนวนทั้งหมดก่อน เพื่อคำนวณ totalPages
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM menu_items ${whereSql}`, params);
    const totalItems = countRows[0].total;

    // 4) ดึงข้อมูลเฉพาะหน้าที่ขอ: OFFSET = (page - 1) * limit
    const offset = (page - 1) * limit;
    const orderSql = `ORDER BY ${SORT_COLUMNS[sort]} ${order === "desc" ? "DESC" : "ASC"}, id ASC`;
    const [rows] = await pool.query(
      `SELECT id, name, price, available FROM menu_items ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      data: rows.map(toMenuDto),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    });
  } catch (err) {
    return next(err); // ส่งต่อให้ error handler ตอบ 500
  }
});

// GET /api/menu/:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (id === null) {
      return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");
    }
    const [rows] = await pool.query("SELECT id, name, price, available FROM menu_items WHERE id = ?", [id]);
    if (rows.length === 0) {
      return sendError(res, 404, "MENU_NOT_FOUND", `ไม่พบเมนู id ${id}`);
    }
    return res.status(200).json({ data: toMenuDto(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

// POST /api/menu  เพิ่มเมนูใหม่ (เฉพาะ admin)  body: { name, price, available? }
// ลำดับ middleware: ตรวจ token (401) -> ตรวจ role (403) -> handler ตรวจข้อมูล (400)
router.post("/", authenticateToken, requireRole("admin"), async (req, res, next) => {
  // 1) validate ก่อนแตะฐานข้อมูล
  const result = validateMenuBody(req.body);
  if (!result.valid) {
    return sendError(res, 400, "VALIDATION_ERROR", "ข้อมูลเมนูไม่ถูกต้อง", result.errors);
  }
  const { name, price, available } = result.data;

  try {
    // 2) INSERT ด้วย ? เสมอ แล้วใช้ insertId เป็น id ของเมนูใหม่
    const [insert] = await pool.query(
      "INSERT INTO menu_items (name, price, available) VALUES (?, ?, ?)",
      [name, price, available]
    );
    return res.status(201).json({ data: { id: insert.insertId, name, price, available } });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/menu/:id  ลบเมนู (เฉพาะ admin)
// order_items.menu_item_id มี FOREIGN KEY ถึง menu_items แต่ไม่มี ON DELETE CASCADE
// -> เมนูที่เคยถูกสั่งแล้วลบไม่ได้ MySQL จะโยน ER_ROW_IS_REFERENCED_2 ซึ่งเราแปลงเป็น 409
router.delete("/:id", authenticateToken, requireRole("admin"), async (req, res, next) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");

  try {
    const [result] = await pool.query("DELETE FROM menu_items WHERE id = ?", [id]);
    // affectedRows = 0 แปลว่า WHERE ไม่ตรงแถวไหนเลย = ไม่มีเมนูนี้ (MySQL ไม่ throw เอง)
    if (result.affectedRows === 0) {
      return sendError(res, 404, "MENU_NOT_FOUND", `ไม่พบเมนู id ${id}`);
    }
    return res.status(204).send(); // 204 No Content: สำเร็จแต่ไม่มี body
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return sendError(res, 409, "MENU_IN_USE", "เมนูนี้เคยถูกสั่งแล้ว ลบไม่ได้");
    }
    return next(err); // error อื่นให้ error handler ตอบ 500
  }
});

module.exports = router;
