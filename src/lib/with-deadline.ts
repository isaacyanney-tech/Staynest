// Resolves to the promise's value, or to `fallback` once `ms` have passed or
// the promise rejects. Used where a slow dependency must never hold a request
// open, such as the session check in the proxy.
export function withDeadline<T, F>(
  promise: Promise<T>,
  ms: number,
  fallback: F,
): Promise<T | F> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<F>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise.catch(() => fallback), deadline]).finally(() =>
    clearTimeout(timer),
  );
}
