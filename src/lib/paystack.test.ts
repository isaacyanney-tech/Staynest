import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidSignature, toMinor, toVerified, verifyResponse } from "./paystack";

describe("toMinor", () => {
  it("converts cedis to pesewas without floating point drift", () => {
    expect(toMinor(150)).toBe(15000);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor(19.99)).toBe(1999);
  });
});

describe("isValidSignature", () => {
  const key = "sk_test_unit";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "sn_abc123" } });
  const good = createHmac("sha512", key).update(body).digest("hex");

  it("accepts Paystack's HMAC-SHA512 of the raw body", () => {
    expect(isValidSignature(body, good, key)).toBe(true);
    expect(isValidSignature(body, good.toUpperCase(), key)).toBe(true);
  });

  it("refuses a missing, malformed or wrong signature", () => {
    expect(isValidSignature(body, null, key)).toBe(false);
    expect(isValidSignature(body, "", key)).toBe(false);
    expect(isValidSignature(body, "abc", key)).toBe(false);
    expect(isValidSignature(body, good.slice(0, 126) + "zz", key)).toBe(false);
    expect(isValidSignature(body, createHmac("sha512", "other").update(body).digest("hex"), key)).toBe(false);
  });

  it("refuses a body changed after signing", () => {
    expect(isValidSignature(body.replace("abc123", "abc124"), good, key)).toBe(false);
  });

  it("refuses everything when no secret is configured", () => {
    expect(isValidSignature(body, createHmac("sha512", "").update(body).digest("hex"), "")).toBe(false);
  });
});

describe("toVerified", () => {
  it("keeps only what the payment row needs, not card or customer details", () => {
    const parsed = verifyResponse.parse({
      status: true,
      message: "Verification successful",
      data: {
        id: 42,
        reference: "sn_abc123",
        status: "success",
        amount: 15000,
        currency: "GHS",
        gateway_response: "Approved",
        channel: "mobile_money",
        paid_at: "2026-10-23T10:00:00.000Z",
        customer: { email: "owner@example.com", phone: "+233200000000" },
        authorization: { last4: "4081", bin: "408408", authorization_code: "AUTH_x" },
      },
    });
    const v = toVerified(parsed);
    expect(v).toEqual({
      reference: "sn_abc123",
      status: "success",
      amountMinor: 15000,
      currency: "GHS",
      gatewayResponse: "Approved",
      summary: { id: 42, status: "success", channel: "mobile_money", paid_at: "2026-10-23T10:00:00.000Z" },
    });
    expect(JSON.stringify(v)).not.toMatch(/owner@example|4081|AUTH_x/);
  });

  it("rejects a response without a whole-number amount", () => {
    expect(verifyResponse.safeParse({ status: true, data: { reference: "x", status: "success", amount: 150.5, currency: "GHS" } }).success).toBe(false);
    expect(verifyResponse.safeParse({ status: false, data: {} }).success).toBe(false);
  });
});
