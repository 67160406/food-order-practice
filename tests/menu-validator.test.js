// Unit test ของ validateMenuBody (ฟังก์ชันล้วน ไม่ใช้ฐานข้อมูล ไม่ใช้ Supertest)
const { validateMenuBody } = require("../src/validators/menu-validator");

describe("validateMenuBody", () => {
  it("ข้อมูลถูกต้อง: trim ชื่อ และ available เป็น true ถ้าไม่ได้ส่งมา", () => {
    const result = validateMenuBody({ name: "  ข้าวต้มปลา  ", price: 65 });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ name: "ข้าวต้มปลา", price: 65, available: true });
  });

  it("body ว่าง: รายงาน error ทั้ง name และ price พร้อมกัน", () => {
    const result = validateMenuBody({});

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.field)).toEqual(["name", "price"]);
  });

  // ตารางกรณีผิด: [คำอธิบาย, body, field ที่ต้องถูกรายงาน]
  it.each([
    ["price เป็น string", { name: "ก", price: "65" }, "price"],
    ["price ทศนิยม 3 ตำแหน่ง", { name: "ก", price: 65.555 }, "price"],
    ["price เป็น 0", { name: "ก", price: 0 }, "price"],
    ["name ยาวเกิน 200", { name: "ก".repeat(201), price: 10 }, "name"],
    ["available ไม่ใช่ boolean", { name: "ก", price: 10, available: "yes" }, "available"],
  ])("%s ไม่ผ่าน", (_label, body, field) => {
    const result = validateMenuBody(body);

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.field)).toContain(field);
  });
});
