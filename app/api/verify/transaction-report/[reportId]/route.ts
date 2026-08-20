import { NextResponse } from "next/server";

import {
  getTransactionReportVerification,
  isMatchingReportPdf,
} from "@/server/admin/transaction-report-verification";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;
  const report = await getTransactionReportVerification(reportId);
  if (!report) return NextResponse.json({ status: "unknown" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("pdf");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PDF_SIZE) {
    return NextResponse.json({ error: "Unggah PDF hingga 10 MB." }, { status: 400 });
  }
  const content = Buffer.from(await file.arrayBuffer());
  if (content.subarray(0, 5).toString() !== "%PDF-") {
    return NextResponse.json({ error: "File harus berformat PDF." }, { status: 400 });
  }
  return NextResponse.json({
    status: isMatchingReportPdf(content, report) ? "valid" : "modified",
  });
}
