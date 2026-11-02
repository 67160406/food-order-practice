// ฟังก์ชันช่วยที่ใช้ร่วมกันหลาย route

// แปลงค่าเป็นจำนวนเต็มบวก ถ้าไม่ได้ส่งมาคืนค่า default ถ้าส่งมาแต่ผิดรูปแบบคืน null
function toPositiveInt(value, defaultValue = null) {
  if (value === undefined || value === "") return defaultValue;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ส่ง error ในรูปแบบมาตรฐาน { error: { code, message, details? } }
function sendError(res, status, code, message, details) {
  const body = { error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

module.exports = { toPositiveInt, sendError };
