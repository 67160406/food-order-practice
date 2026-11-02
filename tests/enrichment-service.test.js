// ทดสอบ Fallback ของ getStudentEnrichment โดย mock fetchWithRetry ทั้งไฟล์
jest.mock("../src/services/external-api");

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
