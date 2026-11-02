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
