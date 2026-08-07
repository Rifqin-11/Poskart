import { recordServerError } from "@/server/observability/system-error-service";

type SafeApiErrorOptions = {
  context: string;
  message: string;
  status?: number;
  field?: "error" | "message";
};

/** Logs the technical cause on the server while returning an actionable, safe message. */
export function safeApiError(
  error: unknown,
  { context, message, status = 500, field = "message" }: SafeApiErrorOptions,
) {
  console.error(`[${context}]`, error);
  void recordServerError({ error, source: "route", route: context });
  return Response.json(
    field === "error" ? { error: message } : { message },
    { status },
  );
}
