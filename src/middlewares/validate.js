// middleware ตรวจ req.body ด้วย Zod schema (สัปดาห์ 12)
// ใช้: router.post("/", validate(createOrderSchema), handler)
const { sendError } = require("../utils");

function validate(schema) {
  return (req, res, next) => {
    // safeParse ไม่ throw แต่คืน { success, data } หรือ { success: false, error }
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        // แปลง issue ของ Zod ให้อยู่ในรูป [{ field, message }] แบบเดียวกับที่ทั้งระบบใช้
        result.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }))
      );
    }
    req.body = result.data; // ส่งข้อมูลที่ผ่านการตรวจและแปลงแล้ว (เช่น trim) ให้ handler ถัดไป
    return next();
  };
}

module.exports = { validate };
