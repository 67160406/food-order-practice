# คู่มือสอบปฏิบัติ ส่วนที่ 2: ติดตั้งและโจทย์ฝึก Express + MySQL + Jest

Nov 2, 2026 · @FR

## ภาพรวม

ส่วนที่ 2 ให้โปรเจกต์ระบบสั่งอาหารที่เขียนไว้แล้ว แล้วให้ทำ 3 โจทย์ (6 + 4 + 5 = 15 คะแนน) ด้วย Express + MySQL + Jest เปิดเอกสารสัปดาห์ 5–12 ได้ ห้ามใช้ AI

โจทย์จริงยังไม่มีใครเห็น แต่มีเบาะแสชัด 3 ข้อ:

- ใบงานสัปดาห์ 9 เขียนไว้ว่า "ข้อสอบปลายภาคส่วนปฏิบัติให้เขียนเทสต์และดีบัก endpoint ที่มี **pagination** และ **transaction**"
- แนวข้อสอบแนะนำให้ "เขียนการยืนยันผลในเทสต์ให้ชัดเจน, อ่าน error ของ Jest ให้ครบก่อนแก้, อธิบายสาเหตุด้วยประโยคของตัวเอง" แปลว่าน่าจะมีข้อดีบักที่ต้องเขียนอธิบาย
- seed.sql ใน zip มี 3 ตาราง: menu\_items (22 เมนู, หมด 2 รายการ), orders (3 ออร์เดอร์) และ order\_items ซึ่งน่าจะเป็นฐานข้อมูลเดียวกับวันสอบ

คู่มือนี้จึงสร้างโปรเจกต์ฝึกที่ใช้ฐานข้อมูลเดียวกัน แล้วพาทำ 6 ชุดโจทย์ที่ครอบคลุมทุกแบบที่น่าจะออก:

| ชุด | สิ่งที่ฝึก | น่าจะตรงกับโจทย์แบบ |
| --- | --- | --- |
| 1 | GET /api/menu: pagination, filter, sort, validation 400/404 พร้อมเทสต์ | เขียน endpoint + เทสต์ (pagination) |
| 2 | POST /api/orders: transaction, rollback, 201/400/404/409 พร้อมเทสต์ที่ตรวจฐานข้อมูล | เขียน endpoint + เทสต์ (transaction) |
| 3 | GET /api/orders/:id (JOIN, ยอดรวม), GET /api/orders (GROUP BY), PATCH สถานะด้วย FOR UPDATE | เพิ่ม endpoint ตามสเปก |
| 4 | JWT + RBAC (401/403) และเทสต์ token แบบต่าง ๆ | เพิ่มการยืนยันตัวตน |
| 5 | Mock ฐานข้อมูลด้วย jest.mock: DB ล่ม, rollback, release | เขียนเทสต์แบบ mock |
| 6 | ดีบัก 8 บั๊กที่พบบ่อย พร้อมข้อความ error ของ Jest และตัวอย่างคำอธิบาย | หาบั๊ก แก้ และอธิบาย |

วิธีใช้: ทำส่วนติดตั้งให้ผ่านก่อน แล้วทำชุด 1→9 ตามลำดับ (ชุดที่ 8–9 คือ validation, DELETE ที่ชน foreign key, OpenAPI และ coverage) (ชุดที่ 7 คือแบบฝึกหัดต่อยอดที่ 3 สัปดาห์ 11 เทสต์ Retry ด้วย jest.mock("axios") ทำแยกได้เพราะไม่ใช้ฐานข้อมูล) เพราะแต่ละชุดต่อยอดไฟล์จากชุดก่อน โค้ดทุกก้อนคัดลอกไปวางได้ทันทีและมีคอมเมนต์บอกว่าแต่ละบรรทัดทำอะไร

หมายเหตุ: ฉันตรวจ syntax ของโค้ดทุกไฟล์และรัน SQL ทุกคำสั่งกับข้อมูลใน seed.sql แล้ว (ตัวเลขที่เทสต์คาดหวัง เช่น 22 เมนู, ยอด order 1 = 170 ได้จากการรันจริง) แต่ในเครื่องฝั่งฉันติดตั้ง package ของ npm ไม่ได้ จึงยังไม่ได้รัน Jest จริง ถ้าเทสต์ไหนไม่ผ่าน ให้อ่านส่วนแก้ปัญหาท้ายคู่มือ หรือคอมเมนต์บอกได้

## ส่วน A: ติดตั้งและทดสอบเครื่อง

เป้าหมายคือ `npm run check` ต้องขึ้น "เชื่อมต่อฐานข้อมูลได้ พบเมนู 22 รายการ" และ `npm test` ผ่าน 3 เทสต์

### A1. ติดตั้งโปรแกรม (ทำครั้งเดียว)

1. **Docker Desktop** ดาวน์โหลดจาก docker.com ติดตั้งแล้ว **เปิดโปรแกรมทิ้งไว้** รอจนมุมล่างซ้ายขึ้น Engine running (Windows ต้องเปิด WSL 2 ตามที่ตัวติดตั้งถาม)
2. **Node.js** รุ่น LTS จาก nodejs.org (รุ่น 18 ขึ้นไปใช้ได้)
3. **VS Code** (แนะนำ) ใช้เปิดโฟลเดอร์และ terminal ในที่เดียว

ตรวจว่าติดตั้งแล้ว เปิด terminal พิมพ์:

```bash
docker --version          # ต้องเห็นเลขเวอร์ชัน เช่น Docker version 27.x
docker compose version    # ต้องเห็น Docker Compose version v2.x
node -v                   # ต้องเห็น v18 ขึ้นไป
npm -v
```

### A2. แตก zip และเปิดโฟลเดอร์

1. สร้างโฟลเดอร์ว่าง เช่น `Desktop/exam-practice` แล้วแตก final-exam-setup.zip ลงไป จะได้โฟลเดอร์ `final-exam-setup`
2. VS Code → File → Open Folder → เลือก `final-exam-setup` (ต้องเปิดให้เห็น package.json อยู่ชั้นแรก ไม่ใช่โฟลเดอร์ซ้อนสองชั้น)
3. Terminal → New Terminal

ใน zip มีไฟล์เหล่านี้:

| ไฟล์ | ทำอะไร |
| --- | --- |
| docker-compose.yml | สร้าง MySQL 8.0 ใน Docker เปิดที่พอร์ต **3309** ของเครื่อง (ภายในคือ 3306) รหัส root = root ฐานข้อมูล exam\_db |
| .env.example | ต้นแบบค่าตั้งค่า DB\_HOST, DB\_PORT=3309, DB\_USER, DB\_PASSWORD, DB\_NAME |
| config.js | อ่าน .env เอง (ไม่ใช้ dotenv) แล้ว export `db`, `jwtSecret` (ค่าเริ่มต้น final-exam-secret-2-2-5) และ `port` (3000) |
| db.js | สร้าง connection pool แล้ว export เป็น **`{ pool }`** (object ไม่ใช่ pool ตรง ๆ) |
| seed.sql | ลบและสร้างตาราง menu\_items, orders, order\_items ใหม่ พร้อมข้อมูลตัวอย่าง |
| scripts/seed.js, scripts/check-env.js | รัน seed.sql / ตรวจว่าต่อฐานข้อมูลได้ (มี retry รอ MySQL พร้อมสูงสุด 60 วินาที) |
| tests/environment.test.js | 3 เทสต์: ต่อ DB ได้, Express + Supertest ทำงาน, สร้าง/ตรวจ JWT ได้ |

### A3. รันทีละคำสั่ง

**ขั้นที่ 1: สร้างไฟล์ .env**

```bash
# macOS / Linux / Git Bash
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

# Windows Command Prompt (cmd)
copy .env.example .env
```

ไม่ต้องแก้ค่าใด ๆ ถ้าพอร์ต 3309 ว่าง

**ขั้นที่ 2: เปิดฐานข้อมูล**

```bash
docker compose up -d      # -d = รันเบื้องหลัง ครั้งแรกจะดาวน์โหลด image mysql:8.0 ราว 500 MB
docker ps                 # ต้องเห็น container mysql:8.0 สถานะ Up และ 0.0.0.0:3309->3306/tcp
```

รอประมาณ 20 วินาทีให้ MySQL เริ่มเสร็จ (ครั้งแรกอาจนานกว่านั้น) ถ้าอยากดูว่าพร้อมหรือยัง ใช้ `docker compose logs mysql` แล้วหาคำว่า ready for connections

**ขั้นที่ 3: ติดตั้ง package**

```bash
npm install               # ติดตั้ง express, mysql2, jsonwebtoken, jest, supertest ลง node_modules
```

**ขั้นที่ 4: ใส่ข้อมูลตัวอย่าง**

```bash
npm run seed              # ควรเห็น: seed exam_db สำเร็จ
```

seed.sql เริ่มด้วย DROP TABLE จึง **รันซ้ำกี่ครั้งก็ได้** ทุกครั้งจะได้ข้อมูลกลับเป็นค่าตั้งต้น ใช้ตอนทำข้อมูลเละระหว่างฝึก

**ขั้นที่ 5: ตรวจการเชื่อมต่อ**

```bash
npm run check             # ควรเห็น: เชื่อมต่อฐานข้อมูลได้ พบเมนู 22 รายการ
```

**ขั้นที่ 6: ทดสอบเครื่องมือ**

```bash
npm test
```

ผลที่ควรได้:

```text
 PASS  tests/environment.test.js
  ตรวจสภาพแวดล้อม
    ✓ เชื่อมต่อฐานข้อมูลได้และมีข้อมูลเมนู
    ✓ Express และ Supertest ทำงานได้
    ✓ สร้างและตรวจ JWT ได้

Tests:       3 passed, 3 total
```

### A4. คำสั่งที่ควรจำไว้ใช้วันสอบ

| คำสั่ง | ใช้เมื่อ |
| --- | --- |
| `docker compose down` | หยุดฐานข้อมูลของโฟลเดอร์นี้ (ต้องรันในโฟลเดอร์เดียวกับ docker-compose.yml) |
| `docker ps` | ดูว่า container ไหนกำลังรันและใช้พอร์ตอะไร |
| `npm run seed` | รีเซ็ตข้อมูลกลับเป็นค่าตั้งต้น |
| `npx jest tests/menu.test.js` | รันเฉพาะไฟล์เดียว (เร็วกว่าตอนแก้บั๊ก) |
| `npx jest -t "page=3"` | รันเฉพาะเทสต์ที่ชื่อมีคำนี้ |
| `npx jest --runInBand` | รันทีละไฟล์ กันหลายไฟล์เขียนฐานข้อมูลชนกัน |

**เตรียมวันสอบ (สำคัญ):** โปรเจกต์ข้อสอบจริงน่าจะมี docker-compose.yml ที่ใช้พอร์ต 3309 เหมือนกัน ก่อนเริ่มให้ไปที่โฟลเดอร์ฝึกแล้วรัน `docker compose down` ก่อน ไม่งั้นจะเจอ error "port is already allocated" แล้วทำตามลำดับ A3 กับโฟลเดอร์ใหม่ (อ่าน README ของข้อสอบก่อน เผื่อคำสั่งต่างจากนี้)

## ส่วน B: สร้างโปรเจกต์ฝึก (จำลองระบบสั่งอาหาร)

zip มีแค่ฐานข้อมูลกับเทสต์ตรวจเครื่อง ยังไม่มีแอป Express ส่วนนี้จะเพิ่มโครงแอปลงในโฟลเดอร์ final-exam-setup เดิม โดยใช้ db.js, config.js และ seed.sql ที่มีอยู่แล้ว เมื่อเสร็จจะได้โครงสร้างแบบนี้:

```text
final-exam-setup/
├── config.js, db.js, seed.sql, docker-compose.yml   ← มีอยู่แล้ว ไม่ต้องแก้
├── package.json                                     ← แก้ scripts (B1)
├── src/
│   ├── app.js            ← สร้าง Express app + error handler (B3)
│   ├── server.js         ← เปิดพอร์ตจริง (B4)
│   ├── utils.js          ← ฟังก์ชันช่วย (B2)
│   ├── routes/menu.js    ← โจทย์ชุด 1
│   ├── routes/orders.js  ← โจทย์ชุด 2, 3
│   └── middlewares/auth.js ← โจทย์ชุด 4
└── tests/
    ├── environment.test.js  ← มีอยู่แล้ว
    ├── helpers/db-helper.js ← รีเซ็ตฐานข้อมูลในเทสต์ (B6)
    ├── menu.test.js, orders.test.js, auth.test.js, orders-mocked.test.js
```

### B1. แก้ scripts ใน package.json

เปิด package.json แล้วแทนที่ก้อน `"scripts"` ทั้งก้อนด้วย:

```json
  "scripts": {
    "start": "node src/server.js",
    "seed": "node scripts/seed.js",
    "check": "node scripts/check-env.js",
    "test": "jest --runInBand"
  },
```

- `start` เปิดเซิร์ฟเวอร์จริงด้วย `npm start`
- `--runInBand` ให้ Jest รันทีละไฟล์ เพราะหลายไฟล์เทสต์จะรีเซ็ตฐานข้อมูลเดียวกัน ถ้ารันพร้อมกันข้อมูลจะชนกันจนเทสต์ล้มแบบสุ่ม

### B2. สร้าง src/utils.js

สร้างโฟลเดอร์ `src` แล้วสร้างไฟล์ `src/utils.js`:

```javascript
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
```

ตัวอย่างการทำงานของ toPositiveInt: `toPositiveInt(undefined, 1)` → 1 (ไม่ได้ส่งมา ใช้ค่าเริ่มต้น), `toPositiveInt("3")` → 3, `toPositiveInt("0")` → null, `toPositiveInt("abc")` → null, `toPositiveInt("1.5")` → null ค่า null แปลว่า "ผิด ต้องตอบ 400"

### B3. สร้าง src/app.js

```javascript
// สร้างแอป Express (ไม่มี app.listen เพื่อให้ Supertest require ไปทดสอบได้)
const express = require("express");
const menuRouter = require("./routes/menu");
const ordersRouter = require("./routes/orders");
const { sendError } = require("./utils");

const app = express();
app.use(express.json()); // แปลง body ที่เป็น JSON ให้อยู่ใน req.body

app.get("/health", (req, res) => res.status(200).json({ ok: true }));
app.use("/api/menu", menuRouter);     // ทุก path ที่ขึ้นต้นด้วย /api/menu ไปที่ routes/menu.js
app.use("/api/orders", ordersRouter); // ทุก path ที่ขึ้นต้นด้วย /api/orders ไปที่ routes/orders.js

// path ที่ไม่มีในระบบ
app.use((req, res) => sendError(res, 404, "NOT_FOUND", "ไม่พบ endpoint นี้"));

// error handler ตัวสุดท้าย ต้องมี 4 พารามิเตอร์ Express จึงรู้ว่าเป็นตัวจัดการ error
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "INVALID_JSON", "รูปแบบ JSON ไม่ถูกต้อง");
  }
  console.error(err);
  return sendError(res, 500, "INTERNAL_ERROR", "เกิดข้อผิดพลาดภายในระบบ");
});

module.exports = app;
```

สิ่งที่ต้องเข้าใจ: ลำดับ `app.use` สำคัญ route ต้องมาก่อน 404 และ error handler ต้องอยู่ท้ายสุด ใน Express 4 ถ้า handler แบบ async throw error เอง Express จะไม่จับให้ ต้อง `try/catch` แล้วเรียก `next(err)` ทุกครั้ง

### B4. สร้าง src/server.js

```javascript
// จุดเริ่มเปิดเซิร์ฟเวอร์จริง (npm start) เทสต์จะไม่ใช้ไฟล์นี้
const app = require("./app");
const { port } = require("../config");

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
```

### B5. สร้าง route ว่างไว้ก่อน

app.js require สองไฟล์นี้ ถ้ายังไม่มีไฟล์แอปจะ error ทันที จึงสร้างไว้ก่อนแล้วค่อยเติมในโจทย์แต่ละชุด

สร้าง `src/routes/menu.js` และ `src/routes/orders.js` ใส่เนื้อหาเดียวกันทั้งสองไฟล์:

```javascript
const express = require("express");
const { pool } = require("../../db");          // db.js อยู่นอก src สองชั้น และ export เป็น { pool }
const { toPositiveInt, sendError } = require("../utils");

const router = express.Router();

// (จะเพิ่ม route ในโจทย์ชุดถัดไป)

module.exports = router;
```

### B6. สร้าง tests/helpers/db-helper.js

ใช้รีเซ็ตฐานข้อมูลก่อนเทสต์ ทำให้ทุกเทสต์เริ่มจากข้อมูลชุดเดียวกันเสมอ (22 เมนู, 3 ออร์เดอร์, 5 order\_items)

```javascript
// รีเซ็ตฐานข้อมูลกลับเป็นข้อมูลตั้งต้นจาก seed.sql (ใช้ใน beforeAll/beforeEach)
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { db } = require("../../config");

async function resetDatabase() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "..", "seed.sql"), "utf8");
  // multipleStatements: true เพราะ seed.sql มีหลายคำสั่งคั่นด้วย ;
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
```

Jest จะไม่รันไฟล์นี้เป็นเทสต์ เพราะชื่อไม่ได้ลงท้ายด้วย .test.js

### B7. ทดลองเปิดเซิร์ฟเวอร์

```bash
npm start
```

เปิดเบราว์เซอร์ไปที่ http://localhost:3000/health ต้องเห็น `{"ok":true}` แล้วกด Ctrl + C เพื่อหยุด จากนั้นรัน `npm test` ต้องยังผ่าน 3 เทสต์เหมือนเดิม

### B8. วันสอบ: อ่านโปรเจกต์ที่ไม่คุ้นใน 10 นาที

โปรเจกต์จริงอาจตั้งชื่อไฟล์ต่างจากนี้ ก่อนเขียนโค้ดให้ตอบ 6 ข้อนี้ให้ได้:

1. **package.json** มี scripts อะไร (start, test, seed) และมี dotenv/zod/knex ไหม
2. **app.js หรือ index.js** แยกกับ server.js แล้วหรือยัง (ถ้ายังต้องแยกก่อนเขียน Supertest) mount route ที่ path ไหน
3. **db.js export อะไร** `module.exports = { pool }` ต้อง `const { pool } = require(...)` ส่วน `module.exports = pool` ต้อง `const pool = require(...)` ใช้ผิดแบบจะได้ "pool.query is not a function"
4. **seed.sql** มีตารางและคอลัมน์อะไร ข้อมูลตั้งต้นกี่แถว (ใช้คำนวณค่าที่ expect)
5. **รูปแบบ error เดิม** เช่น `{ error: { code, message } }` โค้ดใหม่ต้องตอบแบบเดียวกัน
6. **เทสต์ที่มีอยู่** ใช้ beforeAll/afterAll อย่างไร ปิด pool ที่ไหน รันผ่านทั้งหมดก่อนแก้หรือไม่ (ถ้ามีเทสต์ล้มอยู่แล้ว นั่นอาจเป็นโจทย์ดีบัก)

## โจทย์ชุดที่ 1: GET /api/menu พร้อม pagination, filter, sort

**โจทย์ (เขียนแบบที่ข้อสอบมักให้มา)**

> เพิ่ม `GET /api/menu` รับ query `page` (ค่าเริ่มต้น 1), `limit` (ค่าเริ่มต้น 10, สูงสุด 50), `available` (true/false), `sort` (id, name, price) และ `order` (asc, desc) คืน `{ data: [...], pagination: { page, limit, totalItems, totalPages } }` ค่าผิดรูปแบบตอบ 400 VALIDATION\_ERROR และเพิ่ม `GET /api/menu/:id` ที่ตอบ 404 เมื่อไม่พบ พร้อมเขียนเทสต์ด้วย Jest + Supertest

### 1.1 แนวคิดก่อนเขียน

- ค่าใน `req.query` เป็น **string เสมอ** (`"2"` ไม่ใช่ 2) ต้องแปลงเป็นตัวเลขก่อนใส่ LIMIT/OFFSET ไม่งั้น mysql2 จะใส่เป็น `LIMIT '10'` ซึ่ง MySQL ฟ้อง syntax error
- สูตรหน้า: **OFFSET = (page − 1) × limit** และ **totalPages = Math.ceil(totalItems / limit)** เช่น 22 เมนู limit 10 → 3 หน้า หน้า 3 มี 2 รายการ
- ต้อง query 2 ครั้ง: `COUNT(*)` ด้วย WHERE เดียวกัน กับ `SELECT ... LIMIT ? OFFSET ?`
- ค่าใส่ผ่าน `?` เสมอ แต่ชื่อคอลัมน์ใน ORDER BY ใช้ `?` ไม่ได้ จึงต้องเทียบกับ allowlist ก่อน กัน SQL Injection
- mysql2 คืน DECIMAL เป็น **string** ("60.00") และ BOOLEAN เป็น **1/0** จึงแปลงเป็น Number/Boolean ก่อนส่งออก

### 1.2 เขียน src/routes/menu.js (แทนทั้งไฟล์)

```javascript
// เส้นทางเกี่ยวกับเมนูอาหาร: GET /api/menu และ GET /api/menu/:id
const express = require("express");
const { pool } = require("../../db");
const { toPositiveInt, sendError } = require("../utils");

const router = express.Router();

// คอลัมน์ที่อนุญาตให้ sort (allowlist) ห้ามเอาค่าจาก client ไปต่อ SQL ตรง ๆ
const SORT_COLUMNS = { id: "id", name: "name", price: "price" };

// แปลงแถวจาก MySQL ให้เป็นชนิดที่ถูกต้อง (DECIMAL มาเป็น string, BOOLEAN มาเป็น 1/0)
function toMenuDto(row) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    available: Boolean(row.available),
  };
}

// GET /api/menu?page=1&limit=10&available=true&sort=price&order=desc
router.get("/", async (req, res, next) => {
  try {
    // 1) ตรวจและแปลง query string (ค่าใน req.query เป็น string เสมอ)
    const page = toPositiveInt(req.query.page, 1);
    const limit = toPositiveInt(req.query.limit, 10);
    const errors = [];
    if (page === null) errors.push({ field: "page", message: "page ต้องเป็นจำนวนเต็มตั้งแต่ 1" });
    if (limit === null || limit > 50) errors.push({ field: "limit", message: "limit ต้องเป็นจำนวนเต็ม 1-50" });

    const { available, sort = "id", order = "asc" } = req.query;
    if (available !== undefined && available !== "true" && available !== "false") {
      errors.push({ field: "available", message: "available ต้องเป็น true หรือ false" });
    }
    if (!SORT_COLUMNS[sort]) errors.push({ field: "sort", message: "sort ต้องเป็น id, name หรือ price" });
    if (order !== "asc" && order !== "desc") errors.push({ field: "order", message: "order ต้องเป็น asc หรือ desc" });

    if (errors.length > 0) {
      return sendError(res, 400, "VALIDATION_ERROR", "query string ไม่ถูกต้อง", errors);
    }

    // 2) สร้าง WHERE จากเงื่อนไขที่มีจริง ค่าใส่ผ่าน ? เสมอ
    const where = [];
    const params = [];
    if (available !== undefined) {
      where.push("available = ?");
      params.push(available === "true"); // "true" -> true, "false" -> false
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    // 3) นับจำนวนทั้งหมดก่อน เพื่อคำนวณ totalPages
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM menu_items ${whereSql}`, params);
    const totalItems = countRows[0].total;

    // 4) ดึงข้อมูลเฉพาะหน้าที่ขอ: OFFSET = (page - 1) * limit
    const offset = (page - 1) * limit;
    const orderSql = `ORDER BY ${SORT_COLUMNS[sort]} ${order === "desc" ? "DESC" : "ASC"}, id ASC`;
    const [rows] = await pool.query(
      `SELECT id, name, price, available FROM menu_items ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      data: rows.map(toMenuDto),
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    });
  } catch (err) {
    return next(err); // ส่งต่อให้ error handler ตอบ 500
  }
});

// GET /api/menu/:id
router.get("/:id", async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (id === null) {
      return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");
    }
    const [rows] = await pool.query("SELECT id, name, price, available FROM menu_items WHERE id = ?", [id]);
    if (rows.length === 0) {
      return sendError(res, 404, "MENU_NOT_FOUND", `ไม่พบเมนู id ${id}`);
    }
    return res.status(200).json({ data: toMenuDto(rows[0]) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
```

ทดลองด้วยมือ: `npm start` แล้วเปิด http://localhost:3000/api/menu?page=3 ต้องเห็นเมนู id 21 และ 22 ส่วน http://localhost:3000/api/menu?limit=0 ต้องได้ 400

### 1.3 เขียน tests/menu.test.js

ค่าที่ expect มาจาก seed.sql: เมนูทั้งหมด 22 รายการ, available 20 รายการ, หมดคือ id 9 และ 18, แพงสุดคือสเต็กไก่ 120 บาท

```javascript
// Integration test ของ /api/menu (ต่อฐานข้อมูลจริง)
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../db");
const { resetDatabase } = require("./helpers/db-helper");

// เทสต์ชุดนี้อ่านอย่างเดียว รีเซ็ตครั้งเดียวก่อนเริ่มพอ
beforeAll(async () => {
  await resetDatabase();
});

// ปิด pool ของแอป ไม่งั้น Jest จะค้าง ("Jest did not exit...")
afterAll(async () => {
  await pool.end();
});

describe("GET /api/menu", () => {
  it("ไม่ส่ง query ได้หน้า 1 จำนวน 10 รายการ และ pagination ถูกต้อง", async () => {
    const res = await request(app).get("/api/menu");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.data[0]).toEqual({ id: 1, name: "ข้าวผัดกุ้ง", price: 60, available: true });
    expect(res.body.pagination).toEqual({ page: 1, limit: 10, totalItems: 22, totalPages: 3 });
  });

  it("page=3&limit=10 ได้ 2 รายการสุดท้าย (id 21, 22)", async () => {
    const res = await request(app).get("/api/menu?page=3&limit=10");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.map((m) => m.id)).toEqual([21, 22]);
  });

  it("page เกินจำนวนหน้าได้ array ว่าง ไม่ error", async () => {
    const res = await request(app).get("/api/menu?page=99");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("available=true กรองเหลือ 20 รายการ และทุกรายการ available เป็น true", async () => {
    const res = await request(app).get("/api/menu?available=true&limit=50");

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.totalItems).toBe(20);
    expect(res.body.data.every((m) => m.available === true)).toBe(true);
  });

  it("available=false ได้เมนูที่หมด 2 รายการ (id 9, 18)", async () => {
    const res = await request(app).get("/api/menu?available=false");

    expect(res.body.data.map((m) => m.id)).toEqual([9, 18]);
  });

  it("sort=price&order=desc เมนูแรกคือราคาแพงสุด 120", async () => {
    const res = await request(app).get("/api/menu?sort=price&order=desc");

    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].price).toBe(120);
  });

  // it.each รันเทสต์เดิมซ้ำด้วยข้อมูลหลายชุด (%s จะถูกแทนด้วยค่าในแต่ละแถว)
  it.each([
    ["page=0", "page"],
    ["page=abc", "page"],
    ["limit=0", "limit"],
    ["limit=51", "limit"],
    ["available=yes", "available"],
    ["sort=password", "sort"],
  ])("query %s ผิด ได้ 400 และระบุ field %s", async (query, field) => {
    const res = await request(app).get(`/api/menu?${query}`);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });
});

describe("GET /api/menu/:id", () => {
  it("id ที่มีจริงได้ 200 และ price เป็นตัวเลข", async () => {
    const res = await request(app).get("/api/menu/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe("ข้าวผัดกุ้ง");
    expect(res.body.data.price).toBe(60);
  });

  it("id ที่ไม่มีได้ 404 MENU_NOT_FOUND", async () => {
    const res = await request(app).get("/api/menu/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("MENU_NOT_FOUND");
  });

  it("id ไม่ใช่ตัวเลขได้ 400", async () => {
    const res = await request(app).get("/api/menu/abc");

    expect(res.statusCode).toBe(400);
  });
});
```

### 1.4 รันและตรวจผล

```bash
npx jest tests/menu.test.js
```

ต้องได้ `Tests: 15 passed, 15 total` (9 เทสต์ปกติ + 6 จาก it.each)

### 1.5 Matcher ที่ใช้บ่อย

| matcher | ใช้เมื่อ |
| --- | --- |
| `toBe(x)` | เทียบค่าเดี่ยว เช่น status, ตัวเลข, string |
| `toEqual(obj)` | เทียบ object/array ทั้งก้อนทุก field |
| `toMatchObject(obj)` | เทียบเฉพาะ field ที่ระบุ field อื่นมีเกินได้ |
| `toHaveLength(n)` | จำนวนสมาชิกของ array |
| `toContain(x)` | array มีค่านี้อยู่ |
| `toHaveProperty("a.b")` | มี field นี้ เช่น `toHaveProperty("data.token")` |
| `toBeGreaterThanOrEqual(n)` | มากกว่าหรือเท่ากับ |
| `not.toBe(x)` | ต้องไม่เท่า |

**คำอธิบายที่ควรเขียนได้:** "เทสต์ page=3 ยืนยันว่าสูตร OFFSET ถูก เพราะถ้าเขียน OFFSET = page × limit หน้า 3 จะข้ามไป 30 แถวและได้ array ว่าง แทนที่จะได้ id 21, 22"

### 1.6 ฝึกเพิ่ม (ลองเองก่อนดูคำตอบ)

1. เพิ่ม query `q` ค้นหาตามชื่อ เช่น `?q=กุ้ง` ในขั้นที่ 2 เพิ่มโค้ดด้านล่าง เทสต์ควรได้ 3 รายการ (ข้าวผัดกุ้ง, ต้มยำกุ้ง, ผัดไทยกุ้งสด)
2. เพิ่ม `minPrice` / `maxPrice` แบบเดียวกัน ด้วย `price >= ?` และ `price <= ?` ถ้า minPrice มากกว่า maxPrice ให้ตอบ 400
3. เขียนเทสต์ว่า `totalPages` เมื่อ `limit=7` ต้องเป็น 4 (22 ÷ 7 = 3.14 ปัดขึ้นเป็น 4)

```javascript
// เพิ่มในขั้นที่ 2 ต่อจาก if (available ...) ของ GET /api/menu
if (req.query.q) {
  where.push("name LIKE ?");          // ค้นหาคำที่อยู่ตรงไหนก็ได้ในชื่อ
  params.push(`%${req.query.q}%`);   // % ใส่ในค่า ไม่ใช่ใน SQL
}
```

## โจทย์ชุดที่ 2: POST /api/orders ด้วย transaction

**โจทย์**

> เพิ่ม `POST /api/orders` รับ `{ customer_name, items: [{ menu_item_id, quantity }] }` บันทึก orders และ order\_items ใน transaction เดียวกัน ตอบ 201 พร้อมยอดรวม, 400 เมื่อข้อมูลผิด, 404 เมื่อมีเมนูที่ไม่มีอยู่, 409 เมื่อเมนูหมด (available = false) ถ้าไม่สำเร็จต้องไม่มีข้อมูลใดถูกบันทึก

### 2.1 แนวคิดก่อนเขียน

คำสั่งซื้อหนึ่งครั้งเขียน 2 ตาราง ถ้า INSERT orders สำเร็จแต่ INSERT order\_items ล้ม จะเหลือ order ที่ไม่มีรายการอาหาร transaction ทำให้ **สำเร็จทั้งหมดหรือไม่เกิดอะไรเลย** (all-or-nothing)

โครงที่ต้องจำ (เหมือนใน ref-mysql2-knex.md):

1. validate body **ก่อน** ขอ connection (ข้อมูลผิดไม่ต้องแตะฐานข้อมูล)
2. `conn = await pool.getConnection()` → `await conn.beginTransaction()`
3. ทุก query ใช้ **`conn.query()`** ไม่ใช่ `pool.query()` (pool อาจหยิบ connection อื่น หลุดจาก transaction)
4. เจอเงื่อนไขไม่ผ่าน → `await conn.rollback()` แล้ว `return` ตอบ error
5. สำเร็จทุกขั้น → `await conn.commit()`
6. `catch` → rollback แล้ว `next(err)`; `finally` → **`conn.release()` เสมอ**

### 2.2 เขียน src/routes/orders.js (แทนทั้งไฟล์)

```javascript
// เส้นทางเกี่ยวกับคำสั่งซื้อ: POST /api/orders (ชุดที่ 3 จะเพิ่ม GET และ PATCH)
const express = require("express");
const { pool } = require("../../db");
const { toPositiveInt, sendError } = require("../utils");

const router = express.Router();

const ALL_STATUSES = ["pending", "preparing", "delivered", "cancelled"];
// สถานะปัจจุบัน -> สถานะที่เปลี่ยนไปได้ (ใช้ในชุดที่ 3)
const NEXT_STATUS = {
  pending: ["preparing", "cancelled"],
  preparing: ["delivered"],
  delivered: [],
  cancelled: [],
};

// ตรวจ body ของ POST /api/orders คืน array ของข้อผิดพลาด (ว่าง = ผ่าน)
function validateOrderBody(body) {
  const errors = [];
  const { customer_name, items } = body || {};

  if (typeof customer_name !== "string" || customer_name.trim() === "") {
    errors.push({ field: "customer_name", message: "ต้องระบุ customer_name" });
  } else if (customer_name.trim().length > 100) {
    errors.push({ field: "customer_name", message: "customer_name ยาวได้ไม่เกิน 100 ตัวอักษร" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push({ field: "items", message: "items ต้องเป็น array ที่มีอย่างน้อย 1 รายการ" });
    return errors;
  }
  if (items.length > 20) errors.push({ field: "items", message: "สั่งได้ไม่เกิน 20 รายการต่อครั้ง" });

  items.forEach((item, i) => {
    // Number.isInteger("1") เป็น false จึงกันการส่งตัวเลขมาเป็น string ได้ด้วย
    if (!Number.isInteger(item?.menu_item_id) || item.menu_item_id <= 0) {
      errors.push({ field: `items[${i}].menu_item_id`, message: "menu_item_id ต้องเป็นจำนวนเต็มบวก" });
    }
    if (!Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > 20) {
      errors.push({ field: `items[${i}].quantity`, message: "quantity ต้องเป็นจำนวนเต็ม 1-20" });
    }
  });
  return errors;
}

// POST /api/orders  body: { customer_name, items: [{ menu_item_id, quantity }] }
router.post("/", async (req, res, next) => {
  // 1) validate ก่อนแตะฐานข้อมูล
  const errors = validateOrderBody(req.body);
  if (errors.length > 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "ข้อมูลคำสั่งซื้อไม่ถูกต้อง", errors);
  }
  const customerName = req.body.customer_name.trim();
  const { items } = req.body;

  let conn;
  try {
    // 2) ขอ connection เดี่ยว แล้วเริ่ม transaction (ทุก query ต้องใช้ conn ตัวนี้)
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 3) ดึงเมนูทั้งหมดที่สั่งในครั้งเดียว: IN (?) + array จะถูกขยายเป็น IN (1, 15)
    const ids = items.map((item) => item.menu_item_id);
    const [menuRows] = await conn.query(
      "SELECT id, name, price, available FROM menu_items WHERE id IN (?)",
      [ids]
    );
    const menuById = new Map(menuRows.map((m) => [m.id, m])); // id -> แถวเมนู ไว้ค้นเร็ว ๆ

    // 4) ตรวจว่าเมนูมีจริงและยังขายอยู่ ถ้าไม่ผ่านให้ rollback แล้ว return ทันที
    for (const item of items) {
      const menu = menuById.get(item.menu_item_id);
      if (!menu) {
        await conn.rollback();
        return sendError(res, 404, "MENU_NOT_FOUND", `ไม่พบเมนู id ${item.menu_item_id}`);
      }
      if (!menu.available) {
        await conn.rollback();
        return sendError(res, 409, "MENU_UNAVAILABLE", `เมนู ${menu.name} หมดชั่วคราว`);
      }
    }

    // 5) บันทึก order แล้วใช้ insertId ไปบันทึก order_items
    const [orderResult] = await conn.query("INSERT INTO orders (customer_name) VALUES (?)", [customerName]);
    const orderId = orderResult.insertId;
    for (const item of items) {
      await conn.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
        [orderId, item.menu_item_id, item.quantity]
      );
    }

    // 6) ทุกขั้นสำเร็จจึง commit
    await conn.commit();

    // คำนวณยอดรวมจากราคาในฐานข้อมูล (ห้ามเชื่อราคาที่ client ส่งมา)
    const total = items.reduce(
      (sum, item) => sum + Number(menuById.get(item.menu_item_id).price) * item.quantity,
      0
    );
    return res.status(201).json({
      data: { id: orderId, customer_name: customerName, status: "pending", total, items },
    });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {}); // ยกเลิกทุกอย่างที่ทำไปใน transaction
    return next(err);
  } finally {
    if (conn) conn.release(); // คืน connection ให้ pool เสมอ ไม่ว่าสำเร็จหรือล้ม
  }
});

// (ชุดที่ 3 จะเพิ่ม route ตรงนี้)

module.exports = router;
```

ทำไม `let conn` อยู่นอก try: ถ้า `pool.getConnection()` เองล้ม (DB ล่ม) conn จะยังเป็น undefined จึงต้องเช็ก `if (conn)` ก่อน rollback/release ไม่งั้นจะเกิด TypeError ซ้อน

### 2.3 ทดลองด้วยมือ (ไม่บังคับ)

เปิด `npm start` แล้วใช้ Postman หรือ terminal อีกอัน:

```bash
curl -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d "{\"customer_name\":\"ทดสอบ\",\"items\":[{\"menu_item_id\":1,\"quantity\":2}]}"
```

ควรได้ 201 และ `"total":120` หลังทดลองเสร็จรัน `npm run seed` ให้ข้อมูลกลับเป็นค่าตั้งต้น

### 2.4 เขียน tests/orders.test.js (ส่วน POST)

เทสต์ที่เขียนข้อมูลต้องใช้ **beforeEach** รีเซ็ตทุกเทสต์ ไม่งั้น order ที่เทสต์ก่อนหน้าสร้างจะทำให้ตัวเลขเทสต์ถัดไปผิด จุดสำคัญคือ **ยืนยันผลในฐานข้อมูลด้วย** ไม่ใช่ดูแค่ status code เพราะการพิสูจน์ว่า rollback ทำงานจริงคือจำนวนแถวไม่เปลี่ยน

```javascript
// Integration test ของ /api/orders (ต่อฐานข้อมูลจริง)
const request = require("supertest");
const app = require("../src/app");
const { pool } = require("../db");
const { resetDatabase, countRows } = require("./helpers/db-helper");

// เทสต์ชุดนี้เขียนข้อมูล ต้องรีเซ็ตก่อนทุกเทสต์เพื่อให้แต่ละเทสต์ไม่กระทบกัน
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe("POST /api/orders", () => {
  it("สั่งอาหารสำเร็จได้ 201 พร้อมยอดรวมที่ถูกต้อง และบันทึกลงฐานข้อมูล", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        customer_name: "ทดสอบ",
        items: [
          { menu_item_id: 1, quantity: 2 },  // ข้าวผัดกุ้ง 60 x 2 = 120
          { menu_item_id: 15, quantity: 1 }, // ชาเย็น 25 x 1 = 25
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe("pending");
    expect(res.body.data.total).toBe(145);

    // ยืนยันในฐานข้อมูลจริง: order เพิ่มจาก 3 เป็น 4, order_items เพิ่มจาก 5 เป็น 7
    expect(await countRows("orders")).toBe(4);
    expect(await countRows("order_items")).toBe(7);
  });

  it.each([
    ["ไม่มี customer_name", { items: [{ menu_item_id: 1, quantity: 1 }] }],
    ["items ว่าง", { customer_name: "ก", items: [] }],
    ["quantity เป็น 0", { customer_name: "ก", items: [{ menu_item_id: 1, quantity: 0 }] }],
    ["menu_item_id เป็น string", { customer_name: "ก", items: [{ menu_item_id: "1", quantity: 1 }] }],
  ])("%s ได้ 400 VALIDATION_ERROR", async (_label, body) => {
    const res = await request(app).post("/api/orders").send(body);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("มีเมนูที่ไม่มีอยู่จริงได้ 404 และไม่สร้าง order (rollback)", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ customer_name: "ทดสอบ", items: [{ menu_item_id: 1, quantity: 1 }, { menu_item_id: 999, quantity: 1 }] });

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("MENU_NOT_FOUND");
    expect(await countRows("orders")).toBe(3);
  });

  it("สั่งเมนูที่หมด (id 9) ได้ 409 และไม่สร้าง order", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ customer_name: "ทดสอบ", items: [{ menu_item_id: 9, quantity: 1 }] });

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("MENU_UNAVAILABLE");
    expect(await countRows("orders")).toBe(3);
  });
});

// (ชุดที่ 3 จะเพิ่ม describe ต่อท้ายไฟล์นี้)
```

รัน `npx jest tests/orders.test.js` ต้องได้ `Tests: 7 passed, 7 total`

### 2.5 คำถามที่อาจารย์อาจถามในข้อสอบ

| คำถาม | คำตอบสั้น |
| --- | --- |
| ทำไมใช้ 404 กับเมนูที่ไม่มี แต่ 409 กับเมนูหมด | 404 = ทรัพยากรไม่มีอยู่ ส่วน 409 = มีอยู่แต่สถานะปัจจุบันขัดกับคำขอ |
| ทำไมคำนวณ total ที่ server | client แก้ราคาได้ ต้องใช้ราคาจากฐานข้อมูลเท่านั้น |
| ทำไมต้อง release ใน finally | ถ้าลืม release ในบางทาง connection จะค้าง ครบ 10 ครั้ง (connectionLimit) คำขอถัดไปจะรอไม่มีวันได้ |
| ทำไมใช้ conn.query ไม่ใช้ pool.query | pool.query อาจได้ connection อื่นซึ่งไม่ได้อยู่ใน transaction จะ commit ทันที rollback ย้อนไม่ได้ |

### 2.6 ฝึกเพิ่ม

1. ถ้า items มี menu\_item\_id ซ้ำกัน (เช่นสั่งข้าวผัดกุ้งสองแถว) ให้ตอบ 400 → ใน validateOrderBody เช็ก `new Set(ids).size !== ids.length`
2. เพิ่มเทสต์ว่า order ที่สร้างใหม่ GET /api/orders/:id แล้วได้ total 145 (ทำหลังชุดที่ 3)

## โจทย์ชุดที่ 3: ดูคำสั่งซื้อ (JOIN) และเปลี่ยนสถานะ (FOR UPDATE)

**โจทย์**

> 1. `GET /api/orders/:id` คืน order พร้อมรายการอาหาร (ชื่อ, ราคา, จำนวน, subtotal) และ total ไม่พบตอบ 404
> 2. `GET /api/orders?status=&page=&limit=` รายการ order ใหม่สุดก่อน พร้อมยอดรวมแต่ละ order และ pagination
> 3. `PATCH /api/orders/:id/status` เปลี่ยนสถานะได้ตามลำดับ pending → preparing → delivered หรือ pending → cancelled เท่านั้น สถานะไม่รู้จัก 400, ไม่พบ 404, เปลี่ยนข้ามลำดับ 409

### 3.1 แนวคิด

- **JOIN** เอาชื่อและราคาจาก menu\_items มาต่อกับ order\_items ด้วย `ON m.id = oi.menu_item_id`
- **GROUP BY + SUM** คำนวณยอดรวมต่อ order ใน SQL ครั้งเดียว ใช้ **LEFT JOIN** เพื่อให้ order ที่ไม่มีรายการยังแสดง (ยอด 0) ผล SUM ของ DECIMAL ก็มาเป็น string ต้อง Number()
- **SELECT ... FOR UPDATE** ใน transaction ล็อกแถวไว้จน commit กันกรณีพนักงานสองคนกดเปลี่ยนสถานะพร้อมกัน แล้วต่างคนอ่านสถานะเก่าได้ (race condition)
- ค่าคาดหวังจาก seed.sql: order 1 (สมชาย, delivered) = 60×2 + 25×2 = **170**, order 2 (สมหญิง, preparing) = **45**, order 3 (วิชัย, pending) = 90 + 20×2 = **130**

### 3.2 เพิ่ม route ใน src/routes/orders.js

วางโค้ดนี้แทนบรรทัด `// (ชุดที่ 3 จะเพิ่ม route ตรงนี้)` (ก่อน `module.exports = router;`):

```javascript
// GET /api/orders?status=pending&page=1&limit=10  รายการคำสั่งซื้อพร้อมยอดรวม (ใหม่สุดก่อน)
router.get("/", async (req, res, next) => {
  try {
    const page = toPositiveInt(req.query.page, 1);
    const limit = toPositiveInt(req.query.limit, 10);
    const { status } = req.query;

    const errors = [];
    if (page === null) errors.push({ field: "page", message: "page ต้องเป็นจำนวนเต็มตั้งแต่ 1" });
    if (limit === null || limit > 50) errors.push({ field: "limit", message: "limit ต้องเป็นจำนวนเต็ม 1-50" });
    if (status !== undefined && !ALL_STATUSES.includes(status)) {
      errors.push({ field: "status", message: `status ต้องเป็นหนึ่งใน ${ALL_STATUSES.join(", ")}` });
    }
    if (errors.length > 0) return sendError(res, 400, "VALIDATION_ERROR", "query string ไม่ถูกต้อง", errors);

    const whereSql = status ? "WHERE o.status = ?" : "";
    const params = status ? [status] : [];

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM orders o ${whereSql}`, params);
    const totalItems = countRows[0].total;

    // LEFT JOIN เพื่อให้ order ที่ยังไม่มีรายการอาหารยังแสดงอยู่ (ยอดรวม 0)
    const [rows] = await pool.query(
      `SELECT o.id, o.customer_name, o.status, o.created_at,
              COALESCE(SUM(oi.quantity * m.price), 0) AS total
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN menu_items m ON m.id = oi.menu_item_id
       ${whereSql}
       GROUP BY o.id, o.customer_name, o.status, o.created_at
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );

    return res.status(200).json({
      data: rows.map((r) => ({ ...r, total: Number(r.total) })), // SUM ของ DECIMAL มาเป็น string
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/orders/:id  คืน order พร้อมรายการอาหารและยอดรวม
router.get("/:id", async (req, res, next) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (id === null) return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");

    const [orders] = await pool.query(
      "SELECT id, customer_name, status, created_at FROM orders WHERE id = ?",
      [id]
    );
    if (orders.length === 0) return sendError(res, 404, "ORDER_NOT_FOUND", `ไม่พบคำสั่งซื้อ id ${id}`);

    // JOIN เพื่อเอาชื่อและราคาเมนูมาด้วย
    const [itemRows] = await pool.query(
      `SELECT oi.menu_item_id, m.name, m.price, oi.quantity
       FROM order_items oi
       JOIN menu_items m ON m.id = oi.menu_item_id
       WHERE oi.order_id = ?
       ORDER BY oi.id`,
      [id]
    );
    const items = itemRows.map((r) => ({
      menu_item_id: r.menu_item_id,
      name: r.name,
      price: Number(r.price),
      quantity: r.quantity,
      subtotal: Number(r.price) * r.quantity,
    }));
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    return res.status(200).json({ data: { ...orders[0], items, total } });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/orders/:id/status  body: { status }
router.patch("/:id/status", async (req, res, next) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");
  const { status } = req.body || {};
  if (!ALL_STATUSES.includes(status)) {
    return sendError(res, 400, "VALIDATION_ERROR", `status ต้องเป็นหนึ่งใน ${ALL_STATUSES.join(", ")}`);
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // FOR UPDATE ล็อกแถวนี้ไว้จนจบ transaction กันสองคำขอเปลี่ยนสถานะพร้อมกัน
    const [rows] = await conn.query("SELECT id, status FROM orders WHERE id = ? FOR UPDATE", [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return sendError(res, 404, "ORDER_NOT_FOUND", `ไม่พบคำสั่งซื้อ id ${id}`);
    }

    const current = rows[0].status;
    if (!(NEXT_STATUS[current] || []).includes(status)) {
      await conn.rollback();
      return sendError(res, 409, "INVALID_STATUS_TRANSITION", `เปลี่ยนสถานะจาก ${current} เป็น ${status} ไม่ได้`);
    }

    await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    await conn.commit();
    return res.status(200).json({ data: { id, status } });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    return next(err);
  } finally {
    if (conn) conn.release();
  }
});
```

ลำดับของ route ใน Express: `router.get("/")` กับ `router.get("/:id")` ไม่ชนกัน แต่ถ้าวันหลังจะเพิ่ม path คงที่ เช่น `/summary` ต้องวาง **ก่อน** `/:id` ไม่งั้น Express จะตีความว่า "summary" เป็น id แล้วตอบ 400

### 3.3 เพิ่มเทสต์ต่อท้าย tests/orders.test.js

วางแทนบรรทัด `// (ชุดที่ 3 จะเพิ่ม describe ต่อท้ายไฟล์นี้)`:

```javascript
describe("GET /api/orders", () => {
  it("ได้ 3 order เรียงใหม่สุดก่อน พร้อมยอดรวมที่ถูกต้อง", async () => {
    const res = await request(app).get("/api/orders");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.map((o) => o.id)).toEqual([3, 2, 1]);
    expect(res.body.data.map((o) => o.total)).toEqual([130, 45, 170]);
    expect(res.body.pagination.totalItems).toBe(3);
  });

  it("status=pending เหลือ order 3 อย่างเดียว", async () => {
    const res = await request(app).get("/api/orders?status=pending");

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 3, customer_name: "วิชัย", total: 130 });
  });

  it("limit=2&page=2 ได้ order 1 (ตัวสุดท้าย)", async () => {
    const res = await request(app).get("/api/orders?limit=2&page=2");

    expect(res.body.data.map((o) => o.id)).toEqual([1]);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it("status ที่ไม่รู้จักได้ 400", async () => {
    const res = await request(app).get("/api/orders?status=lost");

    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/orders/:id", () => {
  it("order 1 มี 2 รายการ ยอดรวม 170", async () => {
    const res = await request(app).get("/api/orders/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.customer_name).toBe("สมชาย");
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0]).toMatchObject({ name: "ข้าวผัดกุ้ง", quantity: 2, subtotal: 120 });
    expect(res.body.data.total).toBe(170); // 60x2 + 25x2
  });

  it("order ที่ไม่มีได้ 404", async () => {
    const res = await request(app).get("/api/orders/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("ORDER_NOT_FOUND");
  });
});

describe("PATCH /api/orders/:id/status", () => {
  it("pending -> preparing ได้ 200 และสถานะในฐานข้อมูลเปลี่ยนจริง", async () => {
    const res = await request(app).patch("/api/orders/3/status").send({ status: "preparing" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ id: 3, status: "preparing" });

    const check = await request(app).get("/api/orders/3");
    expect(check.body.data.status).toBe("preparing");
  });

  it("pending -> cancelled ได้ 200", async () => {
    const res = await request(app).patch("/api/orders/3/status").send({ status: "cancelled" });

    expect(res.statusCode).toBe(200);
  });

  it("delivered -> preparing ไม่ได้ ได้ 409", async () => {
    const res = await request(app).patch("/api/orders/1/status").send({ status: "preparing" });

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("status ที่ไม่มีในระบบได้ 400", async () => {
    const res = await request(app).patch("/api/orders/3/status").send({ status: "done" });

    expect(res.statusCode).toBe(400);
  });

  it("order ที่ไม่มีได้ 404", async () => {
    const res = await request(app).patch("/api/orders/999/status").send({ status: "preparing" });

    expect(res.statusCode).toBe(404);
  });
});
```

รัน `npx jest tests/orders.test.js` ต้องได้ `Tests: 18 passed, 18 total` (7 จากชุดที่ 2 + 11 ใหม่)

### 3.4 ฝึกเพิ่ม

1. `DELETE /api/orders/:id` ลบได้เฉพาะ order สถานะ pending (อื่น ๆ 409) ใช้ transaction + FOR UPDATE แบบเดียวกับ PATCH และตอบ **204** (ไม่มี body ใช้ `res.status(204).send()`) order\_items จะหายตามเพราะ `ON DELETE CASCADE` เทสต์ด้วย `countRows("order_items")` ต้องลดจาก 5 เป็น 3 หลังลบ order 3
2. `GET /api/menu/:id/sales` นับยอดขายของเมนู ด้วย `SELECT COALESCE(SUM(quantity), 0) AS sold FROM order_items WHERE menu_item_id = ?` (ชาเย็น id 15 ต้องได้ 2)

## โจทย์ชุดที่ 4: ป้องกัน endpoint ด้วย JWT + RBAC

**โจทย์**

> ให้ `PATCH /api/orders/:id/status` ใช้ได้เฉพาะพนักงาน (role `staff` หรือ `admin`) ไม่มี token หรือ token ผิดตอบ 401, role อื่นตอบ 403 เขียนเทสต์ครอบทุกกรณี

### 4.1 แนวคิด

- **401** = ยังไม่รู้ว่าเป็นใคร (ไม่มี token, token ปลอม, คนละ secret, หมดอายุ) ส่วน **403** = รู้แล้วว่าเป็นใครแต่ไม่มีสิทธิ์
- ลำดับ middleware: `authenticateToken` (ตั้ง `req.user`) → `requireRole(...)` (อ่าน `req.user.role`) → handler สลับกันไม่ได้
- secret มาจาก `config.jwtSecret` เทสต์ต้องเซ็น token ด้วย secret ตัวเดียวกัน ไม่ต้องมี endpoint login ก็ทดสอบได้ (เหมือน generate-test-token.js สัปดาห์ 13)

### 4.2 สร้าง src/middlewares/auth.js

```javascript
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
  const token = authHeader.split(" ")[1]; // "Bearer abc" -> "abc"

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
```

ทำไม `next()` อยู่นอก try: ถ้าเรียก `next()` ใน try แล้ว handler ถัดไปเกิด error แบบ synchronous catch นี้จะจับได้แล้วตอบ 401 ผิด ๆ แทน 500

### 4.3 แก้ src/routes/orders.js 2 จุด

**จุดที่ 1** เพิ่มบรรทัดนี้ใต้ `const { toPositiveInt, sendError } = require("../utils");`

```javascript
const { authenticateToken, requireRole } = require("../middlewares/auth");
```

**จุดที่ 2** แก้บรรทัดแรกของ PATCH จาก

```javascript
router.patch("/:id/status", async (req, res, next) => {
```

เป็น

```javascript
router.patch("/:id/status", authenticateToken, requireRole("staff", "admin"), async (req, res, next) => {
```

ถ้ารัน `npx jest tests/orders.test.js` ตอนนี้ เทสต์ PATCH เดิมจะล้มด้วย `Expected: 200 Received: 401` นั่นคือสิ่งที่ควรเกิด แก้ในขั้นถัดไป

### 4.4 แก้เทสต์ PATCH เดิมใน tests/orders.test.js

เพิ่ม 3 บรรทัดนี้ใต้ `require` บรรทัดสุดท้ายด้านบนไฟล์:

```javascript
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const staffToken = jwt.sign({ id: 1, role: "staff" }, jwtSecret, { expiresIn: "1h" }); // token พนักงานสำหรับเทสต์
```

แล้วแทน `describe("PATCH /api/orders/:id/status", ...)` ทั้งก้อนด้วย:

```javascript
describe("PATCH /api/orders/:id/status", () => {
  // ฟังก์ชันช่วยยิง PATCH พร้อม token พนักงาน ลดการเขียนซ้ำ
  const patchStatus = (id, status) =>
    request(app)
      .patch(`/api/orders/${id}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status });

  it("pending -> preparing ได้ 200 และสถานะในฐานข้อมูลเปลี่ยนจริง", async () => {
    const res = await patchStatus(3, "preparing");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ id: 3, status: "preparing" });

    const check = await request(app).get("/api/orders/3");
    expect(check.body.data.status).toBe("preparing");
  });

  it("pending -> cancelled ได้ 200", async () => {
    const res = await patchStatus(3, "cancelled");

    expect(res.statusCode).toBe(200);
  });

  it("delivered -> preparing ไม่ได้ ได้ 409", async () => {
    const res = await patchStatus(1, "preparing");

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("status ที่ไม่มีในระบบได้ 400", async () => {
    const res = await patchStatus(3, "done");

    expect(res.statusCode).toBe(400);
  });

  it("order ที่ไม่มีได้ 404", async () => {
    const res = await patchStatus(999, "preparing");

    expect(res.statusCode).toBe(404);
  });
});
```

### 4.5 สร้าง tests/auth.test.js (เทสต์เฉพาะเรื่องสิทธิ์)

```javascript
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
```

รัน `npx jest tests/auth.test.js` ต้องได้ `Tests: 7 passed, 7 total` และ `npx jest tests/orders.test.js` กลับมาผ่าน 18 เทสต์

### 4.6 ฝึกเพิ่ม

1. เพิ่มเทสต์ว่า role `admin` ก็ได้ 200 ด้วย
2. เพิ่ม `POST /api/menu` (เฉพาะ admin) รับ `{ name, price }` ตรวจ name ไม่ว่าง, price เป็นตัวเลขมากกว่า 0 ตอบ 201 พร้อม `insertId` แล้วเทสต์ว่า staff ได้ 403 ส่วน admin ได้ 201 และ GET /api/menu มี totalItems เป็น 23

## โจทย์ชุดที่ 5: เทสต์แบบ mock ฐานข้อมูล

**โจทย์**

> เขียนเทสต์ที่ไม่ต่อฐานข้อมูลจริง เพื่อยืนยันว่า (1) เมื่อฐานข้อมูลล่ม API ตอบ 500 (2) เมื่อ INSERT ล้มกลาง transaction ต้อง rollback ไม่ commit และ release connection (3) ส่ง LIMIT/OFFSET ที่คำนวณถูกไปให้ query

### 5.1 แนวคิด

- `jest.mock("../db", () => ({ ... }))` แทนไฟล์ db.js ทั้งไฟล์ด้วย object ที่เราสร้าง **path นับจากไฟล์เทสต์** (tests/ → ../db) แต่มีผลกับทุกไฟล์ที่ require db.js รวมถึง routes ด้วย Jest ยก jest.mock ขึ้นไปบนสุดไฟล์ให้เอง จึงทำงานก่อน require app
- ต้องเลียนรูปที่ db.js export จริง ในโปรเจกต์นี้คือ `{ pool }` จึง mock เป็น `{ pool: { query: jest.fn(), getConnection: jest.fn() } }` (ถ้าโปรเจกต์ export pool ตรง ๆ ให้ mock เป็น `{ query: jest.fn(), getConnection: jest.fn() }`)
- mysql2 คืน `[rows, fields]` จึงต้อง mock เป็น array ซ้อน: SELECT → `[[แถว1, แถว2]]`, ไม่พบ → `[[]]`, INSERT → `[{ insertId: 10 }]`
- `mockResolvedValueOnce` ต่อกันหลายครั้ง = คำตอบของการเรียกครั้งที่ 1, 2, 3 ตามลำดับ ต้องเรียงให้ตรงกับลำดับ query ใน route
- ตรวจว่าถูกเรียกด้วย `toHaveBeenCalledTimes(n)`, `not.toHaveBeenCalled()` และดู argument ที่ส่งเข้าไปด้วย `mockFn.mock.calls[i]`

### 5.2 สร้าง tests/orders-mocked.test.js

```javascript
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

    const [, params] = pool.query.mock.calls[1]; // argument ของการเรียกครั้งที่ 2 (ตัวที่ 0 คือ SQL, ตัวที่ 1 คือ params)
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
      .mockResolvedValueOnce([[MENU_RICE]])          // SELECT menu_items
      .mockResolvedValueOnce([{ insertId: 10 }])     // INSERT orders
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
```

ไฟล์นี้ไม่ต้องมี resetDatabase และไม่ต้อง `pool.end()` เพราะไม่มี connection จริงเปิดอยู่ รัน `npx jest tests/orders-mocked.test.js` ต้องได้ `Tests: 8 passed, 8 total` และควรเร็วกว่าเทสต์ที่ต่อ DB จริงมาก

### 5.3 mock กับ integration ใช้ตอนไหน

| สถานการณ์ | เลือก | เหตุผล |
| --- | --- | --- |
| ยืนยันว่า SQL ถูกและข้อมูลถูกบันทึกจริง | Integration (DB จริง) | mock ไม่รัน SQL จริง SQL ผิดก็ยังผ่าน |
| DB ล่ม, deadlock, timeout | Mock | ทำให้เกิดจริงยาก |
| ตรวจว่า rollback/release ถูกเรียก | Mock | นับการเรียกได้ตรง ๆ |
| ตรวจตัวเลข LIMIT/OFFSET ที่ส่งไป | Mock | ดู `mock.calls` ได้ |
| ตรวจ validation 400 | แบบไหนก็ได้ | ไม่แตะ DB อยู่แล้ว |

### 5.4 ฝึกเพิ่ม

1. เทสต์ว่าถ้า `pool.getConnection` เองล้ม (`mockRejectedValueOnce(new Error("Too many connections"))`) ได้ 500 และแอปไม่ crash
2. เทสต์ว่า SQL ของ INSERT orders ส่ง customer\_name ที่ trim แล้ว เช่นส่ง `"  ทดสอบ  "` แล้ว `expect(conn.query.mock.calls[1][1]).toEqual(["ทดสอบ"])`
3. mock PATCH ให้ `SELECT ... FOR UPDATE` คืน `[[{ id: 1, status: "delivered" }]]` แล้วยืนยันว่าได้ 409 และไม่มี UPDATE (อย่าลืมแนบ staff token เพราะชุดที่ 4 ใส่การยืนยันตัวตนแล้ว)

## โจทย์ชุดที่ 6: ดีบักจาก error ของ Jest และอธิบายสาเหตุ

**โจทย์ (รูปแบบที่คาดว่าจะออก)**

> โปรเจกต์มีเทสต์ที่ล้มอยู่ ให้หาสาเหตุ แก้โค้ด (ห้ามแก้เทสต์) และเขียนอธิบายสาเหตุด้วยประโยคของตัวเอง

### 6.1 ขั้นตอนอ่าน error ของ Jest

1. ดูชื่อเทสต์ที่ล้มตัวแรก (บรรทัด `● describe › it`)
2. อ่าน `Expected:` กับ `Received:` บอกทันทีว่าต่างกันตรงไหน เช่นอยาก 200 แต่ได้ 500
3. ดูบรรทัดที่มี `>` ชี้ในไฟล์เทสต์ และ **console.error ที่พิมพ์ออกมาด้วย** (ถ้าได้ 500 สาเหตุจริงอยู่ใน log นี้ เช่น SQL syntax error)
4. รันเฉพาะเทสต์นั้นซ้ำด้วย `npx jest -t "ชื่อเทสต์บางส่วน"` แล้วใส่ `console.log(res.body)` ชั่วคราวดูคำตอบจริง
5. แก้ทีละจุด รันเทสต์ทั้งหมดอีกครั้ง แล้วลบ console.log ที่ใส่ไว้

**แม่แบบคำอธิบาย (4 ประโยค):** สาเหตุคือ \[บรรทัด/ฟังก์ชันไหนทำอะไรผิด\] → ทำให้ \[ผลที่เกิดกับข้อมูลหรือ response\] → แก้โดย \[เปลี่ยนอะไร\] → ยืนยันด้วย \[เทสต์ไหนผ่าน\]

วิธีฝึก: ใส่บั๊กทีละตัวลงในโค้ดที่ทำเสร็จแล้ว รันเทสต์ดู error จริง เขียนคำอธิบายเองก่อน แล้วค่อยเทียบกับเฉลย

### บั๊ก 1: OFFSET ผิดสูตร

```javascript
const offset = page * limit; // ผิด
```

**อาการ:** เทสต์ page=3 ล้มด้วย `Expected: [21, 22]` `Received: []` และเทสต์หน้าแรกได้เมนู id 11 แทน id 1

**สาเหตุ:** หน้า 1 ควรข้าม 0 แถว แต่สูตรนี้ข้าม 10 แถว ทุกหน้าจึงเลื่อนไปหนึ่งหน้าเสมอ

**แก้:** `const offset = (page - 1) * limit;`

### บั๊ก 2: ลืมแปลง query string เป็นตัวเลข

```javascript
const limit = req.query.limit || 10; // ถ้าส่ง ?limit=5 จะได้ "5" (string)
```

**อาการ:** เมื่อส่ง `?limit=5` ได้ `Expected: 200` `Received: 500` และ console.error มี `You have an error in your SQL syntax ... near ''5' OFFSET`

**สาเหตุ:** ค่าใน req.query เป็น string mysql2 จึง escape เป็น `LIMIT '5'` มีเครื่องหมายคำพูด ซึ่ง MySQL ไม่ยอมรับ ส่วนกรณีไม่ส่ง limit จะผ่านเพราะได้เลข 10 บั๊กนี้จึงซ่อนอยู่ถ้าเทสต์ไม่ครบ

**แก้:** แปลงและตรวจด้วย `toPositiveInt(req.query.limit, 10)` (หรือ `Number(...)` แล้วเช็ก `Number.isInteger`)

### บั๊ก 3: ใช้ pool.query ใน transaction

```javascript
conn = await pool.getConnection();
await conn.beginTransaction();
const [orderResult] = await pool.query("INSERT INTO orders (customer_name) VALUES (?)", [customerName]); // ผิด
for (const item of items) {
  await conn.query("INSERT INTO order_items ...", [...]); // เมนู 999 ทำให้ foreign key error
}
```

**อาการ:** เทสต์ "ไม่สร้าง order (rollback)" ล้มด้วย `expect(await countRows("orders")).toBe(3)` → `Received: 4`

**สาเหตุ:** pool.query หยิบ connection อีกตัวที่ไม่ได้อยู่ใน transaction และ autocommit ทันที เมื่อ INSERT order\_items ล้มแล้ว rollback จึงย้อนได้เฉพาะสิ่งที่ทำผ่าน conn ไม่รวม order ที่บันทึกไปแล้ว

**แก้:** ทุก query ระหว่าง beginTransaction กับ commit ต้องเป็น `conn.query(...)` (และควรตรวจว่าเมนูมีจริงก่อน INSERT เพื่อตอบ 404 แทน 500)

### บั๊ก 4: ลืม release connection

```javascript
if (!menu) {
  await conn.rollback();
  return sendError(res, 404, "MENU_NOT_FOUND", "..."); // return ออกไปโดยไม่ release
}
// ...
await conn.commit();
conn.release(); // release เฉพาะทางที่สำเร็จ ไม่มี finally
```

**อาการ:** เทสต์เดี่ยวผ่าน แต่เมื่อยิงเมนูที่ไม่มีเกิน 10 ครั้ง คำขอที่ 11 ค้าง และ Jest ขึ้น `Exceeded timeout of 5000 ms for a test`

**สาเหตุ:** connection ที่ไม่ได้คืนสะสมจนครบ connectionLimit 10 คำขอถัดไปจึงรอ connection ว่างตลอดไป (connection leak)

**แก้:** ย้าย `conn.release()` ไปอยู่ใน `finally { if (conn) conn.release(); }` ทำงานทุกทางรวมทั้ง return กลางทาง

เทสต์ที่จับบั๊กนี้ได้:

```javascript
it("ยิงเมนูที่ไม่มี 12 ครั้งติดกัน ต้องได้ 404 ทุกครั้ง (ไม่มี connection leak)", async () => {
  for (let i = 0; i < 12; i++) {
    const res = await request(app)
      .post("/api/orders")
      .send({ customer_name: "ทดสอบ", items: [{ menu_item_id: 999, quantity: 1 }] });
    expect(res.statusCode).toBe(404);
  }
});
```

### บั๊ก 5: ลืม return หลังตอบ error

```javascript
if (rows.length === 0) {
  sendError(res, 404, "MENU_NOT_FOUND", "ไม่พบเมนู"); // ลืม return
}
return res.status(200).json({ data: toMenuDto(rows[0]) });
```

**อาการ:** เทสต์ 404 อาจ**ผ่าน** แต่ console มี `TypeError: Cannot read properties of undefined (reading 'id')` ตามด้วย `Cannot set headers after they are sent to the client` (ERR\_HTTP\_HEADERS\_SENT) นี่คือเหตุผลที่ต้องอ่าน log ให้ครบ ไม่ใช่ดูแค่ผ่าน/ไม่ผ่าน

**สาเหตุ:** ตอบ 404 ไปแล้วแต่โค้ดยังทำงานต่อ `rows[0]` เป็น undefined จึง error และ error handler พยายามตอบ 500 ซ้ำใน response เดิม

**แก้:** ใส่ `return` หน้า `sendError(...)` ทุกจุด (หลัก: ทุกคำตอบใน handler ขึ้นต้นด้วย return)

### บั๊ก 6: async handler ไม่มี try/catch

```javascript
router.get("/:id", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM menu_itemz WHERE id = ?", [req.params.id]); // ชื่อตารางผิด
  res.json({ data: rows[0] });
});
```

**อาการ:** เทสต์ค้างจน `Exceeded timeout of 5000 ms` และมี unhandled promise rejection ใน log (`Table 'exam_db.menu_itemz' doesn't exist`)

**สาเหตุ:** Express 4 ไม่จับ error จาก async function ให้ เมื่อ query พังจึงไม่มีใครตอบ response client รอจนหมดเวลา

**แก้:** ครอบด้วย `try { ... } catch (err) { return next(err); }` แล้วแก้ชื่อตารางเป็น menu\_items จะได้ 500 ทันทีแทนการค้าง

### บั๊ก 7: DECIMAL เป็น string

```javascript
return res.status(200).json({ data: rows[0] }); // ส่งแถวจาก mysql2 ตรง ๆ
```

**อาการ:** `expect(res.body.data.price).toBe(60)` → `Expected: 60` `Received: "60.00"` และ available ได้ 1 แทน true

**สาเหตุ:** mysql2 คืน DECIMAL เป็น string เพื่อไม่ให้เสียความแม่นยำ และ BOOLEAN เก็บเป็น TINYINT จึงได้ 1/0

**แก้:** แปลงใน route ด้วย `Number(row.price)` และ `Boolean(row.available)` ถ้าโจทย์ห้ามแก้ route ให้แก้เทสต์เป็น `expect(Number(res.body.data.price)).toBe(60)` แทน (อ่านข้อกำหนดการแก้ไฟล์ในกระดาษข้อสอบก่อน)

### บั๊ก 8: ลืม await ในเทสต์

```javascript
it("ได้ 200", async () => {
  const res = request(app).get("/api/menu"); // ลืม await
  expect(res.statusCode).toBe(200);
});
```

**อาการ:** `Expected: 200` `Received: undefined`

**สาเหตุ:** ไม่มี await ตัวแปร res คือ request object ที่ยังไม่ได้ส่ง ไม่ใช่ response จึงไม่มี statusCode

**แก้:** `const res = await request(app).get("/api/menu");` และ callback ของ it ต้องเป็น `async`

### บั๊ก 9: ต่อค่าจาก client เข้า SQL ตรง ๆ

```javascript
const [rows] = await pool.query(`SELECT * FROM menu_items ORDER BY ${req.query.sort}`);
```

**อาการ:** `?sort=abc` ได้ 500 (`Unknown column 'abc' in 'order clause'`) แทน 400 และเปิดช่อง SQL Injection

**สาเหตุ:** ชื่อคอลัมน์ใส่ผ่าน `?` ไม่ได้ คนเขียนจึงต่อ string ตรง ๆ ทำให้ผู้ใช้ควบคุมส่วนหนึ่งของ SQL ได้

**แก้:** ตรวจกับ allowlist (`SORT_COLUMNS[sort]`) ไม่ผ่านตอบ 400 ค่าอื่นทุกตัวใช้ `?`

### บั๊ก 10: Jest ไม่ยอมจบ

**อาการ:** เทสต์ผ่านหมดแต่ terminal ค้าง พร้อมข้อความ `Jest did not exit one second after the test run has completed`

**สาเหตุ:** pool ของ db.js ยังเปิด connection ค้างอยู่ Node.js จึงไม่จบ process

**แก้:** ใส่ `afterAll(async () => { await pool.end(); });` ในทุกไฟล์เทสต์ที่ใช้ฐานข้อมูลจริง (อย่าใช้ `--forceExit` ปิดปัญหา)

### ตัวอย่างคำตอบเต็ม (บั๊ก 3)

> เทสต์ "มีเมนูที่ไม่มีอยู่จริงได้ 404 และไม่สร้าง order" ล้มเพราะจำนวน orders เป็น 4 แทน 3 สาเหตุคือบรรทัด INSERT orders ใช้ pool.query ซึ่งได้ connection คนละตัวกับ transaction และ commit ทันที เมื่อขั้นถัดไปล้มและ rollback จึงลบ order นั้นไม่ได้ แก้โดยเปลี่ยนเป็น conn.query ให้ทุกคำสั่งอยู่ใน transaction เดียวกัน หลังแก้รัน npx jest tests/orders.test.js ผ่านครบทุกเทสต์

## โจทย์ชุดที่ 7: เทสต์ Retry logic ด้วย jest.mock("axios") (แบบฝึกหัดต่อยอดที่ 3 สัปดาห์ 11)

**โจทย์ (ตามใบงานสัปดาห์ 11)**

> ใช้ `jest.mock("axios")` เพื่อจำลองให้ `axios.get` คืนค่า error ตามจำนวนครั้งที่กำหนดก่อนจะสำเร็จ แล้วเขียน test ยืนยันว่า `fetchWithRetry` เรียกซ้ำตามจำนวนที่ถูกต้องและคืนค่าที่ถูกต้องเมื่อสำเร็จในที่สุด

### 7.1 แนวคิด

- `jest.mock("axios")` ใส่**ชื่อโมดูล** ไม่ใช่ path Jest จะสร้าง mock อัตโนมัติ ทำให้ `axios.get` กลายเป็น `jest.fn()` ทั้งในไฟล์เทสต์และใน external-api.js
- สั่งให้ล้มก่อนแล้วค่อยสำเร็จด้วย `mockRejectedValueOnce(...)` ต่อกัน แล้วปิดท้ายด้วย `mockResolvedValueOnce({ data: ... })` (axios คืน object ที่มี data เพราะโค้ดอ่าน `response.data`)
- **นับให้ถูก:** maxRetries = 2 หมายถึงเรียกสูงสุด 1 + 2 = **3 ครั้ง** ส่วน error ที่ไม่ควร retry (400, 404) เรียกแค่ **1 ครั้ง**
- ปัญหาคือ backoff รอจริง 0.5–3 วินาทีต่อเทสต์ จึงใช้ **fake timers**: `jest.useFakeTimers()` แล้ว `await jest.runAllTimersAsync()` เร่งเวลาให้ setTimeout ทุกตัวทำงานทันที (มีใน Jest 29.5 ขึ้นไป ชุดติดตั้งใช้ Jest ^29.7)
- Jitter ใช้ Math.random ค่าเลยสุ่ม ถ้าอยากตรวจตัวเลขให้ `jest.spyOn(Math, "random").mockReturnValue(0)` จะได้ค่าต่ำสุด base/2 คงที่ (500ms, 1000ms)

### 7.2 ติดตั้ง axios

ชุดติดตั้งใน zip **ไม่มี axios** ต้องติดตั้งเองตอนฝึก (วันสอบให้ดู package.json ของโปรเจกต์ข้อสอบก่อนว่ามีหรือยัง)

```bash
npm install axios
```

### 7.3 สร้าง src/services/external-api.js

โค้ดเดียวกับ lab สัปดาห์ 11 ขั้นตอนที่ 2.2 (สร้างโฟลเดอร์ `src/services` ก่อน):

```javascript
// src/services/external-api.js  (โค้ดเดียวกับ lab สัปดาห์ 11 ขั้นตอนที่ 2.2)
const axios = require("axios");

// error แบบไหนควรลองใหม่: ไม่มี response (network/timeout), 429 หรือ 5xx
function isRetryable(error) {
  if (!error.response) return true;
  const status = error.response.status;
  return status === 429 || (status >= 500 && status < 600);
}

// รอ ms มิลลิวินาที
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, timeoutMs = 3000, maxRetries = 2) {
  let attempt = 0;

  while (true) {
    try {
      const response = await axios.get(url, { timeout: timeoutMs });
      return response.data;
    } catch (error) {
      attempt += 1;
      const canRetry = attempt <= maxRetries && isRetryable(error);

      if (!canRetry) {
        throw error;
      }

      const baseBackoffMs = 2 ** (attempt - 1) * 1000;
      // Equal Jitter: รอระหว่าง base/2 ถึง base
      const backoffMs = baseBackoffMs / 2 + Math.random() * (baseBackoffMs / 2);
      console.warn(
        `[external-api] request to ${url} failed (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${Math.round(backoffMs)}ms`,
      );
      await delay(backoffMs);
    }
  }
}

module.exports = { fetchWithRetry, isRetryable };
```

### 7.4 เขียน tests/external-api.test.js

```javascript
// ทดสอบ Retry logic ของ fetchWithRetry โดยไม่เรียก network จริง
jest.mock("axios"); // แทน axios ทั้งโมดูลด้วย mock อัตโนมัติ: axios.get กลายเป็น jest.fn()

const axios = require("axios");
const { fetchWithRetry, isRetryable } = require("../src/services/external-api");

const URL = "https://example.com/data";

// สร้าง error แบบที่ Axios โยนจริง
function networkError() {
  return new Error("connect ECONNREFUSED"); // ไม่มี error.response
}
function httpError(status) {
  const err = new Error(`Request failed with status code ${status}`);
  err.response = { status }; // server ตอบกลับแล้วแต่ status ผิดพลาด
  return err;
}

beforeEach(() => {
  axios.get.mockReset();       // ล้างค่าที่ตั้งไว้ของเทสต์ก่อนหน้า
  jest.useFakeTimers();        // ทำให้ setTimeout ใน delay() ไม่ต้องรอจริง
  jest.spyOn(console, "warn").mockImplementation(() => {}); // ซ่อน log retry แต่ยังนับได้
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();      // คืน console.warn และ Math.random ของจริง
});

describe("isRetryable", () => {
  it.each([
    ["network error (ไม่มี response)", networkError(), true],
    ["500", httpError(500), true],
    ["503", httpError(503), true],
    ["429", httpError(429), true],
    ["404", httpError(404), false],
    ["400", httpError(400), false],
  ])("%s -> %s", (_label, error, expected) => {
    expect(isRetryable(error)).toBe(expected);
  });
});

describe("fetchWithRetry", () => {
  it("สำเร็จครั้งแรก: เรียก axios.get 1 ครั้ง ไม่มีการ retry", async () => {
    axios.get.mockResolvedValueOnce({ data: { title: "ok" } });

    const result = await fetchWithRetry(URL);

    expect(result).toEqual({ title: "ok" });
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(URL, { timeout: 3000 }); // ส่ง timeout ไปด้วยจริง
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("ล้ม 2 ครั้งแล้วสำเร็จ: เรียก 3 ครั้ง และคืนข้อมูลของครั้งที่สำเร็จ", async () => {
    axios.get
      .mockRejectedValueOnce(networkError())      // ครั้งที่ 1 ล้ม
      .mockRejectedValueOnce(httpError(503))      // ครั้งที่ 2 ล้ม
      .mockResolvedValueOnce({ data: { title: "ok" } }); // ครั้งที่ 3 สำเร็จ

    const promise = fetchWithRetry(URL, 3000, 2);
    await jest.runAllTimersAsync(); // เร่งเวลา backoff ทั้งหมดให้จบทันที

    await expect(promise).resolves.toEqual({ title: "ok" });
    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledTimes(2); // log retry 2 ครั้ง
  });

  it("ล้มทุกครั้ง (500): เรียก 1 + maxRetries = 3 ครั้ง แล้วโยน error เดิมออกมา", async () => {
    axios.get.mockRejectedValue(httpError(500)); // ไม่มี Once = ล้มทุกครั้ง

    const promise = fetchWithRetry(URL, 3000, 2);
    const assertion = expect(promise).rejects.toThrow("status code 500"); // ผูก expect ก่อนเร่งเวลา
    await jest.runAllTimersAsync();
    await assertion;

    expect(axios.get).toHaveBeenCalledTimes(3);
  });

  it("404 ไม่ retry: เรียกครั้งเดียวแล้วโยน error ทันที", async () => {
    axios.get.mockRejectedValueOnce(httpError(404));

    await expect(fetchWithRetry(URL)).rejects.toThrow("status code 404");
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("maxRetries = 0: ล้มครั้งแรกแล้วหยุดเลย", async () => {
    axios.get.mockRejectedValueOnce(networkError());

    await expect(fetchWithRetry(URL, 3000, 0)).rejects.toThrow("ECONNREFUSED");
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("ส่ง timeout ที่กำหนดเองไปให้ axios", async () => {
    axios.get.mockResolvedValueOnce({ data: 1 });

    await fetchWithRetry(URL, 1500);

    expect(axios.get).toHaveBeenCalledWith(URL, { timeout: 1500 });
  });

  it("backoff เป็น Equal Jitter: Math.random = 0 ได้ 500ms และ 1000ms", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // ทำให้ค่าสุ่มคงที่ = ได้ค่าต่ำสุด base/2
    axios.get
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ data: "ok" });

    const promise = fetchWithRetry(URL, 3000, 2);
    await jest.runAllTimersAsync();
    await promise;

    expect(console.warn.mock.calls[0][0]).toContain("Retrying in 500ms");  // attempt 1: base 1000 -> 500
    expect(console.warn.mock.calls[1][0]).toContain("Retrying in 1000ms"); // attempt 2: base 2000 -> 1000
  });
});
```

รัน `npx jest tests/external-api.test.js` ต้องได้ `Tests: 13 passed, 13 total` (isRetryable 6 + fetchWithRetry 7) และควรจบในไม่กี่ร้อยมิลลิวินาที ถ้าใช้เวลาหลายวินาที แปลว่า fake timers ไม่ทำงาน

(ฉันทดสอบตรรกะของ fetchWithRetry กับ axios ปลอมแล้ว: ล้ม 2 ครั้งแล้วสำเร็จ ได้ log "Retrying in 500ms" และ "Retrying in 1000ms" ตามที่เทสต์คาดไว้)

### 7.5 ต่อยอด: เทสต์ Fallback ของ enrichment-service

ถ้าโจทย์ให้เทสต์ชั้นที่เรียก fetchWithRetry อีกที ให้ mock **external-api.js ทั้งไฟล์** แทน axios (ไม่ต้องสนใจเรื่อง retry/timer อีก) สร้าง `src/services/enrichment-service.js` ตาม lab ขั้นตอนที่ 2.3:

```javascript
// src/services/enrichment-service.js  (โค้ดเดียวกับ lab สัปดาห์ 11 ขั้นตอนที่ 2.3)
const { fetchWithRetry } = require("./external-api");

async function getStudentEnrichment(studentId) {
  const url = `https://jsonplaceholder.typicode.com/todos/${studentId}`;

  try {
    const data = await fetchWithRetry(url, 3000, 2);
    return { source: "external", available: true, note: data.title };
  } catch (error) {
    console.error(`[enrichment-service] external API unavailable after retries: ${error.message}`);
    return {
      source: "fallback",
      available: false,
      note: "ไม่สามารถดึงข้อมูลเสริมจากบริการภายนอกได้ในขณะนี้ กรุณาลองใหม่ภายหลัง",
    };
  }
}

module.exports = { getStudentEnrichment };
```

แล้วสร้าง `tests/enrichment-service.test.js`:

```javascript
// ทดสอบ Fallback ของ getStudentEnrichment โดย mock fetchWithRetry ทั้งไฟล์
jest.mock("../src/services/external-api"); // path นับจากไฟล์เทสต์

const { fetchWithRetry } = require("../src/services/external-api");
const { getStudentEnrichment } = require("../src/services/enrichment-service");

beforeEach(() => {
  fetchWithRetry.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("API ภายนอกตอบได้: source เป็น external และ note มาจาก title", async () => {
  fetchWithRetry.mockResolvedValueOnce({ id: 1, title: "delectus aut autem" });

  const result = await getStudentEnrichment(1);

  expect(result).toEqual({ source: "external", available: true, note: "delectus aut autem" });
  expect(fetchWithRetry).toHaveBeenCalledWith("https://jsonplaceholder.typicode.com/todos/1", 3000, 2);
});

it("retry ครบแล้วยังล้ม: ไม่ throw แต่คืน fallback", async () => {
  fetchWithRetry.mockRejectedValueOnce(new Error("timeout of 3000ms exceeded"));

  const result = await getStudentEnrichment(1);

  expect(result.source).toBe("fallback");
  expect(result.available).toBe(false);
});
```

รัน `npx jest tests/enrichment-service.test.js` ต้องได้ `Tests: 2 passed, 2 total`

### 7.6 บั๊กที่มักเจอในโจทย์นี้

| อาการ | สาเหตุ | แก้ |
| --- | --- | --- |
| `Exceeded timeout of 5000 ms` | เปิด fake timers แต่ลืม `await jest.runAllTimersAsync()` setTimeout จึงไม่เคยทำงาน | เรียก fetchWithRetry เก็บ promise ไว้ก่อน แล้ว runAllTimersAsync แล้วค่อย await promise |
| `Expected number of calls: 2 Received: 3` | คิดว่า maxRetries 2 = เรียก 2 ครั้ง | ครั้งแรกไม่นับเป็น retry รวมเป็น 1 + 2 = 3 |
| `TypeError: Cannot read properties of undefined (reading 'data')` | ตั้ง `mockResolvedValueOnce({ title: "ok" })` ลืมห่อด้วย data หรือเรียกเกินจำนวน Once ที่ตั้งไว้ (mock คืน undefined) | ใช้ `{ data: { title: "ok" } }` และตั้ง Once ให้ครบทุกครั้งที่จะถูกเรียก |
| เทสต์ผ่านแต่ขึ้น `PromiseRejectionHandledWarning` | เขียน `expect(promise).rejects` หลัง runAllTimersAsync promise reject ไปก่อนมีคนรับ | ผูก `const assertion = expect(promise).rejects...` ก่อนเร่งเวลา แล้ว `await assertion` |
| เทสต์ถัดไปได้ค่าจากเทสต์ก่อน | ใช้ `mockRejectedValue` (ไม่มี Once) แล้วไม่ reset | `axios.get.mockReset()` ใน beforeEach |
| เรียก network จริง / ได้ ENOTFOUND | เขียน `jest.mock("./axios")` หรือสะกดชื่อผิด | ใช้ชื่อโมดูลตรง ๆ `jest.mock("axios")` |

**คำอธิบายที่ควรเขียนได้:** "เทสต์นี้ใช้ jest.mock แทน axios เพื่อกำหนดเองว่าแต่ละครั้งจะล้มหรือสำเร็จ จึงทดสอบกรณีบริการภายนอกล่มชั่วคราวได้แน่นอนทุกครั้งโดยไม่พึ่งเครือข่ายจริง และใช้ fake timers เพราะ backoff รอจริงหลายวินาที การนับ toHaveBeenCalledTimes(3) ยืนยันว่าระบบลองใหม่ครบ 2 ครั้งตาม maxRetries แล้วหยุด ไม่ retry ไม่รู้จบ"

### 7.7 ฝึกเพิ่ม

1. ทำแบบฝึกหัดต่อยอดที่ 2 ควบคู่: ให้ fetchWithRetry อ่าน `EXTERNAL_API_MAX_RETRIES` จาก env เช่น `const maxRetries = Number(process.env.EXTERNAL_API_MAX_RETRIES ?? 2)` แล้วเทสต์โดยตั้ง `process.env.EXTERNAL_API_MAX_RETRIES = "1"` ในเทสต์ ต้องเรียก axios 2 ครั้ง (อย่าลืม `delete process.env.EXTERNAL_API_MAX_RETRIES` ใน afterEach)
2. เทสต์ว่า 429 ถูก retry แล้วสำเร็จในครั้งที่ 2 (เรียก 2 ครั้ง)
3. เทสต์ด้วย `Math.random = 0.999...` (mockReturnValue(1)) ว่าได้ "Retrying in 1000ms" และ "Retrying in 2000ms" คือค่าสูงสุดของ Equal Jitter

## โจทย์ชุดที่ 8: Validation เขียนเอง + Zod และ DELETE ที่ชน foreign key

**โจทย์**

> 1. เพิ่ม `POST /api/menu` (เฉพาะ admin) รับ `{ name, price, available? }` ตรวจข้อมูลแบบไม่ใช้ไลบรารี รายงาน error ทุก field ในครั้งเดียว
> 2. เพิ่ม `DELETE /api/menu/:id` (เฉพาะ admin) ตอบ 204 เมื่อลบได้, 404 เมื่อไม่พบ, 409 เมื่อเมนูเคยถูกสั่งแล้ว
> 3. ห้ามสั่ง menu\_item\_id ซ้ำในคำสั่งซื้อเดียว (cross-field) และเขียนกฎเดียวกันด้วย Zod

### 8.1 แนวคิด

- ชุดติดตั้งของอาจารย์**ไม่มี zod** ถ้าโจทย์สั่งให้ validate ต้องเขียนเองเป็นหลัก Zod ไว้เผื่อโจทย์ให้ติดตั้งเอง
- หลักเดียวกันทั้งสองแบบ: ตรวจชนิดข้อมูล (ไม่รับ `"65"` ที่เป็น string), ช่วงค่า, ความยาว (trim ก่อน), **รวบรวม error ทุก field** และตอบ `{ error: { code: "VALIDATION_ERROR", message, details: [{ field, message }] } }`
- กฎที่เทียบหลายค่า (ห้ามซ้ำ) คือ **cross-field** ส่วนกฎ "ถ้า A แล้วต้องมี B" คือ **conditional** ใน Zod ทำด้วย `.superRefine` + `ctx.addIssue`
- ตาราง order\_items มี FOREIGN KEY ถึง menu\_items **แต่ไม่มี ON DELETE CASCADE** (ดู seed.sql) ลบเมนูที่เคยถูกสั่ง MySQL จะโยน `ER_ROW_IS_REFERENCED_2` ถ้าไม่ดักจะกลายเป็น 500 ที่ถูกคือแปลงเป็น 409 (ต่างจาก orders ที่ลบแล้ว order\_items หายตามเพราะ CASCADE)
- เมนูที่ถูกสั่งใน seed.sql คือ id 1, 6, 7, 15, 16 จึงใช้ id 1 ทดสอบ 409 และ id 2 ทดสอบลบสำเร็จ

### 8.2 สร้าง src/validators/menu-validator.js (เขียนเอง)

```javascript
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
```

### 8.3 เพิ่ม POST และ DELETE ใน src/routes/menu.js

เพิ่ม 2 บรรทัดใต้ `const { toPositiveInt, sendError } = require("../utils");`

```javascript
const { authenticateToken, requireRole } = require("../middlewares/auth");
const { validateMenuBody } = require("../validators/menu-validator");
```

แล้ววางโค้ดนี้ก่อน `module.exports = router;`

```javascript
// POST /api/menu  เพิ่มเมนูใหม่ (เฉพาะ admin)  body: { name, price, available? }
// ลำดับ middleware: ตรวจ token (401) -> ตรวจ role (403) -> handler ตรวจข้อมูล (400)
router.post("/", authenticateToken, requireRole("admin"), async (req, res, next) => {
  // 1) validate ก่อนแตะฐานข้อมูล
  const result = validateMenuBody(req.body);
  if (!result.valid) {
    return sendError(res, 400, "VALIDATION_ERROR", "ข้อมูลเมนูไม่ถูกต้อง", result.errors);
  }
  const { name, price, available } = result.data;

  try {
    // 2) INSERT ด้วย ? เสมอ แล้วใช้ insertId เป็น id ของเมนูใหม่
    const [insert] = await pool.query(
      "INSERT INTO menu_items (name, price, available) VALUES (?, ?, ?)",
      [name, price, available]
    );
    return res.status(201).json({ data: { id: insert.insertId, name, price, available } });
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/menu/:id  ลบเมนู (เฉพาะ admin)
// order_items.menu_item_id มี FOREIGN KEY ถึง menu_items แต่ไม่มี ON DELETE CASCADE
// -> เมนูที่เคยถูกสั่งแล้วลบไม่ได้ MySQL จะโยน ER_ROW_IS_REFERENCED_2 ซึ่งเราแปลงเป็น 409
router.delete("/:id", authenticateToken, requireRole("admin"), async (req, res, next) => {
  const id = toPositiveInt(req.params.id);
  if (id === null) return sendError(res, 400, "VALIDATION_ERROR", "id ต้องเป็นจำนวนเต็มบวก");

  try {
    const [result] = await pool.query("DELETE FROM menu_items WHERE id = ?", [id]);
    // affectedRows = 0 แปลว่า WHERE ไม่ตรงแถวไหนเลย = ไม่มีเมนูนี้ (MySQL ไม่ throw เอง)
    if (result.affectedRows === 0) {
      return sendError(res, 404, "MENU_NOT_FOUND", `ไม่พบเมนู id ${id}`);
    }
    return res.status(204).send(); // 204 No Content: สำเร็จแต่ไม่มี body
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return sendError(res, 409, "MENU_IN_USE", "เมนูนี้เคยถูกสั่งแล้ว ลบไม่ได้");
    }
    return next(err); // error อื่นให้ error handler ตอบ 500
  }
});
```

### 8.4 เพิ่มกฎห้ามซ้ำใน validateOrderBody (src/routes/orders.js)

วางก่อนบรรทัด `return errors;` สุดท้ายของฟังก์ชัน แล้วเพิ่มแถว `["menu_item_id ซ้ำกัน", { customer_name: "ก", items: [{ menu_item_id: 1, quantity: 1 }, { menu_item_id: 1, quantity: 2 }] }]` ใน it.each ของเทสต์ 400 ใน tests/orders.test.js

```javascript
  // cross-field validation: ห้ามมี menu_item_id ซ้ำในคำสั่งซื้อเดียว (ให้รวมเป็น quantity เดียว)
  const ids = items.map((item) => item?.menu_item_id);
  if (new Set(ids).size !== ids.length) {
    errors.push({ field: "items", message: "menu_item_id ห้ามซ้ำกันในคำสั่งซื้อเดียว" });
  }
```

### 8.5 เวอร์ชัน Zod (ต้อง `npm install zod`)

`src/schemas/order-schema.js`:

```javascript
// สัปดาห์ 12: กฎ validation แบบเดียวกันแต่เขียนด้วย Zod (ต้อง npm install zod)
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

// ตัวอย่าง conditional validation: ถ้าเลือก delivery ต้องมี address ส่วน pickup ไม่ต้องมี
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
```

`src/middlewares/validate.js` ใช้แบบ `router.post("/", validate(createOrderSchema), handler)`:

```javascript
// middleware ตรวจ req.body ด้วย Zod schema (สัปดาห์ 12)
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
```

### 8.6 เทสต์

ในโปรเจกต์มี 3 ไฟล์ (เปิดอ่านได้เลย มีคอมเมนต์ทุกเทสต์):

| ไฟล์ | แบบ | จำนวน | ตรวจอะไร |
| --- | --- | --- | --- |
| tests/menu-validator.test.js | unit (ไม่ใช้ DB) | 7 | เรียก validateMenuBody ตรง ๆ ทุกกรณีผิด และตรวจว่า error ถูกรวบรวมครบ |
| tests/menu-admin.test.js | integration (DB จริง) | 8 | POST/DELETE กับ 401, 403, 400, 201, 204, 404, 409 และนับแถวใน DB |
| tests/zod-schema.test.js | unit + mini app | 12 | schema ทุกตัว, cross-field, conditional และ validate middleware ผ่าน Supertest |

ตัวอย่างเทสต์สำคัญที่ควรเขียนได้เอง:

```javascript
it("ลบเมนูที่เคยถูกสั่ง (id 1 อยู่ใน order 1) ได้ 409 MENU_IN_USE และเมนูยังอยู่", async () => {
  const res = await request(app).delete("/api/menu/1").set(asAdmin);

  expect(res.statusCode).toBe(409);
  expect(res.body.error.code).toBe("MENU_IN_USE");
  expect(await countRows("menu_items")).toBe(22); // ยืนยันใน DB ว่าไม่ถูกลบ
});
```

**คำอธิบายที่ควรเขียนได้:** "ลบเมนู id 1 แล้วได้ 500 เพราะ order\_items ยังอ้างถึงเมนูนี้ผ่าน foreign key ที่ไม่มี ON DELETE CASCADE MySQL จึงปฏิเสธด้วย ER\_ROW\_IS\_REFERENCED\_2 แก้โดยดัก err.code นี้ใน catch แล้วตอบ 409 MENU\_IN\_USE หลังแก้เทสต์ 409 ผ่านและจำนวนเมนูยังเป็น 22"

## โจทย์ชุดที่ 9: OpenAPI + Swagger UI และ Coverage

**โจทย์**

> เขียน `openapi.yaml` ให้ครบทุก endpoint ทุก status ที่ตอบได้จริง แสดงที่ `/api-docs` และเขียนเทสต์ยืนยันว่าเอกสารตรงกับ route จริง

### 9.1 แนวคิด

- โครงไฟล์: `openapi`, `info`, `servers`, `paths`, `components` (schemas, parameters, responses, securitySchemes) แล้วอ้างซ้ำด้วย `$ref`
- endpoint ที่ต้องมี token ใส่ `security: - bearerAuth: []` และต้องมี 401 ใน responses ถ้าตรวจ role ต้องมี 403 ด้วย
- ในโปรเจกต์นี้มี 8 operation: GET/POST /menu, GET/DELETE /menu/{id}, GET/POST /orders, GET /orders/{id}, PATCH /orders/{id}/status (ไฟล์เต็มอยู่ที่ openapi.yaml ใน zip)
- เปิด /api-docs เฉพาะตอนไม่ใช่ production เพราะเปิดเผยโครงสร้างทั้งระบบ
- ต้องติดตั้งเพิ่ม `npm install swagger-ui-express js-yaml`

### 9.2 ตัวอย่าง path หนึ่งตัว (DELETE เมนู)

```yaml
  /menu/{id}:
    delete:
      tags: [Menu]
      summary: ลบเมนู (เฉพาะ admin) ลบเมนูที่เคยถูกสั่งแล้วไม่ได้
      security:
        - bearerAuth: []          # ต้องแนบ JWT
      parameters:
        - $ref: "#/components/parameters/Id"
      responses:                  # ต้องครบทุก status ที่โค้ดตอบได้จริง
        "204":
          description: ลบสำเร็จ (ไม่มี body)
        "400": { $ref: "#/components/responses/ValidationError" }
        "401": { $ref: "#/components/responses/Unauthorized" }
        "403": { $ref: "#/components/responses/Forbidden" }
        "404": { $ref: "#/components/responses/NotFound" }
        "409": { $ref: "#/components/responses/Conflict" }
```

### 9.3 แก้ src/app.js ให้มี /api-docs

เพิ่มใต้ `const express = require("express");`

```javascript
const fs = require("fs");
const path = require("path");
const swaggerUi = require("swagger-ui-express"); // สัปดาห์ 10: แสดงเอกสาร API เป็นหน้าเว็บ
const YAML = require("js-yaml");                  // อ่านไฟล์ openapi.yaml เป็น object
```

และเพิ่มก่อนบรรทัด `app.use("/api/menu", menuRouter);`

```javascript
// เอกสาร API ที่ /api-docs เปิดเฉพาะตอนไม่ใช่ production
// เพราะหน้านี้เปิดเผยโครงสร้าง endpoint ทั้งระบบ (ข้อควรระวังสัปดาห์ 10)
if (process.env.NODE_ENV !== "production") {
  const openapiDocument = YAML.load(fs.readFileSync(path.join(__dirname, "..", "openapi.yaml"), "utf8"));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
}
```

`npm start` แล้วเปิด http://localhost:3000/api-docs กด Authorize ใส่ token (สร้างด้วย `node -e "console.log(require('jsonwebtoken').sign({id:1,role:'admin'}, require('./config').jwtSecret))"`) แล้วลอง Try it out ได้

### 9.4 เทสต์เทียบเอกสารกับ route (tests/openapi.test.js)

ไฟล์นี้อ่าน openapi.yaml แล้วไล่ตรวจทุก operation โดย mock ฐานข้อมูล (22 เทสต์):

1. เป็น OpenAPI 3 และมี 8 operation
2. ทุก operation มี summary และ response 2xx
3. ทุก path มี route อยู่จริง (ไม่ได้ 404 NOT\_FOUND ของแอป)
4. operation ที่ประกาศ security ต้องมี 401 ในเอกสาร **และ**โค้ดต้องตอบ 401 จริงเมื่อไม่ส่ง token
5. operation ที่ไม่ประกาศ security ต้องเรียกได้โดยไม่ต้องมี token
6. /api-docs/ เปิดได้

ถ้าวันหนึ่งเพิ่ม route แล้วลืมเขียนเอกสาร หรือเอกสารบอกว่าต้องมี token แต่โค้ดลืมใส่ authenticateToken เทสต์ชุดนี้จะล้ม นี่คือการกันเอกสารล้าสมัย (stale documentation) ด้วยเทสต์

### 9.5 Coverage (สัปดาห์ 9)

```bash
npm run test:coverage     # = jest --runInBand --coverage
```

ดูคอลัมน์ % Branch และ Uncovered Line #s หาไฟล์ที่ coverage ต่ำสุด แล้วเพิ่มเทสต์ให้ครอบ branch ที่ขาด (ไม่ใช่ลบเทสต์) ผลจะอยู่ในโฟลเดอร์ coverage/ ซึ่งอยู่ใน .gitignore แล้ว

### 9.6 หัวข้อที่ตั้งใจไม่ทำ

Redis cache (สัปดาห์ 7), rate limit (สัปดาห์ 12) และ webhook HMAC (สัปดาห์ 11) เพราะชุดติดตั้งไม่มี Redis หรือ express-rate-limit ถ้าโจทย์สั่ง ให้เปิดเอกสารสัปดาห์นั้นซึ่งเปิดดูได้ในห้องสอบ (หัวข้อ 4.8 และ 3.8 ในเลคเชอร์ทบทวนสรุปโค้ดไว้แล้ว)

## แก้ปัญหาที่พบบ่อยและเช็กลิสต์ก่อนส่ง

ถ้าทำครบทุกชุด `npm test` ควรได้ 11 ไฟล์ผ่านทั้งหมด: environment 3 + menu 15 + orders 18 + auth 7 + orders-mocked 8 + external-api 13 + enrichment-service 2 + menu-validator 7 + menu-admin 8 + zod-schema 12 + openapi 22 + เคสซ้ำที่เพิ่มใน orders 1 = **116 เทสต์** (ไม่นับแบบฝึกเพิ่ม)

### ตอนติดตั้ง

| ข้อความที่เห็น | สาเหตุ | แก้ |
| --- | --- | --- |
| `Cannot connect to the Docker daemon` หรือ `error during connect` | Docker Desktop ยังไม่เปิด | เปิด Docker Desktop รอจนขึ้น Engine running แล้วรันใหม่ |
| `port is already allocated` / `Bind for 0.0.0.0:3309 failed` | มี container หรือ MySQL อื่นใช้พอร์ต 3309 อยู่ | `docker ps` ดูตัวที่ใช้อยู่ แล้ว `docker compose down` ในโฟลเดอร์นั้น หรือเปลี่ยนพอร์ตทั้งใน docker-compose.yml (เช่น `"3310:3306"`) และ DB\_PORT=3310 ใน .env |
| `npm run check` ค้างนานแล้วขึ้น `ECONNREFUSED` | MySQL ยังไม่ติด หรือพอร์ตไม่ตรง | `docker ps` ต้องเห็น Up, เทียบ DB\_PORT กับพอร์ตซ้ายใน docker-compose.yml |
| `ER_ACCESS_DENIED_ERROR` | รหัสผ่านไม่ตรง | DB\_PASSWORD ต้องเป็น root ตาม MYSQL\_ROOT\_PASSWORD (ถ้าเคยแก้รหัสหลังสร้าง container ให้ `docker compose down -v` แล้ว up ใหม่) |
| `ER_BAD_DB_ERROR: Unknown database` | ต่อ MySQL ตัวอื่น (เช่น XAMPP พอร์ต 3306) | ตรวจว่า .env มี DB\_PORT=3309 และไฟล์ชื่อ `.env` จริง ไม่ใช่ `.env.txt` |
| `ER_NO_SUCH_TABLE` | ยังไม่ได้ seed | `npm run seed` |
| `jest: not found` / `Cannot find module 'express'` | ยังไม่ npm install หรือรันผิดโฟลเดอร์ | `cd` ไปโฟลเดอร์ที่มี package.json แล้ว `npm install` |
| PowerShell ขึ้น `running scripts is disabled` | execution policy ของ Windows | ใช้ Command Prompt หรือ Git Bash แทน หรือรัน `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

### ตอนเขียนโค้ดและเทสต์

| ข้อความที่เห็น | สาเหตุที่น่าจะเป็น |
| --- | --- |
| `pool.query is not a function` / `Cannot read properties of undefined (reading 'query')` | require db.js ผิดรูป: ไฟล์ export `{ pool }` ต้องเขียน `const { pool } = require(...)` หรือ mock ไม่ตรงกับรูปที่ export |
| `Cannot find module '../db'` | path ผิด นับจากไฟล์ที่เขียน require: จาก src/routes/ คือ `../../db` จาก tests/ คือ `../db` |
| `Expected: 200 Received: 404` ทุกเทสต์ | path ไม่ตรง: ตรวจ `app.use("/api/...")` กับ URL ในเทสต์ หรือลืม mount router |
| `Expected: 201 Received: 400` ตอน POST | ลืม `app.use(express.json())` ทำให้ req.body ว่าง หรือส่งชื่อ field ไม่ตรง (customer\_name กับ customerName) |
| `Expected: 200 Received: 500` | ดู console.error ในผล Jest มักเป็น SQL ผิด, ชื่อคอลัมน์ผิด, หรือจำนวน `?` ไม่เท่าค่าใน array |
| `Exceeded timeout of 5000 ms` | ไม่มี try/catch ใน async handler, ลืม release, หรือ MySQL ไม่ได้เปิด |
| ตัวเลขเทสต์เพี้ยนเฉพาะตอนรันหลายไฟล์พร้อมกัน | หลายไฟล์รีเซ็ต DB ชนกัน ใช้ `jest --runInBand` |
| ตัวเลขเพี้ยนเฉพาะเทสต์ที่สองขึ้นไป | เทสต์ก่อนหน้าเขียนข้อมูลค้างไว้ ใช้ beforeEach(resetDatabase) แทน beforeAll |
| `Jest did not exit one second after...` | ลืม `afterAll(() => pool.end())` |
| `Cannot log after tests are done` | ลืม await บางจุด โค้ดยังทำงานหลังเทสต์จบ |
| `Incorrect arguments to mysqld_stmt_execute` | ใช้ `pool.execute()` กับ LIMIT ? ให้ใช้ `pool.query()` แทนสำหรับ LIMIT/OFFSET |

### ลำดับทำงานวันสอบ (ส่วนที่ 2 ประมาณ 60 นาที)

1. (5 นาที) `docker compose down` โฟลเดอร์ฝึก → แตกไฟล์ข้อสอบ → ทำตาม README → `npm test` ดูว่าตอนเริ่มมีเทสต์ไหนผ่าน/ล้ม
2. (5 นาที) อ่านโปรเจกต์ตาม B8 และอ่านข้อกำหนดว่า **แก้ไฟล์ไหนได้บ้าง** (บางข้ออาจห้ามแก้เทสต์ หรือห้ามแก้ route)
3. ทำโจทย์ที่คะแนนมากที่ทำได้ก่อน หลังทำแต่ละข้อรันเทสต์ทั้งหมด เพราะแก้จุดหนึ่งอาจทำอีกจุดพัง
4. ข้อที่ให้อธิบาย เขียนตามแม่แบบ 4 ประโยคในชุดที่ 6 ด้วยคำของตัวเอง
5. เหลือเวลา 10 นาทีสุดท้ายไว้เช็กลิสต์ด้านล่างและส่งงาน

### เช็กลิสต์ก่อนส่ง

- [ ] `npm test` ผ่านทุกเทสต์ และ Jest จบเองไม่ค้าง
- [ ] ไม่มี `it.only`, `describe.only`, `it.skip` หลงเหลือ (ทำให้เทสต์อื่นไม่ถูกรัน)
- [ ] ลบ `console.log` ที่ใส่ไว้ดีบัก
- [ ] ทุก query ใช้ `?` ไม่ต่อ string จาก req.body / req.query
- [ ] ทุก transaction มี rollback ใน catch และ release ใน finally
- [ ] เทสต์ยืนยันทั้ง status code และเนื้อหา (body หรือข้อมูลใน DB) ไม่ใช่แค่ status
- [ ] คำอธิบายสาเหตุเขียนด้วยประโยคของตัวเอง ระบุบรรทัด/ฟังก์ชันที่แก้
- [ ] ส่งตามรูปแบบที่กำหนด **ไม่ใส่** โฟลเดอร์ `node_modules` และไฟล์ `.env`

วิธี zip โดยไม่เอา node\_modules กับ .env (ถ้าข้อสอบให้ส่ง zip):

```bash
# macOS / Linux / Git Bash (รันในโฟลเดอร์โปรเจกต์)
zip -r ../submission.zip . -x "node_modules/*" -x ".env"
```

บน Windows ที่ไม่มี Git Bash: คัดลอกโฟลเดอร์ไปที่ใหม่ ลบ node\_modules กับ .env ในสำเนา แล้วคลิกขวา → Compress to ZIP file
