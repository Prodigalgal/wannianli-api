import { ApiError, MAX_BODY_BYTES } from "./request.js";

export class RequestGuard {
  constructor({ perMinute = 120, burst = 20, maxConcurrent = 4, now = () => performance.now() } = {}) {
    if (![perMinute, burst, maxConcurrent].every((value) => Number.isInteger(value) && value > 0)) {
      throw new TypeError("API resource limits must be positive integers");
    }
    this.perMinute = perMinute;
    this.burst = burst;
    this.maxConcurrent = maxConcurrent;
    this.now = now;
    this.lastRefill = now();
    this.tokens = burst;
    this.active = 0;
  }

  acquire() {
    const now = this.now();
    this.tokens = Math.min(this.burst, this.tokens + Math.max(0, now - this.lastRefill) * this.perMinute / 60_000);
    this.lastRefill = now;
    if (this.tokens < 1) throw new ApiError(429, "请求过于频繁，请稍后重试");
    if (this.active >= this.maxConcurrent) throw new ApiError(503, "计算繁忙，请稍后重试");
    this.tokens--;
    this.active++;
  }

  release() { this.active--; }

  chargeAdditional(units) {
    if (!Number.isInteger(units) || units < 0) throw new TypeError("Invalid calculation cost");
    const now = this.now();
    this.tokens = Math.min(this.burst, this.tokens + Math.max(0, now - this.lastRefill) * this.perMinute / 60_000);
    this.lastRefill = now;
    if (this.tokens < units) throw new ApiError(429, "计算配额不足，请稍后重试");
    this.tokens -= units;
  }
}

export function checkRequestHeaders(request, calculation, maxBytes = MAX_BODY_BYTES) {
  let headerBytes = 0;
  const encoder = new TextEncoder();
  for (const [name, value] of request.headers) {
    headerBytes += encoder.encode(name).length + encoder.encode(value).length + 4;
    if (headerBytes > 8192) throw new ApiError(431, "请求头过大");
  }
  if (calculation) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/iu.test(contentType)) {
      throw new ApiError(415, "Content-Type必须为application/json且使用UTF-8编码");
    }
  }
  const encoding = request.headers.get("content-encoding");
  if (encoding !== null && encoding.toLowerCase() !== "identity") throw new ApiError(415, "不支持压缩请求体");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > maxBytes)) {
    throw new ApiError(413, `请求体不能超过${maxBytes}字节`);
  }
  if (!calculation && (request.body !== null || Number(length) > 0 || request.headers.has("transfer-encoding"))) {
    throw new ApiError(400, "当前时间接口不接受请求体");
  }
}
