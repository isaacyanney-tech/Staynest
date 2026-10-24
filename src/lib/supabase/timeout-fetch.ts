// Supabase calls give up after a fixed time instead of holding a request
// open until the platform kills it. Callers then see an ordinary error and
// show their "try again" message.
export const SUPABASE_TIMEOUT_MS = 15_000;

export const timeoutFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(SUPABASE_TIMEOUT_MS);
  return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
};
