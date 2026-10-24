import { afterEach, describe, expect, it, vi } from "vitest";
import { SUPABASE_TIMEOUT_MS, timeoutFetch } from "./timeout-fetch";

afterEach(() => vi.unstubAllGlobals());

describe("timeoutFetch", () => {
  it("gives every request a deadline", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await timeoutFetch("https://example.supabase.co/rest/v1/x");
    const init = fetchMock.mock.calls[0][1]!;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(SUPABASE_TIMEOUT_MS).toBeLessThanOrEqual(20_000);
  });

  it("still honours the caller's own abort", async () => {
    const fetchMock = vi.fn(async (_: unknown, init?: RequestInit) => {
      if (init?.signal?.aborted) throw new DOMException("aborted", "AbortError");
      return new Response("ok");
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();
    await expect(timeoutFetch("https://example.supabase.co", { signal: controller.signal })).rejects.toThrow("aborted");
  });
});
