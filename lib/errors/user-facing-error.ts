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

  // Keep dependency failures useful before the generic data-layer masking.
  // Server actions may receive an FK message from an older deployment while
  // the client is already using the actionable error contract.
  if (
    /foreign key|violates .*constraint|still referenced|is still in use|pricing product.*device|device.*pricing/i.test(
      message,
    )
  ) {
    return "Data ini masih digunakan oleh device atau data terkait. Lepaskan package dari konfigurasi device terlebih dahulu, lalu coba lagi.";
  }

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
