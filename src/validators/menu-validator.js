// ตรวจ body ของ POST /api/menu แบบ "เขียนเอง" ไม่ใช้ไลบรารี (ชุดติดตั้งของอาจารย์ไม่มี zod)
// หลักการเดียวกับสัปดาห์ 12: ตรวจทุก field แล้วรวบรวม error ทั้งหมดในครั้งเดียว ไม่หยุดที่ตัวแรก
// คืนค่า { valid, errors, data } -> errors เป็น [{ field, message }], data คือค่าที่ทำความสะอาดแล้ว

const MAX_PRICE = 99999999.99; // DECIMAL(10, 2) เก็บได้สูงสุดเท่านี้

function validateMenuBody(body) {
  const errors = [];
  const { name, price, available } = body || {}; // body อาจเป็น undefined ถ้าไม่ได้ส่งมา

  // name: ต้องเป็น string ที่ไม่ว่าง (หลัง trim) และยาวไม่เกิน 200 ตามคอลัมน์ VARCHAR(200)
  if (typeof name !== "string" || name.trim() === "") {
    errors.push({ field: "name", message: "ต้องระบุ name" });
  } else if (name.trim().length > 200) {
    errors.push({ field: "name", message: "name ยาวได้ไม่เกิน 200 ตัวอักษร" });
  }

  // price: ต้องเป็น number จริง (ไม่รับ "65" ที่เป็น string), มากกว่า 0, ทศนิยมไม่เกิน 2 ตำแหน่ง
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    errors.push({ field: "price", message: "price ต้องเป็นตัวเลขมากกว่า 0" });
  } else if (price > MAX_PRICE) {
    errors.push({ field: "price", message: `price ต้องไม่เกิน ${MAX_PRICE}` });
  } else if (!/^\d+(\.\d{1,2})?$/.test(String(price))) {
    errors.push({ field: "price", message: "price มีทศนิยมได้ไม่เกิน 2 ตำแหน่ง" });
  }

  // available: ไม่บังคับส่ง แต่ถ้าส่งต้องเป็น boolean
  if (available !== undefined && typeof available !== "boolean") {
    errors.push({ field: "available", message: "available ต้องเป็น true หรือ false" });
  }

  if (errors.length > 0) return { valid: false, errors, data: null };
  return {
    valid: true,
    errors: [],
    data: { name: name.trim(), price, available: available ?? true }, // ไม่ส่ง available มา = ขายได้
  };
}

module.exports = { validateMenuBody };
