// Integration test ของ POST /api/menu และ DELETE /api/menu/:id (ต้องเป็น admin, ต่อฐานข้อมูลจริง)
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { pool } = require("../db");
const { jwtSecret } = require("../config");
const { resetDatabase, countRows } = require("./helpers/db-helper");

// token ทดสอบของแต่ละ role (เซ็นด้วย secret เดียวกับที่แอปใช้ตรวจ)
const adminToken = jwt.sign({ id: 1, role: "admin" }, jwtSecret, { expiresIn: "1h" });
const staffToken = jwt.sign({ id: 2, role: "staff" }, jwtSecret, { expiresIn: "1h" });
const asAdmin = { Authorization: `Bearer ${adminToken}` };

// เทสต์ชุดนี้เพิ่ม/ลบข้อมูล ต้องรีเซ็ตก่อนทุกเทสต์
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe("POST /api/menu", () => {
  const newMenu = { name: "ข้าวต้มปลา", price: 65 };

  it("ไม่มี token ได้ 401", async () => {
    const res = await request(app).post("/api/menu").send(newMenu);

    expect(res.statusCode).toBe(401);
  });

  it("staff ได้ 403 เพราะเพิ่มเมนูได้เฉพาะ admin", async () => {
    const res = await request(app).post("/api/menu").set("Authorization", `Bearer ${staffToken}`).send(newMenu);

    expect(res.statusCode).toBe(403);
  });

  it("ข้อมูลผิดหลาย field ได้ 400 และรายงาน error ครบทุก field ในครั้งเดียว", async () => {
    const res = await request(app).post("/api/menu").set(asAdmin).send({ name: "  ", price: -5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(["name", "price"]);
  });

  it("admin เพิ่มสำเร็จได้ 201 และเมนูทั้งหมดเพิ่มเป็น 23", async () => {
    const res = await request(app).post("/api/menu").set(asAdmin).send(newMenu);

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toEqual({ id: 23, name: "ข้าวต้มปลา", price: 65, available: true });
    expect(await countRows("menu_items")).toBe(23);
  });
});

describe("DELETE /api/menu/:id", () => {
  it("ลบเมนูที่ไม่เคยถูกสั่ง (id 2) ได้ 204 และหาไม่เจออีก", async () => {
    const res = await request(app).delete("/api/menu/2").set(asAdmin);

    expect(res.statusCode).toBe(204);
    expect(res.body).toEqual({}); // 204 ไม่มี body

    const check = await request(app).get("/api/menu/2");
    expect(check.statusCode).toBe(404);
  });

  it("ลบเมนูที่เคยถูกสั่ง (id 1 อยู่ใน order 1) ได้ 409 MENU_IN_USE และเมนูยังอยู่", async () => {
    const res = await request(app).delete("/api/menu/1").set(asAdmin);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("MENU_IN_USE");
    expect(await countRows("menu_items")).toBe(22);
  });

  it("id ที่ไม่มีได้ 404", async () => {
    const res = await request(app).delete("/api/menu/999").set(asAdmin);

    expect(res.statusCode).toBe(404);
  });

  it("staff ลบไม่ได้ ได้ 403", async () => {
    const res = await request(app).delete("/api/menu/2").set("Authorization", `Bearer ${staffToken}`);

    expect(res.statusCode).toBe(403);
    expect(await countRows("menu_items")).toBe(22);
  });
});
