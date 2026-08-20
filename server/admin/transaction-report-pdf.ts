import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { P12Signer } from "@signpdf/signer-p12";
import signPdf from "@signpdf/signpdf";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

import { calculatePaymentGatewayFee, type GatewayFeeSettings } from "@/lib/payment-gateway-fee";
import { formatCurrency, formatWibDateTime } from "@/lib/utils";
import type { Transaction } from "@/types/transaction";

export type TransactionReportSummary = {
  profit: number;
  sessionCount: number;
  printCount: number;
};

function paymentMethod(transaction: Transaction) {
  if (transaction.provider === "Voucher" || transaction.location.toUpperCase().includes("VOUCHER")) return "Voucher";
  return transaction.provider;
}

function netAmount(transaction: Transaction, settings: GatewayFeeSettings) {
  const fee = paymentMethod(transaction) === "QRIS" && transaction.status === "paid"
    ? calculatePaymentGatewayFee(transaction.amount, settings)
    : 0;
  return Math.max(0, transaction.amount - fee);
}

export function summarizeTransactions(transactions: Transaction[], settings: GatewayFeeSettings): TransactionReportSummary {
  const paid = transactions.filter((transaction) => transaction.status === "paid");
  return {
    profit: paid.reduce((total, transaction) => total + netAmount(transaction, settings), 0),
    sessionCount: paid.length,
    printCount: paid.reduce((total, transaction) => total + transaction.printCount, 0),
  };
}

async function getP12Certificate() {
  const encoded = process.env.REPORT_SIGNING_P12_BASE64?.trim();
  if (encoded) return Buffer.from(encoded, "base64");
  const filePath = process.env.REPORT_SIGNING_P12_PATH?.trim();
  if (filePath) return readFile(filePath);
  throw new Error("Sertifikat laporan belum dikonfigurasi. Ikuti docs/transaction-report-signing.md.");
}

export async function createSignedTransactionReport({
  transactions,
  settings,
  verificationBaseUrl,
}: {
  transactions: Transaction[];
  settings: GatewayFeeSettings;
  verificationBaseUrl: string;
}) {
  const summary = summarizeTransactions(transactions, settings);
  const issuedAt = new Date().toISOString();
  const reportId = crypto.randomUUID();
  const qrUrl = `${verificationBaseUrl}/${reportId}`;
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const qrImage = await document.embedPng(await QRCode.toDataURL(qrUrl, { margin: 1, width: 240 }));
  const logo = await document.embedPng(
    await readFile(path.join(process.cwd(), "public", "poskart-report-logo.png")),
  );
  const page = document.addPage([595.28, 841.89]);
  const dark = rgb(0.05, 0.11, 0.22);
  const logoScale = 48 / logo.width;
  page.drawImage(logo, {
    x: 555 - 54,
    y: 760,
    width: 54,
    height: logo.height * logoScale,
  });
  page.drawText("Laporan Transaksi POSKART", { x: 40, y: 792, size: 19, font: bold, color: dark });
  page.drawText(`Diterbitkan ${formatWibDateTime(issuedAt)} WIB`, { x: 40, y: 770, size: 9, font: regular, color: rgb(0.35, 0.38, 0.43) });
  const metrics = [["Total keuntungan", formatCurrency(summary.profit)], ["Total sesi", String(summary.sessionCount)], ["Total print", String(summary.printCount)]];
  metrics.forEach(([label, value], index) => {
    const x = 40 + index * 170;
    page.drawRectangle({ x, y: 700, width: 154, height: 50, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.86, 0.88, 0.9), borderWidth: 1 });
    page.drawText(label, { x: x + 10, y: 733, size: 8, font: regular, color: rgb(0.35, 0.38, 0.43) });
    page.drawText(value, { x: x + 10, y: 714, size: 12, font: bold, color: dark });
  });
  // Keep the original report's bordered ledger style while the PDF itself is signed.
  const columns = [
    { label: "ID", width: 85 }, { label: "Date &\nTime", width: 60 },
    { label: "Payment", width: 48 }, { label: "Package", width: 136 },
    { label: "Gross", width: 43 }, { label: "Gateway\nfee", width: 50 },
    { label: "Net", width: 48 }, { label: "Status", width: 45 },
  ];
  const tableX = 40;
  const tableTop = 678;
  const headerHeight = 27;
  const rowHeight = 28;
  let columnX = tableX;
  columns.forEach((column) => {
    page.drawRectangle({ x: columnX, y: tableTop - headerHeight, width: column.width, height: headerHeight, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.84, 0.86, 0.89), borderWidth: 0.6 });
    column.label.split("\n").forEach((line, index) => page.drawText(line, { x: columnX + 4, y: tableTop - 12 - index * 8, size: 6.3, font: bold, color: dark }));
    columnX += column.width;
  });
  let y = tableTop - headerHeight;
  transactions.forEach((transaction) => {
    if (y - rowHeight < 105) return;
    const values = [
      transaction.id.slice(0, 18), formatWibDateTime(transaction.createdAtRaw).replace(", ", "\n").slice(0, 28),
      paymentMethod(transaction), transaction.packageName.slice(0, 26),
      formatCurrency(transaction.amount), formatCurrency(Math.max(0, transaction.amount - netAmount(transaction, settings))),
      formatCurrency(netAmount(transaction, settings)), transaction.status,
    ];
    columnX = tableX;
    values.forEach((value, index) => {
      const column = columns[index];
      page.drawRectangle({ x: columnX, y: y - rowHeight, width: column.width, height: rowHeight, borderColor: rgb(0.84, 0.86, 0.89), borderWidth: 0.6 });
      value.split("\n").forEach((line, lineIndex) => page.drawText(line, { x: columnX + 4, y: y - 13 - lineIndex * 8, size: 6.2, font: regular, color: dark }));
      columnX += column.width;
    });
    y -= rowHeight;
  });
  page.drawLine({ start: { x: 40, y: 82 }, end: { x: 555, y: 82 }, thickness: 0.6, color: rgb(0.8, 0.82, 0.85) });
  page.drawText("Digitally signed by POSKART", { x: 40, y: 64, size: 9, font: bold, color: dark });
  page.drawText("Dokumen akan ditandai tidak valid bila diubah setelah ditandatangani.", { x: 40, y: 49, size: 7, font: regular, color: rgb(0.35, 0.38, 0.43) });
  page.drawText(`Report ID: ${reportId}`, { x: 40, y: 36, size: 7, font: regular, color: rgb(0.35, 0.38, 0.43) });
  page.drawImage(qrImage, { x: 485, y: 26, width: 60, height: 60 });
  pdflibAddPlaceholder({ pdfDoc: document, reason: "POSKART transaction report integrity", contactInfo: "support@poskart.my.id", name: "POSKART", location: "Indonesia", signatureLength: 16000 });
  const unsigned = await document.save({ useObjectStreams: false });
  const signed = await signPdf.sign(Buffer.from(unsigned), new P12Signer(await getP12Certificate(), { passphrase: process.env.REPORT_SIGNING_P12_PASSWORD ?? "" }));
  return {
    pdf: signed,
    reportId,
    issuedAt,
    summary,
    pdfSha256: crypto.createHash("sha256").update(signed).digest("hex"),
  };
}
