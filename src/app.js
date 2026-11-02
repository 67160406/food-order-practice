// สร้างแอป Express (ไม่มี app.listen เพื่อให้ Supertest require ไปทดสอบได้) -- สัปดาห์ 9
const express = require("express");
const fs = require("fs");
const path = require("path");
const swaggerUi = require("swagger-ui-express"); // สัปดาห์ 10: แสดงเอกสาร API เป็นหน้าเว็บ
const YAML = require("js-yaml");                  // อ่านไฟล์ openapi.yaml เป็น object
const menuRouter = require("./routes/menu");
const ordersRouter = require("./routes/orders");
const { sendError } = require("./utils");

const app = express();
app.use(express.json()); // แปลง body ที่เป็น JSON ให้อยู่ใน req.body

app.get("/health", (req, res) => res.status(200).json({ ok: true }));

// เอกสาร API ที่ /api-docs เปิดเฉพาะตอนไม่ใช่ production
// เพราะหน้านี้เปิดเผยโครงสร้าง endpoint ทั้งระบบ (ข้อควรระวังสัปดาห์ 10)
if (process.env.NODE_ENV !== "production") {
  const openapiDocument = YAML.load(fs.readFileSync(path.join(__dirname, "..", "openapi.yaml"), "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
}

app.use("/api/menu", menuRouter);     // ทุก path ที่ขึ้นต้นด้วย /api/menu ไปที่ routes/menu.js
app.use("/api/orders", ordersRouter); // ทุก path ที่ขึ้นต้นด้วย /api/orders ไปที่ routes/orders.js

// path ที่ไม่มีในระบบ
app.use((req, res) => sendError(res, 404, "NOT_FOUND", "ไม่พบ endpoint นี้"));

// error handler ตัวสุดท้าย ต้องมี 4 พารามิเตอร์ Express จึงรู้ว่าเป็นตัวจัดการ error
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "INVALID_JSON", "รูปแบบ JSON ไม่ถูกต้อง");
  }
  console.error(err);
  return sendError(res, 500, "INTERNAL_ERROR", "เกิดข้อผิดพลาดภายในระบบ");
});

module.exports = app;
