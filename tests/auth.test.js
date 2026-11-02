// ทดสอบ JWT + RBAC ของ PATCH /api/orders/:id/status (ต้องเป็น staff หรือ admin)
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const { pool } = require("../db");
const { jwtSecret } = require("../config");
const { resetDatabase } = require("./helpers/db-helper");

// สร้าง token ทดสอบด้วย secret เดียวกับที่แอปใช้ตรวจ
function makeToken(payload, secret = jwtSecret) {
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}
const staffToken = makeToken({ id: 1, role: "staff" });
const customerToken = makeToken({ id: 2, role: "customer" });
const wrongSecretToken = makeToken({ id: 1, role: "staff" }, "not-the-real-secret");
// กำหนด exp ย้อนหลัง 60 วินาที = token หมดอายุแล้ว
const expiredToken = jwt.sign({ id: 1, role: "staff", exp: Math.floor(Date.now() / 1000) - 60 }, jwtSecret);

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe("PATCH /api/orders/:id/status ต้องยืนยันตัวตนและเป็น staff", () => {
  const url = "/api/orders/3/status";
  const body = { status: "preparing" };

  it("ไม่แนบ header ได้ 401 NO_TOKEN", async () => {
    const res = await request(app).patch(url).send(body);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("NO_TOKEN");
  });

  it("ลืมคำว่า Bearer ได้ 401 NO_TOKEN", async () => {
    const res = await request(app).patch(url).set("Authorization", staffToken).send(body);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("NO_TOKEN");
  });

  it.each([
    ["token มั่ว", "abc.def.ghi"],
    ["token คนละ secret", wrongSecretToken],
    ["token หมดอายุ", expiredToken],
  ])("%s ได้ 401 INVALID_TOKEN", async (_label, token) => {
    const res = await request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("customer ได้ 403 และสถานะในฐานข้อมูลไม่เปลี่ยน", async () => {
    const res = await request(app).patch(url).set("Authorization", `Bearer ${customerToken}`).send(body);

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");

    const check = await request(app).get("/api/orders/3");
    expect(check.body.data.status).toBe("pending");
  });

  it("staff ได้ 200", async () => {
    const res = await request(app).patch(url).set("Authorization", `Bearer ${staffToken}`).send(body);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe("preparing");
  });
});
