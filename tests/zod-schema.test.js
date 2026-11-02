// Unit test ของ Zod schema และ validate middleware (สัปดาห์ 12) ไม่ใช้ฐานข้อมูล
const express = require("express");
const request = require("supertest");
const { createOrderSchema, createMenuSchema, deliveryOrderSchema } = require("../src/schemas/order-schema");
const { validate } = require("../src/middlewares/validate");

// ดึงรายชื่อ field ที่ผิดออกมาจาก issue ของ Zod เช่น ["items.0.quantity"]
const fieldsOf = (result) => result.error.issues.map((issue) => issue.path.join("."));

describe("createOrderSchema", () => {
  it("ข้อมูลถูกต้องผ่าน และ trim customer_name ให้", () => {
    const result = createOrderSchema.safeParse({
      customer_name: "  สมชาย  ",
      items: [{ menu_item_id: 1, quantity: 2 }],
    });

    expect(result.success).toBe(true);
    expect(result.data.customer_name).toBe("สมชาย");
  });

  it.each([
    ["ไม่มี customer_name", { items: [{ menu_item_id: 1, quantity: 1 }] }, "customer_name"],
    ["items ว่าง", { customer_name: "ก", items: [] }, "items"],
    ["quantity เป็น 0", { customer_name: "ก", items: [{ menu_item_id: 1, quantity: 0 }] }, "items.0.quantity"],
    ["menu_item_id เป็น string", { customer_name: "ก", items: [{ menu_item_id: "1", quantity: 1 }] }, "items.0.menu_item_id"],
    // cross-field (superRefine): แถวที่ 2 ซ้ำกับแถวแรก
    ["menu_item_id ซ้ำ", { customer_name: "ก", items: [{ menu_item_id: 1, quantity: 1 }, { menu_item_id: 1, quantity: 2 }] }, "items.1.menu_item_id"],
  ])("%s ไม่ผ่าน และชี้ field %s", (_label, body, field) => {
    const result = createOrderSchema.safeParse(body);

    expect(result.success).toBe(false);
    expect(fieldsOf(result)).toContain(field);
  });
});

describe("createMenuSchema", () => {
  it("available ไม่บังคับส่ง", () => {
    expect(createMenuSchema.safeParse({ name: "ชาเขียว", price: 30 }).success).toBe(true);
  });

  it("price ติดลบไม่ผ่าน", () => {
    const result = createMenuSchema.safeParse({ name: "ชาเขียว", price: -1 });

    expect(result.success).toBe(false);
    expect(fieldsOf(result)).toContain("price");
  });
});

describe("deliveryOrderSchema (conditional validation)", () => {
  it("delivery แต่ไม่มี address ไม่ผ่าน", () => {
    const result = deliveryOrderSchema.safeParse({ delivery_type: "delivery" });

    expect(result.success).toBe(false);
    expect(fieldsOf(result)).toContain("address");
  });

  it("pickup ไม่ต้องมี address ก็ผ่าน", () => {
    expect(deliveryOrderSchema.safeParse({ delivery_type: "pickup" }).success).toBe(true);
  });
});

describe("validate middleware", () => {
  // สร้างแอปเล็ก ๆ ไว้ทดสอบ middleware โดยเฉพาะ: ถ้าผ่าน handler จะส่ง req.body กลับมา
  const app = express();
  app.use(express.json());
  app.post("/test", validate(createOrderSchema), (req, res) => res.status(201).json(req.body));

  it("ข้อมูลผิดได้ 400 VALIDATION_ERROR พร้อม details", async () => {
    const res = await request(app).post("/test").send({ customer_name: "", items: [] });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d) => d.field)).toEqual(expect.arrayContaining(["customer_name", "items"]));
  });

  it("ข้อมูลถูกได้ 201 และ handler ได้ req.body ที่ trim แล้ว", async () => {
    const res = await request(app)
      .post("/test")
      .send({ customer_name: "  วิชัย ", items: [{ menu_item_id: 3, quantity: 1 }] });

    expect(res.statusCode).toBe(201);
    expect(res.body.customer_name).toBe("วิชัย");
  });
});
