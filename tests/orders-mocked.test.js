// Unit test แบบ mock ฐานข้อมูล: ทดสอบกรณีที่ทำจริงยาก เช่น DB ล่ม หรือ INSERT ล้มกลาง transaction
// แทน db.js ทั้งไฟล์ด้วยของปลอม (path นับจากไฟล์เทสต์นี้)
jest.mock("../db", () => ({
  pool: { query: jest.fn(), getConnection: jest.fn() },
}));

const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../db"); // ได้ pool ปลอมจาก jest.mock ด้านบน

// สร้าง connection ปลอมที่มีทุก method ที่ route เรียก
function createMockConnection() {
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    query: jest.fn(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
  };
}

const MENU_RICE = { id: 1, name: "ข้าวผัดกุ้ง", price: "60.00", available: 1 }; // แบบที่ mysql2 คืนจริง

beforeEach(() => {
  jest.resetAllMocks(); // ล้าง mock และค่าที่ตั้งไว้ของเทสต์ก่อนหน้า
  jest.spyOn(console, "error").mockImplementation(() => {}); // ซ่อน log ของ error handler
});

describe("GET /api/menu (mock)", () => {
  it("ฐานข้อมูลล่มได้ 500 INTERNAL_ERROR", async () => {
    pool.query.mockRejectedValueOnce(new Error("Connection lost"));

    const res = await request(app).get("/api/menu");

    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("query ส่ง limit และ offset เป็นตัวเลขที่คำนวณถูก (page=2, limit=5 -> offset 5)", async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 22 }]]) // ครั้งที่ 1: COUNT(*)
      .mockResolvedValueOnce([[]]);             // ครั้งที่ 2: SELECT ... LIMIT ? OFFSET ?

    await request(app).get("/api/menu?page=2&limit=5");

    const [, params] = pool.query.mock.calls[1]; // argument ของการเรียกครั้งที่ 2
    expect(params).toEqual([5, 5]);
  });
});

describe("GET /api/menu/:id (mock)", () => {
  it("ไม่พบแถวได้ 404", async () => {
    pool.query.mockResolvedValueOnce([[]]); // rows ว่าง

    const res = await request(app).get("/api/menu/1");

    expect(res.statusCode).toBe(404);
  });

  it("แปลง price จาก string '60.00' เป็นตัวเลข 60", async () => {
    pool.query.mockResolvedValueOnce([[MENU_RICE]]);

    const res = await request(app).get("/api/menu/1");

    expect(res.body.data.price).toBe(60);
    expect(res.body.data.available).toBe(true);
  });
});

describe("POST /api/orders (mock transaction)", () => {
  const body = { customer_name: "ทดสอบ", items: [{ menu_item_id: 1, quantity: 2 }] };

  it("สำเร็จ: commit 1 ครั้ง ไม่ rollback และ release connection", async () => {
    const conn = createMockConnection();
    pool.getConnection.mockResolvedValue(conn);
    conn.query
      .mockResolvedValueOnce([[MENU_RICE]])        // SELECT menu_items
      .mockResolvedValueOnce([{ insertId: 10 }])   // INSERT orders
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT order_items

    const res = await request(app).post("/api/orders").send(body);

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({ id: 10, total: 120 });
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("INSERT order_items ล้ม: ได้ 500, rollback, ไม่ commit และยัง release", async () => {
    const conn = createMockConnection();
    pool.getConnection.mockResolvedValue(conn);
    conn.query
      .mockResolvedValueOnce([[MENU_RICE]])
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockRejectedValueOnce(new Error("Deadlock found")); // ล้มกลาง transaction

    const res = await request(app).post("/api/orders").send(body);

    expect(res.statusCode).toBe(500);
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("เมนูหมด: ได้ 409, rollback และไม่มีการ INSERT", async () => {
    const conn = createMockConnection();
    pool.getConnection.mockResolvedValue(conn);
    conn.query.mockResolvedValueOnce([[{ ...MENU_RICE, available: 0 }]]);

    const res = await request(app).post("/api/orders").send(body);

    expect(res.statusCode).toBe(409);
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.query).toHaveBeenCalledTimes(1); // มีแค่ SELECT ไม่มี INSERT
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("body ผิดได้ 400 โดยไม่ขอ connection เลย", async () => {
    const res = await request(app).post("/api/orders").send({ customer_name: "" });

    expect(res.statusCode).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });
});
