# food-order-practice

โปรเจกต์ฝึกสำหรับข้อสอบปฏิบัติ ส่วนที่ 2 วิชา 88736065 API for Back-End Development
สร้างต่อจาก `final-exam-setup.zip` (ใช้ฐานข้อมูลระบบสั่งอาหารชุดเดียวกัน) และมีโค้ดของโจทย์ฝึกทั้ง 9 ชุดที่ทำเสร็จแล้ว (รวมจุดเด่นจากชุดของเพื่อน: validation เขียนเอง/Zod, OpenAPI, DELETE ที่ชน foreign key, coverage)
คำอธิบายทีละขั้นของทุกชุดอยู่ใน [GUIDE.md](GUIDE.md)

## เริ่มใช้งาน

ต้องมี Docker Desktop (เปิดไว้) และ Node.js 18 ขึ้นไป

```bash
cp .env.example .env        # Windows cmd: copy .env.example .env
docker compose up -d        # เปิด MySQL ที่พอร์ต 3309 รอประมาณ 20 วินาที
npm install                 # ติดตั้ง express, mysql2, jsonwebtoken, axios, zod, swagger-ui-express, js-yaml, jest, supertest
npm run seed                # ใส่ข้อมูลตัวอย่าง (รันซ้ำได้ทุกเมื่อเพื่อรีเซ็ต)
npm run check               # ต้องเห็น: เชื่อมต่อฐานข้อมูลได้ พบเมนู 22 รายการ
npm test                    # ต้องผ่าน 116 เทสต์ ใน 11 ไฟล์
npm run test:coverage       # ดู coverage (สัปดาห์ 9)
npm start                   # เปิดเซิร์ฟเวอร์ที่ http://localhost:3000 และเอกสาร API ที่ /api-docs
```

ถ้าพอร์ต 3309 ถูกใช้อยู่ (เช่นเปิดโฟลเดอร์ final-exam-setup ไว้) ให้รัน `docker compose down` ในโฟลเดอร์นั้นก่อน

## โครงสร้าง

| ไฟล์ | โจทย์ฝึก | เนื้อหา |
| --- | --- | --- |
| `src/app.js`, `src/server.js`, `src/utils.js` | พื้นฐาน | แยก app/server, error handler, ฟังก์ชันช่วย |
| `src/routes/menu.js` + `tests/menu.test.js` | ชุดที่ 1 | GET /api/menu: pagination, filter, sort, 400/404 |
| `src/routes/orders.js` + `tests/orders.test.js` | ชุดที่ 2, 3 | POST ด้วย transaction, GET รายการ/รายละเอียด (JOIN), PATCH สถานะ (FOR UPDATE) |
| `src/middlewares/auth.js` + `tests/auth.test.js` | ชุดที่ 4 | JWT + RBAC (401/403) |
| `tests/orders-mocked.test.js` | ชุดที่ 5 | jest.mock ฐานข้อมูล: DB ล่ม, rollback, release |
| `GUIDE.md` (ชุดที่ 6) | ชุดที่ 6 | ดีบัก 10 บั๊กพร้อมคำอธิบายสาเหตุ (ฝึกโดยใส่บั๊กลงในโค้ดนี้เอง) |
| `src/services/*` + `tests/external-api.test.js`, `tests/enrichment-service.test.js` | ชุดที่ 7 | ทดสอบ Retry ด้วย jest.mock("axios") และ fallback |
| `src/validators/menu-validator.js` + `tests/menu-validator.test.js`, `tests/menu-admin.test.js` | ชุดที่ 8 | validation เขียนเอง, POST/DELETE เมนู (admin), FK -> 409 |
| `src/schemas/order-schema.js`, `src/middlewares/validate.js` + `tests/zod-schema.test.js` | ชุดที่ 8 | Zod: cross-field, conditional, validate middleware |
| `openapi.yaml` + `tests/openapi.test.js` | ชุดที่ 9 | OpenAPI 3, Swagger UI ที่ /api-docs, เทสต์เทียบเอกสารกับ route |
| `tests/helpers/db-helper.js` | ทุกชุด | รีเซ็ตฐานข้อมูลจาก seed.sql ก่อนเทสต์ |

## Endpoint

| Method | Path | สิทธิ์ | ผลลัพธ์ |
| --- | --- | --- | --- |
| GET | /api/menu?page&limit&available&sort&order | ทุกคน | 200, 400 |
| GET | /api/menu/:id | ทุกคน | 200, 400, 404 |
| POST | /api/menu | admin | 201, 400, 401, 403 |
| DELETE | /api/menu/:id | admin | 204, 400, 401, 403, 404, 409 |
| POST | /api/orders | ทุกคน | 201, 400, 404, 409 |
| GET | /api/orders?status&page&limit | ทุกคน | 200, 400 |
| GET | /api/orders/:id | ทุกคน | 200, 400, 404 |
| PATCH | /api/orders/:id/status | staff, admin (Bearer token) | 200, 400, 401, 403, 404, 409 |

## หมายเหตุ

- โปรเจกต์นี้ใช้ฝึกก่อนสอบ โปรเจกต์และโจทย์จริงจะแจกในวันสอบ และวันสอบห้ามใช้ AI
- เวลาส่งงาน อย่าใส่ `node_modules/` และ `.env` (มีอยู่ใน .gitignore แล้ว)
