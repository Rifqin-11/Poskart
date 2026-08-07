const MASKED_SERVER_ERROR =
  /an error occurred in the server components render|digest property/i;

const INTERNAL_ERROR_PATTERNS = [
  /\bsupabase\b/i,
  /\b(postgres(?:ql)?|sql)\b/i,
  /\b(relation|column|table|schema)\b.*\b(does not exist|unknown)\b/i,
  /\b(duplicate key|foreign key|violates|constraint)\b/i,
  /\b(econn\w*|etimedout|enotfound)\b/i,
  /\b(api key|secret|token|jwt|service role)\b/i,
];

/**
 * Keeps known validation messages useful while hiding framework and data-layer
 * details that are either opaque in production or unsafe to expose.
 */
export function getUserFacingErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  if (!message || MASKED_SERVER_ERROR.test(message)) return fallback;
  if (INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  if (/^(unauthorized|forbidden|access denied)$/i.test(message)) {
    return "Akses Anda tidak diizinkan untuk melakukan tindakan ini.";
  }

  if (/^not authenticated$/i.test(message)) {
    return "Sesi Anda telah berakhir. Silakan masuk kembali.";
  }

  return message;
}
