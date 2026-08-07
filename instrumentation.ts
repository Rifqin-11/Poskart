import type { Instrumentation } from "next";
import { recordServerError } from "@/server/observability/system-error-service";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const errorWithDigest = error as Error & { digest?: string };
  await recordServerError({
    error,
    source:
      context.routeType === "action"
        ? "server_action"
        : context.routeType === "route"
          ? "route"
          : context.routeType === "render"
            ? "render"
            : "web",
    route: context.routePath ?? request.path,
    method: request.method,
    digest: errorWithDigest.digest,
    context: {
      routerKind: context.routerKind,
      renderSource: context.renderSource,
    },
  });
};
