import { afterEach, describe, expect, it, vi } from "vitest";
import { withDeadline } from "./with-deadline";

afterEach(() => vi.useRealTimers());

describe("withDeadline", () => {
  it("returns the value when the promise settles in time", async () => {
    await expect(withDeadline(Promise.resolve("ok"), 1000, null)).resolves.toBe(
      "ok",
    );
  });

  it("returns the fallback when the promise rejects", async () => {
    await expect(
      withDeadline(Promise.reject(new Error("dns")), 1000, null),
    ).resolves.toBeNull();
  });

  it("returns the fallback when the promise never settles", async () => {
    vi.useFakeTimers();
    const result = withDeadline(new Promise(() => {}), 3000, "fallback");
    await vi.advanceTimersByTimeAsync(3000);
    await expect(result).resolves.toBe("fallback");
  });
});
