// Structured server logs. Netlify keeps function output, so one JSON line per
// event can be searched by name ("event") in the Netlify log viewer or
// forwarded to a log drain. Never pass secrets or full form data here.

type Context = Record<string, string | number | boolean | null | undefined>;

function describe(error: unknown) {
  if (error instanceof Error)
    return { name: error.name, message: error.message, stack: error.stack?.split("\n").slice(0, 6).join("\n") };
  if (error && typeof error === "object") {
    const e = error as { code?: unknown; message?: unknown; details?: unknown };
    return { code: String(e.code ?? ""), message: String(e.message ?? ""), details: e.details ? String(e.details) : undefined };
  }
  return { message: String(error) };
}

export function logError(event: string, error: unknown, context: Context = {}) {
  console.error(JSON.stringify({ level: "error", event, time: new Date().toISOString(), ...context, error: describe(error) }));
}

export function logWarn(event: string, context: Context = {}) {
  console.warn(JSON.stringify({ level: "warn", event, time: new Date().toISOString(), ...context }));
}
