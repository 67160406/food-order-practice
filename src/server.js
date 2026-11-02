// จุดเริ่มเปิดเซิร์ฟเวอร์จริง (npm start) เทสต์จะไม่ใช้ไฟล์นี้
const app = require("./app");
const { port } = require("../config");

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
