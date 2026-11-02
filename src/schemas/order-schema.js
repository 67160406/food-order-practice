// สัปดาห์ 12: กฎ validation แบบเดียวกันแต่เขียนด้วย Zod (ต้อง npm install zod)
// โปรเจกต์นี้ให้ route ใช้แบบเขียนเองเป็นหลัก เพราะชุดติดตั้งของอาจารย์ไม่มี zod
// ไฟล์นี้ไว้ฝึกเผื่อโจทย์สั่งให้ใช้ Zod -> ใช้คู่กับ src/middlewares/validate.js
const { z } = require("zod");

// รายการอาหาร 1 แถว
const orderItemSchema = z.object({
  menu_item_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
});

// body ของ POST /api/orders
const createOrderSchema = z
  .object({
    customer_name: z.string().trim().min(1).max(100), // trim ก่อนนับความยาว
    items: z.array(orderItemSchema).min(1).max(20),
  })
  // cross-field validation: เทียบค่าระหว่างหลายแถว (ห้าม menu_item_id ซ้ำ)
  // superRefine ทำงานหลังจากทุก field ผ่านการตรวจพื้นฐานแล้วเท่านั้น
  .superRefine((data, ctx) => {
    const seen = new Set();
    data.items.forEach((item, i) => {
      if (seen.has(item.menu_item_id)) {
        ctx.addIssue({
          code: "custom",
          message: `menu_item_id ${item.menu_item_id} ซ้ำกัน`,
          path: ["items", i, "menu_item_id"], // ผูก error กับแถวที่ซ้ำ
        });
      }
      seen.add(item.menu_item_id);
    });
  });

// body ของ POST /api/menu (กฎเดียวกับ src/validators/menu-validator.js)
const createMenuSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.number().positive().max(99999999.99),
  available: z.boolean().optional(),
});

// body ของ PATCH /api/orders/:id/status
const updateStatusSchema = z.object({
  status: z.enum(["pending", "preparing", "delivered", "cancelled"]),
});

// ตัวอย่าง conditional validation (สัปดาห์ 12 หัวข้อ superRefine):
// ถ้าเลือก delivery ต้องมี address ส่วน pickup ไม่ต้องมี
const deliveryOrderSchema = z
  .object({
    delivery_type: z.enum(["pickup", "delivery"]),
    address: z.string().trim().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.delivery_type === "delivery" && !data.address) {
      ctx.addIssue({ code: "custom", message: "ต้องระบุ address เมื่อเลือก delivery", path: ["address"] });
    }
  });

module.exports = { createOrderSchema, createMenuSchema, updateStatusSchema, deliveryOrderSchema };
