// Integration test ของ /api/orders (ต่อฐานข้อมูลจริง)
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../db");
const { resetDatabase, countRows } = require("./helpers/db-helper");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const staffToken = jwt.sign({ id: 1, role: "staff" }, jwtSecret, { expiresIn: "1h" }); // token พนักงานสำหรับเทสต์

// เทสต์ชุดนี้เขียนข้อมูล ต้องรีเซ็ตก่อนทุกเทสต์เพื่อให้แต่ละเทสต์ไม่กระทบกัน
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe("POST /api/orders", () => {
  it("สั่งอาหารสำเร็จได้ 201 พร้อมยอดรวมที่ถูกต้อง และบันทึกลงฐานข้อมูล", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        customer_name: "ทดสอบ",
        items: [
          { menu_item_id: 1, quantity: 2 },  // ข้าวผัดกุ้ง 60 x 2 = 120
          { menu_item_id: 15, quantity: 1 }, // ชาเย็น 25 x 1 = 25
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.total).toBe(145);

    // ยืนยันในฐานข้อมูลจริง: order เพิ่มจาก 3 เป็น 4, order_items เพิ่มจาก 5 เป็น 7
    expect(await countRows("orders")).toBe(4);
    expect(await countRows("order_items")).toBe(7);
  });

  it.each([
    ["ไม่มี customer_name", { items: [{ menu_item_id: 1, quantity: 1 }] }],
    ["items ว่าง", { customer_name: "ก", items: [] }],
    ["quantity เป็น 0", { customer_name: "ก", items: [{ menu_item_id: 1, quantity: 0 }] }],
    ["menu_item_id เป็น string", { customer_name: "ก", items: [{ menu_item_id: "1", quantity: 1 }] }],
    ["menu_item_id ซ้ำกัน", { customer_name: "ก", items: [{ menu_item_id: 1, quantity: 1 }, { menu_item_id: 1, quantity: 2 }] }],
  ])("%s ได้ 400 VALIDATION_ERROR", async (_label, body) => {
    const res = await request(app).post("/api/orders").send(body);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("มีเมนูที่ไม่มีอยู่จริงได้ 404 และไม่สร้าง order (rollback)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ customer_name: "ทดสอบ", items: [{ menu_item_id: 1, quantity: 1 }, { menu_item_id: 999, quantity: 1 }] });

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("MENU_NOT_FOUND");
    expect(await countRows("orders")).toBe(3);
  });

  it("สั่งเมนูที่หมด (id 9) ได้ 409 และไม่สร้าง order", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ customer_name: "ทดสอบ", items: [{ menu_item_id: 9, quantity: 1 }] });

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("MENU_UNAVAILABLE");
    expect(await countRows("orders")).toBe(3);
  });
});

describe("GET /api/orders", () => {
  it("ได้ 3 order เรียงใหม่สุดก่อน พร้อมยอดรวมที่ถูกต้อง", async () => {
    const res = await request(app).get("/api/orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.map((o) => o.id)).toEqual([3, 2, 1]);
    expect(res.body.data.map((o) => o.total)).toEqual([130, 45, 170]);
    expect(res.body.pagination.totalItems).toBe(3);
  });

  it("status=pending เหลือ order 3 อย่างเดียว", async () => {
    const res = await request(app).get("/api/orders?status=pending");

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 3, customer_name: "วิชัย", total: 130 });
  });

  it("limit=2&page=2 ได้ order 1 (ตัวสุดท้าย)", async () => {
    const res = await request(app).get("/api/orders?limit=2&page=2");

    expect(res.body.data.map((o) => o.id)).toEqual([1]);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it("status ที่ไม่รู้จักได้ 400", async () => {
    const res = await request(app).get("/api/orders?status=lost");

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/orders/:id", () => {
  it("order 1 มี 2 รายการ ยอดรวม 170", async () => {
    const res = await request(app).get("/api/orders/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.customer_name).toBe("สมชาย");
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(170); // 60x2 + 25x2
  });

  it("order ที่ไม่มีได้ 404", async () => {
    const res = await request(app).get("/api/orders/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("ORDER_NOT_FOUND");
  });
});

describe("PATCH /api/orders/:id/status", () => {
  // ฟังก์ชันช่วยยิง PATCH พร้อม token พนักงาน ลดการเขียนซ้ำ
  const patchStatus = (id, status) =>
    request(app)
      .patch(`/api/orders/${id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status });

  it("pending -> preparing ได้ 200 และสถานะในฐานข้อมูลเปลี่ยนจริง", async () => {
    const res = await patchStatus(3, "preparing");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ id: 3, status: "preparing" });

    const check = await request(app).get("/api/orders/3");
    expect(check.body.data.status).toBe("preparing");
  });

  it("pending -> cancelled ได้ 200", async () => {
    const res = await patchStatus(3, "cancelled");

    expect(res.statusCode).toBe(200);
  });

  it("delivered -> preparing ไม่ได้ ได้ 409", async () => {
    const res = await patchStatus(1, "preparing");

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("status ที่ไม่มีในระบบได้ 400", async () => {
    const res = await patchStatus(3, "done");

    expect(res.statusCode).toBe(400);
  });

  it("order ที่ไม่มีได้ 404", async () => {
    const res = await patchStatus(999, "preparing");

    expect(res.statusCode).toBe(404);
  });
});
