// Integration test ของ /api/menu (ต่อฐานข้อมูลจริง)
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../db");
const { resetDatabase } = require("./helpers/db-helper");

// เทสต์ชุดนี้อ่านอย่างเดียว รีเซ็ตครั้งเดียวก่อนเริ่มพอ
beforeAll(async () => {
  await resetDatabase();
});

// ปิด pool ของแอป ไม่งั้น Jest จะค้าง ("Jest did not exit...")
afterAll(async () => {
  await pool.end();
});

describe("GET /api/menu", () => {
  it("ไม่ส่ง query ได้หน้า 1 จำนวน 10 รายการ และ pagination ถูกต้อง", async () => {
    const res = await request(app).get("/api/menu");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.data[0]).toEqual({ id: 1, name: "ข้าวผัดกุ้ง", price: 60, available: true });
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, totalItems: 22, totalPages: 3 });
  });

  it("page=3&limit=10 ได้ 2 รายการสุดท้าย (id 21, 22)", async () => {
    const res = await request(app).get("/api/menu?page=3&limit=10");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.map((m) => m.id)).toEqual([21, 22]);
  });

  it("page เกินจำนวนหน้าได้ array ว่าง ไม่ error", async () => {
    const res = await request(app).get("/api/menu?page=99");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("available=true กรองเหลือ 20 รายการ และทุกรายการ available เป็น true", async () => {
    const res = await request(app).get("/api/menu?available=true&limit=50");

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.totalItems).toBe(20);
    expect(res.body.data.every((m) => m.available === true)).toBe(true);
  });

  it("available=false ได้เมนูที่หมด 2 รายการ (id 9, 18)", async () => {
    const res = await request(app).get("/api/menu?available=false");

    expect(res.body.data.map((m) => m.id)).toEqual([9, 18]);
  });

  it("sort=price&order=desc เมนูแรกคือราคาแพงสุด 120", async () => {
    const res = await request(app).get("/api/menu?sort=price&order=desc");

    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].price).toBe(120);
  });

  it.each([
    ["page=0", "page"],
    ["page=abc", "page"],
    ["limit=0", "limit"],
    ["limit=51", "limit"],
    ["available=yes", "available"],
    ["sort=password", "sort"],
  ])("query %s ผิด ได้ 400 และระบุ field %s", async (query, field) => {
    const res = await request(app).get(`/api/menu?${query}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });
});

describe("GET /api/menu/:id", () => {
  it("id ที่มีจริงได้ 200 และ price เป็นตัวเลข", async () => {
    const res = await request(app).get("/api/menu/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe("ข้าวผัดกุ้ง");
    expect(res.body.data.price).toBe(60);
  });

  it("id ที่ไม่มีได้ 404 MENU_NOT_FOUND", async () => {
    const res = await request(app).get("/api/menu/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("MENU_NOT_FOUND");
  });

  it("id ไม่ใช่ตัวเลขได้ 400", async () => {
    const res = await request(app).get("/api/menu/abc");

    expect(res.statusCode).toBe(400);
  });
});
