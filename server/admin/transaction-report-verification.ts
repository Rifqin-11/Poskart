import "server-only";

import crypto from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TransactionReportVerification = {
  id: string;
  issuedAt: string;
  transactionCount: number;
  sessionCount: number;
  printCount: number;
  profit: number;
  pdfSha256: string;
};

export async function getTransactionReportVerification(reportId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("transaction_report_verifications")
    .select("id,issued_at,transaction_count,session_count,print_count,profit,pdf_sha256")
    .eq("id", reportId)
    .maybeSingle();
  if (error) throw new Error(`Gagal memuat verifikasi laporan: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    issuedAt: data.issued_at,
    transactionCount: data.transaction_count,
    sessionCount: data.session_count,
    printCount: data.print_count,
    profit: Number(data.profit),
    pdfSha256: data.pdf_sha256,
  } satisfies TransactionReportVerification;
}

export function isMatchingReportPdf(file: Buffer, report: TransactionReportVerification) {
  return crypto.createHash("sha256").update(file).digest("hex") === report.pdfSha256;
}
