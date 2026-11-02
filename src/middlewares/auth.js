// middleware ตรวจ JWT และตรวจ role
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../../config");
const { sendError } = require("../utils");

// ตรวจ header Authorization: Bearer <token>
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "NO_TOKEN", "ต้องแนบ token ใน header Authorization");
  }
  const token = authHeader.split(" ")[1];

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret); // ตรวจทั้งลายเซ็นและวันหมดอายุ
  } catch (err) {
    return sendError(res, 401, "INVALID_TOKEN", "token ไม่ถูกต้องหรือหมดอายุ");
  }
  req.user = payload; // ให้ middleware/handler ถัดไปรู้ว่าเป็นใคร
  return next();
}

// อนุญาตเฉพาะ role ที่ระบุ เช่น requireRole("staff", "admin")
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(res, 403, "FORBIDDEN", "ไม่มีสิทธิ์ทำรายการนี้");
    }
    return next();
  };
}

module.exports = { authenticateToken, requireRole };
