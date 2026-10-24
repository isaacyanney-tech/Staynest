import type { Instrumentation } from "next";
import { logError } from "@/lib/log";

// Every uncaught error in a page, route handler or server action is logged
// once, as one JSON line, with the route it happened on. The page itself
// shows the nearest error boundary.
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest = (error as { digest?: string }).digest;
  logError("request_failed", error, {
    method: request.method,
    path: request.path.split("?")[0],
    route: context.routePath,
    kind: context.routeType,
    digest,
  });
};
