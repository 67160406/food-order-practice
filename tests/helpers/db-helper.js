// รีเซ็ตฐานข้อมูลกลับเป็นข้อมูลตั้งต้นจาก seed.sql (ใช้ใน beforeAll/beforeEach)
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { db } = require("../../config");

async function resetDatabase() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "..", "seed.sql"), "utf8");
  const conn = await mysql.createConnection({ ...db, multipleStatements: true });
  await conn.query(sql);
  await conn.end();
}

// นับแถวในตาราง ใช้ยืนยันผลในฐานข้อมูลหลังเรียก API
async function countRows(table) {
  const conn = await mysql.createConnection(db);
  const [rows] = await conn.query(`SELECT COUNT(*) AS total FROM ${table}`);
  await conn.end();
  return rows[0].total;
}

module.exports = { resetDatabase, countRows };
