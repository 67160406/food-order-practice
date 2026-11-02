// สัปดาห์ 10: ตรวจว่า openapi.yaml ตรงกับ route ที่เขียนจริง (mock ฐานข้อมูล ไม่ต้องต่อ MySQL)
jest.mock("../db", () => ({
  pool: { query: jest.fn().mockResolvedValue([[], []]), getConnection: jest.fn() },
}));

const fs = require("fs");
const path = require("path");
const YAML = require("js-yaml");
const request = require("supertest");
const app = require("../src/app");

// อ่านเอกสารแล้วแตกเป็นรายการ operation เช่น { method: "get", path: "/menu/{id}", url: "/api/menu/1" }
const spec = YAML.load(fs.readFileSync(path.join(__dirname, "..", "openapi.yaml"), "utf8"));
const basePath = new URL(spec.servers[0].url).pathname; // "/api"
const METHODS = ["get", "post", "put", "patch", "delete"];
const operations = Object.entries(spec.paths).flatMap(([p, item]) =>
  METHODS.filter((m) => item[m]).map((m) => ({
    method: m,
    path: p,
    url: basePath + p.replace(/\{[^}]+\}/g, "1"), // แทน {id} ด้วย 1
    op: item[m],
  }))
);
const label = (o) => [`${o.method.toUpperCase()} ${o.path}`, o];

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {}); // บาง route จะได้ 500 จาก mock ว่าง ซ่อน log ไว้
});
afterEach(() => jest.restoreAllMocks());

describe("openapi.yaml", () => {
  it("เป็น OpenAPI 3 และมี 8 operation", () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(operations).toHaveLength(8);
  });

  it.each(operations.map(label))("%s มี summary และมี response 2xx", (_name, { op }) => {
    expect(typeof op.summary).toBe("string");
    expect(Object.keys(op.responses).some((code) => code.startsWith("2"))).toBe(true);
  });

  it.each(operations.map(label))("%s มี route อยู่จริงในแอป", async (_name, { method, url }) => {
    const res = await request(app)[method](url);
    expect(res.body?.error?.code).not.toBe("NOT_FOUND"); // NOT_FOUND = ไม่มี route นี้ในแอป
  });

  const secured = operations.filter((o) => o.op.security);

  it.each(secured.map(label))("%s ประกาศ security แล้วต้องตอบ 401 เมื่อไม่ส่ง token", async (_name, { method, url, op }) => {
    expect(op.responses).toHaveProperty("401"); // เอกสารต้องบอกว่ามี 401
    const res = await request(app)[method](url);
    expect(res.statusCode).toBe(401);           // และโค้ดต้องตอบ 401 จริง
  });

  it("endpoint ที่ไม่ประกาศ security ต้องเรียกได้โดยไม่ต้องมี token", async () => {
    const open = operations.filter((o) => !o.op.security);
    for (const { method, url } of open) {
      const res = await request(app)[method](url);
      expect([401, 403]).not.toContain(res.statusCode);
    }
  });

  it("Swagger UI เปิดได้ที่ /api-docs/", async () => {
    const res = await request(app).get("/api-docs/");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("swagger");
  });
});
