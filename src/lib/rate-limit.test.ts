import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const rpc = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ rpc: (...args: unknown[]) => ({ abortSignal: () => rpc(...args) }) }),
}));

const { ipFrom, rateLimit } = await import("./rate-limit");

describe("ipFrom", () => {
  it("prefers the address Netlify reports", () => {
    const h = new Headers({ "x-nf-client-connection-ip": "41.66.1.2", "x-forwarded-for": "10.0.0.1" });
    expect(ipFrom(h)).toBe("41.66.1.2");
  });

  it("takes the first forwarded address", () => {
    expect(ipFrom(new Headers({ "x-forwarded-for": "2c0f:fe38::1, 10.0.0.1" }))).toBe("2c0f:fe38::1");
  });

  it.each(["", "not an ip", "1.2.3.4; drop table", "x".repeat(60)])("treats %s as unknown", (v) => {
    expect(ipFrom(new Headers({ "x-forwarded-for": v }))).toBe("unknown");
  });
});

describe("rateLimit", () => {
  const limit = { max: 2, windowSeconds: 60 };

  it("passes the counter's answer through", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await rateLimit("k", limit)).toBe(false);
    expect(rpc).toHaveBeenLastCalledWith("take_rate_limit", { p_key: "k", p_max: 2, p_window_seconds: 60, p_cost: 1 });
  });

  it("allows the request and logs when the counter is unreachable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockRejectedValueOnce(new Error("timeout"));
    expect(await rateLimit("signin:ip:1.2.3.4", limit)).toBe(true);
    const line = JSON.parse(String(log.mock.calls[0][0]));
    expect(line).toMatchObject({ level: "error", event: "rate_limit_unavailable", key: "signin" });
    log.mockRestore();
  });
});
